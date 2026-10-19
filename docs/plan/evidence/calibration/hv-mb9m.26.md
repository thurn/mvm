# Grassland clear rate (hv-mb9m.26, plan 2.26)

`src/sim/policies/grassland-clear.test.ts` asks a fresh account of each
focus to clear Levels 1–5 in order with the `campaign` policy, retrying a
lost level up to three times, on at least 8 of 10 seeds (1–10).

At 2.25's tuning (Miller walks 7 s per tile, `K_heroActionRate` 0.5) the
Warrior passed, but the Ranger cleared 6 of 10 and the Sorceress 4 of 10.
Almost every miss stopped at Level 5. Its losses came at 200–245 s, as
late as its wins, with 7–14 leaks: the Miller walked through before the
board in his two lanes could kill him.

Sweeps over seeds 1–10 and 11–20 (each cell: cleared / 10):

| Miller s/tile | L5 waves | K_heroActionRate | Warrior | Ranger | Sorceress | Median boss fight |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | 8 | 0.5 | 9 | 6 | 4 | 32–58 s (2.25) |
| 10 | 8 | 0.5 | 9 + 6 | 8 + 9 | 8 + 3 | 51–54 s |
| 12 | 8 | 0.5 | 10 + 8 | 9 + 9 | 7 + 6 | 57–59 s |
| 12 | 7 | 0.5 | 9 + 7 | 8 + 9 | 6 + 7 | 59 s |
| 12 | 6 | 0.5 | 9 + 7 | 9 + 8 | 6 + 3 | 64 s |
| **12** | **8** | **0.55** | **8 + 9** | **9 + 9** | **8 + 9** | **60 s** |
| 12 | 8 | 0.6 | 10 + 8 | 8 + 9 | 9 + 9 | 57 s |

## Tuning made here

- **The Miller walks 12 s per tile** (was 7; `src/tuning/bosses.ts`). It
  also lengthens his fight to a 60 s median, inside D §7's 60–90 s, which
  2.25 missed at 32–58 s.
- **`K_heroActionRate` 0.5 → 0.55** (`src/tuning/combat.ts`). That's 2.25's
  named tunable for hero power at area levels 5–6. The Sorceress needed it:
  slowing the boss alone left her at 7 + 6, and her Level 5 losses came to
  the waves too. The campaign's E §7 beats and kill-rate holdings
  (`campaign.test.ts`) still pass.
- Cutting Level 5's waves didn't help the Sorceress and shortened the
  level, so it stays at 8.
