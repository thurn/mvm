# Decisions

These decisions bind the plan. The operator made them in the planning
interview of 2026-10-18. Where they differ from the [GDD](../gdd.md) or its
appendices, these decisions win.

Decision IDs use the prefix **P**.

[Back to the plan](README.md)

## Workflow

### P1. One Hive project

The plan runs in Hive project `mvm`, repository `/Users/dthurn/mvm`, in the
default stream. Beads carry `hive_project=mvm` and no `hive_stream`.

Phase 0 repoints the stale `kvn` entry in `~/brain/hive.json` (repository
`/Users/dthurn/kvn`, which no longer exists, and no beads) to `id: "mvm"` and
`/Users/dthurn/mvm`. It keeps `observe_since`.

### P2. Self-contained plan docs

The plan lives in `docs/plan/`. Its workflow page is self-contained, apart
from the Hive skills and the global `wt` skill it names. Phase 0 makes the
only edits outside `docs/plan/`: `AGENTS.md`
([P9](#p9-delivery-through-tollgate-worktrees)) and `~/brain/hive.json`
([P1](#p1-one-hive-project)).

### P3. Bootstrap by the planning session

The planning session runs Phase 0 itself, after the operator approves this
plan. Executors start only once Phase 1 is filed and admitted.

### P4. Milestones never pause the stream

Milestones (M1–M5) are checkpoints for the operator, not stops. The stream
keeps filing and running work. The operator plays on the play server
([P18](#p18-the-play-server)) whenever they like. Their feedback becomes
`playtest` beads, which preempt ordinary ready work. A playtest bead may
amend a phase page and file follow-up beads.

### P5. Reviews are paired beads from day one

Every bead that changes behavior gets a paired **review/QA bead** (label
`review-qa`), starting with the first code bead. There is no light-process
period.

- The review bead depends on its implementation bead and is claimed after
  that bead lands on `staging`.
- The claiming session reviews the landed diff cold with the `warden` skill,
  plays the change in the browser, and fixes what it confirms in one commit
  ([workflow § Review and QA beads](workflow.md#review-and-qa-beads)).
- Juice beads' reviews add an A/B: the same QA scene at `juice=0` and
  `juice=1`, with captures of both.
- Pure documentation, data-only and filing beads get no review bead. Their
  acceptance checks are enough.
- Each milestone also ends with one playthrough bead that plays the whole
  milestone and runs `visual-review`.

This supersedes the AGENTS.md line "Changes of any size are delivered
without warden review" for plan beads. Phase 0 amends AGENTS.md
accordingly. Review happens in review beads only, never inline in the
implementing bead.

**Why:** the operator wants separate review beads, and with a wide graph,
reviews run beside the next implementation wave at little wall-clock cost.

### P6. No subagents

No session dispatches a subagent for any purpose: implementation, review,
QA, research or exploration. No session runs `codex exec`, `claude -p` or any
other agent CLI. A review is cold because it is a different bead from the
work it reviews, claimed by a session without the author's context.

This overrides the executor skill's optional implementation subagent and the
general fresh-reviewer policy.

### P7. Introspection from day one

From the first bead:

- every close note ends with a friction block of tagged lines
  ([workflow § Introspection](workflow.md#introspection));
- a tag that recurs in three beads of a phase files an `introspection` bead
  at once, which preempts phase work;
- every phase ends with a `mason` refactor-and-tooling pass, then a read-only
  `sage` retrospective, then the gate.

Phase 5, the last phase, ends with the refactor pass and the gate. Its
`report.md` takes the retrospective's place.

### P8. A wide graph

The graph is built for 6–8 concurrent executor sessions:

- **A thin root.** One scaffold bead lands first, kept small enough to land
  in under an hour.
- **Seams early.** The seams that many beads build on come right after the
  root and are marked `core`: the sim kernel, the save layer, the render
  shell, the audio engine, the juice director and the account lifecycle.
  Their review beads judge the seam's design too.
- **Disjoint Areas.** Each bead owns a directory. Shared files are listed as
  hub seams ([workflow § Areas](workflow.md#areas)), and additions to them
  are append-only cases, resolved with `tg --no-launch update`.
- **Phase 1's widest point** is eight implementation beads right after the
  scaffold. Its steady state is about ten ready beads, counting trailing
  review beads.

Beads are sized at about half a day of agent work. A bead that grows past
that is split, with an edge, before it is claimed.

### P9. Delivery through Tollgate worktrees

Each bead is one Conventional Commit in a Tollgate worktree
(`tg --no-launch worktree create wt/<bead-id>`, based on `staging`). It is
submitted with `tg candidate HEAD` and authorized with
`tg approve <candidate-id> --wait`, which takes the candidate's ID, not the
bead's. Plan sessions never commit on `master` and never
run `tg push-master`. This plan grants promotion authority for in-scope plan
work.

Phase 0 amends AGENTS.md:

- it names this plan and its README as the re-entry point;
- plan beads deliver through worktrees, and review happens only in review
  beads ([P5](#p5-reviews-are-paired-beads-from-day-one));
- sessions never dispatch subagents ([P6](#p6-no-subagents));
- it records "never break a save" ([P15](#p15-never-break-a-save)) and the
  no-binaries rule ([P20](#p20-assets-are-baked-never-committed)).

## Architecture

### P10. Stack

- **TypeScript** (strict), **Vite**, **Vitest**, ESLint, Prettier.
- **React** for every DOM surface: the title, focus select, HUD, roster bar,
  ticker, level-end screen, hideout, tooltips and dev menu.
- **Canvas 2D** for the board, drawn at the largest integer scale that fits.
  The logical board is 9×5 tiles of 64 px. Appendix H's techniques map onto
  it directly: `source-atop` flash, `fillRect` particles, offscreen-canvas
  outlines and `lighter` blending.
- **Web Audio** through a thin in-house wrapper (Appendix H §10), plus
  **ZzFX** (MIT) for code-authored sounds.
- **`tsx`** for scripts. **`pngjs`** for any image work in scripts (pure JS,
  no native dependencies).
- No game framework and no state library. The sim is plain data; React
  reads it through a small external-store hook.

### P11. A pure, deterministic sim

- **Plain data.** `RoundState` is JSON-safe: no classes, `Map`s, closures or
  `undefined` holes.
- **Fixed step.** `step(state, intents)` advances exactly 1/60 s
  (Appendix A §1.2). The driver runs one step per tick at 1×, two at 2×.
- **Intents in, events out.** Player actions are intents (`place`, `shovel`,
  `cast`, `setSpeed`). Each step returns `SimEvent[]` (hit, kill, drop,
  manaSpawn, leak, waveStart, and so on). Events carry everything
  presentation needs: dealt damage, target max life, damage-type breakdown,
  crit, rarity and positions.
- **Named RNG streams.** Each domain has its own seeded, serializable stream
  (`waves`, `combat`, `loot`, `sky`, `heroGen`). Adding a feature that draws
  from one stream never perturbs another, so scenario tests stay stable.
- **No wall clock, DOM or `Math.random`** in `src/sim/` or anything it
  imports. A lint rule enforces this.

### P12. Juice is presentation only

- **The director.** A pure function maps each `SimEvent` to **cues**: tier,
  shake trauma, actor or global hitstop, particle preset and count, sound id
  and bus, damage-number spec, loot timeline. It is table-driven from
  `src/tuning/juice.ts` (Appendix H §1.3 and §2.6).
- **Presentation systems** consume cues: renderer layers, particles,
  numbers, audio and HUD bumps. They hold their own cosmetic state, which is
  never persisted.
- **Global hitstop and slow-mo** pause or slow the driver in wall-clock time
  only; no sim time passes (Appendix H §2.3).
- **The invariant test.** A scripted round run with the director and every
  presentation system attached at `juice=2`, and again headless, ends with
  identical state hashes.

### P13. One save document, two sections

The game has one save slot. Its document is:

```ts
type SaveDocument = {
  format: 1;
  savedAt: string;       // ISO time, for logs only
  build: string;         // git short OID, for logs only
  account: Section<AccountState>;   // focus, roster, stash, gold, currency, XP, first clears
  round: Section<RoundState> | null; // the level in progress, if any
};
type Section<T> = { schemaVersion: number; data: T };
```

- **Atomic.** Both sections are written together in one IndexedDB
  transaction, so loot credited to the account at kill time can never be
  double-counted or lost against the round.
- **Independent versions.** Each section loads on its own. A round that
  cannot load never costs the account.
- **When.** The document is written every 1 s of sim time during a round, on
  `pagehide` and `visibilitychange`, and after every account change in the
  hideout.
- **History.** The store keeps the last 20 documents plus one per level
  start, for recovery. The dev menu can restore any of them.

### P14. Rounds resume mid-wave

- **What is saved.** The round snapshot is the whole `RoundState`: every
  hero and monster, projectiles, ailments, timers, the stored wave plan,
  mana, recharge, life pool and the RNG streams.
- **What is not saved.** Cosmetic state: particles, numbers, beams and
  in-flight loot animations. Loot is credited to the account at kill time,
  and the ticker repopulates from the round's recent drops.
- **Resume.** On load with a round present, the game opens the board paused
  behind a 3-2-1 countdown, then continues. This is the only pause in the
  game. The GDD's "no pause-and-place" still holds, because intents are
  refused during the countdown.
- **Fallback.** If the round section fails to normalize or migrate, it is
  discarded and logged at error level with the reason and the raw document,
  saved under `.saves/rejected/`. The player returns to the level's start,
  with credited loot kept (GDD §5: losing keeps loot). The dev menu shows a
  banner naming the failure.

### P15. Never break a save

From the first bead that persists a section, every change to a persisted
shape keeps every committed golden fixture loading.

- **Normalize with defaults.** Each section has a schema module with a
  `normalize(raw): T` that fills every missing field with its default, and
  drops unknown fields with a log line. Additive changes need only a
  default.
- **Migrations.** A rename, retype or restructure ships one ordered pure
  migration (`src/save/migrations/<section>/<n>-to-<n+1>.ts`) and bumps that
  section's `schemaVersion`.
- **Golden fixtures.** `src/save/fixtures/<section>/v<n>.json` holds one real
  document per version. A test loads every fixture through the current
  `load()` and asserts the result normalizes, validates and, for rounds,
  steps 600 ticks without throwing.
- **Each bead that changes a persisted shape** either adds a default
  (additive change, no version bump, old fixtures still load), or adds a
  migration, bumps the version and writes the new version's fixture with
  `npm run save:fixture`. It always keeps every old fixture.
- **Milestones** also commit the operator's real save from that build as
  `src/save/fixtures/milestones/m<n>.json`.

Until bead 1.19 lands nothing is persisted, so nothing can break.

### P16. Outcomes, not seeds

Every generated result is written into state when it is first produced:

- the level's wave plan (every wave's monsters, lanes and spawn offsets),
  rolled at level start;
- each monster's rarity, affixes and stats, at spawn;
- each drop's full item, hero or currency, at the kill.

They are never re-derived from a seed on load. A catalog, tunable or
algorithm change therefore never reshuffles an existing round, and future
rolls use the new rules.

### P17. Reconciliation on load

Every content reference in a save is a RePoE ID or an MvM custom ID. A
load-time pass resolves each one against the current data:

- an unknown item base, mod, skill or support is replaced through a
  committed retirement table, or salvaged into gold at its sell price;
- a stat the vocabulary no longer has is dropped;
- every reconciliation is logged with the old ID and its outcome.

### P18. The play server

`npm run play` (run once in `~/mvm`) does the following:

- keeps a gitignored worktree at `~/mvm/.play/`, detached at `staging`;
- polls `tg --no-launch status` every 15 s, and on a new `staging` OID
  fast-forwards, reruns `npm install` and the asset step when their inputs
  changed, and lets Vite reload the page;
- serves Vite on the fixed port **5180**, so the browser origin, and with it
  IndexedDB, never changes;
- runs the **save mirror**: a dev-server endpoint that writes every saved
  document to `~/mvm/.saves/latest.json` plus a rolling history, and serves
  it back on load when IndexedDB is empty or older;
- runs the **log sink**, which appends structured logs to
  `~/mvm/logs/play.jsonl`.

Executor dev servers use any free port of 5181 or higher, with their own
`.saves/` inside their worktree. Agents debugging a playtest bead read
`~/mvm/.saves/latest.json` and `~/mvm/logs/play.jsonl`, never write them.

### P19. Real PoE2 data through an importer

- **Fetch.** `npm run import:poe2` fetches `github.com/repoe-fork/poe2` at a
  commit pinned in `scripts/import-poe2/pin.json` into gitignored
  `.cache/repoe/`.
- **Trim.** It writes trimmed, committed JSON to `data/`, keyed by the IDs
  that appendices B, C, D and F cite.
- **Scope.** It covers what M1 needs first: the 7 starter heroes and 3
  starter spells, their compatible supports, the bases and mods up to item
  level 10, uniques, currency, and `default_monster_stats`. Later phases
  extend the ID lists, not the importer.
- **Determinism.** Re-running it at the same pin reproduces `data/` byte for
  byte. A test checks a small checked-in sample.
- **Runtime.** It never fetches. CI uses the committed `data/`.

The combat model is Appendix A, implemented as pure functions. Mechanics no
M1 content uses (for example bleed or thorns) wait for the phase that brings
their first user.

### P20. Assets are baked, never committed

`npm run assets`:

- composes ULPC layer recipes from `~/Documents/lpc/ulpc-generator` into
  sprite sheets, per Appendix G §2.6;
- copies the mapped sounds and music from `~/Documents/game-audio/` and
  `~/Documents/lpc/`;
- writes atlases and a generated asset manifest into gitignored
  `public/assets/`.

The committed inputs are TypeScript: `src/assets/recipes/`,
`src/assets/sounds.ts`, `src/assets/music.ts` and `src/assets/credits.ts`.
The credits are built from each pack's `SOURCE.txt` and `CREDITS.csv`.

Without the libraries, the step warns and the game uses placeholders:

- capsules and flat tiles, coloured by role, for art;
- ZzFX tones for every sound.

`scripts/ci` never requires the libraries.

### P21. Tunables and knobs

- `src/tuning/` holds every number that logic reads: the Appendix A global
  knobs, the Appendix D wave rules, the Appendix E rates and the Appendix H
  tier, significance, timing and audio tables.
- **Dev knobs.** Appendix H §14's knobs (`juice`, `shakeMax`,
  `lootHoldScale`, `sigBands`, `numbers`, `debugSlowmo`, `audioLog`,
  `tierLog`) and the accessibility toggles (shake Off/Low/Full, reduce
  flashing) live in a separate settings store. It is persisted in
  `localStorage` and never in the save document.

### P22. The QA surface

- **`window.__mvm`** exposes read-only state for browser QA:
  - the current screen, round state and account summary;
  - the last 200 sim events and cues;
  - `tierLog` and `audioLog`;
  - `caps`, a list of caught errors and console errors, which must be empty
    at the end of every QA run.

  It also exposes dev actions: `grant`, `setLevel`, `spawn`, `seed`,
  `setKnob` and `loadFixture`.
- **QA scenes.** `?scene=<name>` boots straight into a scripted board state
  for juice work:
  - `hit-bands`: one hero against three Shamblers of different life;
  - `loot-shower`: one kill of each rarity;
  - `mana-rain`;
  - `ailments`;
  - `wave-flag`;
  - `equip-ab`: the same lane before and after an upgrade.

  Beads add scenes beside their features.

### P23. Logging

Every system logs structured events with IDs, never names: run and level
starts, wave plans, spawns with affixes, drops with full rolls, placements,
leaks, level results, saves, loads, migrations and reconciliations.
Development logs go to the log sink; every build keeps the last 5,000 lines
in IndexedDB, with JSONL export in the dev menu. Read the logs first when
debugging a playtest report.

### P24. Tests

Every bead is test-first. Before writing implementation code, a bead writes
the failing tests that pin its acceptance contracts, then makes them pass.

| Layer | Runs in | Pins |
| --- | --- | --- |
| Unit | Vitest, node | Pure functions: combat math, loot rolls, wave plans, save normalize and migrate, the juice director's event→cue tables, shake and hitstop models, the voice manager over a fake `AudioContext` |
| Scenario | Vitest, node | Headless scripted rounds with fixed seeds, asserting outcome summaries (kills, leaks, mana curve, drops), never frame-exact traces |
| Golden saves | Vitest, node | Every fixture in `src/save/fixtures/` loads and steps |
| Invariants | Vitest, node | Juice on/off state-hash equality; sim purity lint |
| Component | Vitest + jsdom | React HUD and hideout behavior that matters (drag to equip, card states) |
| Browser QA | Playwright MCP | The changed workflow played through `window.__mvm`, with captures and `caps` empty |

Calibration tests pin Appendix A's worked examples (§1.3 and §10) as
tolerances, and Appendix E §2.3's first-minute mana shape.

### P25. Desktop only

The target is desktop Chrome, mouse and keyboard, at 1280×720 and up. QA
captures are taken at 1280×720 and 1920×1080. Mobile and touch are
non-goals for the whole plan.

## Scope

### P26. M1 scope

M1 is the Level 1 vertical slice plus a loop closer:

- **Title and focus select** with all three focuses and their starter kits
  (Appendix B §4).
- **Level 1** per Appendix D §6.1: 3 lanes, Shamblers, 5 waves, 150 starting
  mana, the first wave at 25 s and a flag wave at the end. Monster rarity and
  M1-relevant affixes per Appendix D §3–4.
- **Loot** per Appendix E §3–5 at area level 1: items with real affixes,
  currency, gold, and hero and spell drops, auto-collected.
- **Level-end summary** with Upgrade tags, XP and the Level 1 first-clear
  reward (Appendix E §4.5), which unlocks roster slot 4.
- **A minimal hideout:**
  - a Roster tab with 6 hero cards and the spell, slot unlocks, and
    drag-to-equip heroes and items;
  - a Stash tab with uniform cards, sorting and filtering, and Upgrade tags;
  - PoE-style tooltips with "DPS on this card".
- **Replay** of Level 1. A one-card campaign stub shows Level 2 locked as
  "coming soon".
- **The dev menu** (GDD §15) and the QA surface.

Out of M1: crafting, Armorer, Recruiter, gamble, the loot filter UI, the
passive tree, the campaign map beyond a Level 1/replay card, bosses,
Strongboxes and terrain.

### P27. M1 juice scope

M1 builds every part of Appendix H that Level 1 can show:

- **§13 build-order items 1–8:**
  1. hit flash, damage numbers, and hit sounds with variation;
  2. loot choreography: pop, beams, labels, stingers, collect flight,
     ticker;
  3. mana orbs and the counter, placement drop-in, card ready;
  4. death fall, soul puff, gold coins;
  5. significance bands and the stat-driven VFX profile;
  6. intensity tiers: shake, hitstop, slow-mo, ducking;
  7. pitch ladders;
  8. ailment overlays and sounds.
- **Music** for the title, hideout and Grassland, with the intensity layer
  (§10.4).
- **Code-drawn currency orbs** (§4.3).
- **Equip feedback** (§4.5) and the **level-end summary** (§3.10).
- **The §14 dev knobs** and the accessibility toggles.

Crafting reveals (§9.2), boss presentation (§7.5), loot fountains (§3.9) and
the Strongbox (§3.8) arrive in Phase 2, with their systems.

### P28. Horizon

Phase 1 is fully specified. Phases 2–5 are outlines, refined by `filing`
beads from what landed, the retrospectives and the operator's playtest beads:

- **Phase 2 (M2):** the Grassland biome (levels 1–5), the Bloated Miller,
  Strongboxes, Rock terrain, crafting with its reveals, the Armorer,
  Recruiter and gamble tab, the loot filter, and the campaign map.
- **Phase 3 (M3):** the passive tree, and the Bog and Desert ruins (levels
  6–15) with their archetypes, terrain and bosses.
- **Phase 4 (M4):** Winter keep, Count Geonor, and the 20-level demo end to
  end.
- **Phase 5 (M5):** headless calibration against Appendix E, and polish.
