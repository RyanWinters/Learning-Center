# Fixes: plc-b (plc-udt, plc-aoi, plc-organization, plc-languages, plc-state-machines, plc-isa88-packml, plc-faults, plc-comms, plc-best-practices, plc-safety, plc-other-vendors)

## plc-udt
- Fixed: house `UDT_Motor` with nested Cmd/Sts/Cfg/Alm and exact HOUSE members (M101 paths, Ignition `Motor` UDT, tagPath). Units removed from member names. Diagram and quiz updated.
- Softened: BOOL packing. Removed the "five BOOLs share one DINT, 4 bytes" claim; the host width is not asserted, readers are told to read the size in the Data Type editor. (Glossary `bool-packing` in a9.js still says "32-bit blocks"; not my file.)

## plc-aoi
- Fixed: AOI uses `UDT_Motor` (`Sts.Fault`, `Cfg.StartDelay`), instance `M101`, `Area10_Enable`; valve example uses `FV101`; added note that overload/E-stop are hardwired.

## plc-organization
- Fixed: uncited task limit removed; torn-data protection now names staging structure + valid flag or single-task copy (program parameters/produced tags are not atomic); `UDT_` prefixes; 12 ms is 12 percent of the task period, not CPU; one sentence on the Line level; Pump examples changed to motors.

## plc-languages
- Fixed: quiz 3 explanation (and question wording) for preemption; seal-in now on `M101_RunCmd` with hardwired-protection note; `Motors[i]` of `UDT_Motor`; history softened; preset-in-tag line.

## plc-state-machines
- Fixed: one numbering (0/10/20/30/900) in table, CASE, worked example, Ignition map, stuck-sequence example and quiz; transition-ordering explanation rewritten (EQU-gated timers protect timer steps, already-true level conditions can chain); step timeout/fault state linked to {{sim:sim-step-fault}}.

## plc-isa88-packml
- Fixed: Meridian Plant 1 / Area10 Batching; `UDT_`/`AOI_` names; Stopped moved to the Stop group; Fault flag name; Ignition path.
- Softened: modes list, revision history (2015/2022 specifics).

## plc-faults
- Fixed: GSV/SSV pseudo-code now labelled pseudo-code and uses class Program, instance THIS; table/example instance for WallClockTime made consistent; "red OK light" reworded; fault-routine location added.
- Softened: resume point after clearing, bad-attribute GSV behaviour, battery-low minor fault (removed).

## plc-comms
- Fixed: complete three-rung MSG polling set (timer, one-shot reset on DN or ER placed before the MSG rung, MSG rung gated by XIO(EN)); EN/DN/ER explained; `UDT_Handshake`; house IPs for PLC1/PLC2.
- Softened: "Rockwell advises preferring reads" now "many integrators prefer" with pointer to 1756-PM012; MSG queue size removed everywhere (check manual); RPI ranges softened.

## plc-best-practices
- Fixed: naming rules exactly per HOUSE section 2; FactoryTalk AssetCentre named; L5X import-overwrite warning plus lab exercise; Cmd/Sts/Cfg/Alm with house members; `P101_Pump` style names replaced (`P101`, `P101_RunFbk`, `P101_RunOut`); units moved to descriptions; checklist item on hardwired overload/E-stop.

## plc-safety
- Fixed: new stop categories 0/1/2 section tied to the motor starter, `{{lesson:plc-sealin}}` and `{{lesson:found-motor-control}}`.

## plc-other-vendors
- Fixed: quiz 4 explanation (PLCopen XML / IEC 61131-10 exchange program units only); OEM skid addresses moved to VLAN 40 NAT plan.
- Softened: OPC UA licensing wording; Siemens optimized-access/PUT-GET statement points to the driver manual.

## Notes
- `sim-step-fault` does not exist in content/sim yet; the reference was requested by the brief.
- Not run: WebSearch (none needed; uncertain claims were hedged instead).
