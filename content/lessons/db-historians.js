LC.lesson({
  id: "db-historians",
  title: "Historians and data lakes: PI, Canary, InfluxDB, cloud",
  track: "db",
  minutes: 20,
  level: 3,
  prereqs: ["db-timeseries"],
  tags: ["historian", "pi", "canary", "influxdb", "timescaledb", "data-lake", "cloud", "compression"],
  summary: "What dedicated process historians do that SQL tables don't, how the main products differ, and how plant data reaches a cloud data lake.",
  objectives: [
    "Explain how swinging-door compression decides which points to store and how interpolation fills the gaps",
    "Describe what an asset model (PI AF) adds beyond raw tags",
    "Compare PI, Canary, the Ignition historian, InfluxDB, TimescaleDB and QuestDB at a decision-making level",
    "Name the standard paths from plant to cloud: MQTT, Kafka and vendor connectors",
    "Distinguish a data lake from a data warehouse and choose a historian approach for a given site"
  ],

  body: `
## Why a separate historian exists

A {{term:historian|historian}} stores time-stamped process values for years and answers questions like "show me this temperature for the last 18 months." You can build that on a relational database, and Ignition's Tag Historian does (see {{lesson:ign-historian}} and {{lesson:db-timeseries}}). Dedicated time-series products exist because plant data has unusual properties: millions of tags, mostly slow-changing values, writes that never stop, reads that almost always ask for a time range of one or a few tags, and old data that is never updated.

A general-purpose SQL table stores every row at full cost. A purpose-built historian stores less, compresses harder, and returns a trend over a year in seconds. The tradeoff is another system to license, secure and learn.

## Compression: storing less without lying

Most process values sit still or drift. Storing a reading every second for a tank holding steady at 72.4 percent is waste. Historians use two filters.

**Exception (deadband).** At the source, drop a new value if it differs from the last reported one by less than a small amount. This is the same idea as {{term:deadband|deadband}} in report-by-exception.

**Compression.** At the archive, keep only the points needed to redraw the curve within a tolerance. The classic method is {{term:swinging-door|swinging door}} compression, patented by Bristol in the 1980s and used in the PI system. Picture a door pivoting on the last stored point. Each new value narrows the range of lines (the "door") that stay within the allowed deviation of every value since. When a new value can no longer be covered by any single straight line, the previous point is stored and a new door begins. The archive keeps only the corner points, and a straight line between them is guaranteed to stay within the deviation.

{{diagram:swing}}

Settings in PI are exception deviation, compression deviation and minimum and maximum times. The PI Square discussion of compression settings listed in Resources is a good starting point for how the two deviations relate: exception filtering is the coarse first screen near the instrument's real precision, and compression is the archive-side tolerance. Specific ratios vary by tag type and by vendor guidance, so check the current AVEVA documents before changing a production system.

| Approach | What is stored | What you can recover |
|---|---|---|
| Store everything | Every sample | Exact history, biggest storage |
| Deadband only | Samples that changed enough | Close to exact, values held flat between |
| Swinging door | Corner points only | A curve within tolerance, not the raw samples |
| Lossless compression (Canary describes its storage this way) | All data, encoded compactly | Exactly what was written |

### Interpolation

When you ask for a value at 10:00:00 and the stored points are at 09:58 and 10:03, the historian computes it. **Linear interpolation** draws a straight line between the two stored points. **Stepped** (previous value) holds the last value flat, which suits states like a pump status or a setpoint. Tags should be marked as continuous or stepped so the answer is honest.

> [!warning] Compression changes your numbers
> If you aggregate compressed data naively (say, average the stored points), you weight each corner point equally even though one might represent a ten-minute plateau and another a ten-second spike. Good historians offer **time-weighted** averages. Use them. If you export compressed points to a data lake and average them there, the result will be wrong.

## Asset models

A legacy tag name like \`LINE1_M101_SPD_PV\` is only useful if you know what it means. An **asset model** organises tags into a hierarchy of equipment with meaningful attributes:

\`\`\`text
Plant1
  Area10
    Line1
      M101 (motor)
        Speed       -> M101.Sts.Speed
        Running     -> M101.Sts.Running
      LT101 (level transmitter)
        Level       -> LT101
\`\`\`

AVEVA PI's Asset Framework (AF) provides this, with templates so that you define "Motor" once and create as many of them as you need, plus calculations (analyses) and event frames that mark things like batches or downtime periods. Ignition does the same job with UDTs and tag folders, and the plant schema in this track (\`line\`, \`machine\`, \`production_run\`, \`downtime_event\`) is its relational counterpart. The question to ask a vendor is not "do you store tags?" but "how do I add motor M102 without rebuilding everything?"

## The products at a glance

| Product | Type | Strength | Watch for |
|---|---|---|---|
| **AVEVA PI** (formerly OSIsoft) | Proprietary process historian | Huge installed base, mature AF asset model, swinging-door compression, many interfaces, enterprise-scale reliability | License cost, a dedicated skill set, Windows-centric |
| **Canary** | Process historian | Simple to deploy, lossless compression, built-in store-and-forward, a time-series-friendly web and API layer, priced for mid-sized sites | A smaller ecosystem than PI |
| **Ignition Tag Historian** | SQL-based historian on your own database | Uses Ignition's Tag Historian module rather than a separate product, tag config is part of your project, trends in Perspective work out of the box | Scales with your database design; partitioning and retention are your job. See {{lesson:db-timeseries}} |
| **InfluxDB** | Open-source time-series database | Data model built on measurements, tags (indexed) and fields (values); fast writes; common in IT and IoT stacks | High tag-cardinality hurts; query language and version differences |
| **TimescaleDB** | PostgreSQL extension | Full SQL, hypertables that auto-partition by time, optional columnar compression; joins to your relational tables | You still run and tune PostgreSQL |
| **QuestDB** | Open-source time-series database | Very fast ingest and SQL-like queries | Younger ecosystem; fewer industrial interfaces |

Timescale describes its compression as converting older chunks into a columnar form, with high ratios quoted by the vendor for suitable data (see the vendor's compression page, and measure on your own data). Treat vendor ratios as best case.

> [!note] An Ignition-friendly pattern
> TimescaleDB is PostgreSQL, so Ignition connects to it with the regular PostgreSQL driver and keeps writing through its usual historian path. Teams pair Ignition with it to get partitioning and compression while keeping SQL for reports. Test your Ignition version and the Postgres settings first, since the historian creates its own partitioned tables and the interaction with hypertables needs checking.

## From plant to cloud

Executives increasingly want plant data in the cloud, in a **data lake** or **data warehouse**.

| | Data lake | Data warehouse |
|---|---|---|
| Holds | Raw files and records in many shapes (Parquet, JSON, CSV) | Cleaned, modelled tables |
| Schema | Applied when you read it | Defined when you load it |
| Typical products | Azure Data Lake Storage, Amazon S3, Databricks lakehouse | Snowflake, Azure Synapse, Amazon Redshift, Google BigQuery |
| Use | Data science, machine learning, long-term archive | BI dashboards and enterprise reporting |

Many platforms blur these into a "lakehouse." For a process engineer the main point is that they are built for analytics across plants and are not meant for operating a plant. A cloud outage must never stop production, so the cloud is a destination, not a dependency.

### How data gets there

{{diagram:path}}

1. **MQTT / Sparkplug.** Edge gateways publish values to a broker. A cloud service or subscriber lands them in storage. This is the lightweight path and fits report-by-exception. See {{lesson:proto-sparkplug}} and {{lesson:arch-mqtt}}.
2. **Kafka (or Event Hubs / Kinesis).** A durable, replayable event stream sits between sources and several consumers. Use it when many applications need the same feed. A connector or bridge usually moves MQTT messages onto a topic.
3. **Vendor connectors.** PI, Canary and Ignition can push to cloud services through supported adapters. Examples are PI integrating with AVEVA's cloud and other platforms, Canary's cloud and API options, and Ignition's cloud-side modules.
4. **Batch files or database replication.** Export daily Parquet or CSV files, or replicate tables. Simple and fine when hourly data is enough.

Design concerns, in order of pain:

- **Context.** A tag value without its asset, units and quality is worthless in a lake. Send the model (via Sparkplug metadata, UNS topic structure or AF) with the data. See {{lesson:mes-uns}}.
- **Security and direction.** Connections go outbound from Level 3 or the DMZ through a controlled path. Don't open the plant for the cloud. See {{lesson:net-security}}.
- **Volume and cost.** Cloud bills scale with storage and queries. Send what analytics needs, at the right resolution, not every one-second sample.
- **Time.** Always UTC, always carrying source timestamps, not arrival time.
- **Back-fill.** When the link drops, data must buffer at the edge and catch up in order.

## Choosing

There is no best product. Use the decision, not the brand.

| Situation | Reasonable choice |
|---|---|
| One plant, Ignition as SCADA, a few thousand tags | Ignition Tag Historian on a well-tuned SQL database |
| Heavy history, many engineers trending months of data, mixed SCADA vendors | A dedicated historian (PI, Canary) beside Ignition |
| Corporate standard already PI | Use PI. Write Ignition tag data into it or read from it through OPC UA |
| IIoT and analytics team comfortable with open source | InfluxDB or TimescaleDB, with an asset model somewhere |
| Cross-plant analytics, ML, finance reporting | Land data in a lake or warehouse from the historian, via MQTT or Kafka |
| Needs SQL joins with production and quality tables | TimescaleDB or the relational historian |

Ask these questions in order: How many tags, how fast, and for how long? Who consumes the history and with which tools? Who will own it after you leave? What does the plant already license? What happens during an outage of the historian, the network and the cloud?

> [!example] Worked example
> A bottling plant has 40,000 tags. At a one-second scan that is 40,000 values a second at the source. With exception and swinging-door compression a historian might keep a small fraction, since most values barely change, so the archive grows at a rate you can plan for. Stored as raw SQL rows at roughly 40 bytes each with indexes, the same stream is 144 million rows an hour, about 5.8 GB per hour, before any compression. That is why the plant keeps the high-resolution stream in a dedicated historian for two years, sends hourly aggregates for each \`machine\` to a Snowflake warehouse for finance, and keeps only the tags its Perspective screens need in the Ignition SQL historian.
`,

  eli5: `
Imagine you track how tall a plant grows by taking a photo every minute. Most photos look identical to the last one. You could keep them all and need a warehouse. Or you could keep only the photos where something changed, and write on the back "everything between these two photos grew in a straight line."

A **historian** does exactly that for factory numbers. It keeps just the interesting moments, and when you ask "how tall was it at lunchtime?" it works out the answer from the nearest two photos. That is compression and interpolation.

An **asset model** is the label on each photo: "M101, speed", instead of just "sensor 203."

A **data lake** is a giant storage shed in the cloud where you pour photos from every factory, and a **warehouse** is a tidy library where only the sorted and labelled ones go. Getting photos from the factory to the shed is done with delivery trucks called MQTT and Kafka.
`,

  why: `
**Why not just use SQL for everything?** For a small site, you can, and Ignition's historian proves it works. The pressure comes from volume and time. Process data is append-only, queried by time range, and enormous. A row-per-sample table with an index on time and tag pays for flexibility that history doesn't need. Time-series stores turn that around: they partition by time, drop or merge old data cheaply, and compress by exploiting the fact that neighbouring values are similar.

**Why does compression cause arguments?** Lossy compression (swinging door) saves space and can make a trend look right while hiding data. A short spike narrower than the deviation never appears. A regulator or a root-cause investigation may demand the raw samples. Lossless storage gives you the exact record at a higher disk cost. Both camps are defensible. Decide per tag: critical process variables and anything used for compliance get tight or no compression, ambient temperature gets loose compression.

**Why the asset model?** Because ten years from now nobody remembers what \`TT_203\` was. Historian projects that skip the model produce data that only the original engineer can read. Models also make the cloud and analytics step possible, since a data scientist needs to ask for "all fillers" and not a hand-made list of tags.

**Why is the cloud a destination?** Control must not depend on a link to a data center. The proven pattern keeps the local historian authoritative, buffers at the edge, and sends copies outward. If the cloud vanishes for a week, the plant runs and the buffer catches up.

**What do integrators argue about?** Vendor lock-in against operational maturity (PI's cost against open source's DIY), and where the single source of truth sits: in the plant historian, in the UNS, or in the lake. A reasonable answer is that the historian owns high-resolution operational history, the lake owns the cross-plant analytical history, and both agree on asset names.
`,

  history: `
Dedicated process historians appeared in the early 1980s, when plants needed to keep years of data on small, expensive disks. OSIsoft's PI became the default process historian in many industries; AVEVA acquired OSIsoft in 2020 and the product is now sold as AVEVA PI. The swinging door algorithm comes from a Bristol patent in the late 1980s. Open-source time-series databases such as InfluxDB and TimescaleDB grew out of the 2010s monitoring and IoT boom, and cloud data warehouses and lakes became common in manufacturing during the late 2010s.
`,

  examples: [
    {
      title: "Reading a swinging-door trend",
      body: `A reactor temperature tag is stored with a compression deviation of 0.5 degC. The archive holds points at 10:00:00 (80.0), 10:12:30 (83.0) and 10:13:10 (83.1). Ask for 10:06:15 and the historian interpolates halfway on the first segment: 81.5 degC. The sensor may have wiggled by up to 0.5 degC either way during those twelve minutes and you will not see it, because the compression allowed it.`
    },
    {
      title: "Landing plant data in the cloud",
      body: `The Plant 1 Area10 edge node publishes Sparkplug B to a local broker (topic \`spBv1.0/Plant1/DDATA/Area10_Line1/M101\`, metric \`Sts/Speed\`). A bridge maps each metric to the plant's UNS form, \`meridian/plant1/area10/line1/m101/sts/speed\`, and forwards it to an Event Hubs topic. A stream job writes Parquet files to a lake, partitioned by day, and an hourly job loads averages into a Snowflake table keyed by \`machine_id\`. Engineers query the warehouse for cross-plant OEE, while the plant keeps its own Ignition and PI history for operations.`
    }
  ],

  diagrams: {
    swing: `<svg viewBox="0 0 640 250" role="img" aria-label="Swinging door compression: raw samples within a corridor around a straight line between two stored points are discarded; only the corner points are archived">
  <line class="dg-line" x1="50" y1="210" x2="610" y2="210"/>
  <line class="dg-line" x1="50" y1="210" x2="50" y2="30"/>
  <text class="dg-text-sm" x="560" y="232">time</text>
  <text class="dg-text-sm" x="16" y="26">value</text>
  <polygon class="dg-zone" points="80,160 300,95 300,125 80,190"/>
  <line class="dg-line-accent" x1="80" y1="175" x2="300" y2="110"/>
  <circle class="dg-fill-accent" cx="80" cy="175" r="6"/>
  <circle class="dg-fill-accent" cx="300" cy="110" r="6"/>
  <circle class="dg-fill-line" cx="120" cy="165" r="3"/>
  <circle class="dg-fill-line" cx="150" cy="150" r="3"/>
  <circle class="dg-fill-line" cx="185" cy="152" r="3"/>
  <circle class="dg-fill-line" cx="220" cy="135" r="3"/>
  <circle class="dg-fill-line" cx="255" cy="125" r="3"/>
  <line class="dg-line-accent" x1="300" y1="110" x2="400" y2="60"/>
  <circle class="dg-fill-accent" cx="400" cy="60" r="6"/>
  <circle class="dg-fill-alarm" cx="340" cy="60" r="4"/>
  <text class="dg-text-sm" x="318" y="48">new value</text>
  <text class="dg-text-sm" x="300" y="150">too far from the corridor,</text>
  <text class="dg-text-sm" x="300" y="166">so the corner point is stored</text>
  <text class="dg-text" x="70" y="76">Shaded band: allowed deviation</text>
  <text class="dg-text-muted" x="70" y="96">Small dots are raw samples that are dropped.</text>
</svg>`,
    path: `<svg viewBox="0 0 640 210" role="img" aria-label="Data path from plant to cloud: Ignition and local historian at the plant, an MQTT broker, Kafka or an event hub, then a data lake and a data warehouse">
  <defs><marker id="dbh-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-zone" x="14" y="20" width="190" height="170" rx="6"/>
  <text class="dg-title" x="26" y="42">Plant (OT)</text>
  <rect class="dg-box-accent" x="26" y="54" width="166" height="44" rx="4"/>
  <text class="dg-text dg-mid" x="109" y="81">Ignition + edge</text>
  <rect class="dg-box" x="26" y="112" width="166" height="44" rx="4"/>
  <text class="dg-text dg-mid" x="109" y="139">Local historian</text>
  <text class="dg-text-muted" x="26" y="178">buffers if the link drops</text>
  <rect class="dg-box" x="238" y="62" width="150" height="44" rx="4"/>
  <text class="dg-text dg-mid" x="313" y="82">MQTT broker</text>
  <text class="dg-text-muted dg-mid" x="313" y="98">Sparkplug B</text>
  <rect class="dg-box" x="238" y="122" width="150" height="44" rx="4"/>
  <text class="dg-text dg-mid" x="313" y="142">Kafka / Event Hubs</text>
  <text class="dg-text-muted dg-mid" x="313" y="158">durable stream</text>
  <rect class="dg-box-ok" x="430" y="48" width="190" height="52" rx="4"/>
  <text class="dg-text dg-mid" x="525" y="72">Data lake</text>
  <text class="dg-text-muted dg-mid" x="525" y="90">S3, ADLS, Databricks</text>
  <rect class="dg-box-ok" x="430" y="118" width="190" height="52" rx="4"/>
  <text class="dg-text dg-mid" x="525" y="142">Data warehouse</text>
  <text class="dg-text-muted dg-mid" x="525" y="160">Snowflake, Synapse</text>
  <line class="dg-line" x1="192" y1="76" x2="236" y2="84" marker-end="url(#dbh-ah)"/>
  <line class="dg-line" x1="313" y1="108" x2="313" y2="120" marker-end="url(#dbh-ah)"/>
  <line class="dg-line" x1="388" y1="76" x2="428" y2="74" marker-end="url(#dbh-ah)"/>
  <line class="dg-line" x1="388" y1="144" x2="428" y2="144" marker-end="url(#dbh-ah)"/>
</svg>`
  },

  pitfalls: [
    "Averaging compressed points without time-weighting, which gives wrong results in the lake.",
    "Loosely compressing tags that an investigation or regulator might need exactly.",
    "Sending raw tag names to the cloud with no asset, units or quality.",
    "Making production depend on a cloud link instead of buffering at the edge.",
    "Choosing a historian by brand before counting tags, rate, retention and who will own it.",
    "Mixing local time and UTC across sites, then trying to join the data."
  ],

  keyTerms: ["historian", "swinging-door", "interpolation", "asset-model", "pi-system", "canary-historian", "influxdb", "timescaledb", "data-lake", "data-warehouse", "kafka"],

  quiz: [
    {
      q: "A swinging-door historian stores points at 10:00 and 10:10 only. You request the value at 10:05. What happens?",
      options: ["The query returns an error because no sample exists", "The historian interpolates between the two stored points", "It returns the raw sample from the PLC at 10:05", "It returns zero"],
      answer: 1,
      explain: [
        "Historians are designed to answer for any timestamp.",
        "Correct. The system interpolates, either linearly or as a stepped value depending on tag type.",
        "Compression discarded the raw samples, so they no longer exist in the archive.",
        "A missing stored sample doesn't produce zero."
      ]
    },
    {
      q: "Why can a compressed historian hide a short spike?",
      options: ["The PLC never saw the spike", "Interpolation deletes outliers", "Spikes are always stored as bad quality", "A spike narrower than the allowed deviation fits inside the corridor and is discarded"],
      answer: 3,
      explain: [
        "The PLC may have seen it. The loss happens at the archive or at exception filtering.",
        "Interpolation only fills gaps. It doesn't delete stored points.",
        "Quality is a separate field and is unrelated to compression.",
        "Correct. Swinging door guarantees the curve stays within the deviation, so smaller excursions are not preserved."
      ]
    },
    {
      q: "What does an asset model like PI AF give you that a flat tag list does not?",
      options: ["Equipment hierarchy, templates and context so 'all fillers' is a query", "Faster disk writes", "Lossless compression", "Automatic cloud upload"],
      answer: 0,
      explain: [
        "Correct. Templates let you define a Filler once and apply it to many machines, and analytics can work by asset.",
        "An asset model organises meaning. It doesn't speed up writes.",
        "Compression is a separate feature of the archive.",
        "Cloud upload is configured elsewhere."
      ]
    },
    {
      q: "A cloud team wants every plant's data in one place for machine learning and finance reports. Which statement describes a sound design?",
      options: ["Control the line from the cloud so the data is always in sync", "Open an inbound firewall rule from the cloud to the Level 3 database", "Keep the local historian authoritative, buffer at the edge, and push outbound through MQTT or Kafka to a lake or warehouse", "Replace every plant historian with the warehouse"],
      answer: 2,
      explain: [
        "Control must not depend on a cloud link.",
        "Inbound access to Level 3 from outside is the pattern to avoid.",
        "Correct. The plant keeps running if the cloud is gone, and data catches up from the edge buffer.",
        "Warehouses are not built for real-time operations or tag trending in the plant."
      ]
    },
    {
      q: "Which pairing is correct?",
      options: ["Data lake: cleaned and modelled tables loaded on a schema first", "Data warehouse: raw files in many formats with schema applied on read", "Both are the same product under two names", "Data lake: raw data kept in open formats, schema applied when read"],
      answer: 3,
      explain: [
        "That describes a warehouse.",
        "That describes a lake.",
        "They overlap in lakehouse products, but they are different concepts.",
        "Correct. Lakes hold raw files such as Parquet and JSON, and structure is imposed at query time."
      ]
    },
    {
      q: "A site has one plant, Ignition SCADA, 5,000 tags and a DBA who already runs SQL Server. Which is the most defensible starting choice?",
      options: ["Ignition Tag Historian on a well-designed SQL database, with retention and partitioning planned", "Buy a full PI System and AF", "Send everything straight to a cloud warehouse", "Skip history and rely on the PLC trends"],
      answer: 0,
      explain: [
        "Correct. It fits the scale and skills. Revisit if volume or consumers grow.",
        "That may be right for a large enterprise, but it adds cost and skills this site doesn't yet need.",
        "A warehouse is not a trending tool and leaves the plant with no local history.",
        "PLC trend buffers are short and not for long-term records."
      ]
    }
  ],

  resources: [
    { title: "How Data Moves through the PI System", url: "https://community.aveva.com/pi-square-community/learning-forums/f/forum/94545/how-data-moves-through-the-pi-system", type: "forum", source: "AVEVA PI Square" },
    { title: "Considering PI Archive performance when selecting compression settings", url: "https://community.aveva.com/pi-square-community/f/forum/89292/considering-pi-archive-performance-when-selecting-compression-settings", type: "forum", source: "AVEVA PI Square" },
    { title: "Canary Historian storage methodology (version 24)", url: "https://helpcenter.canarylabs.com/t/h7y8gl1/canary-historian-storage-methodology-version-24", type: "docs", source: "Canary" },
    { title: "Canary Historian overview", url: "https://www.canarylabs.com/product/historian", type: "article", source: "Canary" },
    { title: "InfluxDB key concepts", url: "https://docs.influxdata.com/influxdb/v1/concepts/key_concepts/", type: "docs", source: "InfluxData" },
    { title: "Hypertables and chunks", url: "https://docs.timescale.com/api/latest/hypertable/", type: "docs", source: "Timescale" },
    { title: "Compression in TimescaleDB", url: "https://docs.timescale.com/use-timescale/latest/compression/", type: "docs", source: "Timescale" }
  ]
});
