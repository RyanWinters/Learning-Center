#!/usr/bin/env python3
"""Learning Center server: serves the app and a single-user progress API.

    python server.py                 # http://127.0.0.1:8080 (this PC only)
    python server.py --port 9000
    python server.py --auto-update   # pull new commits on main every 5 minutes

To use it from your phone, keep the default (localhost only) and run
`tailscale serve --bg 8080` once. Tailscale then gives you an HTTPS URL that only
devices on your tailnet can open. `--host 0.0.0.0` exposes it to your whole LAN
instead, which isn't recommended: the progress API has no login.

API
    GET  /api/progress   -> the saved progress JSON ({} if none yet)
    PUT  /api/progress   -> body is the client's progress JSON; the server merges it
                            with what it has and returns the merged result.
Both need the header `X-LC: 1`, and PUT needs `Content-Type: application/json`.
A web page on another site can't send those without a CORS preflight, which this
server never approves, so other sites can't read or overwrite your progress.

No third-party packages. Python 3.8+.
"""
import argparse
import json
import os
import posixpath
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
PROGRESS = os.path.join(DATA_DIR, "progress.json")
MAX_BODY = 5 * 1024 * 1024
MAPS = ("lessons", "sims", "cards", "badges")
# Only these are ever served. Everything else (.git, data/, docs/, tools/, server.py) is 404.
PUBLIC_FILES = {"/", "/index.html"}
PUBLIC_DIRS = ("/assets/", "/content/")
lock = threading.Lock()


def read_progress():
    try:
        with open(PROGRESS, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError, UnicodeDecodeError):
        return {}


def write_progress(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(PROGRESS):
        shutil.copyfile(PROGRESS, PROGRESS + ".bak")  # one step of undo if something goes wrong
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)
    os.replace(tmp, PROGRESS)  # atomic on Windows and POSIX


def num(v):
    """Numbers only (bool is excluded even though it subclasses int)."""
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def sanitize(doc):
    """Drop anything that would break merging: non-object records, non-numeric timestamps or XP."""
    out = {k: v for k, v in doc.items() if k not in MAPS}
    for key in ("updatedAt", "resetAt", "xp"):
        if key in out and not num(out[key]):
            del out[key]
    for key in MAPS:
        items = doc.get(key)
        if not isinstance(items, dict):
            continue
        out[key] = {
            k: v for k, v in items.items()
            if isinstance(k, str) and isinstance(v, dict) and num(v.get("updatedAt", 0))
        }
    return out


def newer(a, b):
    """Return whichever record has the later updatedAt (b wins ties)."""
    if not isinstance(a, dict):
        return b
    if not isinstance(b, dict):
        return a
    return a if a.get("updatedAt", 0) > b.get("updatedAt", 0) else b


def merge(server, client):
    """Merge two progress documents.

    Maps of per-item records (lessons, sims, cards, badges) merge item by item so
    two devices working on different lessons never overwrite each other. XP takes
    the higher value since the last reset; other scalars and settings come from
    whichever document is newer. Timestamps come from device clocks, so a device
    whose clock runs far ahead will win ties it shouldn't.
    """
    if not server:
        return client
    out = dict(newer(server, client))
    for key in MAPS:
        s, c = server.get(key) or {}, client.get(key) or {}
        out[key] = {k: newer(s.get(k), c.get(k)) for k in set(s) | set(c)}
    out["updatedAt"] = max(server.get("updatedAt", 0), client.get("updatedAt", 0))
    # XP only goes up between resets, so a stale device can't lower it. A document last
    # written before the newest reset doesn't count.
    reset_at = max(server.get("resetAt", 0), client.get("resetAt", 0))
    live = [d for d in (server, client) if d.get("updatedAt", 0) >= reset_at]
    out["resetAt"] = reset_at
    out["xp"] = max([d.get("xp", 0) for d in live] + [0])
    return out


def public_path(raw):
    """Decoded, normalised request path if it may be served, else None."""
    path = posixpath.normpath(unquote(urlsplit(raw).path))
    if raw.split("?")[0].endswith("/") and path != "/":
        path += "/"
    if any(part.startswith(".") for part in path.split("/") if part):
        return None
    if path in PUBLIC_FILES or path.startswith(PUBLIC_DIRS):
        return path
    return None


