# Meridian Foods naming sheet (one page)

Use this for every build lab. If a name here disagrees with a lab step, this sheet wins.

## Hierarchy (ISA-95)

`Enterprise > Site (Plant1) > Area (Area10 Batching, Area20 Packaging) > Line (Line1) > Equipment`

Reference plant: **Meridian Foods, Plant 1 (Chicago)**. Other plants are Plant 2 and Plant 3.

## Equipment tags

| Item | Tag | Rule |
|---|---|---|
| Motor | `M101` | ISA-5.1 style, uppercase, no separator |
| Pump | `P101` | Area10 uses the 100s, Area20 the 200s |
| Valve | `FV101` | |
| Level transmitter | `LT101` | 0-5.0 m example |

Lab motors: `M101`, `M102`, `M103`.

## PLC side (Logix)

`UDT_Motor` with nested members. PascalCase members. An underscore only after a prefix (`UDT_`, `AOI_`) or between area and name (`Area10_Mixing`).

| Member | Type | Contents |
|---|---|---|
| `Cmd` | `UDT_MotorCmd` | `Start`, `Stop`, `Reset` (BOOL, HMI writes, PLC clears) |
| `Sts` | `UDT_MotorSts` | `Running`, `Ready`, `Fault`, `Auto` (BOOL), `Speed` (REAL), `RunHours` (REAL) |
| `Cfg` | `UDT_MotorCfg` | `StartDelay` (DINT ms), `SpeedHigh` (REAL), `Description` (STRING) |
| `Alm` | `UDT_MotorAlm` | `FailToStart`, `Overload`, `CommLoss` (BOOL) |

Paths: `M101.Cmd.Start`, `M101.Sts.Running`, `M101.Cfg.SpeedHigh`.

## Ignition side

| Thing | Name |
|---|---|
| Tag provider | `default` |
| UDT definition | `Motor` (folders `Cmd`, `Sts`, `Cfg`, `Alm`) |
| UDT parameters | `PLC` (device name, lab value `PLC1`), `InstanceName` (`M101`) |
| OPC item path | `ns=1;s=[{PLC}]{InstanceName}.Sts.Running` |
| Instance path | `[default]Plant1/Area10/Line1/M101/Sts/Running` |
| Faceplate view | `Faceplates/Motor`, one param `tagPath` = `[default]Plant1/Area10/Line1/M101` |
| Gateway device | `PLC1` (simulator in the labs) |
| Database connection | `meridian_db` |
| Project | `Meridian` |
| UNS / MQTT topic | `meridian/plant1/area10/line1/m101/sts/running` (lowercase) |
| Sparkplug B | group `Plant1`, edge node `Area10_Line1`, device `M101`, metric `Sts/Running` |

## Network (Plant 1)

Supernet `10.20.0.0/16`. Gateway is `.1` on each subnet.

| VLAN | Purpose | Subnet |
|---|---|---|
| 10 | Control (PLC1 `10.20.10.10`) | 10.20.10.0/24 |
| 20 | HMI clients | 10.20.20.0/24 |
| 30 | Level 3 servers (Ignition `10.20.30.10`, SQL `.20`) | 10.20.30.0/24 |
| 50 | Engineering | 10.20.50.0/24 |
| 250 | DMZ | 10.20.250.0/24 |

Ports: Ignition HTTP 8088, HTTPS 8043, OPC UA server 62541, PostgreSQL 5432, MySQL/MariaDB 3306.

## Motor safety

Overloads, E-stops and safety stops are hardwired in the starter circuit. The PLC (or simulator) only monitors them. Software interlocks are permissives, never the only protection.
