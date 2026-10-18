LC.lesson({
  "id": "build-alarms-history",
  "title": "Lab 3: Alarms and history for the motor",
  "track": "build",
  "minutes": 45,
  "level": 3,
  "prereqs": [
    "build-faceplate",
    "ign-alarming",
    "ign-historian"
  ],
  "tags": [
    "lab",
    "alarms",
    "historian",
    "trend",
    "deadband",
    "sql"
  ],
  "summary": "Add priority-ranked alarms with delays and deadbands to the Motor UDT, show them in an alarm status table, log Sts members with sensible deadbands, trend with system.historian and check the rows in the database.",
  "objectives": [
    "Create a database history provider and alarm journal on meridian_db",
    "Add UDT-level alarms with priorities, active delays and a deadband",
    "Display alarms in an Alarm Status Table filtered to Line1",
    "Enable history on Sts members with appropriate sample modes and deadbands",
    "Query history with system.historian.queryRawPoints and verify rows in SQL"
  ],
  "body": "\nRight now your motor shows data. This lab makes it **accountable**: alarms that tell an operator what needs action, and history that lets you answer \"what happened at 02:14?\" You will add alarms and history to the `Motor` UDT definition so M101, M102 and M103 and every motor you add later inherit both. Concepts are in {{lesson:ign-alarming}}, {{lesson:ign-historian}} and {{lesson:int-alarm-mgmt}}.\n\n{{diagram:flow}}\n\n## Part 0: Prepare the storage\n\nAlarm journal and history need a database. You made `meridian_db` in {{lesson:build-setup}}.\n\n1. In the Gateway Config area, open Tags > History (the historian providers) and create a **database historian provider** that uses `meridian_db`. Name it `meridian_hist`. In 8.3 the built-in Core Historian also exists and does not use your database. This lab uses the database provider so you can look at the raw rows.\n2. In the Config area under Alarming, create an **alarm journal** profile that uses `meridian_db`. Name it `meridian_journal`.\n\nYou should see both profiles listed as running, and new tables (names beginning `sqlt` for history, `alarm_events` and `alarm_event_data` for the journal) appear in the database after the first events.\n\n## Part 1: Add alarms to the UDT definition\n\nOpen the `Motor` definition in the Designer's UDT Definitions tab. For each tag below, open the tag's properties, find the **Alarms** category, add an alarm, and set the fields.\n\n| Tag | Alarm name | Trigger | Priority | Active delay | Why |\n|---|---|---|---|---|---|\n| `Alm/Overload` | Overload | Boolean true | High | 0 s | Protective trip already happened. No reason to wait |\n| `Alm/FailToStart` | FailToStart | Boolean true | High | 0 s | The PLC already timed it out |\n| `Alm/CommLoss` | CommLoss | Boolean true | Medium | 5 s | Brief communications blips should not call anyone |\n| `Sts/Fault` | MotorFault | Boolean true | Medium | 2 s | Summary fault bit from the PLC |\n| `Sts/Speed` | SpeedHigh | Value above `Cfg/SpeedHigh` | Low | 10 s | Process warning, not a trip |\n\nThe exact mode names depend on your build. Look for \"Equal to value\" or a Boolean mode for the bits, and \"Above setpoint\" for the speed alarm. The setpoint can be bound to the tag `{InstanceName}`-relative `Cfg/SpeedHigh` so each motor uses its own limit.\n\nFor each alarm also set:\n\n- **Display path**: use something readable such as `{InstanceName}`, so the table shows `M101`.\n- **Deadband** on SpeedHigh: for example 2 Hz, so it clears only when speed drops 2 Hz below the setpoint.\n- **Ack mode**: leave the default (acknowledge required) for High alarms.\n- **Notes**: a one-line operator action. \"Check motor for overheating. Reset overload at the starter.\"\n\n> [!tip] Priority is a promise\n> The priority says how fast someone must act. Do not mark everything High. A common outcome of ignoring that is an alarm flood where operators acknowledge everything without reading. See {{lesson:int-alarm-mgmt}} and the alarm philosophy in {{lesson:int-lifecycle}}.\n\nBecause the alarms live in the definition, every instance has them as soon as you save. Open `M103` in the Alarm Status of the tag browser, or use the Designer's alarm status panel, and you should see Overload and MotorFault active.\n\n## Part 2: Test delays and deadband\n\n1. Edit the simulator program so M101's `Alm.CommLoss` is true for 3 seconds, then false. With a 5 second active delay it should never alarm. Make it 8 seconds and it should.\n2. Raise `M101.Cfg.SpeedHigh` below the current speed and watch SpeedHigh go active after 10 seconds. Lower speed by less than the deadband and confirm it stays active.\n\nWrite down what you saw. This is the content of a real alarm test sheet.\n\n## Part 3: Build an alarm status table\n\n1. On a new page view `Alarms`, add an **Alarm Status Table** component.\n2. In its filter settings, set the **source path** to `prov:default:/tag:Plant1/Area10/Line1/*` so it shows alarms under Line1. The component supports wildcards, and you can bind the path so the same table works for any line. Check the exact path syntax for your build in the component docs.\n3. Set the columns to show Display Path, Priority, State, Active time and Label.\n4. Acknowledging works from the table. Acknowledge one alarm and look at its state change.\n\nYou should see: M103's alarms listed, acknowledged and unacknowledged states styled differently. M101 is clean.\n\n> [!note] Alarm state versus condition state\n> Active and unacknowledged, active and acknowledged, cleared and unacknowledged, cleared and acknowledged are four distinct states. Watch an alarm go through each.\n\n## Part 4: Turn on history\n\nIn the UDT definition, set history on the **Sts** members:\n\n| Tag | History enabled | Sample mode | Deadband | Why |\n|---|---|---|---|---|\n| `Sts/Running` | Yes | On Change | Discrete | Every transition matters. This feeds OEE later |\n| `Sts/Fault` | Yes | On Change | Discrete | Same |\n| `Sts/Speed` | Yes | On Change | Analog, 0.5 Hz absolute (or 1 percent) | Ignore noise, keep real movement |\n| `Sts/RunHours` | Yes | On Change | Analog, 0.1 h | Slow counter. Large deadband avoids needless rows |\n| `Sts/Auto`, `Sts/Ready` | Yes | On Change | Discrete | Mode changes explain behavior |\n\nPick `meridian_hist` as the history provider. Set a **maximum time between samples** (heartbeat), such as 5 minutes, for Speed so a flat line shows as \"still alive\" and not as missing data. Leave `Cfg` and `Cmd` unlogged. Cfg changes rarely and Cmd bits are momentary.\n\n> [!warning] Deadband sets what you can ever know\n> A deadband throws data away at the source. You cannot get back a 0.2 Hz wiggle later if your deadband was 0.5. Choose it from the instrument's real noise and what a decision needs. Check the manual for the deadband styles in your version.\n\nLet it run for 10 to 15 minutes. The simulator's moving Speed and M102's toggling Running give you data.\n\n## Part 5: A trend with the 8.3 historian functions\n\nAdd a **Time Series Chart** to a page, or read in a script first. The 8.3 function for raw history is `system.historian.queryRawPoints`:\n\n```python\nend = system.date.now()\nstart = system.date.addMinutes(end, -30)\npaths = [\"[default]Plant1/Area10/Line1/M101/Sts/Speed\"]\nds = system.historian.queryRawPoints(paths=paths, startTime=start, endTime=end)\nprint ds.getRowCount()\n```\n\nFor one number per window, use `system.historian.queryAggregatedPoints` with an aggregate such as average or maximum. Parameter names and accepted path forms changed in a later 8.3 patch release, so check the function page for your exact version before relying on keyword arguments.\n\n> [!note] In 8.1\n> The same job is `system.tag.queryTagHistory` (raw) and `system.tag.queryTagCalculations` (aggregates). In 8.3 these are deprecated but still run. New code uses `system.historian.*`.\n\nFor the chart component, configure a tag history binding on the pens for `Sts/Speed` of M101 and give the chart a time range of the last 30 minutes. Compare what the script returns with the chart.\n\nYou should see: a speed line that matches the simulator's function, and a Running trace for M102 that steps between 0 and 1.\n\n## Part 6: Verify in the database\n\nOpen a SQL client (see {{lesson:db-intro}} for tools) or run in the container:\n\n```text\ndocker compose exec db psql -U ignition -d meridian\n```\n\nCheck that history is landing:\n\n```sql\nSELECT id, tagpath FROM sqlth_te WHERE tagpath LIKE 'plant1/area10/line1/m10%' ORDER BY tagpath;\n```\n\nTag paths are stored in lowercase. Then count data rows for one tag (the table name includes the partition year and month):\n\n```sql\nSELECT COUNT(*) FROM sqlt_data_1_2026_10 WHERE tagid = <the id from above>;\n```\n\nCheck the alarm journal:\n\n```sql\nSELECT eventtime, source, eventtype FROM alarm_events ORDER BY eventtime DESC LIMIT 20;\n```\n\nThe partition name depends on today's date and your historian's settings. If the name is wrong, list tables that start with `sqlt_data`.\n\nYou should see: rows for Running, Fault, Speed and RunHours, with Speed having far fewer rows than the simulator updates, thanks to the deadband. The journal lists active and clear events for M103 and the tests you ran.\n\n## Common mistakes\n\n- **Alarms on every bit with the same priority.** Decide the priority by the required response time.\n- **No active delay on communication or process-limit alarms**, producing chatter. See {{lesson:int-alarm-mgmt}}.\n- **Configuring alarms on instances.** Put them on the definition.\n- **History with no deadband on an analog.** Every simulator update becomes a row.\n- **Using the old `system.tag.queryTagHistory` in new code.** It runs, but it is deprecated in 8.3.\n- **Looking in the wrong partition table** and concluding history is empty.\n\n## Result check\n\nAn operator sees M103's alarms with the right priority. A report writer can query M102's stops from the database. And a new motor instance inherits both behaviors without configuration.\n",
  "checklist": [
    "Database history provider meridian_hist created and running",
    "Alarm journal meridian_journal created on meridian_db",
    "Alarms defined on the Motor definition for Overload, FailToStart, CommLoss, MotorFault and SpeedHigh",
    "Priorities differ and match the response required",
    "CommLoss active delay 5 s and MotorFault 2 s set",
    "SpeedHigh uses Cfg/SpeedHigh as setpoint with a deadband",
    "M103 shows Overload and MotorFault active in the tag browser alarm view",
    "A 3 s CommLoss blip does not alarm and an 8 s one does",
    "Alarm Status Table on Alarms page filtered to Plant1/Area10/Line1",
    "An alarm acknowledged from the table and its state change observed",
    "History enabled on Running, Fault, Auto, Ready, Speed and RunHours with on-change sampling",
    "Speed uses an analog deadband and a maximum time between samples",
    "system.historian.queryRawPoints returns rows for M101 Speed in the last 30 minutes",
    "SQL against sqlth_te and the data partition shows rows for the motors",
    "Alarm journal table shows active and clear events"
  ],
  "eli5": "\nThink of a baby monitor and a diary. The monitor makes a noise only when something needs a parent's attention. If it beeped every time the baby breathed, you would turn it off, and then miss the real cry. That is the alarm: loud only when action is needed, and a short wait so a single hiccup does not wake you.\n\nThe diary is the history. You do not write down every second. You write when something changes, or once in a while to say \"still sleeping.\" If you wrote down every tiny wiggle, the diary would be too big to read and you would not find the important entries.\n\nBoth are set up on the motor's blank form, so every motor you add after that gets the monitor and the diary for free.\n",
  "why": "\n**Why alarms in the UDT and not on each instance?** An instance-level alarm is a one-off that nobody remembers. A definition-level alarm is a documented behavior that applies to all equipment of that type. When the plant decides that an overload is High, one edit changes it everywhere.\n\n**Why active delays?** A signal that blips for half a second is not an event a person can respond to. Delays filter blips from real conditions, at the price of reacting later. Integrators argue about how long. The usual answer is as short as the process tolerates and never zero on analog limits. Trips that the PLC has already timed (Overload, FailToStart) do not need another delay.\n\n**Why a deadband on the analog alarm?** Without it, a value that hovers around the limit goes active, clear, active, clear. That is a chattering alarm and it trains operators to ignore alarms.\n\n**Why a historian deadband?** Storage is not the only cost. Queries over millions of rows of noise are slow, and charts become unreadable. But a deadband is irreversible. Set it from the instrument's actual noise and the decisions the data supports.\n\n**Why log Sts but not Cmd?** Commands are momentary and the audit trail belongs in the audit log and the alarm journal. Logging them as tags creates rows that nobody queries. Status tells you what the equipment did, and that is what the OEE lab needs.\n\n**Why verify in the database?** The Designer shows what Ignition thinks it stored. The tables show what is actually on disk. When a report is wrong, the tables are where you start.\n",
  "diagrams": {
    "flow": "<svg viewBox=\"0 0 640 200\" role=\"img\" aria-label=\"A Motor UDT instance feeds the alarm pipeline to the alarm journal and status table, and the tag historian to SQL history tables that scripts and charts query\"><defs><marker id=\"build-alarms-history-ah\" markerWidth=\"10\" markerHeight=\"8\" refX=\"9\" refY=\"4\" orient=\"auto\"><path class=\"dg-fill-line\" d=\"M0,0 L10,4 L0,8 z\"/></marker></defs><rect class=\"dg-box-accent\" x=\"20\" y=\"70\" width=\"150\" height=\"60\" rx=\"6\"/><text class=\"dg-title\" x=\"34\" y=\"96\">Motor UDT</text><text class=\"dg-text-sm\" x=\"34\" y=\"116\">alarms + history</text><rect class=\"dg-box\" x=\"260\" y=\"20\" width=\"150\" height=\"50\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"274\" y=\"50\">Alarm journal</text><rect class=\"dg-box\" x=\"260\" y=\"130\" width=\"150\" height=\"50\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"274\" y=\"160\">Tag historian</text><rect class=\"dg-box\" x=\"480\" y=\"20\" width=\"140\" height=\"50\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"494\" y=\"50\">Status table</text><rect class=\"dg-box\" x=\"480\" y=\"130\" width=\"140\" height=\"50\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"494\" y=\"160\">Trend, scripts</text><line class=\"dg-line\" x1=\"170\" y1=\"90\" x2=\"258\" y2=\"48\" marker-end=\"url(#build-alarms-history-ah)\"/><line class=\"dg-line\" x1=\"170\" y1=\"110\" x2=\"258\" y2=\"152\" marker-end=\"url(#build-alarms-history-ah)\"/><line class=\"dg-line\" x1=\"410\" y1=\"45\" x2=\"478\" y2=\"45\" marker-end=\"url(#build-alarms-history-ah)\"/><line class=\"dg-line\" x1=\"410\" y1=\"155\" x2=\"478\" y2=\"155\" marker-end=\"url(#build-alarms-history-ah)\"/></svg>"
  },
  "pitfalls": [
    "Putting alarms on instances so they drift from the standard.",
    "Giving every alarm the same priority.",
    "Analog alarms with no delay and no deadband, which chatter.",
    "Historizing analog values with no deadband and filling the database with noise.",
    "Checking the wrong monthly partition table and deciding history is missing."
  ],
  "keyTerms": [
    "ign-alarm",
    "alarm-priority",
    "alarm-active-delay",
    "alarm-journal",
    "chattering-alarm",
    "deadband",
    "tag-historian",
    "historian-deadband-style",
    "sqlth-tables",
    "tag-history-binding"
  ],
  "quiz": [
    {
      "q": "Why does CommLoss have a 5 second active delay but Overload has none?",
      "options": [
        "Overload is less important",
        "Delays are only allowed on Medium alarms",
        "CommLoss cannot be Boolean",
        "Overload is a protective trip the PLC already confirmed, while comm loss often blips and would produce false alarms"
      ],
      "answer": 3,
      "explain": [
        "It is the opposite: Overload is a trip and needs immediate attention.",
        "Delays can be set on any priority.",
        "It is Boolean by definition.",
        "Correct. A delay filters transients, and a latched trip is not a transient."
      ]
    },
    {
      "q": "A speed alarm keeps going active and clear around the limit. What fixes it?",
      "options": [
        "A higher priority",
        "A deadband (and delay) on the alarm",
        "Turning off history",
        "Moving the alarm to the instance"
      ],
      "answer": 1,
      "explain": [
        "Priority does not change how often it toggles.",
        "Correct. A deadband makes the alarm clear only after the value falls clearly below the limit.",
        "History does not affect alarm evaluation.",
        "Location does not change the chatter."
      ]
    },
    {
      "q": "Why is the deadband on history 'irreversible'?",
      "options": [
        "It deletes existing rows",
        "It locks the table",
        "Values inside the deadband are never stored, so that detail cannot be recovered later",
        "It disables queries"
      ],
      "answer": 2,
      "explain": [
        "Existing rows stay.",
        "It does not lock anything.",
        "Correct. The historian discards in-band changes at write time.",
        "Queries still work."
      ]
    },
    {
      "q": "You need the average motor speed per 5 minutes for a report. Which 8.3 function fits best?",
      "options": [
        "system.historian.queryAggregatedPoints",
        "system.tag.queryTagHistory",
        "system.db.runQuery",
        "system.historian.queryRawPoints with no window"
      ],
      "answer": 0,
      "explain": [
        "Correct. Aggregated points collapse time windows into one value per aggregate.",
        "It still runs but is deprecated in 8.3.",
        "That reads SQL tables directly and ignores the historian's structure.",
        "Raw points return stored samples, not per-window aggregates."
      ]
    },
    {
      "q": "Why define alarms in the UDT and not on each instance?",
      "options": [
        "Ignition forbids instance alarms",
        "One definition is one documented behavior for all motors, and a change reaches every instance",
        "Instance alarms are not logged",
        "It makes alarms faster"
      ],
      "answer": 1,
      "explain": [
        "They are allowed. They are just harder to manage.",
        "Correct. That is the point of types.",
        "They are logged the same way.",
        "Speed does not change."
      ]
    }
  ],
  "resources": [
    {
      "title": "Configuring Alarms",
      "url": "https://www.docs.inductiveautomation.com/docs/8.1/platform/alarming/configuring-alarms",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Perspective - Alarm Status Table",
      "url": "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-display-palette/perspective-alarm-status-table",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Configure an Alarm (video)",
      "url": "https://inductiveuniversity.com/videos/configure-an-alarm/8.3",
      "type": "video",
      "source": "Inductive University"
    },
    {
      "title": "system.historian.queryRawPoints",
      "url": "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-historian/system-historian-queryRawPoints",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "system.historian.queryAggregatedPoints",
      "url": "https://docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-historian/system-historian-queryAggregatedPoints",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Configuring Tag History (8.3)",
      "url": "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian/configuring-tag-history",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Ignition Historian Guide",
      "url": "https://www.docs.inductiveautomation.com/docs/8.3/tutorials/ignition-historian-guide",
      "type": "docs",
      "source": "Inductive Automation"
    }
  ]
});
