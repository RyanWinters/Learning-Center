LC.lesson({
  id: "dev-python",
  title: "Python for integrators outside Ignition",
  track: "dev",
  minutes: 30,
  level: 3,
  prereqs: ["dev-bash", "proto-modbus", "ign-scripting"],
  tags: ["python", "venv", "pymodbus", "rest", "pytest", "devops"],
  summary: "CPython 3 on a server is not Jython in the Designer: virtual environments, pinned packages, a Modbus client and server with pymodbus, a tiny REST service, and tests that prove your scaling math.",
  objectives: [
    "Explain how CPython 3 outside Ignition differs from Jython 2.7 inside it",
    "Create a virtual environment, install packages with pip and pin them in requirements.txt",
    "Read holding registers with a pymodbus client and describe what a pymodbus server needs",
    "Describe a minimal REST service and what separates a toy server from a production one",
    "Write pytest tests for pure functions such as raw-to-engineering-unit scaling"
  ],

  body: `
## Two Pythons

Inside Ignition you write {{term:ign-jython|Jython 2.7}}: Python 2 syntax on the Java virtual machine, with \`system.*\` functions and Java libraries, but no C-extension packages ({{lesson:ign-scripting}}). Outside Ignition, on a Linux server, in a container or on your laptop, you use {{term:cpython|CPython}} 3: the standard Python, with modern syntax and the whole package ecosystem.

| | Jython in Ignition | CPython 3 outside |
|---|---|---|
| Language version | 2.7 | 3.x (current releases) |
| Where it runs | Gateway, Designer, Vision client | Any OS, container, CI runner |
| Packages | Pure-Python 2.7 libs, Java libs | Anything on PyPI via pip |
| \`print\` | Statement: \`print x\` | Function: \`print(x)\` |
| Strings | Bytes by default | Unicode by default |
| Typical jobs | Tag events, bindings, Gateway scripts | Simulators, data movers, test tools, small services |

Integrators use CPython for the things around Ignition: a Modbus simulator for a skid that isn't built yet, a script that bulk-generates tag JSON, a small REST service that bridges a lab instrument, and the tests that run in CI.

## Virtual environments and pip

Never install project packages into the system Python with \`sudo pip\`. The operating system's own tools depend on that Python, and two projects needing different versions of a library will fight. A {{term:venv|virtual environment}} is a private folder with its own Python and its own packages, one per project.

\`\`\`text
python3 -m venv .venv                 # create (Windows: py -m venv .venv)
source .venv/bin/activate             # Linux/macOS (Windows: .venv\\Scripts\\activate)
python -m pip install pymodbus pytest
python -m pip freeze > requirements.txt
\`\`\`

{{term:pip}} installs packages from PyPI. \`pip freeze\` writes the exact installed versions to {{term:requirements-txt|requirements.txt}}; on another machine, in a container build or in CI, \`pip install -r requirements.txt\` recreates the same set. That is the Python version of pinning image tags in {{lesson:dev-compose}}. Commit \`requirements.txt\`; add \`.venv/\` to \`.gitignore\`.

Running \`python -m pip\` instead of plain \`pip\` guarantees you use the pip that belongs to the active interpreter, which avoids a whole class of "I installed it but Python can't find it" problems.

## Modbus with pymodbus

{{term:pymodbus|pymodbus}} is a widely used Python library that implements Modbus clients and servers over TCP, RTU and more. Everything from {{lesson:proto-modbus}} still applies, especially the off-by-one rule: pymodbus takes **zero-based offsets**, exactly what goes on the wire.

### A client

\`\`\`python
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("10.20.40.15", port=502)
client.connect()
rr = client.read_holding_registers(100, count=2, device_id=1)   # 40101-40102
if rr.isError():
    print("Modbus error:", rr)
else:
    print(rr.registers)
client.close()
\`\`\`

Offset 100 is register 40101 in manual notation. \`device_id\` is the unit ID; it matters behind serial gateways. The keyword for the unit ID has changed between pymodbus releases, so match the client documentation for the version in your \`requirements.txt\`.

Two registers come back as a list of 16-bit integers. Combining them into a float, with the right word order, is the same problem as in Ignition; pymodbus includes helpers for converting registers to and from 32-bit types.

### A server

A Modbus **server** (the device side) needs three things:

1. A **datastore**: blocks of coils, discrete inputs, input registers and holding registers with initial values.
2. A **device context** that groups those blocks under a unit ID.
3. A **server** bound to an address and port.

The pymodbus documentation includes complete example servers, including one that updates values from a background task. Bind it to \`0.0.0.0\` if anything outside the host or container must reach it, as in {{lesson:dev-linux-services}}. On Linux, ports below 1024, including 502, need extra privileges, which is why simulators often listen on a high port such as 5020 and let Docker or a firewall rule map 502 to it.

> [!tip] Simulator values should move
> A simulator that returns constants proves almost nothing. Make values ramp, add noise, and let some writable registers change state, so you can test trends, deadbands and alarms end to end.

## A minimal REST service

Ignition's {{lesson:arch-webdev}} serves REST endpoints from the Gateway. Sometimes the endpoint belongs outside Ignition: an instrument bridge, a lab stub of an ERP endpoint, a health endpoint for a container. The core of any {{term:rest-api|REST}} service is the same:

- A **route**: method plus path, such as \`GET /api/v1/lt101\`.
- A **handler** that does the work and returns a status code and a body, usually {{term:json|JSON}}.
- A **server** that listens on an address and port.

Python's standard library has \`http.server\`, enough to understand the mechanics:

\`\`\`python
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"tag": "LT101", "value": 3.42, "units": "m"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)
\`\`\`

The Python documentation states that \`http.server\` is not recommended for production: it only implements basic security checks. Real services use a web framework (Flask and FastAPI are common), run behind a proper application server, validate their input, log requests and require authentication.

## Testing with pytest

{{term:pytest}} finds files named \`test_*.py\`, runs functions named \`test_*\`, and uses plain \`assert\`. When an assertion fails it shows the values involved.

The trick that makes industrial code testable: **keep the math in pure functions**, separate from the I/O. Scaling is a perfect example, using the house teaching card for LT101 (raw 6242–31208 counts to 0–5.0 m):

\`\`\`python
def scale(raw, raw_lo=6242, raw_hi=31208, eu_lo=0.0, eu_hi=5.0):
    return eu_lo + (raw - raw_lo) * (eu_hi - eu_lo) / (raw_hi - raw_lo)

def test_4ma_is_zero():
    assert scale(6242) == 0.0

def test_20ma_is_full_scale():
    assert scale(31208) == 5.0

def test_midscale():
    assert abs(scale(18725) - 2.5) < 0.001
\`\`\`

Run \`python -m pytest\` and each test passes or fails with a clear message. {{term:unit-test|Unit tests}} like these run in milliseconds, need no PLC, and run in CI on every pull request ({{lesson:dev-ci}}). Tests that need a live Modbus server or database are integration tests; run them against a service container or the lab stack.

{{diagram:layers}}

\`pytest.raises\` checks that bad input raises the right error, and built-in fixtures such as \`tmp_path\` give each test a clean temporary folder. Remember the counts note from the house standard: these raw values are module-specific, so the test documents the card you're scaling for.
`,

  eli5: `
There are two kitchens. Ignition's kitchen has a special, older oven (Jython) that only takes certain pans. The kitchen outside Ignition has a modern oven (CPython 3) and access to a huge shop of ready-made tools (PyPI).

A virtual environment is giving each recipe its own lunchbox of tools, so the cake recipe's whisk doesn't get mixed up with the soup recipe's ladle. requirements.txt is the packing list taped to the lunchbox, so anyone can pack an identical one.

pymodbus lets your program play either part in the Modbus conversation: the one asking "what's in drawer 100?" or the cabinet answering.

A REST service is a little window where other programs can knock and ask a question, and get a neatly written answer back.

pytest is a taste-tester. You write down "when I put in this, I expect that", and the tester checks every one of those promises every time you change the recipe.
`,

  why: `
**Why not just use Ignition scripting for everything?** Many jobs don't belong on the Gateway: simulators for equipment that doesn't exist yet, tools that run in CI, services that must keep working when the Gateway is down for an upgrade. CPython also gets you libraries Jython can't load.

**Why virtual environments.** Without them, upgrading a library for one tool can break another, and the server's own tools can break too. A venv per project plus a pinned requirements file makes a tool reproducible on a colleague's laptop, in a container and in CI.

**Why separate math from I/O.** Code that reads a register, scales it and writes a tag in one function can only be tested with a PLC attached. Pull the scaling, deadband and state logic into pure functions and you can test every edge case, including NAMUR NE43 limits, in milliseconds. The I/O wrapper becomes too small to hide bugs.

**Why toy servers stay in the lab.** \`http.server\` and quick pymodbus servers are great for learning and simulation. Production services need authentication, input validation, logging, timeouts and supervision. Modbus servers have no authentication at all, so a simulator must never be reachable from the control network.

**What people argue about.** pip with requirements.txt versus newer project tools that manage environments and lock files automatically. Both solve the same problem; the important part is that the exact versions are recorded and committed. Another debate is how much to test. For integrator tools, test the logic that would hurt if it were wrong: scaling, unit conversions, state machines and parsing.
`,

  history: `
Python was created by Guido van Rossum. Python 3 deliberately broke compatibility with Python 2 to fix long-standing problems, most visibly text versus bytes and print as a function, and Python 2 is no longer supported. Jython implements the Python 2.7 language on the Java platform, which is why Ignition scripting remains on 2.7 syntax. The venv module became part of the standard library in Python 3, replacing the separate virtualenv tool for most uses. pytest grew out of the PyPy project's testing tools and became the most common Python test framework.
`,

  examples: [
    {
      title: "A skid simulator before the skid exists",
      body: `The OEM's Area20 case packer arrives in eight weeks, but its Modbus map is in the FDS. An engineer writes a pymodbus server that exposes the same holding registers with ramping values, runs it in a container on the lab network, and points an Ignition Modbus device at it. Screens, alarms and OEE logic are tested before FAT. When the real skid arrives only the device's IP changes.`
    },
    {
      title: "The test that caught a swapped range",
      body: `A colleague refactored the scaling helper and swapped \`raw_lo\` and \`raw_hi\` in one call. \`test_4ma_is_zero\` failed in CI with \`assert 5.0 == 0.0\`, before the change ever reached a Gateway.`
    }
  ],

  diagrams: {
    layers: `<svg viewBox="0 0 640 210" role="img" aria-label="Pure functions like scaling are unit tested in milliseconds; I/O wrappers that talk to Modbus or HTTP are integration tested against a simulator or service container">
  <defs><marker id="dev-python-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="30" width="170" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="105" y="56">Modbus read</text>
  <text class="dg-text-muted dg-mid" x="105" y="76">I/O wrapper</text>
  <rect class="dg-box-accent" x="235" y="30" width="170" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="56">scale(raw)</text>
  <text class="dg-text-muted dg-mid" x="320" y="76">pure function</text>
  <rect class="dg-box" x="450" y="30" width="170" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="535" y="56">REST / tag write</text>
  <text class="dg-text-muted dg-mid" x="535" y="76">I/O wrapper</text>
  <line class="dg-line" x1="190" y1="60" x2="233" y2="60" marker-end="url(#dev-python-ah)"/>
  <line class="dg-line" x1="405" y1="60" x2="448" y2="60" marker-end="url(#dev-python-ah)"/>
  <rect class="dg-box-ok" x="235" y="120" width="170" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="142">unit tests</text>
  <text class="dg-text-muted dg-mid" x="320" y="162">milliseconds, no PLC</text>
  <rect class="dg-box-warn" x="20" y="120" width="170" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="105" y="142">integration tests</text>
  <text class="dg-text-muted dg-mid" x="105" y="162">simulator or service</text>
  <rect class="dg-box-warn" x="450" y="120" width="170" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="535" y="142">integration tests</text>
  <text class="dg-text-muted dg-mid" x="535" y="162">stub endpoint</text>
  <line class="dg-line-thin dg-dash" x1="320" y1="90" x2="320" y2="120"/>
  <line class="dg-line-thin dg-dash" x1="105" y1="90" x2="105" y2="120"/>
  <line class="dg-line-thin dg-dash" x1="535" y1="90" x2="535" y2="120"/>
  <text class="dg-text-muted" x="20" y="200">Keep the logic in the middle box; keep the outer boxes thin.</text>
</svg>`
  },

  pitfalls: [
    "Installing packages with sudo pip into the system Python.",
    "Forgetting to activate the venv, so pip installs into one Python and you run another.",
    "Using 1-based register numbers with pymodbus, which expects zero-based offsets.",
    "Leaving a Modbus simulator reachable from the control network.",
    "Deploying http.server as a production service.",
    "Mixing math and I/O in one function, so nothing can be tested without hardware."
  ],

  keyTerms: ["cpython", "ign-jython", "venv", "pip", "requirements-txt", "pymodbus", "rest-api", "pytest", "unit-test"],

  quiz: [
    {
      q: "A device manual lists a value at holding register 40101. Which pymodbus call reads it?",
      options: ["read_holding_registers(40101, count=1)", "read_holding_registers(101, count=1)", "read_holding_registers(100, count=1)", "read_input_registers(100, count=1)"],
      answer: 2,
      explain: [
        "pymodbus takes the wire offset, not the manual's 4xxxx number.",
        "Close, but 40101 is offset 100 because offsets start at 0.",
        "Correct. Holding register table, zero-based offset 100.",
        "4xxxx means holding registers, not input registers."
      ]
    },
    {
      q: "Why create a virtual environment for a small simulator script on a Linux server?",
      options: ["Python won't run without one", "It makes the script run faster", "It's required by pymodbus", "It isolates the script's packages from the system Python and other projects, and makes them reproducible"],
      answer: 3,
      explain: [
        "Python runs fine without one; that's the trap.",
        "Speed is unchanged.",
        "pymodbus installs anywhere; isolation is about keeping projects apart.",
        "Correct. Isolation plus a pinned requirements.txt gives a reproducible setup."
      ]
    },
    {
      q: "Which piece of code is easiest to unit test without hardware?",
      options: ["A function that reads a register over Modbus TCP", "A function that converts raw counts to metres", "A function that writes a tag through a REST call", "The main loop that polls every second"],
      answer: 1,
      explain: [
        "It needs a server to talk to, which makes it an integration test.",
        "Correct. A pure function with numbers in and numbers out is ideal for unit tests.",
        "It needs a live endpoint or a stub.",
        "Loops with timing and I/O are the hardest to test."
      ]
    },
    {
      q: "What's the main reason not to run Python's http.server as a production service?",
      options: ["It can't return JSON", "It only works on Windows", "The Python documentation says it only implements basic security checks and isn't recommended for production", "It requires Jython"],
      answer: 2,
      explain: [
        "It can return any bytes you write, including JSON.",
        "It's cross-platform.",
        "Correct. Use a proper framework and application server for anything real.",
        "It's part of the CPython standard library."
      ]
    },
    {
      q: "A colleague's Jython script from the Designer fails under CPython 3 on the line print value. Why?",
      options: ["In Python 3, print is a function and needs parentheses", "CPython doesn't support printing", "The variable name is reserved", "CPython needs a venv to print"],
      answer: 0,
      explain: [
        "Correct. print(value). It's one of the visible Python 2 to 3 differences.",
        "It does, as a function.",
        "value isn't reserved.",
        "Environments have nothing to do with syntax."
      ]
    }
  ],

  resources: [
    { title: "Virtual Environments and Packages (Python tutorial)", url: "https://docs.python.org/3/tutorial/venv.html", type: "docs", source: "Python Software Foundation" },
    { title: "PyModbus client documentation", url: "https://pymodbus.readthedocs.io/en/latest/source/client.html", type: "docs", source: "PyModbus" },
    { title: "PyModbus examples", url: "https://pymodbus.readthedocs.io/en/latest/source/examples.html", type: "docs", source: "PyModbus" },
    { title: "http.server (Python standard library)", url: "https://docs.python.org/3/library/http.server.html", type: "docs", source: "Python Software Foundation" },
    { title: "Get Started (pytest)", url: "https://docs.pytest.org/en/stable/getting-started.html", type: "docs", source: "pytest" }
  ]
});
