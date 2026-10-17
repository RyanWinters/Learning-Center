#!/usr/bin/env python3
"""Learning Center server: serves this folder and a single-user progress API.

    python server.py                 # http://0.0.0.0:8080
    python server.py --port 9000

Reach it from your phone over Tailscale at http://<pc-name>:8080, or run
`tailscale serve --bg 8080` for an HTTPS URL on your tailnet.

API
    GET  /api/progress   -> the saved progress JSON ({} if none yet)
    PUT  /api/progress   -> body is the client's progress JSON; the server merges it
                            with what it has (newest updatedAt wins per item) and
                            returns the merged result.
No third-party packages. Python 3.8+.
"""
import argparse
import json
import os
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
PROGRESS = os.path.join(DATA_DIR, "progress.json")
MAX_BODY = 5 * 1024 * 1024
lock = threading.Lock()


def read_progress():
    try:
        with open(PROGRESS, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def write_progress(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)
    os.replace(tmp, PROGRESS)  # atomic on Windows and POSIX


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
    two devices working on different lessons never overwrite each other. Scalar
    totals (xp, streak) and settings come from whichever document is newer.
    """
    if not server:
        return client
    out = dict(newer(server, client))
    for key in ("lessons", "sims", "cards", "badges"):
        s, c = server.get(key) or {}, client.get(key) or {}
        out[key] = {k: newer(s.get(k), c.get(k)) for k in set(s) | set(c)}
    out["updatedAt"] = max(server.get("updatedAt", 0), client.get("updatedAt", 0))
    return out


class Handler(SimpleHTTPRequestHandler):
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

    def do_GET(self):
        if self.path.split("?")[0] == "/api/progress":
            with lock:
                return self.send_json(200, read_progress())
        if self.path.startswith("/data/"):
            return self.send_error(404)
        return super().do_GET()

    def do_PUT(self):
        if self.path.split("?")[0] != "/api/progress":
            return self.send_error(404)
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.send_json(400, {"error": "Body must be 1 byte to 5 MB of JSON."})
        try:
            client = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return self.send_json(400, {"error": "Body is not valid JSON."})
        if not isinstance(client, dict):
            return self.send_json(400, {"error": "Progress must be a JSON object."})
        with lock:
            merged = merge(read_progress(), client)
            write_progress(merged)
        return self.send_json(200, merged)

    do_POST = do_PUT

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            super().log_message(fmt, *args)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8080)
    a = ap.parse_args()
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    print(f"Learning Center on http://localhost:{a.port}  (Ctrl+C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
