# Fixes: proto lessons

## proto-sparkplug
- Fixed: new "Securing a Sparkplug network" section (TLS 8883, per-edge-node credentials, ACLs by group/edge node, NCMD/DCMD write authorization, net-security link); new quiz item; topics/examples/diagram now Plant1 / Area10_Line1 / M101 per HOUSE section 2, with a note not to put ISA-95 paths in Sparkplug topics.

## proto-mqtt
- Fixed: all topics/filters/quiz/diagram use `meridian/plant1/area10/line1/m101/sts/running` form; water example replaced with LT101 on Line1; 3.1.1 vs 5 reason-code row corrected (CONNACK codes 0-5 only).
- Softened: "Ignition's MQTT modules speak 3.1.1 first" now "check each product's manual".

## proto-enip
- Fixed: new "Securing EtherNet/IP" section (CIP Security, keyswitch/mode, trusted sources and write restrictions kept general, "check the manual"); examples use PLC1 10.20.10.10 and M101 tags.

## proto-opc
- Fixed: trust-list overstatement; added "trust gates the channel, user auth and roles gate actions" with anonymous access guidance.
- Softened: did not name an exact Ignition menu for anonymous access ("check the manual for your version"; not verifiable offline).

## proto-fieldbus
- Fixed: PROFIBUS gateway data direction (output area); safety-traffic sentence; figures flagged "check the manual or specification".

## proto-polling-rbe
- Fixed: exact break-even (20/30, about two-thirds); quality/state bypass of deadband; byte counts labelled planning assumptions; historian double-filtering note; removed "0.5 to 2% of span" and softened "2 to 3 intervals".
- Softened: Ignition OPC UA subscription deadband statement.

## proto-serial
- Fixed: gateway moved to 10.20.10.40 (VLAN 10); scan-time arithmetic; "gets warm" removed; isolation/surge sentence.

## proto-modbus
- Fixed: signed vs unsigned note; watchdog/heartbeat register for comm loss.
- Softened: "2020" master/slave claim and HRF address syntax (could not reach vendor site to verify).

## proto-others
- Fixed: DNP3 SAv5 and IEC 62351 paragraph; class-priority wording; 8.3 driver first with "In 8.1" callout; resource order.
- Rejected: none. Glossary: no new terms.
