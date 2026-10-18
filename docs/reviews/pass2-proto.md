## Persona

Industrial communications specialist: Modbus RTU/TCP, RS-232/422/485 wiring, PROFIBUS/PROFINET/DeviceNet/ControlNet, MQTT and Sparkplug brokers, DNP3 for utilities. Reviewed against docs/HOUSE_STANDARD.md and docs/FACTS.md. Cross-lesson references were checked: every `{{lesson:...}}` target in these six files exists.

## Per-lesson findings

### proto-serial
- **[med consistency]** "Ethernet gateway at 10.20.30.40 accepts Modbus TCP on port 502" (example "One gateway, six drives") → HOUSE_STANDARD §3 puts drives on VLAN 10 (10.20.10.0/24, "PLCs, I/O adapters, drives") and VLAN 30 is Level 3 servers. Use a VLAN 10 address (e.g. 10.20.10.x) and say the gateway sits in the control zone.
- **[low accuracy]** "Poll twenty such devices one after another and a full scan takes close to a second." → 20 x 34 ms is about 0.7 s before turnaround and silent gaps. Say "about 0.7 s before turnaround and gaps, so close to a second in practice" or drop the figure.
- **[low accuracy (verify)]** Table row "RS-232 cable gets warm or does nothing | TX to TX ..." → a TX-to-TX fault is not a normal cause of a warm cable. Keep the "does nothing" symptom and drop "gets warm".
- **[low missing]** No mention of isolated converters or surge protection for runs that leave a building or sit near VFD/welder ground. Add one sentence: "Isolated converters and surge protection on any run that leaves the building."

### proto-modbus
- **[med missing]** "Modbus only knows bits and 16-bit words" with no mention of signed vs unsigned. A temperature of -5 °C arrives as 65531 in an unsigned tag. → Add one line: "The same 16 bits are INT or UINT depending on the tag type. A negative value showing as 65,000-plus means the tag is UINT."
- **[low missing]** The HOUSE UDT has `Alm.CommLoss`, but the lesson never says how a device reports comm loss. → Add: "Many meters and drives have a watchdog or heartbeat register. Write it from Ignition and alarm if it stops changing."
- **[low accuracy (verify)]** "The 'master/slave' terms were officially replaced with 'client/server' in 2020." → Check the Modbus Organization date before publishing.
- **[low consistency (verify)]** `HRF101` as the float address format → confirm against the Ignition 8.3 Modbus address-mapping page. FACTS #5 (one-based default, HR1 = 40001) is consistent with the rest of the lesson.

### proto-mqtt
- **[med consistency]** Example topics `plant1/line2/filler/temperature` and `water/stationA/pump1/flow` do not use the HOUSE_STANDARD §2 plain-MQTT form `meridian/plant1/area10/line1/m101/sts/running`. The "water" example is also off-plant with no "on purpose" sentence (§ intro). → Use the house topic form, or add one sentence saying the water example is deliberate.
- **[low accuracy]** Table row "Reason codes on acknowledgments | 3.1.1: Mostly none, a failed connect just closes" → 3.1.1 CONNACK does carry return codes (0 to 5). The real difference is that 3.1.1 has no reason codes on PUBACK, SUBACK or DISCONNECT. → Reword: "3.1.1: CONNACK return codes only (0-5); no reason codes on other acks."
- **[low accuracy (verify)]** "Ignition's MQTT modules and many gateways speak 3.1.1 first." → No source. Cite the Ignition MQTT docs or soften to "check each product's version support."

