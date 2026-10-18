## Persona

OT network engineer (CCNP). Designs Stratix and Cisco plant networks, builds DLR rings, and troubleshoots with ping, Test-NetConnection and Wireshark. Reviewed against docs/HOUSE_STANDARD.md and docs/FACTS.md. Quiz answer indices and explain arrays were checked for all seven lessons and align.

## Per-lesson findings

### net-data
- **[high accuracy]** "Bits 0, 5 and 9 are set, so the drive is ready, at speed and faulted." → 0x0A21 is 0000 1010 0010 0001. The upper byte 0x0A also sets bit 11, so bits 0, 5, 9 and 11 are set. Change to "Bits 0, 5, 9 and 11 are set" and say "check the manual for bit 11" in the sentence that follows.
- **[med consistency] (verify)** "word order as a device setting" (body, Where this shows up) vs. "flip the word-order setting on the Ignition device or tag" (body, DINT example) vs. "In Ignition's Modbus driver this is the data type suffix on the address" (body, Strings/bits). The lesson gives three locations for the same setting. Pick the one the Ignition 8.3 Modbus driver actually uses and state it once.
- **[low clarity]** "An INT energy counter in watt-hours rolls over in under two days at a busy plant." → Show the arithmetic with a stated load (32,767 Wh is about 33 kWh), or drop the claim. HOUSE §7 asks for stated numbers.

No other significant issues. The 0x0FF0, 0x0014, 0xFFFE, 0x43666666, 100000/0x86A0 and 2.4E-41 (0x000042C8) values all check out.

### net-ethernet
- **[med accuracy]** "Gigabit requires auto-negotiation by the standard." → Scope this to copper 1000BASE-T. Fiber gigabit (SX/LX) does not use copper auto-negotiation the same way (verify).
- **[low missing]** "(300 seconds is a common default)" → HOUSE §7 asks for a cited number or "check the manual." Change to "check your switch manual; aging time is configurable."
- **[low accuracy] (verify)** "Managed industrial switches such as the Stratix family also let you see port status from Studio 5000 or a web page" → Confirm which Stratix families expose port status in Studio 5000 before keeping this claim.

Otherwise sound. The duplex-mismatch story (late collisions on the half-duplex side, CRC on the full-duplex side) is correct and matches the quiz.

### net-models
- **[high consistency]** "An HMI at 10.20.10.50 cannot read a PLC at 10.20.10.10 over Modbus TCP." → HOUSE §3 puts HMIs on VLAN 20 (10.20.20.0/24). An HMI on the control VLAN is itself a design finding. Use 10.20.20.50 for the HMI.
- **[med consistency]** "allow TCP 502 from the Ignition gateway at 10.20.100.10 to 10.20.10.0/24" → The Ignition master is 10.20.30.10 (VLAN 30). 10.20.100.0 is not in the plan. The rule also contradicts quiz 4, which calls the tightest rule one that names source and destination. Fix: "from 10.20.30.10 to the meter's single address" (for example 10.20.10.20).
- **[low missing]** The layer lesson never names ICMP or says that ping is layer 3, not TCP/UDP. The troubleshoot lesson relies on that distinction. Add one line.

### net-routing
- **[high accuracy/consistency]** "Ignition (10.20.100.10) can ping a new PLC (10.20.10.40), but a read never completes ... The PLC was configured with a mask but no gateway, so it cannot answer a different subnet." → An ICMP echo reply to a host on another subnet needs the PLC's gateway. If the PLC cannot answer across subnets, the ping from 10.20.100.10 cannot succeed. Rewrite: a same-subnet host pings the PLC fine, and Ignition's reads from another subnet fail with SYNs arriving and no SYN-ACK leaving.
- **[high consistency]** Quiz 5 stem: "Ping works from Ignition to a PLC, but Ignition's reads never complete." → Same contradiction. Reword the stem to a same-subnet ping success with a cross-subnet read failure.
- **[med accuracy]** "When ping works in one direction only, check the return route." (note under "The return path") → ICMP is a round trip, so "ping works one way" is not a real symptom. Replace with "a TCP read that connects in one direction and gets no reply back."
- **[med consistency]** "10.20.50.31 ... 10.20.50.(machine number * 10 + 1)" (machine builder section and example) → HOUSE §3 assigns VLAN 40 to OEM skid uplinks with 1:1 NAT (10.20.40.0/24). VLAN 50 is engineering workstations. Use 10.20.40.x for the translated addresses.
- **[med consistency]** "HMI at 10.20.10.50 wants to read a PLC at 10.20.11.10" (routing walkthrough) → Use the plan's inter-VLAN pair: HMI 10.20.20.50 (VLAN 20) to PLC 10.20.10.10 (VLAN 10). 10.20.11.0/24 is not in §3.
- **[med accuracy] (verify)** "documentation names the 5700, 5400 and 5200 families" (NAT note) and "Rockwell Stratix switches offer a feature for this called DHCP persistence" (option 82 section) → Confirm which Stratix models support 1:1 NAT and what the DHCP feature is named in current docs. The note hedges, but the family list and feature name are specific.
- **[low verify]** "Ignition has an option to resolve client hostnames by reverse DNS." → Confirm the setting exists in 8.3 and where it is.
- **[low consistency]** Ignition at 10.20.100.10 appears in the walkthrough, the NAT diagram and the Ignition example. Use 10.20.30.10.

