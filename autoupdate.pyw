"""Run Learning Center and keep it up to date with GitHub (used by the Startup shortcut).

Starts server.py, then every few minutes fetches origin/main and fast-forwards the
local checkout. Lessons are read from disk, so new content shows on the next page
load. The server is restarted only when server.py itself changed, or if it exits.

It only pulls when the checkout is on main with no edits to tracked files, so local
work is never overwritten. Output goes to data/autoupdate.log (pythonw has no console).
"""
import os
import socket
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8080
EVERY = 300  # seconds between checks
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def log(msg):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), msg)


def git(*args):
    r = subprocess.run(["git"] + list(args), cwd=HERE, capture_output=True, text=True,
                       creationflags=NO_WINDOW)
    if r.returncode:
        raise RuntimeError("git %s: %s" % (" ".join(args), (r.stderr or r.stdout).strip()))
    return r.stdout.strip()


def port_busy():
    with socket.socket() as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", PORT)) == 0


def start_server():
    log("starting server.py")
    return subprocess.Popen([sys.executable, os.path.join(HERE, "server.py"), "--port", str(PORT)],
                            cwd=HERE, stdout=sys.stdout, stderr=sys.stderr, creationflags=NO_WINDOW)


def update():
    """Fast-forward to origin/main. Returns the changed file paths."""
    if git("rev-parse", "--abbrev-ref", "HEAD") != "main":
        return []
    git("fetch", "--quiet", "origin", "main")
    old, new = git("rev-parse", "HEAD"), git("rev-parse", "origin/main")
    if old == new:
        return []
    if git("status", "--porcelain", "--untracked-files=no"):
        log("local edits to tracked files; not updating")
        return []
    git("merge", "--ff-only", "--quiet", "origin/main")
    changed = git("diff", "--name-only", old, new).splitlines()
    log("updated %s -> %s (%d files)" % (old[:7], new[:7], len(changed)))
    return changed


def main():
    os.chdir(HERE)
    os.makedirs("data", exist_ok=True)
    sys.stdout = sys.stderr = open(os.path.join("data", "autoupdate.log"), "a", buffering=1, encoding="utf-8")
    # Another copy (or an old start_hidden.pyw server) already owns the port: let it be.
    proc = None if port_busy() else start_server()
    if proc is None:
        log("port %d already in use; updating files only" % PORT)
    while True:
        try:
            changed = update()
        except Exception as e:
            log("update failed: %s" % e)
            changed = []
        if proc and ("server.py" in changed or proc.poll() is not None):
            if proc.poll() is None:
                proc.terminate()
                proc.wait(10)
            proc = start_server()
        elif proc is None and not port_busy():
            proc = start_server()
        elif proc is None and "server.py" in changed:
            log("server.py changed but this copy doesn't own the server; restart it by hand")
        time.sleep(EVERY)


if __name__ == "__main__":
    main()
