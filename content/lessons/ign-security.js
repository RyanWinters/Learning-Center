LC.lesson({
  id: "ign-security",
  title: "Users, roles, identity providers and security zones",
  track: "ignition",
  minutes: 25,
  level: 3,
  prereqs: ["ign-architecture"],
  tags: ["security", "users", "roles", "identity-provider", "zones", "hardening"],
  summary: "Who is allowed to do what in Ignition, where that answer is stored, and how to lock a gateway down without locking out the plant.",
  objectives: [
    "Name the user source types and say when each fits",
    "Explain how 8.3 splits authentication into the Classic and Identity Provider strategies",
    "Describe how roles, security levels and security zones combine to gate a Perspective view",
    "Apply least privilege to operators, engineers and integrators",
    "List the first gateway hardening steps: HTTPS, default accounts and audit logging"
  ],

  body: `
## What Ignition security answers

Every action in Ignition comes down to three questions. **Who are you** (authentication)? **What are you allowed to do** (authorization)? **Where are you coming from** (location)? Ignition answers the first with a {{term:user-source|user source}} or an {{term:identity-provider|identity provider}}, the second with roles and security levels, and the third with {{term:security-zone|security zones}}. Get these right once and every project, tag and view inherits a sane default.

## Two authentication strategies in 8.3

Ignition 8.3 separates authentication into two strategies on the Gateway.

| Strategy | Used by | Where users live |
|---|---|---|
| Classic | Designer, Vision clients | **User sources** |
| Identity Provider | Perspective sessions | **Identity providers (IdPs)** |

The Designer always logs in through the Classic strategy, even if your whole system is Perspective. So you need a user source for engineers and an IdP for operators. They can point at the same directory, but they are configured separately.

> [!note] In 8.1
> Perspective also used user sources, selected per project. 8.3 moves Perspective to identity providers, and IdPs are not carried over by simply importing an 8.1 export, so plan to recreate them during an upgrade. Service security settings (who may call a gateway service) also moved into security zone configuration. Confirm both points in the 8.1 to 8.3 upgrade guide for your build.

### User sources (Classic)

A user source is a list of users, their passwords or credentials, and their roles.

- **Internal**: users stored in the gateway itself. Fine for a small site, a lab or the one emergency admin account. Every user is managed by hand.
- **Database**: users and roles come from tables you map. Useful when HR or a plant application already owns the data.
- **Active Directory / LDAP**: the gateway checks credentials against the corporate directory and can map AD groups to roles. Users leave the company once and lose access everywhere.
- **Hybrid**: AD for passwords, with internal role assignments, or a fallback internal source in case the domain controller is unreachable.

### Identity providers (Perspective)

An IdP tells Perspective "this person is who they say they are" and passes back attributes such as group membership.

- **Internal**: the gateway keeps the users, like an internal user source.
- **SAML**: browser redirect to a corporate single sign-on page.
- **OpenID Connect (OIDC)**: the same idea built on OAuth 2.0. Okta, Azure AD (now Microsoft Entra ID) and Keycloak all speak OIDC.

With SAML or OIDC the gateway never sees the password. The operator logs in at the company's single sign-on page and comes back with a token. That gives you multi-factor authentication and instant account disablement without any Ignition work.

## Roles, security levels and zones

Pre-8.3 Ignition used flat **roles**: Operator, Supervisor, Engineer. 8.3 organizes access around **security levels**, a tree of named levels such as \`Authenticated/Roles/Operator\` (check the security level pages for the exact node names in your version). Roles from the IdP map onto nodes in that tree. A reserved \`SecurityZones\` node holds the levels that come from your zones.

A **security zone** is a named group of gateways, computers or IP addresses/hostnames. A user inside the zone "Control Room" gets an extra security level automatically. You can then require both:

\`\`\`text
Role: Supervisor     (what you are)
Zone: Control Room   (where you are)
\`\`\`

A supervisor on a phone in the parking lot has the role but not the zone, so the setpoint view stays read-only. Security level rules are expressions that can check IdP attributes and zone membership, with helper functions for matching sets of levels (see the Security Level Rules page for the current names).

{{diagram:layers}}

### Where permissions get applied

| Object | What you can restrict |
|---|---|
| Perspective session/project | Who may open the project at all |
| Perspective view or page | Who may see it or navigate to it |
| Component or binding | Hide or disable by role through a binding or script |
| Tag | Read and write permissions per tag or folder |
| Designer | Who may open the project or edit it |
| Gateway Network and services | Which remote gateways may connect or call services |

> [!example] Worked example: a motor speed limit
> Tag \`[default]Plant1/Area10/Line1/M101/Cfg/SpeedHigh\` has write permission set to security level \`Roles/Supervisor\`. The Perspective numeric entry is bound to it. Any operator can see the value. The write succeeds only when the session carries Supervisor and the zone rule says the client is on the \`10.20.20.0/24\` HMI VLAN (VLAN 20). The Ignition servers live on a different subnet (\`10.20.30.0/24\`), so do not use that range for a client zone. From a laptop on guest Wi-Fi the same supervisor gets a rejected write, and with auditing on, the attempt is logged.

## Least privilege

**Least privilege** means each person and each system gets exactly the access the job needs.

- **Operators**: view screens, acknowledge alarms, write the handful of tags they run the process with. No Designer access.
- **Supervisors**: operators plus setpoint and recipe changes within limits.
- **Engineers**: Designer access to specific projects, not every project, and no gateway config.
- **Integrators and vendors**: named accounts, time-limited, removed at handover. Never a shared "vendor" login.
- **Services**: a database account with only the tables Ignition needs, not \`sa\`.

## Hardening the gateway

1. **Turn on HTTPS.** A new Gateway's secure port normally starts with a self-signed certificate. Install a certificate your clients trust and redirect HTTP to HTTPS, so passwords and session tokens never cross the plant network in clear text.
2. **Remove defaults.** Change or delete the initial admin account made at commissioning. Give the Gateway Web Interface its own named engineers.
3. **Segment the network.** Only the gateway should reach PLC ports. Only engineers should reach port 8088/8043. See {{lesson:net-security}}.
4. **Enable audit logging.** Create an audit profile (a database table) and assign it to the gateway and to projects. Actions such as tag writes and logins are then recorded with user and time (check the audit log page for exactly which events your version captures). After a restore, verify that audit profiles are enabled, because they can come back disabled.
5. **Restrict OPC UA and service access.** Use security zones to limit which remote gateways may connect.
6. **Patch.** Ignition publishes security fixes in new versions. Stay on a supported release.

> [!warning] Locked out
> Before you switch the Designer to a directory-based user source, keep one internal break-glass administrator and test it. If the domain controller is down during an outage, nobody can open the Designer to fix things.
`,

  eli5: `
Think of a big office building. At the front door, the guard checks your ID badge. That is authentication, and it is how you prove you are really you. The badge also says what kind of person you are: cleaner, manager, or visitor. That is your role.

Inside, some doors only open for managers. Some doors only open when you are on the second floor, because that is where the safe room is. That is a zone: it does not matter who you are if you are standing in the wrong place.

A good building does not give every key to every person. The cleaner gets the cleaning closet, the manager gets the files. That is least privilege. If you lose a cleaner's key, only the closet is at risk.

Ignition does the same thing for a factory. The badge may be issued by the company's own front desk (a corporate login) instead of the plant's own desk. That way, when someone leaves the company, one phone call ends all their access.
`,

  why: `
**Why separate who you are from where you are?** Roles alone assume that anyone with the right title is safe wherever they are. A stolen supervisor password then works from anywhere on earth. Zones add a second fact that a thief cannot easily fake. Plants have long used physical location as a control (the control room door), and zones bring that idea into software.

**Why use a corporate IdP instead of internal users?** Internal users drift. People leave and their accounts stay. Passwords get shared on a sticky note. A directory plus single sign-on gives one place to disable an account and a place to enforce multi-factor authentication. The tradeoff is dependency: if the IdP is down, so is the login. Experienced integrators keep an internal break-glass account and cache sessions where possible. Operators who are already signed in should not be kicked out by a directory outage.

**Why not give operators broad write access "to be safe"?** Plants argue about this constantly. Locking down too much creates workarounds, such as shared logins and people calling an engineer for every change. Locking down too little lets a mis-click change a setpoint on the wrong unit. The usual answer is a small set of well-named roles, with write access matched to the job and an audit trail on top, so a legitimate action never needs a workaround.

**Why audit?** Security is not only prevention. When a batch fails, the first question is "who changed what, and when?" An audit log answers it in seconds and also discourages careless changes. It also supports compliance work such as 21 CFR Part 11 and IEC 62443.
`,

  history: `
Early Ignition versions used simple user sources with roles, which carried through Ignition 7 and 8.1. As Perspective moved operators into browsers, plants wanted the same single sign-on they used for email. 8.1 added more external options for Perspective. In 8.3 Inductive Automation reorganized this into the Classic and Identity Provider strategies, with security levels and zones replacing flat role lists and the older per-service security settings.
`,

  examples: [
    {
      title: "Operator on the floor, supervisor in the office",
      body: `A plant defines zones \`Floor\` (the HMI terminals' IP range) and \`Office\` (the corporate subnet). Alarm acknowledgement requires the Operator role in any zone. Changing a recipe requires Supervisor **and** the Floor zone. A supervisor reviewing a batch from their desk can look at everything but cannot change a recipe until they walk to a floor terminal.`
    },
    {
      title: "Contractor access that expires",
      body: `A vendor needs to tune a loop for two weeks. Instead of sharing an engineer login, you add them in the corporate directory in a group \`Ign-Vendor-Tuning\`, map the group to a security level that only opens one project in the Designer, and set the account to expire. Day 15 they are locked out with no Ignition change.`
    }
  ],

  diagrams: {
    layers: `<svg viewBox="0 0 640 230" role="img" aria-label="A login passes through an identity provider, then roles, then a security zone check, before it can write a tag">
  <defs><marker id="ign-security-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="60" width="130" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="85" y="86">User logs in</text>
  <text class="dg-text-sm dg-mid" x="85" y="108">browser or Designer</text>
  <rect class="dg-box-accent" x="190" y="60" width="130" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="255" y="86">Who?</text>
  <text class="dg-text-sm dg-mid" x="255" y="108">IdP or user source</text>
  <rect class="dg-box-accent" x="360" y="60" width="120" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="420" y="86">What?</text>
  <text class="dg-text-sm dg-mid" x="420" y="108">roles, levels</text>
  <rect class="dg-box-accent" x="510" y="60" width="110" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="565" y="86">Where?</text>
  <text class="dg-text-sm dg-mid" x="565" y="108">security zone</text>
  <line class="dg-line" x1="150" y1="95" x2="188" y2="95" marker-end="url(#ign-security-ah)"/>
  <line class="dg-line" x1="320" y1="95" x2="358" y2="95" marker-end="url(#ign-security-ah)"/>
  <line class="dg-line" x1="480" y1="95" x2="508" y2="95" marker-end="url(#ign-security-ah)"/>
  <text class="dg-text-muted dg-mid" x="255" y="160">password, SAML, OIDC</text>
  <text class="dg-text-muted dg-mid" x="420" y="160">Supervisor?</text>
  <text class="dg-text-muted dg-mid" x="565" y="160">Control Room?</text>
  <rect class="dg-box" x="190" y="182" width="290" height="36" rx="6"/>
  <text class="dg-text-sm dg-mid" x="335" y="205">Allowed: write tag, and log it in the audit profile</text>
</svg>`
  },

  pitfalls: [
    "Leaving the commissioning admin account with its original password.",
    "Using a directory user source with no internal break-glass administrator.",
    "Assuming Perspective uses the same user source as the Designer in 8.3. Configure both.",
    "Securing a view but not the tag behind it, so a script or another view can still write.",
    "Running the gateway on plain HTTP across the plant network.",
    "Sharing one 'vendor' or 'operator' login, which makes the audit log useless."
  ],

  keyTerms: ["user-source", "identity-provider", "ign-role", "security-zone", "least-privilege", "audit-log", "saml", "openid-connect"],

  quiz: [
    {
      q: "In Ignition 8.3, an engineer opens the Designer and an operator opens a Perspective session. Where is each authenticated?",
      options: ["Designer through a user source (Classic), Perspective through an identity provider", "Both through the same user source", "Both through identity providers", "Designer needs no login on the gateway machine"],
      answer: 0,
      explain: [
        "Correct. 8.3 uses the Classic strategy (user sources) for Designer and Vision, and the Identity Provider strategy for Perspective.",
        "That was close to the 8.1 model for Perspective. In 8.3 they are configured separately.",
        "The Designer uses the Classic strategy, which relies on user sources.",
        "The Designer always authenticates against the gateway."
      ]
    },
    {
      q: "A supervisor's password is stolen. Which control limits the damage if the attacker is outside the plant?",
      options: ["A longer role name", "A security zone requirement on write access", "More tags in the historian", "Switching the user source to internal"],
      answer: 1,
      explain: [
        "Role names have no security effect by themselves.",
        "Correct. If writes require both the Supervisor role and a Control Room zone, a login from outside the zone cannot write.",
        "The historian records data and does not control access.",
        "Internal users are not safer than directory users, and they cannot restrict by location."
      ]
    },
    {
      q: "What is the main benefit of SAML or OIDC for Perspective logins?",
      options: ["Faster page loads", "The gateway never handles the password, and the company can enforce MFA and disable accounts centrally", "It removes the need for roles", "It encrypts the PLC connection"],
      answer: 1,
      explain: [
        "Login method has little to do with page speed.",
        "Correct. The user authenticates at the corporate provider and the gateway receives a token and attributes.",
        "You still map IdP groups or attributes to roles and security levels.",
        "PLC traffic is separate and is not affected by the IdP."
      ]
    },
    {
      q: "A contractor needs two weeks of access to tune one loop. What follows least privilege?",
      options: ["Share the engineer login", "Give them the admin account and ask them to be careful", "A named, expiring account limited to the one project", "Disable security for the project during the tuning"],
      answer: 2,
      explain: [
        "Shared logins destroy accountability.",
        "Admin access is far more than the job needs.",
        "Correct. Named, scoped and expiring access gives the least access that still lets the work happen.",
        "Turning security off is the opposite of least privilege."
      ]
    },
    {
      q: "You restore a gateway backup onto a new server. After the restore, auditing is not recording. What is the likely cause?",
      options: ["Audit profiles come back disabled and need to be re-enabled", "Backups cannot contain security settings", "The audit database must be MySQL", "Auditing only works on the original hardware"],
      answer: 0,
      explain: [
        "Correct. Restored audit profiles are among the resources that come back disabled, so you turn them on again.",
        "Security settings are part of a backup.",
        "Audit profiles write to a database table, but not only MySQL is supported.",
        "Auditing has no hardware tie."
      ]
    },
    {
      q: "Which is the best first step to harden a new gateway used across the plant network?",
      options: ["Install a trusted certificate and use HTTPS", "Add more Perspective views", "Raise the tag scan rate", "Disable the historian"],
      answer: 0,
      explain: [
        "Correct. HTTPS protects passwords and session tokens in transit. Do it before anything else is exposed.",
        "More views do not improve security.",
        "Scan rate affects load, not security.",
        "The historian is unrelated to access control."
      ]
    }
  ],

  resources: [
    { title: "Security (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/security", type: "docs", source: "Inductive Automation" },
    { title: "Identity Provider Authentication Strategy", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/security/identity-provider-authentication-strategy", type: "docs", source: "Inductive Automation" },
    { title: "Security Levels", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/security/identity-provider-authentication-strategy/security-levels", type: "docs", source: "Inductive Automation" },
    { title: "Security Level Rules", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/security/identity-provider-authentication-strategy/security-level-rules", type: "docs", source: "Inductive Automation" },
    { title: "Internal Authentication (Classic strategy)", url: "https://docs.inductiveautomation.com/docs/8.3/platform/security/classic-authentication-strategy/internal-authentication", type: "docs", source: "Inductive Automation" },
    { title: "Audit Log and Profiles", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/audit-log-and-profiles", type: "docs", source: "Inductive Automation" },
    { title: "8.1 to 8.3 Upgrade Guide", url: "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/installing-and-upgrading/ignition-8-upgrade-guide/81to83-upgrade-guide", type: "docs", source: "Inductive Automation" }
  ]
});
