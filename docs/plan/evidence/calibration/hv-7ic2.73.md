# Calibration report: Level 1 (hv-7ic2.73)

The first headless calibration of Level 1, at staging `e47cd49` plus this
bead. Produced with:

```sh
npm run sim -- --level 1 --runs 40
```

Each row is 40 rounds (seeds 1–40) of one focus's starter kit, played by a
scripted policy against Level 1's stored wave plan. Drops are rolled from
each kill with `rollDrops`. "Gear by 1:30" is the share of rounds with a
gear drop within 60 s of the level starting.

| Focus | Policy | Runs | Win rate | Level length | Kills/min | Leaks/run | Gear by 1:30 | First gear (median) | Mana 0 / 7.5 / 15 / 25 / 60 s | Drops/run (N/M/R/U · hero/spell · currency · gold) |
|---|---|---|---|---|---|---|---|---|---|---|
| warrior | pvzOpener | 40 | 100% | 105 s | 11.4 | 0.1 | 35% | 69 s | 150 / 132 / 150 / 56 / 54 | 1.57/1.23/0.17/0.05 · 0.40/0.17 · 0.90 · 24 |
| warrior | rangedHeavy | 40 | 98% | 106 s | 11.3 | 0.1 | 30% | 71 s | 150 / 132 / 50 / 48 / 61 | 1.32/1.23/0.28/0.05 · 0.35/0.15 · 0.82 · 23 |
| warrior | wallFirst | 40 | 95% | 141 s | 8.1 | 0.5 | 8% | 104 s | 150 / 132 / 97 / 66 / 38 | 1.68/0.97/0.23/0.05 · 0.40/0.10 · 0.90 · 21 |
| ranger | pvzOpener | 40 | 95% | 93 s | 12.6 | 0.3 | 30% | 67 s | 150 / 132 / 150 / 56 / 54 | 1.48/0.85/0.25/0.03 · 0.25/0.15 · 0.88 · 20 |
| ranger | rangedHeavy | 40 | 93% | 98 s | 11.7 | 0.5 | 25% | 70 s | 150 / 132 / 50 / 48 / 61 | 1.65/0.57/0.20/0.03 · 0.23/0.13 · 0.78 · 19 |
| ranger | wallFirst | 40 | 95% | 116 s | 10.0 | 0.3 | 8% | 89 s | 150 / 132 / 25 / 91 / 66 | 1.60/0.78/0.23/0.03 · 0.33/0.07 · 0.80 · 21 |
| sorceress | pvzOpener | 40 | 98% | 125 s | 9.5 | 0.2 | 15% | 89 s | 150 / 132 / 150 / 69 / 70 | 1.55/1.13/0.20/0.03 · 0.28/0.07 · 0.85 · 22 |
| sorceress | rangedHeavy | 40 | 95% | 116 s | 10.3 | 0.1 | 15% | 85 s | 150 / 132 / 25 / 91 / 83 | 1.55/1.07/0.23/0.00 · 0.28/0.10 · 0.75 · 21 |
| sorceress | wallFirst | 40 | 88% | 147 s | 7.5 | 0.7 | 5% | 111 s | 150 / 132 / 25 / 91 / 83 | 1.32/0.85/0.25/0.03 · 0.35/0.07 · 0.75 · 20 |

## Checks

The calibration tests (`src/sim/policies/calibration.test.ts`) run 20
PvZ-opener rounds per focus. Appendix E §7's clock counts a 30 s focus pick
before Level 1, so "~1:30" and "~2:30" are about 60 s and 120 s into the
level.

| Check | Band | Warrior | Ranger | Sorceress |
|---|---|---|---|---|
| Win rate | ≥ 90% | pass | pass | pass |
| Level length (E §7) | 120–210 s | **miss** (105 s) | **miss** (93 s) | pass (125 s) |
| Kills per minute (D §5.2) | 8–20 | pass (11.4) | pass (12.6) | pass (9.5) |
| First gear drop (E §7) | median ≤ 75 s | pass (69 s) | pass (67 s) | **miss** (89 s) |
| First-minute mana (E §2.3) | 150 / ~125 / ~125 | pass | pass | pass |
| Hits to kill a white Shambler (A §1.3) | 8–10 Lightning Arrows | **miss** (12) | | |
| Time for a Shambler to kill a squishy hero (A §1.3) | ~3.7 s | pass | | |

No tunable was changed. Each miss conflicts with another documented
target, so it is recorded here with the tunable that would close it.

## Misses

- **Level length, Warrior and Ranger (93–105 s).** Their kits clear each
  wave fast, so the early trigger (§5.1: the next wave 2 s after the current
  one falls to 50–65% of its life, at least 4 s after it started) collapses
  Level 1's ~150 s nominal schedule. The tunables that would close it are
  `WAVE_TUNING.earlyTriggerDelaySeconds` (2 s) or
  `earlyTriggerMinSecondsAfterStart` (4 s). A sweep found that 10 s of
  delay lifts Warrior to 124 s, but Ranger only reaches 116 s, and it
  departs from PvZ's rule. The other lever, `K_monsterLife`, would break
  A §1.3. Recommendation: playtest first. A fast clear for a strong board
  may feel right, and the operator's Level 1 runs decide which knob moves.
- **First gear drop, Sorceress (median 89 s).** Level 1 yields ~1.4 gear
  per round (0.08 item rolls per normal kill × 85% gear), and the
  Sorceress kit kills the first waves more slowly. The tunable is
  `LOOT_TUNING.itemRolls.normal` (0.08); about 0.11 would bring the median
  under 75 s, at the cost of E §3.4's gear-per-minute target.
- **Hits to kill, Lightning Arrow (12, not 8–10).** A §1.3 assumes "about 8
  physical per hit", but B H12's level 1 Lightning Arrow hits for 6.0 (80%
  of a Crude Bow's 6–9), less a little to the Shambler's armour. The
  tunable is `COMBAT_KNOBS.K_monsterLife` (4.5); about 3.6 would give 9–10
  hits, and it would shorten levels further. The arrow's beams also hit
  nearby monsters, so a pack dies faster than this single-target count
  suggests.

## Notes

- `wallFirst` is the weakest opener: it spends early mana on strikers in
  empty lanes, which starves acolytes. That is a policy result, not a
  tuning finding.
- Currency (~0.9 per round) and gold (~20 per round) match E §3.4's Level 1
  row (0.9 and ~20).
