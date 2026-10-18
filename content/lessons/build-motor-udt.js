LC.lesson({
  "id": "build-motor-udt",
  "title": "Lab 1: A motor from PLC UDT to Ignition UDT",
  "track": "build",
  "minutes": 60,
  "level": 3,
  "prereqs": [
    "build-setup",
    "ign-udts",
    "plc-udt"
  ],
  "tags": [
    "lab",
    "udt",
    "tags",
    "opc",
    "simulator",
    "motor"
  ],
  "summary": "Define the Motor UDT with Cmd, Sts, Cfg and Alm folders, drive its OPC paths from two parameters and the simulator, create M101 to M103 and check quality.",
  "objectives": [
    "Program the simulator with Logix-style member names for three motors",
    "Build the Ignition Motor UDT that mirrors UDT_Motor",
    "Drive every OPC item path from the PLC and InstanceName parameters",
    "Create instances M101 to M103 under Plant1/Area10/Line1",
    "Verify tag quality with isGood() and by breaking paths on purpose"
  ],
  "body": "\nYou will define the Meridian `Motor` UDT in Ignition so that it mirrors the PLC's `UDT_Motor`, drive it from the simulator, and create three instances, M101 to M103, by changing two parameters. This is the central pattern of the whole track: one definition, many instances, one path that identifies each. The background is in {{lesson:ign-udts}} and the PLC side is in {{lesson:plc-udt}}. Naming rules are on the [naming sheet](content/files/meridian-naming-sheet.md). If you want to document the data interface first, start from the [FDS outline](content/files/fds-outline.md) and the [I/O list template](content/files/io-list-template.csv).\n\n## The target\n\n{{diagram:udt}}\n\nThe PLC owns `UDT_Motor` with four nested members. Ignition owns a UDT definition named `Motor` with four folders of the same names. Each OPC tag inside points at `ns=1;s=[{PLC}]{InstanceName}.<Member>.<Item>`. Fill the two parameters and the same definition serves any motor.\n\n| PLC member (Logix) | Ignition folder | Tags |\n|---|---|---|\n| `Cmd` | `Cmd` | `Start`, `Stop`, `Reset` (Boolean) |\n| `Sts` | `Sts` | `Running`, `Ready`, `Fault`, `Auto` (Boolean), `Speed`, `RunHours` (Float) |\n| `Cfg` | `Cfg` | `StartDelay` (Integer, ms), `SpeedHigh` (Float), `Description` (String) |\n| `Alm` | `Alm` | `FailToStart`, `Overload`, `CommLoss` (Boolean) |\n\n> [!note] Members are PascalCase\n> Match the PLC spelling exactly. `Running`, not `running` or `RUN`. A typo in the item path gives you a tag that is permanently bad, and nothing warns you except the quality.\n\n## Part 1: Teach the simulator about three motors\n\nThe simulator runs a program. Each instruction has a time interval, a browse path (the name the tag will have), a value source (a static value or a function) and a data type. You build the program in the gateway under the device `PLC1`. In 8.3 the editor may be reached from the device's settings or a program link; look for \"program\" on the device page. You can also import a CSV-style instruction file instead of typing rows.\n\nUse dotted browse paths so they match Logix paths, for example `M101.Sts.Running`. If your simulator turns dots into folders, keep the structure and adjust the UDT item path in Part 3 to match what the OPC browser shows. That is the one place the lab depends on a driver detail.\n\nProgram rows to create for each motor (repeat for `M102` and `M103` with the changes in the second table):\n\n| Browse path | Type | Value source |\n|---|---|---|\n| `M101.Sts.Running` | Boolean | Static `true` |\n| `M101.Sts.Ready` | Boolean | Static `true` |\n| `M101.Sts.Fault` | Boolean | Static `false` |\n| `M101.Sts.Auto` | Boolean | Static `true` |\n| `M101.Sts.Speed` | Float | A sine or ramp function, scaled 0 to 60 (Hz) |\n| `M101.Sts.RunHours` | Float | A slow ramp, such as 1200 upward |\n| `M101.Cfg.StartDelay` | Integer | Static `2000` |\n| `M101.Cfg.SpeedHigh` | Float | Static `58` |\n| `M101.Cfg.Description` | String | Static `Mixer feed motor` |\n| `M101.Alm.FailToStart` | Boolean | Static `false` |\n| `M101.Alm.Overload` | Boolean | Static `false` |\n| `M101.Alm.CommLoss` | Boolean | Static `false` |\n| `M101.Cmd.Start`, `.Stop`, `.Reset` | Boolean | Static `false` |\n\nThe simulator's function list differs by version, so choose whichever ramp, sine or random function your editor offers and set its range. For timed behavior, add rows at later time intervals that set values to something else.\n\nMake the other two motors different on purpose, so your faceplate and alarms have something to show:\n\n| Motor | Change |\n|---|---|\n| `M102` | `Sts.Running` is `true` for a few intervals, then `false`, repeating. This produces stop/start events for the OEE lab. |\n| `M103` | `Sts.Running` `false`, `Sts.Ready` `false`, `Alm.Overload` `true` and `Sts.Fault` `true` after a delay. |\n\n> [!warning] Safety stays out of the data\n> The `Overload` and `Fault` bits represent a hardwired overload relay that the PLC monitors. In the real PLC, protection and E-stops are in the starter circuit, not in software. The simulator just reports what that circuit would say. See the motor safety rule on the naming sheet.\n\nCheck: in the gateway, open the OPC Connections quick client or the Designer tag browser's OPC Connections and confirm that `PLC1` shows items for `M101`, `M102` and `M103` with good quality and moving values.\n\n## Part 2: Define the UDT\n\n1. In the Designer, open the Tag Browser, switch to the **UDT Definitions** tab, and select the `default` provider.\n2. Create a new data type named `Motor`.\n3. Add four folders: `Cmd`, `Sts`, `Cfg`, `Alm`.\n4. Add the tags from the table above inside each folder. Every one is an OPC tag. Set the data type of each (Boolean, Float, Integer or String).\n5. In the UDT's **Parameters**, add two parameters: `PLC` (String, default `PLC1`) and `InstanceName` (String, no default or a placeholder like `M000`).\n\nYou should see: a definition tree with four folders and 15 tags, and two parameters.\n\n## Part 3: Drive the paths from the parameters\n\nFor every OPC tag in the definition, set the **OPC Item Path** to a binding on the parameters. With the house standard it reads:\n\n`ns=1;s=[{PLC}]{InstanceName}.Sts.Running`\n\nDo the same for each tag, changing only the member and item. The OPC Server is the Ignition OPC UA server and the **Server** and **Device** should not need parameters because the `[{PLC}]` part names the device.\n\n> [!tip] Editing many tags\n> Select several tags, edit the shared property once, then fix only the tail of each path. Or export the UDT as JSON from the Tag Browser, edit the item paths in a text editor with find-and-replace, and import it. The JSON route is also how you version UDTs. See {{lesson:ign-versioning}}.\n\nSet sensible tag properties while you are here. Set `Cmd` members to be writable and `Sts`, `Cfg` and `Alm` members to read-only through access rights where your 8.3 build exposes that option. The HMI writes commands and the PLC owns status. If the option is named differently in your build, look for \"Access Rights\" or \"Read Only\" on the tag.\n\nAdd engineering units where they apply: `Hz` on `Sts.Speed`, `ms` on `Cfg.StartDelay`, `h` on `Sts.RunHours`.\n\n## Part 4: Create the instances\n\n1. In the tag browser, open `Plant1/Area10/Line1`.\n2. Right-click, create a new tag, and pick **Data Type > Motor**.\n3. Name the instance `M101`. Set `PLC` to `PLC1` and `InstanceName` to `M101`.\n4. Repeat for `M102` and `M103`.\n\nThe result is the standard instance path `[default]Plant1/Area10/Line1/M101/Sts/Running`.\n\nYou should see: three instances in the tag browser. Open `M101` and watch `Sts/Speed` move and `Sts/Running` stay true. `M102` toggles `Running`. `M103` shows `Fault` true.\n\n## Part 5: Quality checks\n\nA tag showing a value is not enough. Check the quality.\n\n1. In the tag browser, enable the quality overlay or hover a tag to see its quality. Good tags show Good.\n2. **Break a path on purpose.** Edit `M103`'s `InstanceName` to `M999`. Every tag under it should go to a bad quality (item not found). Put it back to `M103` and watch them recover.\n3. **Break the device.** In the gateway config, disable the `PLC1` device. All tags go to bad or stale quality. Re-enable it.\n4. In a Perspective label or the Script Console, test quality properly. In an expression use `isGood({[default]Plant1/Area10/Line1/M101/Sts/Running})`. In a script use `system.tag.readBlocking([\"[default]Plant1/Area10/Line1/M101/Sts/Running\"])[0].quality.isGood()`. Never compare a quality to a number: Ignition 8 quality codes are not the 7.x values (192 for Good in 7.x does not apply). See {{lesson:ign-expressions}}.\n\n```python\npaths = [\"[default]Plant1/Area10/Line1/M101/Sts/Running\",\n         \"[default]Plant1/Area10/Line1/M101/Sts/Speed\"]\nfor p, qv in zip(paths, system.tag.readBlocking(paths)):\n    print p, qv.value, qv.quality, qv.quality.isGood()\n```\n\nYou should see: `True` / `isGood()` true for both when everything is healthy, and `False` after disabling the device.\n\n## Part 6: Test a write\n\nThe Cmd bits are written by the HMI and cleared by the PLC. The simulator does not clear them, so you play the PLC's part.\n\n1. Write `true` to `M101/Cmd/Start` in the tag browser's value editor.\n2. Confirm it changes in the tag and in the simulator's item.\n3. Set it back to `false` by hand.\n\nIn the next lab a button will write the bit; the real PLC logic (or you) clears it. In a real system an unreset command bit is a classic bug.\n\n## Common mistakes\n\n- **Typing the item path as a plain string on each tag.** If you do not bind to `{InstanceName}`, all three instances point at M101.\n- **Parameter names that differ in case** (`instanceName` vs `InstanceName`). References are case sensitive.\n- **Mixing separators.** Logix paths use dots, Ignition tag paths use slashes. The item path uses dots, the tag path uses slashes.\n- **Making `PLC` a tag property instead of a parameter.** You then cannot reuse the UDT against `PLC2`.\n- **Editing instances instead of the definition.** Override a property on an instance and it stops following the definition. Change the definition.\n\n## Where this goes next\n\nThe `Motor` UDT is the single dependency of the rest of the track. In {{lesson:build-faceplate}} you build a screen from one `tagPath`. In {{lesson:build-alarms-history}} you add alarms and history to the definition so every motor inherits them.\n",
  "checklist": [
    "Simulator program on PLC1 has Cmd, Sts, Cfg and Alm items for M101, M102 and M103",
    "OPC browser shows PLC1 items with Good quality",
    "UDT definition Motor exists with folders Cmd, Sts, Cfg, Alm",
    "Definition has parameters PLC (default PLC1) and InstanceName",
    "Every OPC item path is ns=1;s=[{PLC}]{InstanceName}.<Member>.<Item>",
    "Engineering units set on Speed, StartDelay and RunHours",
    "Instances M101, M102, M103 created under [default]Plant1/Area10/Line1",
    "M101 Sts/Speed moves and Sts/Running is true",
    "M102 Running toggles and M103 shows Fault true",
    "Changing InstanceName to a wrong value turns the instance tags bad, and fixing it recovers them",
    "Disabling device PLC1 turns tags bad or stale, and re-enabling recovers them",
    "Quality checked with isGood() in an expression or quality.isGood() in a script",
    "Cmd/Start written true then cleared by hand"
  ],
  "eli5": "\nImagine a form for a school locker: name, locker number, combination, and a space for a note. You do not redesign the form for each student. You print one blank form and fill it in 30 times.\n\nA UDT is the blank form. The PLC has one, listing what it knows about a motor: the buttons you can press, the lights that show status, the settings and the warnings. Ignition has its own matching form. Two blanks on it say \"which PLC\" and \"which motor.\" Fill those in, and every line on the form knows where to look for its data.\n\nIf you later decide every form needs a new line, you add it to the blank and every filled-in copy gets it. That is why you do not copy and paste forms.\n",
  "why": "\n**Why mirror the PLC structure exactly?** The PLC programmer and the screen builder meet at the UDT. If the Ignition folders are `Cmd/Sts/Cfg/Alm` and the PLC members are the same, a new engineer can read a tag path and know the PLC path without a lookup table. Renames in one place that are not made in the other break paths silently.\n\n**Why parameters instead of copied tags?** Copying produces 15 tags times N motors that all need editing when anything changes. A definition with parameters means one change reaches every instance. The cost is that overrides on instances can hide drift, so most integrators forbid them except for real differences.\n\n**Why two parameters, not one?** `PLC` and `InstanceName` change for different reasons. A second line may use another controller with the same motor names, or the same controller with new motors. Separate parameters make both cases a one-field change. Some teams put the whole prefix in one parameter. That is shorter and easier to mistype.\n\n**Why check quality, not just values?** A frozen last value looks normal on a screen. Quality is how Ignition tells you the number is stale or the path is broken. The cheapest time to learn what a bad path looks like is now, in a lab.\n\n**Why does the HMI only write `Cmd`?** One writer per bit. If both the HMI and PLC write a status bit, you cannot tell who is right when they disagree. This is the {{term:cmd-sts-cfg|Cmd/Sts/Cfg}} convention.\n",
  "diagrams": {
    "udt": "<svg viewBox=\"0 0 640 230\" role=\"img\" aria-label=\"The Logix UDT_Motor with Cmd, Sts, Cfg, Alm maps to the Ignition Motor UDT whose OPC item paths use the PLC and InstanceName parameters\"><defs><marker id=\"build-motor-udt-ah\" markerWidth=\"10\" markerHeight=\"8\" refX=\"9\" refY=\"4\" orient=\"auto\"><path class=\"dg-fill-line\" d=\"M0,0 L10,4 L0,8 z\"/></marker></defs><rect class=\"dg-box\" x=\"20\" y=\"30\" width=\"170\" height=\"170\" rx=\"6\"/><text class=\"dg-title\" x=\"34\" y=\"54\">PLC1: UDT_Motor</text><text class=\"dg-text-mono\" x=\"34\" y=\"86\">M101.Cmd</text><text class=\"dg-text-mono\" x=\"34\" y=\"114\">M101.Sts</text><text class=\"dg-text-mono\" x=\"34\" y=\"142\">M101.Cfg</text><text class=\"dg-text-mono\" x=\"34\" y=\"170\">M101.Alm</text><rect class=\"dg-box-accent\" x=\"250\" y=\"30\" width=\"370\" height=\"170\" rx=\"6\"/><text class=\"dg-title\" x=\"264\" y=\"54\">Ignition UDT: Motor</text><text class=\"dg-text-sm\" x=\"264\" y=\"76\">params: PLC=PLC1, InstanceName=M101</text><text class=\"dg-text-mono\" x=\"264\" y=\"106\">Cmd/ Sts/ Cfg/ Alm/</text><text class=\"dg-text-mono\" x=\"264\" y=\"134\">ns=1;s=[{PLC}]{InstanceName}</text><text class=\"dg-text-mono\" x=\"264\" y=\"158\">   .Sts.Running</text><text class=\"dg-text-sm\" x=\"264\" y=\"186\">[default]Plant1/Area10/Line1/M101/Sts/Running</text><line class=\"dg-line\" x1=\"190\" y1=\"115\" x2=\"248\" y2=\"115\" marker-end=\"url(#build-motor-udt-ah)\"/></svg>"
  },
  "pitfalls": [
    "Typing item paths as fixed strings so all instances read M101.",
    "Misspelling a member (Running vs running) and getting a permanently bad tag.",
    "Overriding properties on instances so they no longer follow the definition.",
    "Trusting that a value on screen is current without checking quality.",
    "Leaving Cmd bits true because the simulator does not clear them."
  ],
  "keyTerms": [
    "ign-udt-definition",
    "ign-udt-instance",
    "ign-udt-parameter",
    "cmd-sts-cfg",
    "ign-quality-code",
    "ign-tag-path",
    "udt-member",
    "engineering-units"
  ],
  "quiz": [
    {
      "q": "Three instances all read M101's values. What is the most likely cause?",
      "options": [
        "The simulator only has one motor",
        "The OPC item path in the definition is a fixed string, not bound to the InstanceName parameter",
        "The tag provider is wrong",
        "Quality codes are cached"
      ],
      "answer": 1,
      "explain": [
        "The simulator holds whatever rows you wrote. This would show missing items, not duplicated values.",
        "Correct. If the path text says M101, each instance resolves to M101 no matter what its parameter says.",
        "A wrong provider would break paths, not make three instances share data.",
        "Quality does not change which item a tag reads."
      ]
    },
    {
      "q": "Why keep PLC as a parameter and not hardcode PLC1?",
      "options": [
        "Ignition requires at least two parameters",
        "The same definition can serve a motor on another controller by changing one field",
        "It speeds up OPC reads",
        "It lets operators change the device at runtime"
      ],
      "answer": 1,
      "explain": [
        "There is no such requirement.",
        "Correct. The definition stays generic and the instance supplies the controller.",
        "Parameters are resolved at configuration time and do not affect read speed.",
        "Operators do not edit tag parameters at runtime."
      ]
    },
    {
      "q": "After you set InstanceName to M999 the tags show bad quality. Is that a failure of the lab?",
      "options": [
        "Yes, UDTs must never show bad quality",
        "No, it proves the path resolution works and shows what a broken path looks like",
        "Yes, it means the device is disabled",
        "No, but only if the value stays at its last good number"
      ],
      "answer": 1,
      "explain": [
        "Bad quality is the correct signal for a path that does not exist.",
        "Correct. A tag that points nowhere should be bad. That is the safety net.",
        "The device is fine. The item is not found.",
        "A good design flags the loss, it does not silently hold the last number."
      ]
    },
    {
      "q": "Why check quality with isGood() and not a numeric comparison?",
      "options": [
        "isGood() is shorter to type",
        "Ignition 8 quality codes differ from 7.x, and isGood() works regardless of the underlying number",
        "Numeric comparison throws an error",
        "Good is always zero in Ignition"
      ],
      "answer": 1,
      "explain": [
        "Length is not the point.",
        "Correct. The code numbers changed between versions. The function expresses intent and is version safe.",
        "It would run but give the wrong answer if you used an old constant.",
        "Good is not defined as zero."
      ]
    },
    {
      "q": "Why does the HMI write only the Cmd members?",
      "options": [
        "Sts tags cannot be written in Ignition",
        "One writer per bit: the PLC owns status and config, the HMI owns requests, so disagreements are traceable",
        "Cmd tags are faster",
        "It reduces license usage"
      ],
      "answer": 1,
      "explain": [
        "They can be written. The convention is that you should not.",
        "Correct. Split ownership makes it clear which side is wrong when values disagree.",
        "Speed is the same.",
        "Licensing is unrelated."
      ]
    }
  ],
  "resources": [
    {
      "title": "Programmable Device Simulator",
      "url": "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/opc-ua/opc-ua-drivers/programmable-device-simulator",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "3. Connect to a Device (Quick Start)",
      "url": "https://www.docs.inductiveautomation.com/docs/8.1/getting-started/quick-start-guide/connect-to-a-device",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Alarms in UDTs (7.9 docs, older UI, same idea)",
      "url": "https://www.docs.inductiveautomation.com/docs/7.9/alarming/configuring-alarms/alarms-in-udts",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Feedback: New Programmable Device Simulator",
      "url": "https://forum.inductiveautomation.com/t/feedback-new-programmable-device-simulator/30779",
      "type": "forum",
      "source": "Inductive Automation Forum"
    },
    {
      "title": "Connecting to the Device Simulator",
      "url": "https://inductiveuniversity.com/video/connecting-to-the-device-simulator/8.0",
      "type": "video",
      "source": "Inductive University"
    }
  ]
});
