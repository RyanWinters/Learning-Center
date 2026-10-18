LC.lesson({
  id: "persp-mobile",
  title: "Perspective on mobile and workstation",
  track: "persp",
  minutes: 20,
  level: 2,
  prereqs: ["persp-navigation"],
  tags: ["perspective", "mobile", "workstation", "kiosk", "barcode", "nfc", "touch", "vpn"],
  summary: "The same Perspective project can run in a browser, a phone app or a locked-down plant PC. Each client gets different powers and different risks.",
  objectives: [
    "Say which Perspective features exist only in the native app and which only in Workstation",
    "Wire a barcode scan or NFC read into a session event script",
    "Choose between Workstation kiosk mode, a browser and the mobile app for a given station",
    "Design a view that works with gloves, one hand and a bad signal",
    "Describe how to expose a Gateway to phones without opening it to the internet"
  ],

  body: `
## Three ways to open the same project

A Perspective project is a set of views that live on the Gateway. A **session** is one running copy of that project for one client. The client can be a desktop browser, the **Ignition Perspective app** on a phone or tablet, or **Perspective Workstation** on a plant PC. All three speak to the same project, but they are not equal. The app can reach the phone's camera and sensors. Workstation can lock a PC into a full-screen kiosk and span several monitors. A plain browser can do neither, so scripts that depend on those features are quietly ignored there.

| Client | Runs on | Strong at | Cannot do |
|---|---|---|---|
| Browser | Any modern browser | Zero install, easy to share a URL | Camera scan, NFC, accelerometer, kiosk lock |
| {{term:perspective-mobile-app|Perspective app}} | iOS and Android | Barcode, NFC, accelerometer, location, push-style workflows | Anything offline |
| {{term:ign-launcher|Perspective Workstation}} | Windows, macOS, Linux PCs | {{term:kiosk-mode|Kiosk mode}}, one window per monitor, no browser chrome | Device sensors |

> [!note] One project, three clients
> You do not build a separate mobile project. You build views that adapt (see {{lesson:persp-containers}}) and add device-aware behavior in event scripts. Check the client first, then branch.

## Device features in the app

The native app exposes hardware as **component actions** and **session events**. An action tells the phone to do something. The result comes back to the Gateway as a session event, and your script handles it.

- **Scan Barcode.** A button or other component runs the action. The phone opens the camera, the user scans one code, and the value is sent to the Gateway. The *Barcode Scanned* session event fires with the text, and in newer app versions with the barcode type too. The first use asks the user for camera permission.
- **Scan NDEF NFC.** The same pattern for NFC tags. The *NFC Ndef Scanned* event delivers the payload.
- **Accelerometer.** An action starts it in one of three modes: continuous (updates a session property as fast as it can), batch (records for a set time, then sends the lot to the *Accelerometer Data Received* event) or off. Use batch for something like detecting a vibration signature on a pump skid. Continuous will flood the Gateway if you leave it running.
- **Location.** The app can report where the device is. Use it to prove that a technician is standing at the asset, or to filter a work list to the nearest equipment. Check the current manual for the exact session property names before you build on them.

> [!example] Scan a motor tag, open its faceplate
> A maintenance tech scans a QR code on a motor nameplate. The code contains the string \`[default]Plant1/Area10/Line1/M101\`. The barcode event script does this:
>
> \`\`\`python
> def onBarcodeScanned(self, session, event):
>     path = event.value          # the scanned text
>     system.perspective.openPopup(
>         'motor-' + path,
>         'Library/Faceplates/Motor',
>         params={'tagPath': path},
>         title=path.split('/')[-1],
>         modal=False)
> \`\`\`
> One scan, no typing, no navigation tree. Validate the string before you use it: a barcode is user input. Check it starts with a known provider and exists as a tag, or someone will open a faceplate on a path you did not intend. The handler signature shown is illustrative. Confirm it on the session events page of the manual for your version.

Because these actions only exist in the app, guard them. In a browser the action is ignored, so give browser users a manual path (a text field to type the tag name) or the screen looks broken.

## Workstation for the plant floor

Perspective Workstation is a launcher-style desktop application that shows Perspective without a browser. Operators cannot wander to other tabs, and the PC looks like a dedicated HMI.

- **Windowed and Kiosk.** Launch mode is a setting you can override at launch. Kiosk is full screen with OS access limited. A component action, and the Workstation-related functions listed under \`system.perspective\` in the manual (check the names for your version), can switch a running session between the two, which is how you build an "Exit kiosk" button for a maintenance login.
- **Multiple monitors.** One Workstation application opens one OS window per display. You assign a Perspective page to each display and pick a primary display for login prompts. A control room with four screens runs one Workstation and four pages, each with its own URL path in the project.
- **Automated startup.** Export the launcher configuration and launch from a startup script or shortcut so a rebooted PC returns to the right pages without anyone touching it.
- **Limits.** Test your identity provider login in Workstation before commissioning, and check the manual for the launcher versions your Gateway version supports.

{{diagram:clients}}

## Designing for touch, gloves and noise

A mouse-sized control is wrong on a wet tank farm. Rules that survive a site walkdown:

1. **Target size.** Size tap targets to your site's glove and device spec, with space between them. Platform design guidelines publish minimum touch sizes, so cite the one you adopt in your style guide. Gloves need more.
2. **No hover, no right-click.** Touch has no hover state. Every action must work from a plain tap.
3. **Confirm the dangerous, not the routine.** A confirm popup for every setpoint teaches people to tap through. Use it for starts, stops and mode changes.
4. **One hand.** Put the main actions in the lower third of a phone screen, where a thumb reaches.
5. **Glare and gloves.** High-contrast colors from your {{term:isa-101|ISA-101}} style work (see {{lesson:persp-hphmi}}) hold up outdoors. Pale gray on white does not.
6. **Orientation.** Use breakpoints so a portrait phone gets a single column and a landscape tablet gets two.

## Offline is not supported

Perspective is thin client. All logic, bindings and scripts run on the Gateway and the client only draws. If the phone loses signal, the session cannot work. The app reconnects when the signal returns, but nothing you tap while disconnected is queued. Design for that:

- Never rely on the phone to hold a half-finished work order. Write data to the Gateway at each step.
- Show connection state, so a user can tell a stalled screen from a slow process.
- For dead zones (basements, metal buildings) fix coverage with access points, or accept that the area needs paper or a hardened tablet on a wired drop.

## Security: reaching the Gateway from a phone

The worst design is a Gateway port forwarded to the internet. The Gateway then carries login pages, designer access and every vulnerability that ships with them. The second worst is any path that lands on the Gateway (VLAN 30, 10.20.30.10) directly from outside, because it skips the DMZ. Plant 1 rules apply to phones as to any other client: no connection passes straight from Level 3 to Level 4 or back, and every connection ends in the DMZ.

> [!warning] A phone path is a Purdue level jump
> A phone that can reach the Gateway can reach the plant. Limit it by role, log it, and keep Designer access off the mobile path entirely. Never route a vendor or mobile VPN straight into VLAN 10 or VLAN 30.

The default design, in order:

1. **Reverse proxy in the DMZ with TLS and an identity provider.** The phone reaches the DMZ reverse proxy (\`10.20.250.10\`) over HTTPS (8043 in the examples). The proxy forwards to the front-end Gateway or the site Gateway over the Gateway Network, with the site side making the outgoing connection. Roles come from the IdP. See {{lesson:net-security}}.
2. **Remote (off-site) phones** first join a VPN that terminates in the DMZ, then use the same proxy. The VPN grants access to the proxy only.
3. **Device hygiene.** Use per-user roles, require a screen lock, and revoke a lost phone in the VPN and in the IdP.

A {{term:mesh-vpn|mesh VPN}} (a WireGuard-based overlay such as Tailscale) is **not** the default. It is a documented, site-approved exception. If security approves one, the overlay endpoint (a subnet router or the node that publishes the proxy) sits in the DMZ and publishes only the reverse proxy's HTTPS port, never the Gateway or a control-network subnet. Write the access rules down like firewall rules: which device group, which destination, which port, who approves enrollment, and who revokes it.

## If you already build Perspective

The lesson so far is a checklist. These are the decisions that make a mobile and kiosk estate operable.

### Identity provider choice and role mapping

Pick the IdP before building screens, because roles drive navigation and writes. Options are the Gateway's internal user source, an external directory (LDAP or Active Directory), or a SAML or OpenID Connect provider. For phones outside the plant, an external IdP with multi-factor authentication behind the DMZ proxy is the usual pattern. Decide how directory groups map to Ignition roles (\`Operator\`, \`Maintenance\`, \`Engineer\`), then drive page visibility and write permission from those roles, as in {{lesson:persp-navigation}}. A phone should usually get a reduced role set: view, acknowledge, scan and fill checklists, with no setpoint writes. Check your Ignition version's security zone and IdP pages for the exact configuration.

### Kiosk recovery

A kiosk is a session that must come back unattended. Test these cases and write down the observed behaviour:

1. Gateway restart while the kiosk is open.
2. Network drop of a minute, then return.
3. Session timeout (check the setting for your version).
4. Monitor power cycle.
5. Login prompt after recovery: does it appear on the primary display, and can an operator reach it without a keyboard?

The kiosk start URL must rebuild state from the URL and tags only, not from session props. Combine with a watchdog (a Gateway tag the kiosk writes, an alarm if stale) so the control room learns a wall display froze.

### Device enrollment and revocation as a procedure

Write it as a runbook, not a habit:

| Step | Owner | Record |
|---|---|---|
| Request with business reason and role | Supervisor | Ticket |
| Approve and assign IdP group | Controls lead | Group membership |
| Enroll device, set screen lock, install app | IT | Device ID in register |
| Test: login, scan, one write attempt that must be refused | Integrator | Test note |
| Quarterly review of active devices | Controls lead | Signed list |
| Revoke on loss or departure, within a time your policy sets | IT | Ticket, IdP and VPN both |

Revocation must happen in both the VPN and the IdP. Test it by revoking a test phone and confirming it can no longer load the login page.

### Scan workflows as data entry

Treat a scan as untrusted input, and keep an audit trail. Validate against a known list (a query or tag browse) rather than a string prefix test. Log user, device, scanned value and result. For work-order or checklist scans, write each step to the Gateway at once so a dropped connection loses at most one step.

### Performance on cellular

Every property change is a message from the Gateway to the phone. Keep mobile views small: no 300-tile repeaters, no high-rate charts. Bind to summary tags, and page long lists. Measure a session with the browser or app network tools on the same link your crew uses.

`,

  eli5: `
Think of the Gateway as a big kitchen. The cooks, the recipes and all the work are in the kitchen. A Perspective session is a waiter carrying a tray to one table.

A waiter at a restaurant table (a browser) can show the plate and take your order. A waiter with a special headset (the phone app) can also scan the bar code on your wine bottle, notice if the table wobbles, and know which room he is standing in. A waiter at a locked-in kiosk (Workstation) never leaves one spot and can serve four tables with four trays at once.

But the waiter never cooks. If he walks out of range of the kitchen, he just stands there. Nothing he said gets remembered until he gets back. So you never put important work on the tray. You make sure the kitchen hears every step as it happens.

And you do not leave the kitchen's back door open to the street. You give staff a guarded front desk that checks who they are.
`,

  why: `
**Why is the logic on the Gateway and not the device?** A thin client means one place to secure, patch and audit. It also means no offline mode. Vision clients and the old fat-client model could hold more state locally. Perspective trades that away for zero installs and one source of truth. Integrators argue about whether field crews really need offline. If yours do (remote pipeline, mine, ship), a mobile Perspective screen is the wrong tool for that part and you need a store-and-forward app.

**Why guard device features instead of assuming the app?** Users will open the same link in a browser, and the scan action will do nothing. A silent failure on a safety-related checklist is worse than an error. Branch on the client type and give a fallback.

**Why kiosk mode instead of a locked-down browser?** Browser kiosk modes work, but the user can still reach the address bar, shortcuts and crash dialogs. Workstation closes more of those doors and gives you multi-monitor handling and scripted switching. It also makes patching a managed install rather than a browser policy.

**Why a DMZ proxy instead of port forwarding or a mesh straight to the Gateway?** Every exposed port is attack surface, scanned within hours. A DMZ reverse proxy with an identity provider gives one inspected entry point, and the Gateway needs no inbound exposure from outside. A mesh VPN shrinks the audience to enrolled devices, but if it lands on the Gateway it skips the DMZ. The tradeoff of any enrolled-device scheme is operational: you own enrollment and revocation, and a stolen enrolled phone is a key to the plant.

**Why bigger touch targets than your designer wants?** Because the screen is used in gloves, with wet hands, in a vehicle. A mis-tap on a valve is an incident. Safe UI is slightly ugly.
`,

  history: `
Perspective arrived with Ignition 8.0 as the web-native successor to the Java-based Vision client. The mobile app and Workstation followed because plants wanted the same project on phones and on dedicated panels without a browser. The native app exists mainly because browsers cannot reliably expose cameras, NFC and motion sensors to every web page.
`,

  examples: [
    {
      title: "A four-monitor control room",
      body: `One Windows PC runs Workstation in Kiosk mode with four displays. In the launcher's page configuration, display 1 maps to \`/overview\`, display 2 to \`/boiler\`, display 3 to \`/alarms\` and display 4 to \`/trends\`. Display 1 is primary, so login prompts appear there. The PC's startup shortcut launches Workstation with the exported configuration, so a power cycle lands operators back on the same four pages.`
    },
    {
      title: "Lockout checklist with NFC",
      body: `Each lockout point has an NFC sticker holding its ID, for example \`LOTO-114\`. The technician taps Scan NFC on the checklist view. The NFC event script checks that the ID is next in the procedure, marks the step done in a database table through a named query, and refreshes the view. If they tap the wrong point, the script shows a message and writes nothing. The audit log now proves the person was physically at each point, in order.`
    }
  ],

  diagrams: {
    clients: `<svg viewBox="0 0 640 260" role="img" aria-label="Three Perspective clients connect to one gateway; only the app has device sensors and only Workstation has kiosk and multi-monitor">
  <defs><marker id="persp-mobile-ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-box" x="20" y="30" width="170" height="64" rx="6"/>
  <text class="dg-text dg-mid" x="105" y="56">Browser</text>
  <text class="dg-text-sm dg-mid" x="105" y="78">URL, no install</text>
  <rect class="dg-box-accent" x="20" y="108" width="170" height="64" rx="6"/>
  <text class="dg-text dg-mid" x="105" y="134">Perspective app</text>
  <text class="dg-text-sm dg-mid" x="105" y="156">camera, NFC, motion</text>
  <rect class="dg-box" x="20" y="186" width="170" height="64" rx="6"/>
  <text class="dg-text dg-mid" x="105" y="212">Workstation</text>
  <text class="dg-text-sm dg-mid" x="105" y="234">kiosk, multi-monitor</text>
  <rect class="dg-box-2" x="250" y="95" width="130" height="80" rx="6"/>
  <text class="dg-title dg-mid" x="315" y="128">Overlay / TLS</text>
  <text class="dg-text-sm dg-mid" x="315" y="150">DMZ proxy</text>
  <rect class="dg-box-accent" x="450" y="60" width="170" height="150" rx="6"/>
  <text class="dg-title dg-mid" x="535" y="92">Gateway</text>
  <text class="dg-text-sm dg-mid" x="535" y="120">bindings</text>
  <text class="dg-text-sm dg-mid" x="535" y="140">scripts</text>
  <text class="dg-text-sm dg-mid" x="535" y="160">session events</text>
  <text class="dg-text-sm dg-mid" x="535" y="180">tags, history</text>
  <line class="dg-line" x1="190" y1="62" x2="250" y2="125" marker-end="url(#persp-mobile-ah)"/>
  <line class="dg-line" x1="190" y1="140" x2="248" y2="135" marker-end="url(#persp-mobile-ah)"/>
  <line class="dg-line" x1="190" y1="218" x2="250" y2="150" marker-end="url(#persp-mobile-ah)"/>
  <line class="dg-line" x1="380" y1="135" x2="448" y2="135" marker-end="url(#persp-mobile-ah)"/>
  <text class="dg-text-muted" x="250" y="30">Nothing runs offline</text>
</svg>`
  },

  pitfalls: [
    "Forwarding the Gateway port to the internet so phones can connect, or running a mesh VPN straight onto the Gateway. Use a DMZ reverse proxy with an identity provider.",
    "Building scan-only workflows with no browser fallback. The action is ignored outside the native app.",
    "Trusting scanned text. A barcode or NFC tag is user input and must be validated before it becomes a tag path or a query parameter.",
    "Leaving the accelerometer in continuous mode and flooding the Gateway with samples.",
    "Tiny controls, hover-only tooltips and right-click menus on touch screens.",
    "Expecting the phone to queue work while offline. It cannot."
  ],

  keyTerms: ["perspective-mobile-app", "ign-launcher", "kiosk-mode", "nfc-ndef", "mesh-vpn", "isa-101", "perspective-session"],

  quiz: [
    {
      q: "A technician opens your scan-and-open-faceplate view in a desktop browser and taps the Scan Barcode button. What happens?",
      options: ["The action is ignored because it only works in the native app", "The browser asks for webcam access and scans", "The Gateway throws a license error", "The session is converted to a mobile session"],
      answer: 0,
      explain: [
        "Correct. The action is ignored in a browser, so you need a manual fallback such as a text field.",
        "The scan action is built for the native app. Browser sessions do not get it.",
        "Nothing about licensing changes. The action just does nothing outside the app.",
        "Sessions do not change type. The client type stays what it was."
      ]
    },
    {
      q: "A control room needs four monitors, each showing a different page, and operators must not reach the OS desktop. Which client fits?",
      options: ["Four browser windows in full screen", "The Perspective mobile app on a tablet", "Four Vision clients", "Perspective Workstation in kiosk mode with a page assigned to each display"],
      answer: 3,
      explain: [
        "Full-screen browsers still expose shortcuts and the address bar, and need manual placement after a reboot.",
        "The app is for phones and tablets and has no multi-monitor model.",
        "Vision is a different module. The question is about Perspective.",
        "Correct. Workstation maps pages to displays and kiosk mode limits OS access."
      ]
    },
    {
      q: "A phone loses signal for 30 seconds while the user fills in a checklist. What should the design assume?",
      options: ["The phone queues the entries and syncs later", "Perspective switches to local logic", "Entries tapped while disconnected are lost, so each step should be saved to the Gateway as it happens", "The Gateway holds the session open and replays taps"],
      answer: 2,
      explain: [
        "Perspective is a thin client with no offline queue.",
        "There is no local logic mode.",
        "Correct. All logic is on the Gateway, so write each step when it occurs and show connection state.",
        "The Gateway cannot receive taps that never left the phone."
      ]
    },
    {
      q: "Which is the safest way to give maintenance phones access to a Gateway that sits on a plant network?",
      options: ["Port-forward the Gateway web port on the plant firewall", "A TLS reverse proxy in the DMZ with an identity provider and per-user roles (off-site phones join a VPN that ends in the DMZ)", "Put the Gateway in a public cloud IP", "Share the Designer login with the crew"],
      answer: 1,
      explain: [
        "Exposed ports are scanned within hours and expose login pages and every Gateway vulnerability.",
        "Correct. Every connection ends in the DMZ, identity is enforced at the proxy, and Designer stays off the mobile path. A mesh landing on the Gateway would skip the DMZ.",
        "Moving it to a public IP only widens exposure.",
        "Shared credentials destroy accountability and expand access."
      ]
    },
    {
      q: "Why validate the string returned by a barcode scan before using it as a tag path?",
      options: ["Barcodes can be corrupted by dirty labels only", "Tag paths cannot contain slashes", "Validation is automatic in the scan action", "Scanned text is user input, and someone could print a code that opens something you did not intend"],
      answer: 3,
      explain: [
        "Corruption is possible, but the main reason is deliberate or accidental wrong input.",
        "Tag paths use slashes freely.",
        "The action delivers the raw text. Your script is responsible for checks.",
        "Correct. Treat it like any input: check provider, existence and permissions."
      ]
    },
    {
      q: "You need to record a short vibration burst from a phone placed on a pump. Which accelerometer mode fits?",
      options: ["Continuous, left on all shift", "Off", "Batch for a set duration, handled in the Accelerometer Data Received event", "Continuous with a one-hour timer in a binding"],
      answer: 2,
      explain: [
        "Continuous streams samples to the Gateway and wastes bandwidth and CPU.",
        "Off stops the sensor and returns nothing.",
        "Correct. Batch records for a duration, then sends the data once.",
        "A binding timer does not make a continuous stream cheap."
      ]
    }
  ],

  resources: [
    { title: "Ignition Perspective Mobile App (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/perspective-sessions/ignition-perspective-app", type: "docs", source: "Inductive Automation" },
    { title: "Perspective Workstation (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/launchers-and-workstation/ign-launcher", type: "docs", source: "Inductive Automation" },
    { title: "Component Events and Actions (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/component-events-and-actions", type: "docs", source: "Inductive Automation" },
    { title: "Perspective Event Scripts (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/scripting-in-perspective/perspective-session-events-scripts", type: "docs", source: "Inductive Automation" },
    { title: "The Ignition Perspective App", url: "https://inductiveuniversity.com/videos/the-ignition-perspective-app/8.3", type: "video", source: "Inductive University" },
    { title: "Perspective Workstation", url: "https://inductiveuniversity.com/videos/ign-launcher/8.3", type: "video", source: "Inductive University" },
    { title: "Barcode Scanned", url: "https://inductiveuniversity.com/videos/barcode-scanned/8.3", type: "video", source: "Inductive University" },
    { title: "Accelerometer Data Received", url: "https://inductiveuniversity.com/videos/accelerometer-data-received/8.3", type: "video", source: "Inductive University" }
  ]
});
