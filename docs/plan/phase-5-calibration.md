# Phase 5: Calibration and Polish (M5) — outline

**Goal:** the demo hits its pacing targets and reads cleanly. This page is an
outline, refined by Phase 4's filing bead.

[Back to the plan](README.md)

**Earliest start:** the simulator work can start once Phase 4's assembly
beads land; the polish work starts at the Phase 4 gate.

## Scope

- **Calibration:** extend the headless simulator to whole-campaign runs
  with happy-path and farming policies. Measure the Appendix E targets:
  loot rates, currency per hour, gold, XP curves and the §7 time-to-fun
  beats. Tune `src/tuning/` until they are met, or record each miss.
- **The GDD §19 risks:** power creep, loot flood or drought, one card
  dominating. Measure each in the simulator and record what was found.
- **Polish:** the remaining Appendix H §13 items, a cold `visual-review` of
  every screen, and the credits.
- **Docs alignment:** bring the GDD and appendices in line with the
  delivered game and these decisions.

## Exit gate (draft)

- The README's done criteria hold.
- `docs/plan/report.md` records what the plan delivered and learned, and
  `docs/plan/` is otherwise deleted.
