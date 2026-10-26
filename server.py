#!/usr/bin/env python3
"""Learning Center server: serves the app and a single-user progress API.

    python server.py                 # http://127.0.0.1:8080 (this PC only)
    python server.py --port 9000

To use it from your phone, keep the default (localhost only) and run
`tailscale serve --bg 8080` once. Tailscale then gives you an HTTPS URL that only
devices on your tailnet can open. `--host 0.0.0.0` exposes it to your whole LAN
instead, which isn't recommended: the progress API has no login.

API
    GET  /api/progress   -> the saved progress JSON ({} if none yet)
    PUT  /api/progress   -> body is the client's progress JSON; the server merges it
                            with what it has and returns the merged result.
    POST /api/tutor      -> body {"lesson": {"title", "text"}, "messages": [{"role", "content"}]};
                            returns {"reply": "..."} from the Ask Claude tutor.
All need the header `X-LC: 1`, and PUT/POST need `Content-Type: application/json`.
A web page on another site can't send those without a CORS preflight, which this
server never approves, so other sites can't read or overwrite your progress.

The tutor runs the Claude Code CLI (`claude -p`) installed on this PC, so it uses your
Claude plan and needs no API key. Set LC_CLAUDE to the CLI's full path if it isn't on PATH.

No third-party packages. Python 3.8+.
"""
import argparse
import json
import os
import posixpath
import shutil
import subprocess
import tempfile
import threading
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

TUTOR_MAX_LESSON = 200 * 1024  # characters
TUTOR_MAX_TURNS = 80
TUTOR_TIMEOUT = 240  # seconds per reply
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)  # pythonw: don't flash a console
TUTOR_PROMPT = """You are the Ask Claude tutor inside Learning Center, Ryan's self-study app for industrial \
automation (PLCs, SCADA, Ignition, networks, field devices). The lesson he has open is below. Lessons are \
dense; your job is to walk him through this one so it actually sticks.

How to teach:
- Split the lesson into about 5 to 8 small chunks that follow its sections. Teach one chunk per message.
- Each chunk: a short plain-language explanation, then one everyday analogy, then only the details that \
matter in practice. Skip low-value table rows and trivia; he can read those in the lesson.
- End every chunk with exactly one quick-check question that makes him apply the idea (a small scenario, \
a number to work out, a "what happens if"), not one he can answer by copying a sentence. Then stop and \
wait for his answer. Never answer your own question.
- If he's right, say so in a line, add one useful nuance if there is one, and move to the next chunk.
- If he's wrong or unsure, don't just give the answer. Show the mechanism or the math step by step, \
then ask a similar check question before moving on.
- Link back to earlier chunks when a new idea builds on them.
- After the last chunk, finish with a short troubleshooting scenario that ties the chunks together, \
and ask what he'd check first. After that, sum up in three bullets and suggest he try the lesson quiz.
- If he asks a side question, answer it briefly, then return to where you were.

Style: talk to him like a patient senior tech. Short paragraphs, plain words, define a term the first \
time you use it. Markdown is fine (bold, lists, small tables, `code`). Keep each message under about \
250 words. Stick to what the lesson says; if you add something from outside it, say so. Your first \
message: one sentence on what the lesson covers and how many chunks you'll take, then chunk 1."""


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


def tutor_transcript(messages):
    """Turn the chat so far into the CLI's single prompt (the CLI has no way to pass prior turns)."""
    if not messages:
        return "Start the walkthrough."
    lines = ["The conversation so far, oldest first:", ""]
    for m in messages:
        lines += ["%s: %s" % ("Tutor" if m["role"] == "assistant" else "Ryan", m["content"]), ""]
    lines.append("Write the tutor's next message only. Do not repeat earlier messages or prefix it with \"Tutor:\".")
    return "\n".join(lines)


def tutor_request(doc):
    """Validate a tutor request body. Returns (lesson_title, lesson_text, messages) or raises ValueError."""
    if not isinstance(doc, dict):
        raise ValueError("Body must be a JSON object.")
    lesson = doc.get("lesson")
    if not isinstance(lesson, dict) or not isinstance(lesson.get("text"), str) or not lesson["text"].strip():
        raise ValueError("lesson.text is required.")
    if len(lesson["text"]) > TUTOR_MAX_LESSON:
        raise ValueError("Lesson text is too long.")
    title = lesson.get("title") if isinstance(lesson.get("title"), str) else ""
    msgs = doc.get("messages", [])
    if not isinstance(msgs, list) or len(msgs) > TUTOR_MAX_TURNS:
        raise ValueError("messages must be a list of at most %d turns." % TUTOR_MAX_TURNS)
    for m in msgs:
        if not isinstance(m, dict) or m.get("role") not in ("user", "assistant") or not isinstance(m.get("content"), str):
            raise ValueError("Each message needs a role (user or assistant) and text content.")
    return title[:200], lesson["text"], msgs