### proto-fieldbus
- **[med accuracy]** "The PLC writes the 20 values into the gateway's input area." → Direction is wrong. The PROFIBUS master writes to a slave's output area, and the slave sends its input area to the master. Fix: "The PLC writes the 20 values to the gateway's output area, and the gateway's Modbus server exposes them." (verify terminology against the gateway vendor's manual.)
- **[low missing]** No mention of safety-rated fieldbus traffic (PROFIsafe on PROFINET/PROFIBUS, CIP Safety on DeviceNet/EtherNet/IP). One sentence: "Safety I/O on these networks is outside the SCADA integration scope and stays in the safety PLC."
- **[low consistency]** Specific figures are uncited: "32 stations per segment", "64 nodes", "121 ohm", "31.25 microseconds", "125, 250 and 500 kbit/s". Per HOUSE_STANDARD §7, add "check the manual for your version" or link the spec.

### proto-others
- **[med missing]** The "why" section cites "legacy protocols with weak security" but DNP3 security is never described. Add a paragraph on DNP3 Secure Authentication (SAv5) and IEC 62351 for 61850 traffic, and say "check the device profile for which one is enabled" (verify the SAv5 detail before publishing).
- **[low accuracy (verify)]** "The master ... Class 1, 2 and 3 ... with priority chosen by you." → DNP3 class numbers do not set priority. The master chooses how often each class is polled. Fix: "The master chooses the poll rate for each class."
- **[low consistency]** HOUSE_STANDARD §7 targets Ignition 8.3 with "In 8.1" notes. This lesson says the DNP3 driver "has changed across 8.1 releases" and lists the 8.1 manual first. Name the 8.3 driver (the Modbus and DNP3 OPC UA-module drivers) and add an "In 8.1" callout.

### proto-polling-rbe
- **[med clarity]** "RBE wins only when most tags are quiet most of the time ... Even if the break-even is closer, with 100% of tags changing, RBE would cost 1.5 times polling here." → The break-even is exact: RBE is cheaper while fewer than 20/30 (about 67%) of tags change per cycle. Fix: "RBE is cheaper while fewer than about two-thirds of tags change in a cycle (20 / 30). At 100% changing it costs 1.5x polling."
- **[med missing]** The deadband section never says a deadband must not suppress quality or status changes. A tag that goes bad at the same value must still report. Add: "Quality and state changes bypass the deadband. A value that stays at 100.0 while its quality goes Bad is still a report."
- **[med consistency]** HOUSE_STANDARD §7 bans uncited numbers. Unsourced figures: "about 20 bytes per tag per cycle", "about 30 bytes per changed tag", "Typical choices are 0.5 to 2% of span", "a consumer that hears nothing for 2 to 3 intervals". → Label them as planning assumptions ("replace with measured values from your link"), or cite.
- **[low accuracy (verify)]** Ignition note: "The OPC UA subscription itself only sends data that changed, subject to a deadband on analog values." → Verify against the Ignition OPC UA tag deadband docs for 8.3.
- **[low missing]** No mention of historian compression interacting with an edge deadband (double filtering). One sentence and a link to {{lesson:ign-historian}}.

## Cross-lesson issues

- **Address and topic conventions:** the serial example puts a VLAN 30 gateway where HOUSE_STANDARD §3 puts drives (VLAN 10), and the MQTT examples use generic and water topics instead of the house UNS form. Fix both to match the house standard.
- **Uncited numbers:** serial, fieldbus and polling-rbe all state specific figures (distances, node counts, byte counts, deadbands) without source or "check the manual" language, contrary to HOUSE_STANDARD §7.
- **Consistent across lessons (no action):** Modbus one-based addressing matches FACTS #5. The Modbus, serial and MQTT port choices (502, 1883, 8883) match HOUSE_STANDARD §4. The RBE latency and bandwidth arithmetic (200 KB/s, 6 KB/s, 10 s cycle, 1/33) is correct.
- **Quizzes:** all 33 items across the six lessons have an answer index that points at the correct option, and each explain array has four entries in the same order.

## One-line verdict

Technically strong and the arithmetic checks out, but fix the PROFIBUS data-direction error, the RBE break-even sentence and the missing quality-bypass rule, add the house VLAN and topic conventions, and cite or label the bare numbers before publishing.
