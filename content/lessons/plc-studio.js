LC.lesson({
  id: "plc-studio",
  title: "A tour of Studio 5000 Logix Designer",
  track: "plc",
  minutes: 20,
  level: 1,
  prereqs: ["plc-intro"],
  tags: ["studio-5000", "logix-designer", "online", "download", "run-mode", "firmware"],
  summary: "The programming window, the tree on the left, and the one habit that saves careers: know exactly which copy of the program you are looking at.",
  objectives: [
    "Find the Controller Organizer, I/O Configuration, tag editor and routine editor on screen",
    "Explain the difference between offline and online, and between download, upload and go online",
    "Describe Run, Program and Remote modes and what the keyswitch does",
    "Describe how a laptop reaches a controller through RSLinx Classic or FactoryTalk Linx",
    "Say why firmware revisions must match and why you keep dated offline copies"
  ],

  body: `
## What you are looking at

{{term:logix-designer|Studio 5000 Logix Designer}} is the application you use to build, edit and watch Logix programs. A project (one \`.ACD\` file) holds everything for one controller: its I/O modules, tags, programs and logic. You open the file on your laptop, change it, and send it to the controller. The controller keeps its own running copy.

That sentence hides the most important idea in this lesson. There are **two copies** of the program: the one in the file on your laptop and the one in the controller. They can be different. Most expensive mistakes in PLC work come from editing one while believing you edited the other.

## The screen

{{diagram:window}}

- **Controller Organizer** (left). The tree for the whole project. Its main branches are *Controller* (properties, Controller Tags, Controller Fault Handler), *Tasks* (with programs and routines under them), *Motion Groups*, *Assets*, *Logical Model*, and *I/O Configuration*.
- **Routine editor** (center). Where ladder, Structured Text or other languages appear. Double-click a routine in the tree to open it. Each routine opens in its own tab.
- **Tag editor** (bottom). Two tabs, *Monitor Tags* and *Edit Tags*, show tag names, values, types and descriptions. You can monitor tags for a program or the controller scope using the scope picker at the top of the tag window.
- **Toolbar and status area** (top left). Shows the controller's mode, the communication path, and whether the program is the same as in the controller. The **online bar** is the key to the next sections.
- **Instruction palette** (above the routine). Tabs such as Favorites, Bit, Timer/Counter, Compare and Compute hold the ladder instructions. You drag from here or type the mnemonic.

### The I/O Configuration tree

Under {{term:io-configuration|I/O Configuration}} you list every module the controller can see. A local chassis appears as **1756 Backplane** or **5069 Compact Bus**, with each card in a numbered slot. Ethernet modules and remote devices (drives, remote I/O) appear under an Ethernet network branch with their IP address. For each module you set:

| Setting | Why it matters |
|---|---|
| Slot or IP address | Where the controller looks for the module |
| Module definition (series, revision, electronic keying) | Rejects the wrong card if someone swaps hardware |
| {{term:rpi|RPI}} | How often input data is sent to the controller |
| Channel configuration | Analog range, filters, fault state |

Adding a module creates its tags automatically, which we use in {{lesson:plc-tags}}.

## Offline and online

- **Offline.** You are editing the file on your laptop. Nothing you do affects the machine. You can edit freely, and the project can be verified (the *Verify* command checks for errors).
- **Online.** Your laptop is connected to a controller. The status bar shows the controller's mode and whether the project matches.

You move between them with three commands:

| Command | Direction | What it does | Danger |
|---|---|---|---|
| {{term:plc-download|Download}} | Laptop to controller | Replaces the controller's program with the file's | Overwrites the running program; puts the controller in Program mode first |
| {{term:plc-upload|Upload}} | Controller to laptop | Creates or replaces the file from the controller | Overwrites unsaved file edits; check the result against your offline file, since not everything in an offline project is guaranteed to come back the same |
| {{term:plc-go-online|Go Online}} | Live link | Connects when both copies match; lets you monitor and edit | Edits made online change the live program immediately |

Logix Designer compares the two copies when you click *Go Online* and asks whether you want to download, upload, or connect anyway. **Read the dialog.** Choosing the wrong button means overwriting either the plant's running program or your afternoon of work.

> [!warning] Online edits are live
> In Logix, you can add a rung or change a value while the controller is running (online edit). You make the edit, then use the online-edit commands (the labels are along the lines of *Test Edits* and *Accept Test Edits*, with *Cancel Edits* to back out; check the exact names in your version). Once accepted, the change is in the running program, even mid-scan. A misplaced instruction can start a motor. Treat online editing like touching a live panel: know what the rung drives, and tell the operator before you do it.

## Run, Program and Remote modes

The controller is always in one of a few modes.

- **Run mode.** Logic executes and outputs follow it. You can monitor and edit tags, and make online edits. You cannot download.
- **Program mode.** Logic does not execute. Outputs go to their configured Program-mode state, typically off. You can download in this mode.
- **Remote Run, Remote Program, Remote Test.** Software (not the key) selects the mode. Remote Test runs logic but keeps outputs disabled, useful for checking logic without moving equipment.
- **Fault.** A major fault has stopped the controller. See {{lesson:plc-faults}}.

On most hardware controllers, the **{{term:keyswitch|keyswitch}}** has three positions: RUN, REM and PROG. In RUN the controller is locked into run mode, and software cannot change it. In PROG it is locked into program mode. In REM, software chooses. A plant that leaves the key in RUN is protecting itself from someone accidentally pausing the line. Not every controller has a physical key, and CompactLogix models differ here, so check the hardware manual for the model you are standing in front of.

## Forces

A **force** overrides a value. A forced input holds a value whatever the real field device is doing. A forced output holds its value whatever the logic says. Forces are the most common reason for the call "the logic is right but the output is wrong".

- A force is installed on a specific I/O tag, and it stays after you go offline or close the software. Forces are enabled and disabled at the controller level, so installing one is not the same as enabling it.
- The controller shows a **Forces** indicator in the online bar (installed, enabled, or none). Look at it every time you go online, and use the force filters in the tag window to list what is forced.
- A forced output can start equipment with no logic condition true. Treat forcing as you would a jumper across a safety contact: announce it, tag the equipment, and write down what you forced.
- **Remove every force before you hand the machine back.** Check the indicator before you leave, and again after the next controller power cycle.

Forcing is a diagnostic tool. A force is never a fix.

## How the laptop reaches the controller

Your laptop needs a **communication driver**. It is the program that turns "controller PLC1 at 10.20.10.10" into network traffic.

- {{term:rslinx|RSLinx Classic}} is the older driver and is still everywhere. You configure drivers (for instance *EtherNet/IP* driver or *Ethernet devices*), then browse in **RSWho** to find controllers.
- **FactoryTalk Linx** is the current driver, used in FactoryTalk-based installs, and is the successor to RSLinx Enterprise.

In Logix Designer, the **Who Active** button (or *Communications > Who Active*) opens a browser of drivers. You pick the controller, then choose *Download*, *Upload* or *Go Online*. Another way is to set the **path** in the project's Controller Properties, but Who Active is the best place to start.

To connect over Ethernet, your laptop and controller must be on the same network or routable to each other, which brings us back to {{lesson:net-ip}}. A common first-day problem is a laptop left on a home-network address such as 192.168.0.x while PLC1 is on the control VLAN at 10.20.10.x.

## Firmware revisions

Every Logix controller runs **firmware** with a version, such as 33.011. The major revision (33) matters most. A project built for revision 33 will not download to a controller running revision 32. The reverse also fails.

You can change the firmware with *ControlFLASH* or *ControlFLASH Plus*, a Rockwell utility, which updates the controller (and modules) to the target revision. This wipes the program in some cases and should be done with a plan and a backup. When a site has an old controller on revision 20, you need an older Logix Designer installation, since the newest software supports a range of recent revisions. This is why integrators keep several Studio 5000 versions on a laptop or in a virtual machine.

Modules have firmware too, and **electronic keying** in the I/O Configuration compares the real module's identity and revision to what the project expects. If keying is *Exact Match* and someone replaces a card with a newer revision, the controller refuses to connect to it. *Compatible Module* keying relaxes this, and *Disable Keying* removes the check (use sparingly).

## The offline-copy habit

Before you change anything on a running controller:

1. Go online and **save an upload** to a dated file, or confirm a trusted offline copy matches. Name it like \`LineA_PLC_2026-10-17_before_change.ACD\`.
2. Compare the offline and online copies if the tools allow (a *Compare* utility, or export to \`.L5X\`).
3. After the change, upload or save again and file the new copy with a note.

The \`.L5X\` format is the project as XML. It is useful for diffing, searching and scripted edits, and it can be imported back into Logix Designer.

> [!example] A bad Monday
> Dana is asked to add an interlock to a packaging line. The shared drive holds \`PackLine.ACD\` from last March. She edits it, downloads it, and the line trips: someone added a safety bypass online in June that was never saved. The download overwrote it. A one-minute upload before the change would have shown that the file was stale.
`,

  eli5: `
Imagine a recipe book at home and the same recipe pinned up in a restaurant kitchen. The one in the kitchen is the one the cooks actually follow. You are allowed to edit your copy at home, and when you are happy you can swap the kitchen's copy for yours. That swap is a *download*. If you instead copy the kitchen's version back to your house, that is an *upload*.

Now suppose a cook scribbled a note in the kitchen copy last month. If you swap your old home copy in, the note vanishes and nobody knows why the soup tastes odd. So before you change anything, you photocopy the kitchen version first.

The key on the front of the PLC is like a lock on the kitchen door. Turned one way, the cooks keep cooking and nobody can pause them. Turned the other way, the cooking stops so the book can be swapped safely.
`,

  why: `
**Why two copies?** Early PLC programming was done by people sitting at the machine. Having an offline file lets you design in the office, test in simulation, and only touch the real machine during a short downtime. The tradeoff is the risk of drift, which is why version control matters so much.

**Why does download stop the controller?** A download replaces the program and the data. The controller cannot keep running a program that is being swapped out from under it, so it goes to Program mode. Outputs fall to their program-mode state. That is why downloads are scheduled and announced, and why you never download to a pump station mid-shift without a plan.

**Why do integrators keep several versions of the software?** The Logix Designer project format changes with each major revision, and you cannot open a v36 project in v32. Plants upgrade controllers rarely, so one laptop must reach back many years. Virtual machines with specific versions are normal.

**Why argue about online edits?** Some shops forbid them. Online edits are convenient and avoid downtime, but an online edit can produce a state nobody tested. The compromise most integrators use: online edits for small, understood changes with the operator informed, and a download in a maintenance window for anything structural.

**Why bother backing up a project you did not write?** The controller's own copy is the only one that is certain to match what is running. You cannot tell what else people have changed. A dated upload is your insurance when something breaks the next day and someone asks what you did.
`,

  history: `
Logix Designer began as RSLogix 5000, introduced with ControlLogix in the late 1990s to replace the file-based RSLogix 5 and 500 tools with a tag-based environment. Rockwell renamed it Studio 5000 Logix Designer in the early 2010s when it grouped its design tools under the Studio 5000 name. The rename kept the project format and the interface largely intact, so experienced users just kept clicking where they always did.
`,

  examples: [
    {
      title: "First connection to a CompactLogix",
      body: `Your engineering workstation is 10.20.50.25 on VLAN 50 and the controller PLC1 is 10.20.10.10 on the control VLAN, reached through the plant router (see {{lesson:net-ip}}). In RSLinx Classic you add an *EtherNet/IP Driver*, point it at the right adapter, then open *RSWho*. The controller appears with its name. In Logix Designer you click *Who Active*, choose the controller, and click *Upload*. The dialog offers to create a new file. You save it as \`Site_PLC_2026-10-17_as_found.ACD\` before any editing.`
    },
    {
      title: "A revision mismatch",
      body: `You try to download a project built for revision 32 into a controller running 33.011. The download fails with a revision mismatch. Options: update the controller's firmware with ControlFLASH to 32 (if available and approved), or change the project's controller revision to 33 in Controller Properties and re-verify. The second is safer because it leaves the plant's hardware alone, but you must re-test the logic.`
    }
  ],

  diagrams: {
    window: `<svg viewBox="0 0 640 260" role="img" aria-label="Layout of Logix Designer: toolbar and online status on top, Controller Organizer on the left, routine editor in the center, tag editor along the bottom">
  <rect class="dg-box" x="20" y="14" width="600" height="36" rx="4"/>
  <text class="dg-text-sm" x="34" y="37">Toolbar: mode, path, online status, Who Active</text>
  <rect class="dg-box" x="20" y="60" width="170" height="150" rx="4"/>
  <text class="dg-title" x="32" y="82">Controller Organizer</text>
  <text class="dg-text-mono" x="32" y="104">Controller</text>
  <text class="dg-text-mono" x="44" y="122">Controller Tags</text>
  <text class="dg-text-mono" x="32" y="140">Tasks</text>
  <text class="dg-text-mono" x="44" y="158">MainProgram</text>
  <text class="dg-text-mono" x="32" y="176">Data Types</text>
  <text class="dg-text-mono" x="32" y="194">I/O Configuration</text>
  <rect class="dg-box-accent" x="200" y="60" width="420" height="150" rx="4"/>
  <text class="dg-title" x="214" y="82">Routine editor</text>
  <text class="dg-text-mono" x="214" y="112">XIC(Start) XIO(Stop) OTE(Motor)</text>
  <text class="dg-text-muted" x="214" y="140">Ladder, Structured Text, FBD or SFC</text>
  <rect class="dg-box" x="20" y="218" width="600" height="32" rx="4"/>
  <text class="dg-text-sm" x="34" y="239">Tag editor: Monitor Tags | Edit Tags, with scope picker</text>
</svg>`
  },

  pitfalls: [
    "Downloading a stale offline file over a controller that other people have been editing.",
    "Clicking Download in the Go Online dialog when you meant Upload.",
    "Making online edits without telling the operator or understanding what the rung drives.",
    "Leaving the keyswitch in PROG after commissioning, so the line stops after a hand-off.",
    "Having only the newest Studio 5000 installed when the plant runs old firmware."
  ],

  keyTerms: ["logix-designer", "controller-organizer", "io-configuration", "plc-go-online", "plc-download", "plc-upload", "run-program-mode", "keyswitch", "rslinx", "firmware-revision", "acd-file", "io-force"],

  quiz: [
    {
      q: "You open last month's project file and click Download. What happens to the running controller's program?",
      options: ["Nothing, the controller keeps its own copy", "It is replaced by the file's program, and the controller goes to Program mode", "The two programs are merged", "Only tags that changed are updated"],
      answer: 1,
      explain: [
        "Download does the opposite. The controller's copy is replaced.",
        "Correct. Download overwrites the controller's program and data, which is why a stale file is dangerous.",
        "Logix Designer does not merge on download. You would use Compare or manual edits for that.",
        "A normal download replaces the whole program."
      ]
    },
    {
      q: "Before changing a running controller you do not know well, what should you do first?",
      options: ["Go online and edit right away", "Switch the keyswitch to PROG", "Upload to a dated file as a baseline", "Reboot the laptop"],
      answer: 2,
      explain: [
        "Editing first leaves you with no record of what was there.",
        "Switching to PROG stops the machine and does not save anything.",
        "Correct. An upload captures what is actually running. You can then compare it with other copies.",
        "Rebooting your laptop has no effect on the problem."
      ]
    },
    {
      q: "The keyswitch is in RUN. Which statement is true?",
      options: ["The controller will ignore all tag writes", "The controller cannot be monitored", "It can only be downloaded to", "Software cannot change the controller to Program mode"],
      answer: 3,
      explain: [
        "Tag writes by logic and by HMIs still work in Run mode.",
        "You can monitor in any mode.",
        "A download requires Program mode, so RUN prevents downloading until the key is changed.",
        "Correct. RUN locks the mode so that software cannot pause the controller. That protects against accidents."
      ]
    },
    {
      q: "A download fails with a revision mismatch. Which fix is least disruptive to the plant?",
      options: ["Change the project's controller revision to match, then verify and test", "Flash the controller firmware immediately", "Replace the controller", "Disable electronic keying"],
      answer: 0,
      explain: [
        "Correct. Aligning the project to the controller avoids touching the hardware, but you must re-verify and test the logic.",
        "Flashing firmware can wipe the program and affects the hardware. It needs a plan.",
        "Replacement is costly and unnecessary.",
        "Electronic keying is about modules, not the controller's firmware revision."
      ]
    },
    {
      q: "What do RSLinx Classic and FactoryTalk Linx do?",
      options: ["They provide the communication driver so software on a PC can reach controllers", "They edit ladder logic", "They monitor firmware health", "They convert .ACD files to .L5X"],
      answer: 0,
      explain: [
        "Correct. They are the drivers that let Logix Designer and HMIs reach the controller.",
        "Ladder is edited in Logix Designer.",
        "They do not monitor firmware health.",
        "Export to L5X is a function inside Logix Designer."
      ]
    }
  ],

  resources: [
    { title: "Studio 5000 Logix Designer Online Help", url: "https://www.rockwellautomation.com/en-nl/docs/studio-5000-logix-designer/37-00/contents-ditamap.html", type: "docs", source: "Rockwell Automation" },
    { title: "Quick Start Steps (Logix Designer)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/quick-start-steps.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Common Procedures (1756-PM001)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Design Software Technical Documentation", url: "https://www.rockwellautomation.com/en-us/support/documentation/technical/factorytalk-software/design.html", type: "docs", source: "Rockwell Automation" }
  ]
});
