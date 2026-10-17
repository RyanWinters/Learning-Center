## Persona
Senior Allen-Bradley PLC programmer, 12 years in Studio 5000 and ControlLogix, writes AOI libraries and trains new hires; picky about Logix semantics, terminology, and whether the simulator behaves like a real controller.

## What works
- plc-timers: the TON, TOF and RTO timing diagrams and the two-timer flasher trace are correct. The quiz answers hold up (TON non-retentive, TOF times while false, RTO needs RES, ms presets).
- engine.js TON, TOF and RTO branches (lines ~325-338): reset-on-false for TON, ACC zeroed on true for TOF, and RTO holding ACC are all Logix-correct. OTE writes false on a false rung (line ~319), and OTL, OTU, ONS and OSR behave correctly.
- plc-aoi: Input and Output copy by value, InOut passes by reference, and the "disabled-area bug" (Logic does not run, outputs keep their last value) is stated correctly. That is the point I teach first.
- plc-udt: the Cmd/Sts/Cfg/Alm ownership rule is how I teach it, and the "naming is forever" warning is right.
- sim-ton and sim-udt-motor: the tests hit the real failure modes (Stop during the countdown, a latched fault that blocks restart, reset then restart). Stop wired NC and read with XIC is correct, and the desktop lab screen labels "NC: reads 1 at rest" clearly.

## Problems (most important first)
**[severity: high] [area: accuracy]** plc-state-machines, "Worked example: mixer batch". The steps are renumbered (10 Fill A, 20 Fill B, 30 Mix 90 s, 40 Drain) with no note. The lesson's own table and CASE use 10 Filling, 20 Mixing, 30 Draining. The "Reading a stuck sequence" example then says "Step 20 is Fill B". A new hire will read two different maps of Step 20. Fix: use one numbering throughout, or say the example is a separate design.

**[severity: high] [area: content]** plc-comms, "The MSG instruction" polling example. The rung `XIC(Poll_Timer.DN) XIO(Msg_Read.EN) XIO(Msg_Read.DN) MSG(Msg_Read)` is followed by "a second rung resets", but that rung is never written. As shown, the poll timer is never reset, so the MSG re-fires whenever DN drops. The text also says "the handshake is to wait for DN or ER" and then gates on XIO(DN), which contradicts it. Fix: show the complete rung set, including the timer reset on DN or ER, and explain how the done bit clears.

**[severity: med] [area: sim]** engine.js lines ~325-331, TON and RTO. `ACC = Math.min(ACC + d, MAXI)` keeps counting after DN is set. In Logix the accumulator stops at PRE. A student who watches ACC in the tag table sees it climb past PRE, which a real controller never does. Fix: when ACC reaches PRE, hold it at PRE while the rung stays true.

**[severity: med] [area: accuracy]** plc-timers, "RES: the reset instruction". "The RES runs while the timer is trying to time" does not explain anything. The engine (line ~357) also clears .EN on RES, but in Logix .EN follows the rung and RES clears ACC, DN and TT. Fix: rewrite the paragraph as the rule: RES clears ACC, DN and TT, and .EN is still the rung state.

**[severity: med] [area: accuracy]** plc-udt, "How data is laid out in memory". It says five BOOLs "share one hidden DINT" and uses 4 bytes. I am not certain of the host type for UDT BOOL members (SINT versus DINT), and the byte count depends on it. Fix: verify in the Data Type editor on a current Studio 5000 release and state the host and byte count exactly, or drop the number.

**[severity: med] [area: content]** plc-timers, "Examples: Run-hours with a rollover to a counter". It drives CTU from a one-scan DN pulse in the same routine, which the lesson's own "self-resetting timer" pitfall calls fragile. The tip "move them into the timer with MOV" is also unnecessary: a DINT tag can be the preset operand directly (`TON(Tag,Preset_Tag,0)`). Fix: use a latch or a one-shot for the rollover and show the tag-as-preset form.

**[severity: med] [area: sim]** engine.js applyPresets (~lines 287-295). It reads only numeric literals (`Number(n.args[1])`), so a DINT tag as the preset cannot be simulated. That means the lesson's preset-in-a-tag advice cannot be exercised in the sandbox. Fix: resolve the preset operand as a tag at scan time, or note the limitation in the lesson.

**[severity: med] [area: accuracy]** plc-comms, "The MSG instruction" and "Remote I/O" sections. "Rockwell advises preferring read messages over write messages" has no citation. "The message queue holds up to 48 MSG instructions" is also unverified, and I would not teach it from memory. Fix: cite the Rockwell manual section, or reword to match it.

**[severity: low] [area: accuracy]** sim-traffic "explain" and plc-state-machines "Transitions at the bottom". Both say that transitions at the bottom ensure "only one transition can fire per scan". The real reason the traffic design works is that each step's timer is gated by EQU on the previous scan's Step value. A MOV does update Step for rungs below it in the same scan, so the stated rule is misleading. Fix: state the timer-gating reason and say that a transition above the outputs can chain when its condition is already true.

**[severity: med] [area: ui]** m-sandbox.png (phone, 390px, dark). The bottom tab bar (HOME, TRACKS, LAB, REVIEW, MORE) sits mid-page over the Inputs grid, covering the Switch 4 and Switch 5 row. If that is a fixed bar captured mid-scroll, the screenshot is a capture artifact. If it really renders there, the bar hides controls. Fix: confirm at a real scroll position and check that the bar is pinned to the viewport bottom.

## Missing (max 5)
- Structured text timer usage (`TON(Timer)` with `.PRE` and `.TimerEnable`) in plc-timers. The AOI lesson uses it, but the timers lesson is ladder only.
- Coverage of ONS, OSR and CTU/CTD. The engine implements them, but none of the five lessons reviewed explains one-shots or counters in depth.
- A sim challenge with a step timeout and a fault state. plc-state-machines teaches both, but sim-traffic has neither.
- Logix-style I/O addressing. The sandbox uses tags named I0 and O0 where a Logix controller uses Local:1:I.Data.0 or similar. A new hire would learn the wrong names.
- Version-specific online-edit rules for AOIs and UDTs, and the controller-mode behavior of Prescan. Both are described only in general terms.

## One-line verdict
Timing, AOI and UDT concepts are mostly right and teachable, but the state-machine and MSG examples are internally inconsistent, and the simulator's accumulator and preset behavior need fixing before I'd trust it for training.
