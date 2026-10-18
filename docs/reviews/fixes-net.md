# Fixes: net lessons

## net-ip
- Fixed: plant IP plan replaced with HOUSE section 3 table; ELI5 now says two reserved addresses with a /24 example and a clearer ruler analogy; body opens with 10.20.10.15 /24 before jargon; /24 reserved-address example added; Line subnet example marked as hypothetical Plant 2 (10.21.x); practice addresses flagged "for the math only".
## net-vlan
- Fixed: plan table = HOUSE section 3 (VLAN 99 mgmt); firewall example and drive example use 10.20.x; Stratix/Smartports querier claim replaced with "check your switch defaults".
## net-security
- Fixed: firewall table on 10.20.x/DMZ 10.20.250.x with 8060/8043/62541/4840/1883/8883, outgoing-from-both-sides DMZ pattern; Gateway Network and Perspective bullets match HOUSE section 4; data diode and monitoring pointer to {{lesson:net-ot-monitoring}}.
## net-models
- Fixed: HMI to 10.20.20.50; firewall sentence uses 10.20.30.10 to single meter address; one line that ping is ICMP at layer 3.
## net-routing
- Fixed: ping/gateway contradiction (example, quiz 5 stem, return-path note, pitfall rewritten to same-subnet ping vs cross-subnet read); walkthrough HMI 10.20.20.50 to PLC1 10.20.10.10 incl. diagram; NAT uses 10.20.40.x; Ignition 10.20.30.10.
- Softened: Stratix NAT/DHCP-persistence model lists, L3 switch family names, reverse DNS option, static-route next hop.
## net-data
- Fixed: 0x0A21 bits 0, 5, 9 and 11; word-order/data-type location stated once with "check the driver page"; INT watt-hour rollover arithmetic shown.
## net-topology
- Softened: DLR/REP recovery figures, DLR node limit, Stratix REP/DLR-node claims, ODVA 2009 date. Renamed Line3_DLR to Line3DLR.
## net-troubleshoot
- Fixed: story and samples moved to HOUSE plan (HMI VLAN 20 to PLC1, arp step corrected for routed path); added port speed/duplex/counters step; active-scan warning; Npcap note; Modbus filter caveat.
## net-ethernet
- Softened: MAC aging time, gigabit auto-negotiation scoped to 1000BASE-T, Stratix Studio 5000 claim.
## net-wireless
- Fixed: polling traffic arithmetic with stated assumptions (about 260 MB/month, the "many gigabytes" claim was wrong); -67 dBm removed in favor of survey criteria.
## Rejected
- None of substance. No glossary additions needed (e2.js unchanged).