class Server(ThreadingHTTPServer):
    # The default listen queue is 5. A phone's first load (through `tailscale serve`) opens dozens of
    # connections at once; on Windows the overflow is refused outright and a script never loads.
    request_queue_size = 128
    daemon_threads = True
    restart = False


class Handler(SimpleHTTPRequestHandler):
    timeout = 30  # seconds; a stalled client can't hold a thread forever
    protocol_version = "HTTP/1.1"  # keep-alive: reuse connections instead of opening one per file

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Content changes often while lessons are being written; don't cache it.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def is_api(self):
        return urlsplit(self.path).path == "/api/progress"

    def from_app(self):
        return self.headers.get("X-LC") == "1"

    def do_GET(self):
        if self.is_api():
            if not self.from_app():
                return self.send_json(403, {"error": "Missing X-LC header."})
            with lock:
                return self.send_json(200, read_progress())
        if public_path(self.path) is None:
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        if public_path(self.path) is None:
            return self.send_error(404)
        return super().do_HEAD()

    def do_PUT(self):
        if not self.is_api():
            return self.send_error(404)
        if not self.from_app() or not (self.headers.get("Content-Type") or "").startswith("application/json"):
            return self.send_json(403, {"error": "Send JSON with the X-LC header."})
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            return self.send_json(400, {"error": "Body must be 1 byte to 5 MB of JSON."})
        try:
            client = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self.send_json(400, {"error": "Body is not valid UTF-8 JSON."})
        if not isinstance(client, dict):
            return self.send_json(400, {"error": "Progress must be a JSON object."})
        try:
            with lock:
                merged = merge(sanitize(read_progress()), sanitize(client))
                write_progress(merged)
        except Exception as e:  # never drop the connection without an answer
            return self.send_json(500, {"error": "Could not merge progress: %s" % e})
        return self.send_json(200, merged)

    def log_message(self, fmt, *args):
        if args and "/api/" in str(args[0]):
            super().log_message(fmt, *args)


def git(*args):
    # CREATE_NO_WINDOW: under pythonw, each git call would otherwise flash a console window.
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")  # never wait on a password prompt
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=120,
                          creationflags=flags, env=env)


def auto_update(srv, minutes):
    """Fast-forward to origin/main every few minutes. Content is read from disk on each request,
    so new lessons show up right away; a change to server.py restarts the server."""
    while True:
        time.sleep(minutes * 60)
        try:
            if git("fetch", "-q", "origin", "main").returncode:
                continue  # offline; try again next time
            old = git("rev-parse", "HEAD").stdout.strip()
            new = git("rev-parse", "origin/main").stdout.strip()
            if old == new or git("merge-base", "--is-ancestor", old, new).returncode:
                continue  # up to date, or local commits we shouldn't touch
            pulled = git("merge", "--ff-only", "-q", "origin/main")
            if pulled.returncode:
                print("Auto-update: couldn't fast-forward:", pulled.stderr.strip(), flush=True)
                continue
            print(f"Auto-update: {old[:7]} -> {new[:7]}", flush=True)
            if "server.py" in git("diff", "--name-only", old, new).stdout.split():
                print("Auto-update: server.py changed, restarting", flush=True)
                srv.restart = True
                srv.shutdown()  # main() starts the new copy once the port is free
                return
        except Exception as e:  # never let the updater take the server down
            print("Auto-update failed:", e, flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--host", default="127.0.0.1", help="127.0.0.1 (default) or 0.0.0.0 for the whole LAN")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--auto-update", type=float, nargs="?", const=5, metavar="MINUTES",
                    help="git pull main every MINUTES (default 5) and restart if server.py changed")
    a = ap.parse_args()
    srv = Server((a.host, a.port), Handler)
    if a.auto_update:
        threading.Thread(target=auto_update, args=(srv, a.auto_update), daemon=True).start()
        print(f"Auto-update: checking origin/main every {a.auto_update:g} min")
    print(f"Learning Center on http://localhost:{a.port}  (Ctrl+C to stop)")
    if a.host == "127.0.0.1":
        print(f"Phone access: run `tailscale serve --bg {a.port}` once, then open the URL it prints.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    srv.server_close()
    if srv.restart:
        subprocess.Popen([sys.executable, os.path.abspath(__file__), *sys.argv[1:]],
                         cwd=ROOT, stdout=sys.stdout, stderr=sys.stderr)


if __name__ == "__main__":
    main()
