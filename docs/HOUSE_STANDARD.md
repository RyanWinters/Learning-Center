# House standard

Every lesson, example, quiz and simulator challenge uses these conventions. When a lesson needs a different example on
purpose, it says so in one sentence. Facts that depend on product versions live in `docs/FACTS.md`.

## 1. The reference plant

**Meridian Foods, Plant 1 (Chicago).** Other plants are Plant 2 and Plant 3. HQ is "Corporate".
ISA-95 hierarchy used in names and paths: `Enterprise → Site (Plant1) → Area (Area10 Batching, Area20 Packaging) → Line (Line1) → Equipment`.

## 2. Equipment and UDTs

Equipment tags follow ISA-5.1-style numbers. **On P&IDs, loop sheets, I/O lists and alarm worksheets they are written with a
hyphen** (`LT-101`, `FV-101`, `LAHH-101`), as drawings do. **In PLC, Ignition, database and MQTT names the hyphen is dropped**
(`LT101`, `FV101`), because hyphens aren't valid in Logix tag names. A lesson that crosses from drawing to code shows the mapping once.
Examples: `M101` (motor), `P101` (pump), `FV101` (valve), `LT101` (level transmitter). Loop numbers match the equipment
(LT-101's alarms are LAH-101 / LAHH-101). Number ranges are per area: Area10 uses 100s, Area20 uses 200s.
Units go in descriptions and engineering-unit properties, not in member names (`Cfg.StartDelay`, not `Cfg.StartDelay_ms`).

**Logix UDT** `UDT_Motor` with nested member structures:

| Member | Type | Contents |
|---|---|---|
| `Cmd` | `UDT_MotorCmd` | `Start`, `Stop`, `Reset` (BOOL, written by HMI, cleared by PLC) |
| `Sts` | `UDT_MotorSts` | `Running`, `Ready`, `Fault`, `Auto` (BOOL), `Speed` (REAL), `RunHours` (REAL) |
| `Cfg` | `UDT_MotorCfg` | `StartDelay` (DINT, ms), `SpeedHigh` (REAL), `Description` (STRING) |
| `Alm` | `UDT_MotorAlm` | `FailToStart`, `Overload`, `CommLoss` (BOOL) |

- Logix paths: `M101.Cmd.Start`, `M101.Sts.Running`, `M101.Cfg.SpeedHigh`. Members are PascalCase. An underscore appears only after a prefix (`UDT_`, `AOI_`) or between an area and a name (`Area10_Mixing`).
- **Ignition UDT definition** `Motor` with folders `Cmd`, `Sts`, `Cfg`, `Alm` that mirror the PLC. OPC item path is built from parameters:
  `ns=1;s=[{PLC}]{InstanceName}.Sts.Running`.
- **Ignition instance path:** `[default]Plant1/Area10/Line1/M101/Sts/Running`.
- **Faceplate parameter:** one `tagPath` param (`[default]Plant1/Area10/Line1/M101`). Bindings derive member paths from it.
- **Plain MQTT / UNS topic:** `meridian/plant1/area10/line1/m101/sts/running` (lowercase).
- **Sparkplug B** uses its fixed namespace `spBv1.0/<group_id>/<msg_type>/<edge_node_id>/<device_id>`. Map: group_id = `Plant1`,
  edge_node_id = `Area10_Line1`, device_id = `M101`, metric name = `Sts/Running`. Never put an ISA-95 path in a Sparkplug topic.

## 3. Plant 1 network plan

Site supernet `10.20.0.0/16` (Plant 2 = `10.21.0.0/16`, Plant 3 = `10.22.0.0/16`). Corporate IT = `10.100.0.0/16`. Gateway is `.1` on each subnet.

| VLAN | Purpose | Subnet | Notable hosts |
|---|---|---|---|
| 10 | Control: PLCs, I/O adapters, drives | 10.20.10.0/24 | PLC1 `10.20.10.10`, PLC2 `.11` |
| 20 | HMI clients and panels | 10.20.20.0/24 | |
| 30 | Level 3 servers | 10.20.30.0/24 | Ignition master `10.20.30.10`, backup `.11`, SQL `.20` |
| 40 | OEM skid uplinks (1:1 NAT) | 10.20.40.0/24 | |
| 50 | Engineering workstations | 10.20.50.0/24 | |
| 99 | Network management | 10.20.99.0/24 | |
| 250 | DMZ (Level 3.5) | 10.20.250.0/24 | DMZ gateway / reverse proxy `10.20.250.10`, historian replica `.20`, jump host `.30`, NTP server `.40` |

## 4. Zones, conduits and the DMZ pattern

- No connection passes straight from Level 3 to Level 4 or back. Every connection ends in the DMZ.
- **Gateway Network:** the site gateway makes an *outgoing* connection to the DMZ gateway. The corporate gateway also makes an *outgoing*
  connection to the DMZ gateway. Corporate reaches site services through it (proxy hops). A direct plant↔HQ Gateway Network link is a
  documented exception, never the default.
- **Office users of Perspective:** browser → HTTPS 8043 → DMZ reverse proxy or front-end gateway → Gateway Network → site.
- **Remote support:** VPN into the DMZ jump host, then RDP to an engineering workstation. Never route vendor VPNs straight into VLAN 10.

**Ports used in examples:**

| Port | Use |
|---|---|
| 44818/TCP | EtherNet/IP explicit |
| 2222/UDP | EtherNet/IP implicit I/O |
| 502/TCP | Modbus TCP |
| 8088/8043 | Ignition HTTP/HTTPS |
| 8060/TCP | Ignition Gateway Network |
| 62541/TCP | Ignition OPC UA server |
| 4840/TCP | OPC UA default |
| 1883/8883 | MQTT / MQTT over TLS |
| 1433 / 3306 / 5432 | MSSQL / MySQL / PostgreSQL |
| 3389 | RDP (jump host only) |

## 5. Analog signals

- Teaching card: **1769-IF4-style raw scale, 0–21 mA ↔ 0–32,767 counts**. 4 mA = **6,242**, 20 mA = **31,208**, 3.8 mA ≈ 5,930, 3.6 mA ≈ 5,617, 21 mA = 32,767.
  Always add: "Counts are module-specific. ControlLogix 1756/5069 analog modules usually scale to engineering units in the module."
- **NAMUR NE43** (one table, used everywhere):

  | Current | Meaning | Treat as |
  |---|---|---|
  | 3.8–20.5 mA | Measurement range (3.8–4 and 20–20.5 = slight under/over range) | Good, clamp for display |
  | 3.6–3.8 or 20.5–21 mA | Indeterminate | Uncertain quality, alarm after delay |
  | < 3.6 or > 21 mA | Device or loop failure | Bad quality, fail-safe action |

- **Example transmitter LT101:** 0–5.0 m. Raw → m uses SCP with In 6242–31208 → Out 0.0–5.0.

## 6. Motor control and safety

- Overloads, E-stops and safety-rated stops are **hardwired in the starter coil circuit**. The PLC monitors an auxiliary contact and the overload
  status. It never provides the only means of stopping or protection. Software permissives (process interlocks) belong in logic.
- Seal-in examples seal on a command bit (`M101_RunCmd`) or the run status from an auxiliary contact, and drive the output from it.
  A note explains when sealing on the output is acceptable in teaching rungs.

## 7. Versions and claims

- Target Ignition 8.3, with "In 8.1" notes. Target Studio 5000 v33+ and ControlLogix/CompactLogix 5380/5580.
- No uncited specific numbers (limits, defaults, queue sizes). Cite the source at the point of use, or say "check the manual for your version".