def claude_cli():
    """Path to the Claude Code CLI, or None. Checks LC_CLAUDE, PATH, then the usual install spots."""
    found = os.environ.get("LC_CLAUDE") or shutil.which("claude")
    if found:
        return found
    home = os.path.expanduser("~")
    for p in (os.path.join(home, ".local", "bin", "claude.exe"), os.path.join(home, ".local", "bin", "claude"),
              os.path.join(os.environ.get("APPDATA", ""), "npm", "claude.cmd")):
        if os.path.isfile(p):
            return p
    return None


def ask_tutor(title, text, messages):
    """One tutor reply from `claude -p`: no tools, no saved session, run in an empty folder."""
    exe = claude_cli()
    if not exe:
        raise RuntimeError("Couldn't find the Claude Code CLI. Install it, or set LC_CLAUDE to its full path.")
    system = TUTOR_PROMPT + "\n\n<lesson title=\"" + title.replace('"', "'") + "\">\n" + text + "\n</lesson>"
    with tempfile.TemporaryDirectory(prefix="lc-tutor-") as work:
        sp = os.path.join(work, "system.md")
        with open(sp, "w", encoding="utf-8") as f:
            f.write(system)
        cmd = [exe, "-p", "--system-prompt-file", sp, "--model", "opus", "--effort", "medium",
               "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--output-format", "text"]
        try:
            r = subprocess.run(cmd, input=tutor_transcript(messages), capture_output=True, text=True,
                               encoding="utf-8", errors="replace", cwd=work, timeout=TUTOR_TIMEOUT,
                               creationflags=NO_WINDOW)
        except subprocess.TimeoutExpired:
            raise RuntimeError("Claude took longer than %d seconds. Try again." % TUTOR_TIMEOUT)
    reply = (r.stdout or "").strip()
    if r.returncode or not reply:
        detail = (r.stderr or r.stdout or "no output").strip().splitlines()
        raise RuntimeError("The Claude CLI failed: %s" % (detail[-1] if detail else "no output")[:300])
    return reply


class Server(ThreadingHTTPServer):
    # The default listen queue is 5. A phone's first load (through `tailscale serve`) opens dozens of
    # connections at once; on Windows the overflow is refused outright and a script never loads.
    request_queue_size = 128
    daemon_threads = True


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

    def read_json(self):
        """The request's JSON body, or None after sending an error response."""
        if not self.from_app() or not (self.headers.get("Content-Type") or "").startswith("application/json"):
            self.send_json(403, {"error": "Send JSON with the X-LC header."})
            return None
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self.send_json(400, {"error": "Body must be 1 byte to 5 MB of JSON."})
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "Body is not valid UTF-8 JSON."})
            return None

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
        client = self.read_json()
        if client is None:
            return
        if not isinstance(client, dict):
            return self.send_json(400, {"error": "Progress must be a JSON object."})
        try:
            with lock:
                merged = merge(sanitize(read_progress()), sanitize(client))
                write_progress(merged)
        except Exception as e:  # never drop the connection without an answer
            return self.send_json(500, {"error": "Could not merge progress: %s" % e})
        return self.send_json(200, merged)

    def do_POST(self):
        if urlsplit(self.path).path != "/api/tutor":
            return self.send_error(404)
        doc = self.read_json()
        if doc is None:
            return
        try:
            title, text, messages = tutor_request(doc)
        except ValueError as e:
            return self.send_json(400, {"error": str(e)})
        try:
            return self.send_json(200, {"reply": ask_tutor(title, text, messages)})
        except Exception as e:  # CLI missing, signed out, timed out: tell the app why
            return self.send_json(502, {"error": str(e)})

    def log_message(self, fmt, *args):
        if args and "/api/" in str(args[0]):
            super().log_message(fmt, *args)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--host", default="127.0.0.1", help="127.0.0.1 (default) or 0.0.0.0 for the whole LAN")
    ap.add_argument("--port", type=int, default=8080)
    a = ap.parse_args()
    srv = Server((a.host, a.port), Handler)
    print(f"Learning Center on http://localhost:{a.port}  (Ctrl+C to stop)")
    if a.host == "127.0.0.1":
        print(f"Phone access: run `tailscale serve --bg {a.port}` once, then open the URL it prints.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