### net-topology
- **[med accuracy] (verify)** "REP (Resilient Ethernet Protocol) | Cisco proprietary | Typically under 50 ms | Cisco and Stratix switches only" → Confirm which Stratix models run REP and cite the 50 ms figure. The "Stratix only" claim is the risky part.
- **[med accuracy] (verify)** "Ring size is limited, commonly around 50 nodes in vendor guidance." → Name the vendor document or say "check your DLR supervisor's documented node limit." Do not present a vendor-specific number as general.
- **[low accuracy] (verify)** "Both HMIs plug into a Stratix access switch that also connects the ring (the switch is a ring node itself)" → Confirm the specific Stratix model supports DLR node operation before the sizing example depends on it.
- **[low consistency]** "[PLC1]Line3_DLR.RingFault" → HOUSE §2 limits underscores to after a prefix or between area and name. Use `Line3DLR` or `Line3_DLR` only if the team agrees the pattern.
- **[low accuracy] (verify)** "The ODVA added Device Level Ring to the EtherNet/IP specification around 2009" (history) → Confirm the date or drop it.

Otherwise sound. The DLR timing example checks out: 4 times 20 ms gives 80 ms, and 10 ms times 4 gives 40 ms. The supervisor role and beacon behaviour are correct.

### net-troubleshoot
- **[med consistency]** "The PLC is a CompactLogix at 10.10.10.10, the HMI at 10.10.10.50, the gateway at 10.10.30.5." → None of these match HOUSE §3 (PLC1 10.20.10.10, Ignition master 10.20.30.10, HMI on VLAN 20). The same drift appears in the ipconfig sample (DNS 10.10.30.2), the power meter (10.10.50.20) and the drive (10.10.10.30). Rewrite on the 10.20.x plan, or add one sentence saying the story uses a non-reference network.
- **[med missing]** "1. **Physical.** The HMI's link light is on, and the PLC's switch port shows green." → The layer table promises a switch MAC-table and port check, but the story never reads port speed, duplex or error counters. Add a step for those. Late collisions and CRC counters are the usual cause of intermittent I/O (see net-ethernet).
- **[med missing] OT safety** "Do not plug an unmanaged laptop with DHCP or discovery tools into a control VLAN." → Also cover active testing. Port scans and sweeps against older PLC and drive stacks can exhaust their few TCP connection slots and drop I/O. Test only the ports you need, and prefer passive capture on a mirror.
- **[low verify]** "`modbus.func_code > 128`" → Confirm the field name and filter behaviour in current Wireshark. Exception responses may be better filtered on the exception field.
- **[low missing]** The Windows capture steps omit Npcap. Add that Wireshark on Windows needs it for live capture.

### net-wireless
- **[med accuracy] (verify)** "aiming for about -67 dBm or better in the work area" → HOUSE §7 requires a cited number or "check your site survey criteria." Cite the source or reword.
- **[low accuracy]** "Polling 40 tags once a second ... adds up to many gigabytes a month ... often a hundredth of that traffic." → Show the arithmetic with stated assumptions (groups, bytes per exchange, heartbeat interval). The example is plausible but unshown. The "hundredth" figure is not supported.

Otherwise sound. The Wi-Fi roaming, WirelessHART bitrate (about 250 kbps), 802.15.4 2.4 GHz, and "safety and closed-loop control stay wired" points match HOUSE §6 and the quizzes.

## Cross-lesson issues

1. **IP plan drift (med-high, all lessons with addresses).** HOUSE §3 defines control 10.20.10.0/24, HMI 10.20.20.0/24, Ignition master 10.20.30.10, OEM skid NAT 10.20.40.0/24 and engineering 10.20.50.0/24. The lessons use four different plans: 10.10.x.x (net-troubleshoot), 10.20.100.10 for Ignition (net-models, net-routing), HMI on 10.20.10.x (net-models, net-routing), and PLC on 10.20.11.x (net-routing), plus NAT addresses in VLAN 50 (net-routing). HOUSE §1 requires lessons to use the reference plant, and says any deliberate exception is flagged in one sentence. None of these examples flags itself. Fix: move every example onto §3, or add one sentence marking each as a non-reference network.
2. **Unsourced specific numbers (med).** HOUSE §7 bans uncited numbers. Affected: 300 s MAC aging (net-ethernet), -67 dBm (net-wireless), about 50 DLR nodes and 50 ms REP (net-topology), the Stratix NAT and DHCP feature claims (net-routing), and the traffic estimates (net-wireless). Cite each one at point of use, or say "check the manual for your version."
3. **Ping semantics (med).** net-routing treats ping as a one-way test. net-troubleshoot correctly says ping is an ICMP round trip. Make net-routing match net-troubleshoot once the ping example is rewritten.

## One-line verdict

Solid fundamentals and correct quiz keys, but fix the status-word bit omission, the ping-without-gateway contradiction in net-routing, the IP-plan drift against HOUSE §3, and the unverified Stratix/DLR/REP claims before release.
