# Audit: terminology and reference world

Checked: reference plant names, equipment tags, UDT members/paths, IP plan, ports, analog scale, Logix defaults, and ~20 concept spellings across lessons, sims and files. validate.js and sim-test.js pass.

## Fixed
- arch-redundancy: quiz IP 10.10.5.20 -> 10.20.10.10 (PLC1).
- proto-others: BACnet subnets 10.1.1.0/10.1.2.0 -> 10.20.30.0/10.20.10.0.
- net-troubleshoot, plc-studio: 192.168.x laptop now labelled "home-network address". (net-ip, net-routing 192.168 uses are deliberate teaching: private ranges, OEM 1:1 NAT.)
- arch-eam: "Plant 9" -> Plant 3.
- "Meridian Plant N" -> "Meridian Foods Plant N" (9 places).
- persp-hphmi: HMI screen label P-101 -> P101.
- found-motor-control: M101_AuxIn/M101_OLOK -> M101_Aux/M101_OL_OK (matches plc-sealin).
- scan class -> tag group in ign-devices, ign-logix-driver, ign-architecture, net-data, net-wireless, db-intro, db-timeseries, ign-historian (ign-tags states the old name once).
- store and forward -> store-and-forward (about 38 places); "Ignition gateway" -> "Ignition Gateway"; lowercase gateway network -> Gateway Network (6); e-stop -> E-stop (~20); Ethernet/IP -> EtherNet/IP (int-capstone); 4-20 mA spelling (hmi-abnormal, hmi-type-numbers, found-signals, plc-compare-math).
- docs/HOUSE_STANDARD.md: new section 8 Vocabulary.

## Verified consistent
K101 in mes-batch is TK101 (fine). P101_Pump in int-naming is already a listed failing example. LT101 0-5.0 m, counts 6242/31208, PLC1 10.20.10.10, Ignition 10.20.30.10, ports 62541/8060/8043/8088, Logix defaults (2 requests, size 500) all agree. Files in content/files match the house standard.

## Needs a decision
- "Gateway" vs "gateway": ~750 vs ~970 uses in lessons, mixed even within lessons. Convention is documented; a safe mass change needs per-sentence review.
- Hyphenated tags in narrative on non-drawing pages (plc-isa88-packml P-101/XV-101A, int-lifecycle test script, int-commissioning alarm names) left as document/drawing contexts.
- Diagram labels "L3", "L4-5", "L3.5" (net-security, net-timesync) left; widths may not fit "Level".
- Range punctuation mixes en dash (hmi-*) and hyphen/"to" elsewhere; left.
- Number format 6242 vs 6,242 mixed; left.
