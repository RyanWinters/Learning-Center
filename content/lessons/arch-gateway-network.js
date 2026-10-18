LC.lesson({
  id: "arch-gateway-network",
  title: "The Gateway Network",
  track: "arch",
  minutes: 20,
  level: 3,
  prereqs: ["ign-architecture", "net-routing"],
  tags: ["gateway-network", "ignition", "security", "certificates", "architecture"],
  summary: "The secure, encrypted link that lets Ignition gateways share tags, history, alarms and management traffic. Every multi-gateway design rides on it.",
  objectives: [
    "Explain what the Gateway Network is and which services travel over it",
    "Distinguish incoming and outgoing connections and say which side starts the link",
    "Walk through certificate approval and connection approval, and name the default policy",
    "Use Service Security to limit what a remote gateway may do",
    "Describe how proxy connections let gateways reach each other through an intermediary"
  ],

  body: `
## What the Gateway Network is

The {{term:gateway-network|Gateway Network}} is Ignition's built-in way for one {{term:ignition|Ignition}} gateway to talk to another. It is an encrypted, authenticated connection between two gateways. Once it is up, the gateways can share tags, store history in each other's databases, forward alarms, run remote notification pipelines, and let a central gateway manage the others. You do not install a module to get it. Every gateway has it.

This matters because almost every design in this track is just "several gateways plus Gateway Network connections." If you understand the link, its security model and what it carries, the architecture patterns become easy to reason about.

## Outgoing and incoming connections

A connection has two ends. You create an **outgoing connection** on the gateway that will start the conversation, and the gateway at the other end automatically shows a matching **incoming connection** when it sees the attempt. The direction is about who dials, not about which way data flows. Once connected, data moves both ways.

{{diagram:handshake}}

The default listening port is **8060** (SSL). The 8.3 manual lists it as an incoming TCP port you can change in the gateway configuration. In a firewalled design, the rule is simple: allow TCP 8060 from the gateway that dials to the gateway that listens. Put the listener in the DMZ. In the Meridian Foods layout the listener is the DMZ gateway at \`10.20.250.10\`. The Plant 1 gateway dials out to it, and the corporate gateway also dials out to it. Corporate then reaches plant services through the DMZ gateway (see proxies below). Nothing connects straight from Level 3 to Level 4, and neither side needs an inbound hole in its own firewall. A direct plant-to-HQ Gateway Network link is a documented exception, never the default.

| Item | Outgoing connection | Incoming connection |
|---|---|---|
| Created by | You, on the dialing gateway | Automatically, on the listening gateway |
| Needs the other side's address | Yes (host name or IP, port) | No |
| Needs approval | Your side must trust the remote certificate | Admin approves the connection |
| Firewall rule | Outbound to remote 8060 | Inbound on 8060 |

## Certificates and approval

Gateway Network links use SSL certificates, and approval is a two-part decision.

1. **Certificate trust.** Each gateway presents a certificate. A gateway only accepts certificates it has been told to trust.
2. **Connection approval.** Under the default **Connection Policy** of \`ApprovedOnly\`, a new incoming connection sits in \`PendingApproval\` and cannot send or receive data until an administrator approves it on the Incoming Connections tab.

In 8.3, **Require Two-Way Authentication** is on by default (check the Gateway Network settings page for your version). That means both ends must explicitly trust each other, so you approve the certificate on the listener and also install or trust the listener's certificate on the dialer. The 8.3 manual also describes other connection policies. \`Unrestricted\` accepts everything, which is fine on a bench and wrong in production. \`SpecifiedList\` admits only gateways whose names are on a list you provide.

> [!note] In 8.1
> Two-way authentication was not on by default. 8.3 gateways can still connect to 8.1 gateways, but the 8.3 setting **Allow Java Serialization** is off on new installs and on only for upgraded gateways. The manual calls it a temporary upgrade aid and a security risk. Plan to turn it off once the whole fleet is on 8.3. 8.3 gateways only talk to 8.3 or 8.1 gateways, so a 7.9 gateway has to be upgraded first.

## What travels over it

The Gateway Network is a transport. Individual features use it as **services**:

- **Remote tag providers**: one gateway reads and writes the tags of another. See {{lesson:arch-remote-services}}.
- **Remote history and alarm journal providers**: store or query data on another gateway.
- **Remote alarm notification**: use another gateway's pipelines or notification hardware.
- **Enterprise Administration**: a controller manages agents. See {{lesson:arch-eam}}.
- **Redundancy**: the backup of a pair syncs from the master. See {{lesson:arch-redundancy}}.
- **Remote script calls and Perspective/Vision features** that reach across gateways, and other module services.

Gateways advertise their services to the gateways they connect to. Each gateway re-enumerates the services of its neighbors on a regular schedule (the manual gives the interval; check it for your version), so a newly created provider can take a short while to show up on its peers.

## Service Security

An approved connection is not a blank cheque. **Service Security** (on the remote gateway, under its Gateway Network settings) controls what a connecting gateway may use. For a tag provider, you choose an access level such as read-only or read/write. For history you choose whether remote gateways may store to or query a given provider. Setting these deliberately is how you make a site gateway readable from headquarters without letting headquarters write setpoints.

> [!example] Locking down a plant
> The Plant 1 gateway \`Plant1\` exposes its tag provider \`default\` through the DMZ gateway to the corporate gateway \`HQ\`. Service Security on \`Plant1\` sets \`default\` to **Read Only** for remote gateways. HQ dashboards show live values such as \`Plant1/Area10/Line1/M101/Sts/Running\`, and a mis-clicked script on HQ cannot write to a PLC. Control writes happen only at the plant.

## Proxies: reaching a gateway through a gateway

Sometimes two gateways cannot connect directly. In the DMZ pattern that is the normal case: the plant and corporate gateways can each reach only the DMZ gateway. A **proxy connection** lets gateway A use gateway B as a relay to reach gateway C. The 8.3 settings include **Allowed Proxy Hops**, a cap on how many relay hops are allowed, where zero or less means no proxying. There are also proxy rules (allow or deny, with wildcards) that govern which gateways and services may be reached this way. Proxies are the mechanism behind designs where a corporate EAM controller manages agents that it can reach only through the DMZ gateway. Treat each hop as extra latency and an extra thing to monitor.

## Health and tuning

Each link pings its peer, and the gateway faults the link after a number of missed pings. The Gateway Network settings page lists the ping rate, ping timeout and maximum missed pings, with separate defaults for outgoing and incoming connections. Look the exact defaults up for your version rather than trusting a number from a course. The default timeout is short, so on a poor WAN or cellular link it can be aggressive. The manual warns that settings that are too tight cause a stream of socket timeouts and reconnects. Loosen the timeout and the missed-ping count to match the real network, and raise the websocket idle timeout so it stays higher than the ping rate.

> [!tip] Commissioning checklist
> 1. Create the outgoing connection on the dialer, using the listener's host (the DMZ gateway) and port 8060.
> 2. On the listener, approve the certificate, then approve the pending connection.
> 3. If two-way authentication is on, trust the listener's certificate on the dialer.
> 4. Wait for the status to read Connected, then wait about a minute for services to appear.
> 5. Set Service Security on every provider you exposed before anyone uses it.
`,

  eli5: `
Imagine two offices in different cities, each with its own front desk. They want to swap files, but they don't want strangers listening in or sneaking in.

First, one office phones the other. That caller is the "outgoing" side. The office that answers sees a new caller on its list. Before it will talk, someone at the front desk checks the caller's ID badge and then decides, "yes, we let this office in." If both offices want to be extra careful, each one checks the other's badge too.

Once they are talking, the answering office can still say what the caller is allowed to do: "You can look at our whiteboard, but you can't change it." That's the permission list.

If the caller can't reach the other office directly, it can ask a friendly third office to pass the message along. Each pass costs a little time, so you don't want a long chain.

That whole private phone line, with badges and permission lists, is the Gateway Network.
`,

  why: `
**Why approval by default?** A gateway network link can expose live tags and, if you allow it, writes. If any gateway that could reach port 8060 were trusted automatically, a stray laptop with Ignition installed could join your network. The \`ApprovedOnly\` default and two-way authentication in 8.3 put a human decision at every new link. Integrators sometimes switch the policy to Unrestricted to get through commissioning and then forget. Audit it.

**Why who dials matters.** Firewalls usually allow outbound easily and inbound reluctantly. Making the DMZ gateway the listener means the plant needs only an outbound rule to one address on 8060, and corporate needs the same. Neither zone accepts an inbound connection from the other, and a compromised enterprise host cannot open a path into Level 3. Security teams argue for this layout. The cost is one more gateway to patch and a proxy hop for corporate-to-plant traffic.

**Why Service Security and not just approval?** Approval answers "who are you?" Service Security answers "what may you do?" Plenty of incidents come from treating those as the same question. A site that has to be monitored from headquarters should not be writable from headquarters unless that is a real requirement.

**Why not just use OPC UA or a database between gateways?** You can, and sometimes should (MQTT is the better fit for many sites, see {{lesson:proto-mqtt}}). The Gateway Network gives you tag provider semantics, store-and-forward history and unified management without custom plumbing. The tradeoff is tight coupling: both ends are Ignition, versions must be compatible, and a dropped link affects remote tags. Experienced integrators choose per link, not once per project.
`,

  history: `
The Gateway Network was formerly called the Gateway Area Network (GAN), and the old name survives in settings and file names, for example in gateway configuration property names (the reference page for gateway and Gateway Network parameters lists them). In 8.3 the defaults tightened: two-way authentication is on, and Java serialization is off for new gateways, so a fresh install is more locked down than a gateway upgraded from 8.1.
`,

  examples: [
    {
      title: "Two plants and a corporate gateway through the DMZ",
      body: `The DMZ gateway at \`10.20.250.10\` (VLAN 250) listens on 8060. The Plant 1 gateway (\`10.20.30.10\`) and the corporate gateway \`HQ\` each create an outgoing connection to it. The DMZ gateway shows two PendingApproval incoming connections. The admin verifies each certificate fingerprint with its owner and approves both. Plant 1's Service Security gives remote gateways read-only access to tag provider \`default\` and store permission to nothing. The Plant 1 firewall needs one rule: outbound TCP 8060 from \`10.20.30.10\` to \`10.20.250.10\`. Corporate needs the same outbound rule. HQ reaches Plant 1 tags by proxy through the DMZ gateway. Plant 2 and Plant 3 repeat the pattern. A direct Plant 1 to HQ link would be a documented exception.`
    },
    {
      title: "Connection flaps every few minutes over cellular",
      body: `A remote pump station on LTE keeps dropping its link. Latency spikes past the default ping timeout and every slow reply counts as missed. Raising the ping timeout to a few seconds and the missed-ping count, then keeping the websocket idle timeout higher than the ping rate, stops the reconnect churn. Check the symptom first: many socket read timeouts in the gateway log point at timing settings, not certificates.`
    }
  ],

  diagrams: {
    handshake: `<svg viewBox="0 0 640 300" role="img" aria-label="An outgoing connection from a plant or corporate gateway reaches port 8060 on the DMZ gateway at 10.20.250.10, where an incoming connection waits for certificate and connection approval before services flow">
  <defs><marker id="arch-gateway-network-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <text class="dg-title" x="20" y="26">Plant or corporate gateway (dialer)</text>
  <text class="dg-title" x="380" y="26">DMZ gateway (listener)</text>
  <rect class="dg-box" x="20" y="40" width="230" height="200" rx="6"/>
  <rect class="dg-box-accent" x="40" y="60" width="190" height="46" rx="4"/>
  <text class="dg-text-sm dg-mid" x="135" y="80">Outgoing connection</text>
  <text class="dg-text-muted dg-mid" x="135" y="97">you create this</text>
  <rect class="dg-box-2" x="40" y="126" width="190" height="46" rx="4"/>
  <text class="dg-text-sm dg-mid" x="135" y="146">Services exposed</text>
  <text class="dg-text-muted dg-mid" x="135" y="163">tags, history, alarms</text>
  <text class="dg-text-muted dg-mid" x="135" y="204">trusts listener cert</text>
  <text class="dg-text-muted dg-mid" x="135" y="222">(two-way auth)</text>
  <rect class="dg-box" x="390" y="40" width="230" height="200" rx="6"/>
  <rect class="dg-box-warn" x="410" y="60" width="190" height="46" rx="4"/>
  <text class="dg-text-sm dg-mid" x="505" y="80">Incoming connection</text>
  <text class="dg-text-muted dg-mid" x="505" y="97">appears automatically</text>
  <rect class="dg-box-2" x="410" y="126" width="190" height="46" rx="4"/>
  <text class="dg-text-sm dg-mid" x="505" y="146">Service Security</text>
  <text class="dg-text-muted dg-mid" x="505" y="163">what the caller may do</text>
  <text class="dg-text-muted dg-mid" x="505" y="204">1 approve certificate</text>
  <text class="dg-text-muted dg-mid" x="505" y="222">2 approve connection</text>
  <path class="dg-line-accent" d="M250 83 L388 83" marker-end="url(#arch-gateway-network-ah)"/>
  <text class="dg-text-mono dg-mid" x="319" y="74">TCP 8060</text>
  <path class="dg-line-thin" d="M388 149 L252 149" marker-end="url(#arch-gateway-network-ah)"/>
  <text class="dg-text-muted dg-mid" x="319" y="140">data both ways</text>
  <text class="dg-text-muted dg-mid" x="319" y="266">Plant and corporate both dial out to the DMZ gateway (10.20.250.10).</text>
  <text class="dg-text-muted dg-mid" x="319" y="286">Default policy ApprovedOnly: PendingApproval until an admin approves.</text>
</svg>`
  },

  pitfalls: [
    "Leaving the Connection Policy on Unrestricted after commissioning.",
    "Approving the connection but forgetting Service Security, so the remote gateway gets more (or less) than intended.",
    "Opening inbound 8060 on every site firewall, or dialing straight from the plant to HQ, when both should dial out to a DMZ gateway.",
    "Leaving the default ping timeout on a cellular or satellite link, then chasing phantom disconnects.",
    "Creating long proxy chains. Each hop adds latency and another failure point.",
    "Assuming an 8.3 gateway can reach a 7.9 gateway. Upgrade through 8.1 first."
  ],

  keyTerms: ["gateway-network", "gan-connection", "connection-policy", "service-security", "proxy-hops", "ignition", "firewall", "port-number"],

  quiz: [
    {
      q: "Plant 1 and the corporate network may not connect to each other directly. Which Gateway Network setup follows the DMZ pattern?",
      options: [
        "The Plant 1 gateway and the corporate gateway each create an outgoing connection to the DMZ gateway on port 8060",
        "The corporate gateway creates an outgoing connection straight to the Plant 1 gateway",
        "Open inbound 8060 on the plant firewall and let the corporate gateway dial in",
        "The Plant 1 gateway dials the corporate gateway directly as the default design"
      ],
      answer: 0,
      explain: [
        "Correct. Both sides dial out and the DMZ gateway listens. Corporate reaches the plant through it by proxy, and no connection passes straight from Level 3 to Level 4.",
        "This needs an inbound path into the plant, which the zone model forbids.",
        "This widens the plant's exposure for no reason.",
        "A direct plant-to-HQ link is only a documented exception. It is not the default design."
      ]
    },
    {
      q: "A new incoming connection shows PendingApproval and no remote tags appear. Under default settings, what is the next step?",
      options: [
        "Restart the gateway service",
        "Approve the certificate, then approve the connection on the Incoming Connections tab",
        "Change the port from 8060 to 8088",
        "Install the Enterprise Administration module"
      ],
      answer: 1,
      explain: [
        "A restart does not approve anything. The connection stays pending.",
        "Correct. ApprovedOnly holds the link until an administrator approves it.",
        "The link already reached the gateway, so the port is fine.",
        "EAM is unrelated. Tag sharing uses the Gateway Network itself."
      ]
    },
    {
      q: "HQ should see live plant values but must never write to plant PLCs. Which control enforces this?",
      options: [
        "Set the Connection Policy to SpecifiedList",
        "Use a shorter ping timeout",
        "Set Service Security on the plant's tag provider to read-only for remote gateways",
        "Turn off Require SSL"
      ],
      answer: 2,
      explain: [
        "SpecifiedList controls which gateways may connect at all, not what they may do afterwards.",
        "Ping settings tune link health, not permissions.",
        "Correct. Service Security sets the access level per provider on the gateway that owns it.",
        "Disabling SSL weakens security and has nothing to do with write access."
      ]
    },
    {
      q: "A link over LTE keeps faulting, and the log shows many socket read timeouts. The certificates are fine. What is the most likely fix?",
      options: [
        "Switch the connection policy to Unrestricted",
        "Raise the ping timeout and missed-ping count to suit the real latency",
        "Delete and recreate the certificate",
        "Increase the number of proxy hops"
      ],
      answer: 1,
      explain: [
        "Policy only decides who may connect. It does not change timing behavior.",
        "Correct. The default timeout can be too tight for cellular latency spikes, so slow replies count as missed pings.",
        "Certificates are not the issue when the link connects and then drops on timeouts.",
        "Proxy hops affect reachability, not the ping timing of a direct link."
      ]
    },
    {
      q: "Why did 8.3 default Require Two-Way Authentication to true?",
      options: [
        "To make the link faster",
        "So each end explicitly trusts the other, so a rogue gateway cannot impersonate either one",
        "Because OPC UA requires it",
        "To allow Java serialization for older gateways"
      ],
      answer: 1,
      explain: [
        "Authentication adds a trust step, not speed.",
        "Correct. Both ends must approve each other's certificates, which tightens the network against impersonation.",
        "OPC UA is a separate protocol with its own security settings.",
        "Java serialization is a separate setting that is off on new 8.3 installs."
      ]
    }
  ],

  resources: [
    { title: "Gateway Network (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/platform/gateway-network", type: "docs", source: "Inductive Automation" },
    { title: "Gateway and Gateway Network Parameters (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/reference-pages/gateway-configuration-file-reference/gateway-and-gateway-network-parameters", type: "docs", source: "Inductive Automation" },
    { title: "Platform Environment Variables (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/reference-pages/platform-environment-variables", type: "docs", source: "Inductive Automation" },
    { title: "Gateway Port Reference (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/reference-pages/gateway-port-reference", type: "docs", source: "Inductive Automation" },
    { title: "Optimize Gateway Network Performance (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/tutorials/tutorials-and-helpful-tricks/optimize-gateway-network-performance", type: "docs", source: "Inductive Automation" },
    { title: "Allowed Proxy Hops setting", url: "https://forum.inductiveautomation.com/t/allowed-proxy-hops-setting/75021", type: "forum", source: "Inductive Automation Forum" },
    { title: "Security Best Practices for Your Ignition System", url: "https://inductiveautomation.com/resources/webinar/security-best-practices-for-your-ignition-system", type: "video", source: "Inductive Automation" }
  ]
});
