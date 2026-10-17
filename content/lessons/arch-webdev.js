LC.lesson({
  id: "arch-webdev",
  title: "WebDev and REST APIs",
  track: "arch",
  minutes: 25,
  level: 3,
  prereqs: ["ign-scripting"],
  tags: ["webdev", "rest", "api", "json", "http", "integration"],
  summary: "Turn a gateway into a web server with the WebDev module, call other systems with system.net.httpClient, and know when to use the built-in configuration API instead.",
  objectives: [
    "Explain what the WebDev module adds to a gateway and how a Python resource maps to a URL",
    "Write a doGet and a doPost handler that return JSON",
    "Secure a WebDev endpoint and name the common ways it goes wrong",
    "Call an external REST API from a gateway script with system.net.httpClient",
    "Choose between a WebDev endpoint and the 8.3 gateway REST API for a given job"
  ],

  body: `
## What WebDev is

Most systems you integrate with, such as an ERP, a WMS, a quality app or a customer portal, speak {{term:rest-api|REST}} over HTTP and trade JSON. The **Web Dev module** lets an Ignition gateway be one of those systems. You write small scripts, mount them at URLs, and anything that can send an HTTP request can read tags, query the historian or push a work order into your project.

Without it, your only front door is Perspective or Vision. With it, the gateway also becomes a data service. This is the usual way a Level 3 or Level 4 system reaches Ignition, as you will see in {{lesson:mes-erp}}.

## Resources and URLs

WebDev adds a new project resource type. A **Python resource** is a script that runs whenever an HTTP request arrives at the URL where the resource is mounted. Each resource can implement one function per HTTP method:

| Function | HTTP method | Typical use |
|---|---|---|
| \`doGet\` | GET | Read data: a tag value, a list of open orders |
| \`doPost\` | POST | Create or trigger something: submit a batch result |
| \`doPut\` | PUT | Replace or update a record |
| \`doDelete\` | DELETE | Remove a record |

There are also \`doHead\`, \`doOptions\`, \`doTrace\` and \`doPatch\`. Most endpoints implement one or two.

Each handler receives a \`request\` dictionary. The parts you use most are \`params\` (URL query parameters), \`data\` (parsed body data), \`headers\`, \`remoteAddr\`, and, in \`doPost\`, \`postData\`. The \`servletRequest\` and \`servletResponse\` objects give raw access when the convenience keys are not enough.

The handler returns a dictionary describing the response. Keys include \`json\`, \`html\`, \`bytes\`, \`file\` and \`response\`, plus an optional \`contentType\`. Returning a dictionary with none of those keys produces an HTTP 500.

Resources live in your project, so they are versioned, copied and exported with it. The URL is built from the gateway address, the project name and the path of the resource you mounted. {{lesson:ign-scripting}} covers the Jython rules that apply here too: this is gateway-scope Python 2.7 syntax.

{{diagram:flow}}

## A small endpoint: tank level over REST

Say a maintenance system wants to read a tank level and send a request to start a transfer. Two resources do it.

\`\`\`python
# doGet for  /system/webdev/Plant/tank
def doGet(request, session):
    tank = request['params'].get('id', 'T101')
    path = '[default]Plant/Tanks/%s/Level' % tank
    qv = system.tag.readBlocking([path])[0]
    if not qv.quality.isGood():
        return {'json': {'error': 'bad quality', 'tank': tank},
                'response': {'status': 503}}
    return {'json': {'tank': tank, 'level': qv.value,
                     'units': 'pct', 'ts': str(qv.timestamp)}}
\`\`\`

A client calls \`GET .../tank?id=T102\` and gets \`{"tank": "T102", "level": 63.4, "units": "pct", "ts": "..."}\`.

\`\`\`python
# doPost for  /system/webdev/Plant/transfer
def doPost(request, session):
    body = request['postData']          # parsed JSON dict
    src, dst, qty = body.get('from'), body.get('to'), body.get('qty')
    if not (src and dst and isinstance(qty, (int, float))) or qty <= 0:
        return {'json': {'error': 'from, to and positive qty required'},
                'response': {'status': 400}}
    system.tag.writeBlocking(['[default]Plant/Transfer/Request'],
                             [{'from': src, 'to': dst, 'qty': qty}])
    return {'json': {'accepted': True}, 'response': {'status': 202}}
\`\`\`

Notice the shape: validate input first, return a clear status code, write one request tag and let the PLC sequence do the real work. Do not let a web call drive an output directly.

> [!warning] Content-Type matters
> The module fills \`postData\` only for certain content types, such as \`application/json\` or \`text/*\`. Clients that send \`application/json;charset=UTF-8\` have caused a \`KeyError\` for some users. If \`postData\` is missing, read the raw bytes from \`servletRequest\` and parse them yourself.

## Security

A WebDev endpoint is a network door into your control system. Treat it like one.

- **Authentication**: a resource can require authentication so the gateway checks the caller against a user source before your script runs. Use it. An unauthenticated endpoint that writes a tag is an open write path to the plant.
- **Authorization**: inside the script, check roles. A caller who may read levels should not be able to post transfers.
- **TLS**: only expose it over HTTPS. Credentials in headers are plain text on HTTP.
- **Input validation**: the body is untrusted. Check types and ranges. Never build SQL by joining strings from the request. Use named queries or prepared parameters ({{lesson:net-security}} covers the network side).
- **Placement**: do not expose the control gateway to the internet. Put a reverse proxy or API gateway in the DMZ, or run a separate gateway for external access.
- **CORS**: browsers block calls from another origin unless the response carries the right \`Access-Control-Allow-Origin\` header. Add it deliberately, to named origins, not \`*\` for everything.

## Calling out: system.net.httpClient

The other direction is Ignition as a client. In 8.3, \`system.net.httpClient\` can be called directly, and it also acts as the factory that creates clients with custom settings. It has blocking verbs (\`get\`, \`post\`, \`put\`, \`delete\`), async versions such as \`getAsync\`, and a generic \`request\` for unusual verbs.

\`\`\`python
def getWeather():
    resp = system.net.httpClient().get(
        'https://api.example.com/v1/forecast',
        params={'site': 'plant1'},
        headers={'Authorization': 'Bearer ' + system.secrets.readSecretValue('Weather', 'token')}
    )
    if resp.good:
        return resp.json
    system.util.getLogger('Weather').warn('HTTP %d' % resp.statusCode)
    return None
\`\`\`

Rules that save grief:

1. **Never call it on a GUI or UI-bound thread path that blocks.** Run it from a gateway timer, a message handler or a tag change script, with a timeout.
2. **Reuse a client** when you make many calls. Creating one per call is expensive. Use a project library function and cache it.
3. **Check the status code and handle failure.** Networks fail. Log, back off, and do not retry in a tight loop.
4. **Keep secrets out of scripts.** Use the gateway's secrets management for tokens instead of hard-coding them.

> [!note] In 8.1
> In 8.1 you created a client with \`system.net.httpClient()\` and kept it in a variable, and the older \`system.net.httpGet\` / \`httpPost\` calls were the common approach. In 8.3 the httpClient function is also usable directly as an instance.

## The built-in gateway REST API versus WebDev

8.3 ships a gateway HTTP API of its own, documented on the gateway itself. The interactive page is at \`/openapi\` and the raw specification at \`/openapi.json\`. It is protected by **API keys**, created in the Gateway under Platform, Security, API Keys. Callers send the key in an \`X-Ignition-API-Token\` header. The routes cover gateway configuration, projects and tags, for example configuration resources under \`/data/api/v1/resources\`.

| | Built-in gateway API | WebDev endpoint |
|---|---|---|
| Purpose | Administer and configure Ignition | Serve your own data and actions |
| You write code | No, the routes are fixed | Yes, you define the shape |
| Typical caller | CI pipeline, provisioning script | ERP, MES, web app, partner |
| Auth | API key with broad access | Your choice, per resource |
| Example | Create a database connection from a deploy script | \`GET /orders/open\` returning JSON |

An API key grants broad access to the API routes, including changing configuration, so guard it like an admin password. Use the built-in API to automate the gateway ({{lesson:arch-containers}}) and WebDev to expose business data. Do not hand an external partner an API key when a narrow WebDev endpoint would do.

## When REST is the wrong tool

REST is request/response. If a system needs to be told the instant something happens, polling your endpoint every second is wasteful and slow. Push events instead, with {{lesson:arch-event-streams}} or MQTT ({{lesson:proto-mqtt}}). Use WebDev for on-demand questions and commands.
`,

  eli5: `
Think of the gateway as a shop with a front counter. Normally only people who walk in (operators with screens) can ask for anything. WebDev cuts a serving window in the wall and hangs a menu beside it.

Someone outside the shop can now lean up to the window and say "What's the level in tank 2?" The clerk behind the counter looks it up and hands back a slip of paper with the answer written in a very tidy format. That tidy format is called JSON, and the window rules (which kinds of requests you can make) are called HTTP.

The clerk should ask who you are before answering anything that matters, and should refuse nonsense orders like "pour minus five liters."

Going the other direction, when the shop needs something from another shop, the clerk phones them up and asks the same way. That is httpClient.

The shop also has a staff-only door, with its own key, for the people who run the shop itself. That is the built-in configuration API. You do not give customers that key.
`,

  why: `
**Why scripts at URLs instead of a ready-made data API?** Every plant's data is shaped differently. A work-order system wants "this lot produced 480 units on this line", not a tag path. WebDev lets you translate between the plant's tag model and the other system's vocabulary in one place, so neither side has to learn the other's structure. The tradeoff is that you own the contract. Version your URLs (\`/v1/orders\`), because a changed field name breaks someone you may never meet.

**Why write requests, not outputs?** A POST that flips a valve directly puts an internet-shaped failure mode, like a retry storm or a malformed body, next to physical equipment. Writing a request tag that the PLC validates and sequences keeps the interlocks where they belong. Integrators argue about how much logic belongs in the endpoint. The safe rule is that the endpoint validates and records, and the controller decides.

**Why a separate gateway for outside callers?** Putting WebDev on the control gateway is fast to build and simple to run. It also means a flood of external requests competes for the same threads as your tag engine and screens. Many sites run a front-end gateway in the DMZ that holds the WebDev endpoints and reaches the control gateway over the gateway network or a narrow API. It costs a license and some complexity. It buys isolation.

**Why API keys for deployment, not for apps?** The built-in API's keys are broad. That suits a pipeline that must create connections and projects. It is wrong for a mobile app that only needs to read three values.
`,

  history: `
Before WebDev, getting data out of Ignition for other systems meant a database in the middle or a custom OPC client. The Web Dev module is an add-on that lets integrators publish their own endpoints. Ignition 8.3 added a documented, key-protected gateway API for configuration as part of its move to file-based projects and resources, which is what made scripted deployments practical.
`,

  examples: [
    {
      title: "ERP pulls yesterday's production counts",
      body: `The ERP team wants totals per line. You mount a \`doGet\` at \`/system/webdev/Plant/production\` that accepts \`?date=2026-10-16\`, runs a named query against the production table and returns \`[{"line":"L1","good":4820,"scrap":31}, ...]\`. The ERP calls it nightly with a service account over HTTPS. If the date is missing or malformed the script returns 400 with a message, so their integration fails loudly instead of loading zeros.`
    },
    {
      title: "Posting a quality alert to a team chat",
      body: `A gateway tag change script fires when \`Line1/QualityFault\` goes true. It builds a small JSON payload and calls \`system.net.httpClient().post(url, data=json.dumps(payload), headers={'Content-Type':'application/json'})\`. A 200 means done. Anything else is logged with the status code, and the script does not retry more than three times, so a dead chat service cannot pile up threads.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 220" role="img" aria-label="An external client sends an HTTP request to a WebDev Python resource on the gateway, which reads tags or a database and returns JSON; the gateway can also call out to an external API with httpClient">
  <defs>
    <marker id="arch-webdev-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="30" width="140" height="70" rx="6"/>
  <text class="dg-text dg-mid" x="90" y="60">Client</text>
  <text class="dg-text-sm dg-mid" x="90" y="82">ERP / app / script</text>
  <rect class="dg-box-accent" x="250" y="20" width="200" height="110" rx="6"/>
  <text class="dg-title dg-mid" x="350" y="44">Ignition gateway</text>
  <text class="dg-text-sm dg-mid" x="350" y="68">WebDev resource</text>
  <text class="dg-text-mono dg-mid" x="350" y="90">doGet / doPost</text>
  <text class="dg-text-sm dg-mid" x="350" y="114">auth, validate, respond</text>
  <rect class="dg-box" x="520" y="20" width="100" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="570" y="50">Tags</text>
  <rect class="dg-box" x="520" y="80" width="100" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="570" y="110">Database</text>
  <line class="dg-line" x1="160" y1="55" x2="248" y2="55" marker-end="url(#arch-webdev-ah)"/>
  <text class="dg-text-sm dg-mid" x="204" y="46">HTTPS</text>
  <line class="dg-line" x1="450" y1="45" x2="518" y2="45" marker-end="url(#arch-webdev-ah)"/>
  <line class="dg-line" x1="450" y1="105" x2="518" y2="105" marker-end="url(#arch-webdev-ah)"/>
  <line class="dg-line" x1="248" y1="85" x2="162" y2="85" marker-end="url(#arch-webdev-ah)"/>
  <text class="dg-text-sm dg-mid" x="204" y="104">JSON</text>
  <rect class="dg-box" x="250" y="160" width="200" height="46" rx="6"/>
  <text class="dg-text-sm dg-mid" x="350" y="188">External REST API</text>
  <line class="dg-line" x1="350" y1="132" x2="350" y2="158" marker-end="url(#arch-webdev-ah)"/>
  <text class="dg-text-sm" x="360" y="150">httpClient</text>
</svg>`
  },

  pitfalls: [
    "Leaving a WebDev resource unauthenticated while it writes tags. That is an open write path to the plant.",
    "Assuming postData is always populated. Odd Content-Type headers can leave it empty.",
    "Returning a dictionary with none of json, html, bytes, file or response, which produces a 500.",
    "Running a blocking httpClient call with no timeout on a thread that screens or tags depend on.",
    "Handing out a gateway API key to an app that only needs three values. Keys grant broad access.",
    "Changing a JSON field name without versioning the URL, which breaks every consumer silently."
  ],

  keyTerms: ["rest-api", "json", "http-methods", "webdev", "api-token", "polling", "firewall"],

  quiz: [
    {
      q: "An ERP system must read yesterday's production totals from Ignition. Which approach is the best fit?",
      options: ["A WebDev doGet resource that queries the database and returns JSON", "Give the ERP an admin API key for the built-in gateway API", "Have the ERP poll the Perspective session for the numbers", "Write a doPost that the ERP calls with no authentication"],
      answer: 0,
      explain: [
        "Correct. You define a narrow, read-only contract in your own vocabulary and can secure it per resource.",
        "The built-in API is for administering the gateway. Its keys are broad and would give far more access than the ERP needs.",
        "Perspective sessions are a user interface, not a data service.",
        "A POST is the wrong verb for reading, and no authentication leaves the endpoint open to anyone who can reach it."
      ]
    },
    {
      q: "A client sends a POST with Content-Type 'application/json;charset=UTF-8' and your doPost throws a KeyError on request['postData']. What is the most likely cause and fix?",
      options: ["The tag path is wrong; correct it", "postData was not populated for that content type; read and parse the raw body from servletRequest", "doPost cannot receive JSON; switch to doGet", "The gateway needs a restart after each script edit"],
      answer: 1,
      explain: [
        "A bad tag path would give bad quality on a read, not a missing key in the request dictionary.",
        "Correct. The module fills postData only for certain content types, so reading the raw bytes is the fallback.",
        "doPost is the normal handler for JSON bodies. GET has no body.",
        "Project resources are saved and live without a gateway restart."
      ]
    },
    {
      q: "Your doPost receives 'open valve V12' from a partner app. What is the safest design?",
      options: ["Write directly to the valve output tag so it responds instantly", "Validate the request, check the caller's role, then write a request tag that the PLC sequence validates and acts on", "Skip validation because the partner is trusted", "Return 200 and ignore the request until an operator approves it"],
      answer: 1,
      explain: [
        "That puts network failure modes, such as retries and malformed bodies, directly on physical equipment and bypasses interlocks.",
        "Correct. The endpoint validates and records. The controller owns permissives and interlocks.",
        "Trusted partners still send bad data, and their credentials can be stolen.",
        "Returning success while doing nothing misleads the caller. A clear status code is better."
      ]
    },
    {
      q: "A deployment pipeline must create a database connection on a new gateway automatically. Which tool fits?",
      options: ["A WebDev doPost resource written for the job", "system.net.httpClient on the gateway being configured", "The built-in gateway REST API with an API key sent in X-Ignition-API-Token", "A Perspective button an engineer clicks"],
      answer: 2,
      explain: [
        "You would have to write and secure custom code for something the platform already exposes.",
        "httpClient makes outbound calls from a gateway. It does not configure another one by itself.",
        "Correct. The built-in API exists for configuration and provisioning, and API keys suit unattended callers.",
        "That is manual and not repeatable."
      ]
    },
    {
      q: "A downstream system needs to know within a second whenever a machine faults. Why is a WebDev doGet that it polls a weak choice?",
      options: ["WebDev cannot return JSON", "Polling wastes requests and still adds up to a poll interval of delay; a push mechanism such as event streams or MQTT fits better", "doGet is limited to one call per hour", "HTTP is not allowed on gateways"],
      answer: 1,
      explain: [
        "WebDev returns JSON easily. That is its main use.",
        "Correct. REST is request/response. For event notification, push the event when it happens.",
        "There is no such limit. The issue is design, not a cap.",
        "Gateways serve and call HTTP routinely."
      ]
    }
  ],

  resources: [
    { title: "Web Dev module (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/web-dev", type: "docs", source: "Inductive Automation" },
    { title: "Building a Simple Web Server (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/web-dev/simple-web-server", type: "docs", source: "Inductive Automation" },
    { title: "system.net.httpClient (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-net/system-net-httpClient", type: "docs", source: "Inductive Automation" },
    { title: "API Documentation (Ignition 8.3 gateway OpenAPI)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/gateway/openapi", type: "docs", source: "Inductive Automation" },
    { title: "API Keys (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/security/api-keys", type: "docs", source: "Inductive Automation" },
    { title: "Web Dev Module - doPost", url: "https://forum.inductiveautomation.com/t/web-dev-module-dopost/37477", type: "forum", source: "Inductive Automation Forum" },
    { title: "How to enable the CORS on the web dev module", url: "https://forum.inductiveautomation.com/t/how-to-enable-the-cors-on-the-web-dev-module/74669", type: "forum", source: "Inductive Automation Forum" }
  ]
});
