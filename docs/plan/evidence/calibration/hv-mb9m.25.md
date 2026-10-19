# Grassland calibration (hv-mb9m.25, plan 2.25)

The headless campaign plays Levels 1–5 in order from a new account, for
each focus over four seeds:

- `npm run sim -- --campaign --runs 4` runs it;
- `src/sim/policies/campaign.ts` holds the runner, and the policy is
  `campaign` in `policies.ts`.

Between rounds it plays the hideout sensibly. It rolls new heroes, takes
the offer the roster most needs, fills empty slots, and equips upgrades.
It can't craft yet, because item crafting is plan 2.6. A lost level is
retried up to three times. The clock adds 30 s to pick a focus and 90 s of
hideout per round (E §7).

Campaigns: 9/12 finished Level 5.

| Level | First-try wins | Median length (s) | Median kills/min | Boss fight (s) |
| --- | --- | --- | --- | --- |
| level-1 | 12/12 | 112 | 10.8 | – |
| level-2 | 12/12 | 144 | 7.2 | – |
| level-3 | 10/12 | 197 | 11.6 | – |
| level-4 | 6/12 | 221 | 14.9 | – |
| level-5 | 3/11 | 209 | 13.0 | 36, 42, 51, 40, 32, 45, 48, 43, 58 |

| Beat (E §7) | Median clock (min) |
| --- | --- |
| craftOrbsAt | 6.4 |
| jewellerAt | 11.2 |
| level4At | 12.7 |
| millerAt | 24.4 |
| millerDefeatedAt | 31.4 |

## Tuning made here

- **The Bloated Miller's life: 40× to 10×** (`src/tuning/bosses.ts`).
  - At 40×, no campaign board beat Level 5 (0 of 12).
  - The board in the Miller's two lanes lands about 20 damage per second,
    and the Miller crosses the board in about a minute.
  - At 10×, 9 of 12 campaigns finish.
- Damage and wave density stay at the design's values. These were probed
  and rejected:
  - **Miller damage 3× → 2×:** no change to win rates.
  - **Wave density B 2.0 → 1.7:** Level 4 first tries rose from 6 to
    11 of 12, but Level 5 got worse. Fewer kills meant less XP, and the
    kill rate dropped below 8 per minute on Levels 1–2.

## Misses, and the tunable that would close each

| Target | Measured | Tunable |
| --- | --- | --- |
| Levels 4–5: a fitting roster wins ≥80% of first tries (moved here from 2.23) | Level 4: 6/12; Level 5: about 3/11 | Hero power at area levels 5–6: `K_heroActionRate`, or the XP curve (`kXp`) so heroes arrive at the level cap; then the Level 4–5 wave budget |
| D §7: a 60–90 s boss fight on a level-appropriate board | 32–58 s when the Miller dies | `BOSS_TUNING.BloatedMiller.lifeMult`: raise it toward 14–16 once the board above can hold Level 5's last wave |
| D §5.2: 8–20 kills per minute | Level 2: median 7.2 (the rest are in band) | Level 2's first-wave wait (18 s) or its wave budget |
| E §7: Level 4 by minutes 15–20 | 12.7 min (early) | The 90 s hideout allowance is a guess. Real players spend longer once crafting exists (2.6, 2.19), which closes this |
| B H19: Permafrost Bolts "often freezes a Normal monster outright" | One volley builds about 0.53 of a Level 1 Shambler's threshold, and volleys are 2.85 s apart | Freeze decay, or this hero's action rate |
| A Rat Swarm pack is 1 point but 3 kills | Its loot, XP and leak cost are counted 3× | Per-rat loot share; the drop rates above look fine so far |

## Holding (tested in `src/sim/policies/campaign.test.ts`)

- **First craft:** about 6.4 min (target about 7).
- **Jeweller's Orb:** about 11.2 min (target about 12).
- **Level 4:** under 20 min.
- **The Miller:** arrives at about 24 min (target 25–30).
- **Kill rate:** 8–20 per minute on Levels 1, 3, 4 and 5.
- **Finishing:** most campaigns beat the Miller.
