# Phase 1: The First Map (M1)

**Goal:** Level 1, fully juiced, with the loop closed
([P26](decisions.md#p26-m1-scope), [P27](decisions.md#p27-m1-juice-scope)):

1. The player picks a focus and sees its starter kit.
2. They play Level 1: 3 lanes, Shamblers, 5 waves and a flag wave. Every
   hit, kill, drop and mana orb lands with Appendix H's feedback.
3. They see the loot summary, choose a first-clear hero, and unlock slot 4.
4. In the hideout they equip a drop, replay Level 1, and feel the upgrade
   on the board.

A reload or a newly landed build at any moment resumes the round mid-wave
([P14](decisions.md#p14-rounds-resume-mid-wave)).

**Read first:**

- this plan's [decisions](decisions.md), especially P5, P6 and P10–P27;
- [GDD](../gdd.md) §4–§7, §14 and §15;
- [Appendix A](../appendix-a-combat.md) §1–§7 and §10;
- [Appendix B](../appendix-b-heroes.md) §1, §4 and the seven starter heroes
  (H01, H07, H10, H09, H12, H18, H24) and three starter spells (S2, S3, S5);
- [Appendix C](../appendix-c-items.md) §C.1, §C.5.1 and §C.6;
- [Appendix D](../appendix-d-monsters-levels.md) §1–§5 and the Level 1 row of
  §6.1;
- [Appendix E](../appendix-e-economy.md) §2–§7;
- [Appendix G](../appendix-g-art.md) §1–§4 (heroes, Shambler) and §6;
- [Appendix H](../appendix-h-juice.md), all of it except §7.5, §9.2 and
  §3.8–§3.9.

[Back to the plan](README.md)

## Task graph

Each task depends on the tasks after its arrow. **Review: yes** tasks get a
paired `review-qa` bead, numbered `<n>r` (for example 1.2r), which depends
on its task. Review beads gate only 1.39.

**Wave 1** (the root):

- 1.1 has no prerequisites.

**Wave 2** (eight at once):

- 1.2 ← 1.1
- 1.3 ← 1.1
- 1.4 ← 1.1
- 1.5 ← 1.1
- 1.6 ← 1.1
- 1.7 ← 1.1
- 1.8 ← 1.1
- 1.9 ← 1.1

**Wave 3:**

- 1.10 ← 1.2
- 1.11 ← 1.5
- 1.12 ← 1.3, 1.5
- 1.13 ← 1.2, 1.3, 1.5
- 1.14 ← 1.3
- 1.15 ← 1.2, 1.6

**Wave 4:**

- 1.16 ← 1.2, 1.12
- 1.17 ← 1.2, 1.12
- 1.18 ← 1.12
- 1.19 ← 1.2, 1.4, 1.12, 1.14
- 1.20 ← 1.2, 1.12
- 1.21 ← 1.8, 1.10
- 1.22 ← 1.7, 1.10, 1.15
- 1.23 ← 1.7, 1.8

**Wave 5** (presentation):

- 1.24 ← 1.10, 1.20
- 1.25 ← 1.7, 1.15, 1.21
- 1.26 ← 1.7, 1.15, 1.21
- 1.27 ← 1.7, 1.15, 1.21, 1.24
- 1.28 ← 1.15, 1.21, 1.24
- 1.29 ← 1.15, 1.16, 1.17, 1.21
- 1.30 ← 1.11, 1.15, 1.21
- 1.31 ← 1.14, 1.18
- 1.32 ← 1.9, 1.19, 1.24
- 1.33 ← 1.19, 1.22, 1.24

**Wave 6** (screens and tuning):

- 1.34 ← 1.19, 1.23, 1.24
- 1.35 ← 1.19, 1.31
- 1.36 ← 1.19, 1.31
- 1.37 ← 1.11, 1.13, 1.14, 1.16, 1.17, 1.20

**Close:**

- 1.38 ← 1.25–1.30, 1.34–1.37
- 1.39 ← 1.38, and every Phase 1 review bead
- 1.40 ← 1.39
- 1.41 ← 1.40
- 1.42 ← 1.39
- 1.43 ← 1.39, 1.40 and the beads it files, 1.41, 1.42

**The widest point** is wave 2: eight beads at once, 1.2–1.9. From wave 3
on, about ten beads are ready at a time, counting trailing review beads.

**The critical path** is
1.1 → 1.5 → 1.12 → 1.16 → 1.37 → 1.38 → 1.39. Sessions pick critical-path
beads first ([workflow § Selection order](workflow.md#selection-order)).

**Juice does not wait for heroes.** The kernel ships a dev-only `scripted`
actor (1.2), which emits real hits through the combat seam on a timer. That
lets 1.25–1.30 build and QA their feel in scenes before 1.16 lands.

**Known overlaps that need no edge:**

- Most beads add variants to `src/sim/events.ts` and `src/sim/intents.ts`,
  rows to `src/juice/cues.ts`, scenes to `src/dev/scenes/`, and IDs to
  `src/types/ids.ts`.
- 1.25–1.30 each draw their own layer in `src/render/layers/` and register
  it with 1.10's layer stack.
- 1.35 and 1.36 both render 1.31's cards.

Owners resolve these textual conflicts with `tg --no-launch update`.

**Serialization edges:**

- 1.16 → 1.29, and 1.17 → 1.29: 1.29 reads the hero and spell VFX inputs
  those beads define.
- After 1.19 lands, any two beads that bump the same save section's
  `schemaVersion` get an edge ([workflow § Serialization](workflow.md#serialization)).

**The save schema during Phase 1.** Nothing persists until 1.19 lands. From
then on, P15 applies in full, because the operator plays on the play server
from that point. Additive fields need only a default. Anything else ships a
migration, a version bump and a fixture. 1.39 commits the M1 milestone save.

## Tasks

### 1.1 Scaffold (core)

The thinnest root that unblocks everyone. Land it fast.

- Vite + React + TypeScript (strict), Vitest (node and jsdom projects),
  ESLint (flat config), Prettier, knip.
- `package.json` scripts: `dev`, `build`, `test`, `typecheck`, `lint`,
  `format:check`, `review` (format check, lint, typecheck, test), `knip`.
  `scripts/ci` already runs the matching names.
- The directory layout from [workflow § Areas](workflow.md#areas), each
  directory with an `index.ts` stub only where an import needs one.
- `src/types/ids.ts` with the branded-ID helper.
- **The sim purity lint rule:** files under `src/sim/`, `src/combat/`,
  `src/heroes/`, `src/spells/`, `src/monsters/`, `src/loot/` and
  `src/account/` may not import React, DOM globals, `Date`, `performance`
  or `Math.random`.
- `.gitignore` for `.cache/`, `public/assets/`, `.saves/`, `.play/`,
  `logs/`, `artifacts/` and `dist/`.
- A blank React page that renders "Mercs vs. Monsters".

**Tests first:**

- a trivial Vitest test in each project;
- a lint fixture proving the purity rule rejects `Math.random` in
  `src/sim/`.

**Acceptance:**

- `scripts/ci` passes and runs under 30 s.
- `npm run dev` serves the page.

**Review: yes** (1.1r also checks the purity rule's coverage).
**Areas:** repository root config, `src/` stubs, `scripts/ci`.

### 1.2 Sim kernel (core)

The seam every gameplay bead builds on
([P11](decisions.md#p11-a-pure-deterministic-sim)), in `src/sim/`:

- **`RoundState`** (`src/sim/state.ts`): JSON-safe board state. It holds:
  - lanes (3 or 5) and 9 columns, per Appendix A §1.1;
  - hero and monster actors, projectiles, ground effects and timers;
  - mana, life pool and wave cursor;
  - the RNG streams;
  - `earned`, the drops credited this round.
- **`step(state, intents): SimEvent[]`** at 1/60 s, mutating a draft and
  returning events. Speed control is the driver's job, not the step's.
- **Named RNG streams** (`src/sim/rng.ts`): a small seeded PRNG
  (sfc32 or similar) whose full state is plain numbers.
- **Board geometry and targeting primitives** (Appendix A §3.3): nearest
  monster in lane ahead, monsters within a radius, tiles in a shape, and
  distance as `hypot(dx, dLane)`.
- **Monster locomotion** from the stat block's walk speed. Blocking by a
  hero on the tile, leaks below `x = 0.5`, and the life-pool cost per rarity
  (GDD §5, Appendix A §7). Level loss at 0.
- **The `SimEvent` union** (`src/sim/events.ts`): `hit`, `kill`, `drop`,
  `manaSpawn`, `manaCollect`, `placed`, `shovelled`, `leak`, `waveStart`,
  `flagWarning`, `levelEnd`, `ailmentApplied`, `ailmentExpired`, `stun`.
  `hit` carries `dealt`, `targetMaxLife`, a per-type breakdown, `crit`,
  `sourceId`, `targetId`, lane and x.
- **The `Intent` union** (`src/sim/intents.ts`) and an intent queue.
- **Seams for later beads:** each step calls registered systems in a fixed
  order (spawning, heroes, projectiles, monsters, ailments, economy, loot).
  Later beads register their system without editing the loop.
- **A `scripted` actor** for dev scenes, which deals a configured hit to the
  nearest monster every N ticks through a `dealHit` seam. 1.5 replaces the
  seam's stub with the real pipeline.
- **`hashState(state)`**, stable across key order, for invariant tests.

**Tests first:**

- the same seed and intents give the same hash after 3,600 steps;
- drawing from one RNG stream leaves every other stream's state unchanged;
- a monster walks one tile in `walkSecondsPerTile` seconds;
- a hero on the tile stops the monster;
- a leak costs the right life per rarity, and life 0 emits
  `levelEnd { result: 'lost' }`;
- each targeting primitive, on small hand-built boards;
- `JSON.parse(JSON.stringify(state))` round-trips to the same hash.

**Acceptance:** the tests pass, and a scenario test runs 10 Shamblers
against a `scripted` actor to a deterministic outcome.

**Review: yes.** **Areas:** `src/sim/`, `src/tuning/sim.ts`,
`src/types/ids.ts`.

### 1.3 PoE2 importer and M1 data

Implement [P19](decisions.md#p19-real-poe2-data-through-an-importer):

- `scripts/import-poe2/`: fetch at the pinned commit into `.cache/repoe/`,
  then trim to `data/`:
  - `heroes.json`: the 7 starter skills, every level they need;
  - `spells.json`: the 3 starter spells;
  - `supports.json`: the supports compatible with those skills, per Appendix
    B §5;
  - `bases.json` and `mods.json` up to item level 10, filtered to the
    Appendix A §9 vocabulary and the Appendix C spawn-weight matrix;
  - `uniques.json` and `currency.json`;
  - `monster-stats.json`: `default_monster_stats`.
- An ID list per file in `scripts/import-poe2/ids/`, which later phases
  extend.
- `src/data/`: typed, read-only accessors, with a branded ID type per kind.
- `--check` mode: re-import into a temp directory and diff against `data/`.

**Tests first:**

- the trimmer over a tiny checked-in RePoE sample produces the expected
  JSON;
- the accessors return the Appendix B §4 starter heroes and the Appendix A
  §1.3 level 1 monster life of 15;
- every mod in `mods.json` maps to a vocabulary stat.

**Acceptance:**

- `data/` is committed, under 2 MB in total.
- `--check` is clean.
- `scripts/ci` never touches the network.

**Review: yes.** **Areas:** `scripts/import-poe2/`, `data/`, `src/data/`.

### 1.4 Save layer (core)

The generic half of [P13](decisions.md#p13-one-save-document-two-sections)
and [P15](decisions.md#p15-never-break-a-save), in `src/save/`. It knows
sections, not game types; 1.19 registers the account and round sections.

- **The `SaveDocument` envelope** and a section registry
  (`src/save/registry.ts`). Each section has a `schemaVersion`, a
  `normalize`, ordered migrations and a validator.
- **`load(raw)`** runs each section independently:
  parse, then migrate up to current, then normalize, then validate. It
  returns per-section results with reasons, so a failed round never costs
  the account.
- **Storage:**
  - an IndexedDB adapter that writes both sections in one transaction, keeps
    the last 20 documents, and keeps named checkpoints;
  - a memory adapter for tests;
  - the **save mirror client**, which POSTs each document to the dev
    server's `/__mvm/save` and reads it back when IndexedDB is empty or
    older.
- **The save mirror endpoint**, as a Vite plugin in `vite/save-mirror.ts`.
  It writes `.saves/latest.json` plus a rolling history, and
  `.saves/rejected/` for documents that failed to load.
- **`npm run save:fixture -- <section>`**, which writes the current
  version's fixture from a dev-built document.
- **The golden-fixture test harness:** every file under
  `src/save/fixtures/` must load through the current registry.
- **Logs** for every load, migration and rejection.

**Tests first:**

- envelope round-trip identity;
- a fixture migration chain v1 → v2 → v3 over a toy section;
- normalize fills a missing field with its default, and drops an unknown
  field with a log line;
- a corrupt round section loads the account and rejects the round with its
  reason;
- the IndexedDB adapter over `fake-indexeddb`: atomic two-section writes and
  history pruning;
- the mirror plugin writes and serves documents, tested against its handler
  function.

**Acceptance:** the tests pass, and a toy section survives a page reload in
the browser through IndexedDB and, with IndexedDB cleared, through the
mirror.

**Review: yes.** **Areas:** `src/save/`, `vite/save-mirror.ts`,
`vite.config.ts`.

### 1.5 Combat: hits and mitigation (core)

The Appendix A damage pipeline as pure functions in `src/combat/`:

- the `Actor` stat block and the closed stat vocabulary (§2, §9), as typed
  stat keys;
- the hit roll (§4): base damage, conversion and gained-as-extra,
  increased and more, accuracy, and crits;
- mitigation (§5): evasion, armour (`A / (A + 10 × D)`, cap 90%),
  resistances (cap 75%) and penetration, block (cap 50%), and energy shield
  before life;
- `resolveHit(attacker, target, skillHit, rng)`, returning dealt damage per
  type, crit, avoided-by and the life and ES changes;
- the four global knobs from `src/tuning/combat.ts`.

Mechanics without an M1 user (bleed, thorns, leech, culling) are out of
scope.

**Tests first:**

- Appendix A §10's worked hit example, step by step, to the documented
  number;
- each mitigation formula at and around its cap;
- conversion ordering and gained-as-extra, over hand-built stat blocks;
- crits with a seeded RNG;
- the §1.3 calibration examples as tolerances (8–10 hits to kill a level 1
  Shambler, about 3.7 s to kill a squishy hero).

**Acceptance:** the tests pass, and `dealHit` in the kernel calls
`resolveHit`.

**Review: yes.** **Areas:** `src/combat/`, `src/tuning/combat.ts`.

### 1.6 Juice core library

Generic feel models from Appendix H §2, in `src/juice/core/`. All of them
are pure or clock-injected.

- the named easings (§2.1);
- the trauma shake model (§2.2), with integer offsets and the
  Off/Low/Full option;
- the hitstop controller (§2.3): actor clocks and the global freeze, with
  the 1.0 s rate limit and halving at 2×;
- the slow-mo controller, with its 4 s rate limit;
- the particle pool (§2.7): 2,000 slots, presets from
  `src/tuning/juice.ts`, the 80% budget rule with loot exempt, and pixel
  snapping;
- the significance bands (§2.6), with the boss ×10;
- the tier table (§1.3) as data in `src/tuning/juice.ts`;
- the dev-knob and accessibility settings store, persisted in
  `localStorage` ([P21](decisions.md#p21-tunables-and-knobs)).

**Tests first:**

- trauma decays linearly at 1.6/s, and offsets stay integers of at most
  `shakeMax`;
- a second global hitstop within 1.0 s is refused and adds shake only;
- the pool never exceeds its capacity, and presets emit half their count
  above 80% unless they are loot;
- band edges at 0.05 and 0.25, and the boss multiplier;
- `juice=0` zeroes shake, hitstop, slow-mo and particle counts.

**Acceptance:** the tests pass.

**Review: yes** (`juice`). **Areas:** `src/juice/core/`,
`src/tuning/juice.ts`.

### 1.7 Audio engine (core)

Appendix H §10, in `src/audio/`:

- one `AudioContext`, with the four buses (`music`, `sfx`, `loot`, `ui`) at
  their default levels, into a master compressor;
- the voice manager (§10.3):
  - per-sound caps and the 32-voice global cap with priorities;
  - the 30 ms retrigger guard;
  - round-robin variants;
  - ±6% pitch and ±2 dB variation on combat sounds, ±2% on loot;
  - pan by board x;
- ducking: `duck(bus, dB, seconds)`;
- the ZzFX player, with the §11.2 starting sounds;
- a sound-id registry that falls back to ZzFX when a sample is missing;
- unlock on the first user gesture;
- `audioLog`: the last 20 sounds and dropped voices.

**Tests first**, against a fake `AudioContext`:

- the per-sound cap and the global cap drop the lowest priority first;
- the loot bus is never ducked and never culled by the global cap;
- the retrigger guard raises the playing voice by 1 dB instead;
- round-robin never repeats a variant twice in a row;
- the pan formula at x = 0 and x = 9.

**Acceptance:**

- The tests pass.
- A dev page plays every ZzFX sketch, audibly.

**Review: yes.** **Areas:** `src/audio/`, `src/tuning/audio.ts`.

### 1.8 Asset pipeline

Implement [P20](decisions.md#p20-assets-are-baked-never-committed) in
`scripts/assets/`:

- **ULPC compositing,** per Appendix G §2.6, from recipes in
  `src/assets/recipes/`:
  - the 7 starter heroes, with right-facing rows;
  - the Shambler, with left-facing rows;
  - the starter weapon layers.

  Output is one atlas plus a frame manifest (rows, counts, release frames
  from G §3.1).
- **The Grassland lawn and tiles,** per G §5.
- **Sounds:** copy the H §12.1 picks for M1's events, and the §12.2 music
  picks for the title, hideout and Grassland. The maps are
  `src/assets/sounds.ts` and `src/assets/music.ts`.
- **Credits:** a generated `src/assets/credits.ts` from each pack's
  `SOURCE.txt` and `CREDITS.csv`.
- **Fallbacks:** without `~/Documents/lpc` or `~/Documents/game-audio`, warn
  and write a placeholder manifest.
- `npm run assets` is idempotent and skips unchanged inputs by hash.

**Tests first:**

- each recipe resolves to existing layer paths in the library (skipped when
  the library is absent);
- the frame manifest's dimensions match the G §2.1 sheet format;
- the placeholder manifest is complete for every recipe and sound id.

**Acceptance:**

- `public/assets/` builds from the libraries.
- A checkout without them still builds and boots.
- No binary is committed.

**Review: yes.** **Areas:** `scripts/assets/`, `src/assets/`.

### 1.9 Play server and log sink

Implement [P18](decisions.md#p18-the-play-server) in `scripts/play/`:

- `npm run play`: create or refresh `~/mvm/.play/` as a detached worktree at
  `staging`, then serve Vite on port 5180;
- every 15 s, read `tg --no-launch status`. On a new `staging` OID:
  - fast-forward;
  - rerun `npm install` when the lockfile changed, and `npm run assets` when
    asset inputs changed;
  - let Vite reload;
- point the play server's save mirror at `~/mvm/.saves/` and its log sink
  at `~/mvm/logs/play.jsonl`;
- **the log sink endpoint** (`vite/log-sink.ts`) and the in-game logger
  (`src/dev/log.ts`): structured JSON lines, an IndexedDB ring of 5,000
  lines, and JSONL export;
- print the URL and the `staging` OID on every update.

**Tests first:**

- the update decision function: which OID, lockfile and asset-hash changes
  trigger which steps;
- the log sink handler appends valid JSONL;
- the logger's ring buffer prunes at 5,000 lines.

**Acceptance:** with the play server running, landing a trivial change on
`staging` reloads the page within 30 s.

**Review: yes.** **Areas:** `scripts/play/`, `vite/log-sink.ts`,
`src/dev/log.ts`.

### 1.10 Render shell and time driver (core)

The board's frame, in `src/render/` and `src/app/driver.ts`:

- **The canvas,** sized to the largest integer scale of the 576×320 logical
  board that fits, centered, with crisp pixel scaling.
- **The layer stack** of Appendix H §1.4. Each layer is a registered draw
  function, so later beads add layers without editing the shell.
- **The time driver:**
  - `requestAnimationFrame` with a fixed-step accumulator;
  - 1× and 2× speed;
  - global hitstop and slow-mo hooks from 1.6;
  - `debugSlowmo`;
  - pausing for the resume countdown.
- **Placeholder drawing** of the lawn grid, heroes (role-coloured capsules)
  and monsters (grey capsules), straight from `RoundState`, with
  interpolation between steps.
- **Board shake** applied to board layers only, never the HUD.
- **`window.__mvm`** ([P22](decisions.md#p22-the-qa-surface)): the
  read-only surface, the event and cue logs, and `caps`, which collects
  errors.
- **`?scene=<name>`** boots a scene registered in `src/dev/scenes/`. Add
  `empty-board` and `shamblers-vs-scripted`.

**Tests first:**

- the accumulator runs exactly 60 steps per simulated second at 1× and 120
  at 2×, and none during global hitstop;
- the integer scale chooser at 1280×720 and 1920×1080;
- the layer registry's draw order.

**Acceptance:**

- `?scene=shamblers-vs-scripted` shows capsules walking and dying.
- Captures at both sizes.
- `caps` is empty.

**Review: yes.** **Areas:** `src/render/`, `src/app/`, `src/dev/`.

### 1.11 Combat: ailments and stun

Appendix A §6, the M1 subset, in `src/combat/ailments/`:

- shock, chill, freeze (with buildup) and ignite. These are the ailments the
  starter kits and M1 affixes apply.
- light and heavy stun with Primed thresholds (§6.3);
- the Armour Break debuff (Armour Piercing Rounds);
- an ailment system registered in the kernel: durations, ticking and expiry
  events.

**Tests first:**

- shock's damage-taken multiplier, and its magnitude against hit size;
- chill's action-speed slow, and freeze buildup reaching freeze;
- ignite DoT per second, and its refresh rule;
- a stun's threshold, and a Primed light stun;
- `ailmentApplied` and `ailmentExpired` events.

**Acceptance:** the tests pass, and a scenario shows an Ice Strike-like
scripted hit freezing a Shambler.

**Review: yes.** **Areas:** `src/combat/ailments/`, `src/tuning/combat.ts`.

### 1.12 Hero model

Appendix B §1, in `src/heroes/model/`:

- the hero instance:
  - skill ID, level, XP, rarity and supports;
  - quality;
  - three item slots: weapon, armour, accessory;
- **stat aggregation** (Appendix A §2.1): gem attribute profile by level,
  the life formula with archetype multipliers, items (local and global mods
  per C.1.7), and supports;
- hero level to gem level (§1.5);
- **the card**: a hero plus its equipped items. Cost is `roleBase × Π(support
  cost multipliers)`, rounded to 25. Recharge tier (§1.11);
- weapon lock (§1.3): which item classes each skill accepts.

**Tests first:**

- Appendix B §3's level 17 Rare Lightning Spear aggregates to its documented
  stat block, using its data from `data/` or a fixture if Lightning Spear is
  not imported;
- the life formula at level 1 with Str 7 gives 42;
- each starter card's cost matches Appendix B §4;
- equipping a weapon of the wrong class is refused;
- a global mod on one card's item affects only that card.

**Acceptance:** the tests pass.

**Review: yes.** **Areas:** `src/heroes/model/`.

### 1.13 Monsters and waves

Appendix D, the Level 1 subset, in `src/monsters/`:

- the monster stat model (§1), from `monster-stats.json` × archetype ×
  `K_monsterLife` and `K_monsterDamage`;
- the Shambler archetype's stats and behaviour (§2): walk, bite at 1/s when
  blocked;
- monster rarity rolls (§3), and the M1-relevant affixes (§4) on magic and
  rare monsters, rolled at spawn and stored
  ([P16](decisions.md#p16-outcomes-not-seeds));
- **the wave plan** (§5), generated at level start and stored whole:
  - timing, with the first wave at 25 s on Level 1 and 25–31 s gaps;
  - the early trigger;
  - the flag wave and its 7.5 s warning;
  - the budget formula;
  - composition and the lane cap;
  - spawn stagger;
- the level definition type, and Level 1's definition in
  `src/monsters/levels/level-1.ts`.

**Tests first:**

- Level 1's plan has 5 waves, the last a flag wave, with its first wave at
  25 s;
- no lane gets more than 40% of a wave's points;
- the same seed gives the same plan, and a stored plan is used verbatim
  after a tuning change;
- a magic Shambler's affix modifies its stats as listed;
- the early trigger fires at the threshold, but never before 4 s.

**Acceptance:** the tests pass, and a scenario test runs Level 1's waves
against a `scripted` wall to the level-end event.

**Review: yes.** **Areas:** `src/monsters/`, `src/tuning/waves.ts`.

### 1.14 Item, currency and gold generation

Appendix C §C.6 and Appendix E §3–§5, in `src/loot/`:

- **item generation:** item level, rarity from the per-kill roll with
  monster-rarity bonuses, base choice with the 50% build-aware weapon
  shaping, and affix rolls by spawn weight and tier gate;
- **currency drops** (E §4.1–§4.2), at M1's area levels;
- **gold piles** (E §5.1);
- **the per-kill drop roll** (E §3.1–§3.3): `rollDrops(monster, ctx, rng)`
  returns full item, currency and gold outcomes;
- normal starter bases (Appendix B §4), for the account to grant;
- sell price (E §5.2), for later salvage.

**Tests first:**

- Appendix C §C.6.1's rare spear example, with a seeded RNG, matches its
  documented shape: mod count, tier gates and item level;
- an affix above its item-level gate never rolls (property test, 1,000
  seeds);
- over 10,000 normal kills at area level 1, the rarity mix is within
  tolerance of E §3.2;
- gold pile size matches E §5.1's formula bounds.

**Acceptance:** the tests pass.

**Review: yes.** **Areas:** `src/loot/`, `src/tuning/loot.ts`.

### 1.15 Juice director (core)

The event→cue seam ([P12](decisions.md#p12-juice-is-presentation-only)),
in `src/juice/director/`:

- the `Cue` types: `shake`, `hitstop`, `slowmo`, `duck`, `particles`,
  `sound`, `number`, `flash`, `lootTimeline`, `hudBump`, `banner`;
- **the cue table** (`src/juice/cues.ts`): one row per `SimEvent` kind,
  mapping the event and its significance band to a tier and cues. Later
  beads add or refine rows;
- **the dispatcher:** it applies tier effects through 1.6's controllers,
  respects the rate limits and the `juice` knob, and fans cues out to
  registered presentation systems;
- **damage-number aggregation** (H §2.5): same source and target within
  150 ms merge; DoT is summed every 0.5 s;
- `tierLog` and the cue log in `window.__mvm`;
- **the invariant test harness:** a scripted Level 1 round with the full
  presentation pipeline attached (headless, with fake audio and a no-op
  canvas) at `juice=2`, ending with the same state hash as the bare sim.

**Tests first:**

- table-driven: each event kind and band yields the expected tier and cue
  set;
- aggregation merges and splits at 150 ms;
- the invariant test.

**Acceptance:** the tests pass.

**Review: yes** (`core`, `juice`). **Areas:** `src/juice/director/`,
`src/juice/cues.ts`.

### 1.16 Hero board behaviors

The hero loop (Appendix A §3.1) and the seven starter heroes' lane
behaviors (Appendix B H01, H07, H09, H10, H12, H18, H24), in
`src/heroes/board/`:

- attack cadence with `K_heroActionRate`, release timing, and target
  acquisition;
- projectiles: lane flight, pierce, fork, chain and extra projectiles
  (Appendix A §3.4);
- melee: the hero's own tile and one ahead; Rolling Slam's area; Falling
  Thunder's cone and volley; Ice Strike's combo;
- Armour Piercing Rounds' clip and reload;
- the Ezomyte Acolyte's Spirit-scaled mana generation
  (`25 × (1 + Spirit / 200)` every ~24 s), as a `manaSpawn` from the hero;
- heroes taking damage and dying.

**Tests first**, one scenario per hero against seeded Shamblers:

- Appendix B §4's damage per second, within tolerance, after
  `K_heroActionRate`;
- pierce, fork and chain hit the right lanes and counts;
- the acolyte's orb cadence and value;
- a wall holds a Shambler for roughly 40 s (Appendix A §1.3).

**Acceptance:** the tests pass, and `?scene=starter-heroes` shows each hero
fighting.

**Review: yes.** **Areas:** `src/heroes/board/`, `src/tuning/heroes.ts`.

### 1.17 Spells

Appendix B §6.1 and the three starter spells (S2 Earthquake, S3 Explosive
Grenade, S5 Comet), in `src/spells/`:

- the spell card: level, rarity, supports, cost and cooldown;
- the `cast` intent at a target tile, with its grid shape;
- the delays: Grenade's 3 s fuse and Earthquake's Aftershock;
- the spell instance model, reusing 1.12's aggregation.

**Tests first:**

- each spell's shape hits exactly its tiles;
- the cooldown and cost are enforced;
- Comet and Earthquake one-shot level 1 white Shamblers (Appendix B §4).

**Acceptance:** the tests pass, and `?scene=spells` casts each one.

**Review: yes.** **Areas:** `src/spells/`.

### 1.18 Hero and spell generation

Appendix B §1.9–§1.10 and §7, in `src/heroes/gen/`:

- the hero drop's level roll, rarity and skill choice, with the 35%
  roster shaping and the unlock gate (§1.8);
- **the support roll** (§1.10): tag-compatible, weighted 3× toward
  recommended, tier-gated by level, no duplicates and no shared families;
- spell drops the same way;
- **"choose 1 of 3"** for first-clear rewards (Appendix E §4.5), with at
  least one matching the roster.

**Tests first:**

- the support roll never yields an incompatible, duplicate or same-family
  support (property test);
- a support's tier never exceeds its level gate;
- a choose-1-of-3 always contains a roster match;
- rarity gives the right support count.

**Acceptance:** the tests pass.

**Review: yes.** **Areas:** `src/heroes/gen/`.

### 1.19 Account and round lifecycle (core)

The game's persistent spine, in `src/account/`. This bead turns on
[P13–P17](decisions.md#p13-one-save-document-two-sections) for real.

- **`AccountState`** (`src/account/state.ts`):
  - focus, roster (6 card slots, of which 3 are unlocked at the start, plus
    the spell);
  - stash, gold, currency, player level and XP;
  - first clears and pending first-clear choices.
- **New account:** a focus grants its Appendix B §4 kit with the normal
  starter bases.
- **Level start:** builds a `RoundState` from the account (roster locked),
  the level definition and a fresh seed, and stores the wave plan.
- **Kill-time crediting:** drops are written to the account and to
  `round.earned` in the same step. The account half is applied by a
  lifecycle hook, so the sim stays account-agnostic.
- **Level end:**
  - win or loss;
  - XP (Appendix B §1.6, Appendix E §6);
  - the first-clear reward, which for Level 1 unlocks slot 4 and offers a
    choose-1-of-3 hero;
  - an `upgrade` flag per drop, from DPS and EHP on its best card.
- **Save sections:** the account and round sections registered with 1.4's
  registry, their `normalize` and validators, and v1 fixtures for both.
- **Autosave:** every 1 s of sim time, on `pagehide` and
  `visibilitychange`, and after each hideout change.
- **Reconciliation on load** ([P17](decisions.md#p17-reconciliation-on-load)),
  with an empty retirement table to start.

**Tests first:**

- a new Warrior account holds exactly the Warrior kit;
- a scripted Level 1 win unlocks slot 4, offers 3 heroes with a roster
  match, and awards XP;
- a loss keeps every credited drop;
- **resume equivalence:** a round saved at tick 1,800, loaded, and stepped
  to 3,600 hashes the same as one stepped straight to 3,600;
- the v1 fixtures load; an unknown base ID reconciles to gold with a log
  line;
- a corrupt round section loads the account and restarts the level.

**Acceptance:**

- The tests pass.
- In the browser, a round in progress survives a reload mid-wave.

**Review: yes** (`core`; 1.19r also judges whether the section split will
hold for crafting, vendors and the tree).
**Areas:** `src/account/`, `src/save/registry.ts`, `src/save/fixtures/`.

### 1.20 Mana economy and placement rules

GDD §6.2–§6.3 and Appendix E §2, in `src/sim/economy/`:

- starting mana (150 on Level 1, otherwise 50);
- sky mana on PvZ's schedule (25 every 5–11 s), as `manaSpawn` events with
  an auto-collect delay;
- placing heroes: the `place` intent with cost, recharge, an occupied-tile
  check and lane bounds. Slow cards start with 20 s of recharge left and
  very-slow cards with 35 s;
- the shovel (no refund) and the roster lock;
- `setSpeed` (1×/2×).

**Tests first:**

- Appendix E §2.3's first-minute shape: a scripted three-acolyte opener's
  mana at 0, 7.5, 15 and 25 s, within tolerance;
- placement is refused for cost, recharge, occupancy and an out-of-bounds
  lane;
- the shovel frees the tile with no refund.

**Acceptance:** the tests pass.

**Review: yes.** **Areas:** `src/sim/economy/`, `src/tuning/economy.ts`.

### 1.21 Sprites and animation

Replace the placeholders with LPC sprites (Appendix G §1 and §2), in
`src/render/sprites/`:

- atlas loading from 1.8's manifest, with placeholder fallback per actor;
- animation states (G §1.3): idle with a desynchronised 1 px bob, walk,
  attack with the held wind-up frame and the release frame (H §5.2), and
  hurt;
- facing (heroes right, monsters left) and sorting (G §1.1);
- the **actor effects** the juice beads drive: hit flash (`source-atop`,
  80 ms), squash, knockback offset, 1 px hero jitter, and per-actor
  animation clocks for actor hitstop;
- rarity tints and outlines for magic and rare monsters (G §4.3);
- health bars that appear on hit and linger for 2 s (H §5.2).

**Tests first:**

- the frame chooser for each state and facing, from a fake manifest;
- the release-frame callback fires on the right frame;
- actor hitstop holds an actor's frame while the sim advances.

**Acceptance:**

- `?scene=starter-heroes` shows LPC heroes and Shamblers animating, with
  placeholders when the library is absent.
- Captures at both sizes.

**Review: yes.** **Areas:** `src/render/sprites/`.

### 1.22 Intensity tiers, wired

Appendix H §1.3, §2.2 and §2.3 end to end, in `src/juice/tiers/`:

- T3–T5 shake on the board layers;
- T4–T5 global hitstop through the driver;
- T5 slow-mo, never during a telegraph;
- music and sfx ducking through 1.7;
- the vignette and the screen flash, honouring "reduce flashing";
- `?scene=tiers`, a button per tier.

**Tests first:**

- each tier's effects with the rate limits, over the dispatcher and a fake
  clock;
- "reduce flashing" caps white flashes at 40% alpha;
- at 2× speed, hitstop and slow-mo halve.

**Acceptance:** the tests pass, and in `?scene=tiers` each tier reads as
distinctly stronger than the last.

**Review: yes** (`juice`). **Areas:** `src/juice/tiers/`.

### 1.23 Music

Appendix H §10.4, the M1 subset, in `src/audio/music/`:

- title, hideout and Grassland tracks;
- Grassland's intensity layer (or a crossfade between two tracks, 1.5 s). It
  fades in on a flag warning and while more than 12 monsters are on the
  board, and out 6 s after;
- victory and defeat stingers;
- per-bus volume sliders in the settings store.

**Tests first:**

- the intensity state machine: entry, hold and the 6 s exit, over fake
  events;
- the crossfade's gain curves.

**Acceptance:** the tests pass, and the music follows a played round
audibly.

**Review: yes** (`juice`). **Areas:** `src/audio/music/`.

### 1.24 HUD shell and placement input

GDD §15's in-level HUD in React (`src/ui/hud/`), over the canvas:

- the mana counter (top left), with roll-up and a bump on change;
- **the roster bar:** cards with cost, a recharge sweep and an unaffordable
  state, plus the spell card;
- life-pool hearts;
- wave progress with flag markers;
- the loot ticker's container (right edge);
- the shovel and the 1×/2× toggle;
- **placement input:**
  - pick a card, then a ghost snaps to the hovered tile with valid and
    invalid tints;
  - the range preview (H §5.2);
  - click to place, which sends the `place` intent;
  - Escape cancels;
- the countdown overlay that 1.32 drives.

**Tests first** (jsdom):

- picking an unaffordable card is refused and flags the deny state;
- clicking a valid tile sends the right `place` intent;
- the recharge sweep's progress tracks the card's timer.

**Acceptance:** a full Level 1 can be played by mouse with placeholder
feedback; captures at both sizes.

**Review: yes.** **Areas:** `src/ui/hud/`.

### 1.25 Hit feel (juice)

Appendix H §13 items 1 and 5, first half: §2.4, §2.5, §2.6 and §10.3. In
`src/juice/hits/`:

- hit flash, squash and knockback, through 1.21's actor effects, sized by
  band;
- impact bursts by band (§2.6);
- **damage numbers** (§2.5), drawn in a pixel font (§12.4) with an outline:
  - colour by damage type;
  - pop and rise;
  - crit and big-hit styling;
  - DoT ticks;
  - the 48-number cap;
  - the `numbers` mode;
  - `IMMUNE`, `EVADE` and `BLOCK`;
- **hit sounds** by band and material, with variation, through 1.7;
- actor hitstop by band (§2.3);
- `?scene=hit-bands`.

**Tests first:**

- the number spec for each band, crit, DoT and the immune word;
- the cap fades the oldest non-crit numbers first;
- the band chooses the sound variant and the hitstop length.

**Acceptance:** in `?scene=hit-bands`, small, medium and big hits are told
apart by eye and ear without reading numbers. A/B captures go in the review.

**Review: yes** (`juice`). **Areas:** `src/juice/hits/`,
`src/render/layers/numbers.ts`.

### 1.26 Deaths, kills and gold (juice)

Appendix H §13 item 4: §7.2 and §3.5. In `src/juice/kills/`:

- the death fall, flash and fade;
- the soul puff;
- the hero death sting and tile flash (H §5.2);
- gold coin piles: pop, bounce, collect flight to the gold readout, and a
  clink per pile on the coin ladder;
- kill sounds and their voice caps.

**Tests first:**

- the cue rows for kills by monster rarity;
- the coin timeline's timings;
- coin clinks respect their per-sound cap.

**Acceptance:** `?scene=kills` reads clearly at 1× and 2×.

**Review: yes** (`juice`). **Areas:** `src/juice/kills/`.

### 1.27 Loot choreography and ticker (juice)

The most important beat (Appendix H §3.1–§3.4, §3.7 and §3.10's ticker
half). In `src/juice/loot/`, plus the ticker in `src/ui/hud/ticker/`:

- **the drop timeline** (§3.1):
  - pop arc, clamped to the lane band;
  - land with two bounces and dust;
  - the stinger;
  - the beam rise and the label;
  - the hold by rarity;
  - the collect flight to the ticker;
  - the ticker slide-in;
- the per-rarity table (§3.2), including hero and currency drops;
- the ascending-rarity stagger for multiple drops, so the best lands last;
- **code-drawn beams** (§11.1): core, glow, shimmer and base flare;
- **stingers** in one key (§3.3), and **pitch ladders** for rapid drops
  (§3.4, §13 item 7);
- labels hoverable for tooltips once 1.31 lands. Until then they show the
  name only;
- `lootHoldScale`;
- `?scene=loot-shower`.

**Tests first:**

- the timeline's keyframes per rarity, against §3.1–§3.2;
- the stagger order puts the best drop last;
- successive drops within the ladder window climb the pentatonic table,
  then reset.

**Acceptance:** in `?scene=loot-shower`, every rarity is identifiable with
eyes closed (stinger) and with sound off (beam height and label). The
ticker never covers a lane.

**Review: yes** (`juice`). **Areas:** `src/juice/loot/`,
`src/ui/hud/ticker/`.

### 1.28 Mana orbs and placement feel (juice)

Appendix H §13 item 3: §3.6 and §5.2. In `src/juice/mana/`:

- sky orbs: fall, glow, auto-collect flight to the counter, and the counter
  bump;
- acolyte pre-glow and orbs;
- the mana pitch ladder;
- **placement:** drop-in from −24 px, squash, dust, `place_thunk` and
  `mana_spend`;
- the card-ready shine and tick, and the unaffordable shake and buzz;
- shovelled heroes sinking into a dirt puff;
- `?scene=mana-rain`.

**Tests first:**

- the orb flight's timings;
- the counter's displayed value converges to the sim value;
- the placement timeline's keyframes.

**Acceptance:** `?scene=mana-rain` and a played opener feel like PvZ's sun.

**Review: yes** (`juice`). **Areas:** `src/juice/mana/`.

### 1.29 Stat-driven VFX profile (juice)

Appendix H §13 item 5, second half: §5.3, §5.4, §6.1–§6.2 for the M1
heroes and spells, and §2.8 and §11.1. In `src/juice/vfx/`:

- **`vfxProfile(card)`** from the final stat block: colour, core, trail,
  ring scale and crit spark;
- projectiles and trails, lightning and chain polylines, pierce streaks,
  fork flashes and volley timing;
- AoE rings at their real size, and slam dust;
- each starter hero's and spell's VFX and SFX from §6.1–§6.2, including the
  muzzle puff on release;
- the role-feel tricks (§5.4) for acolyte, wall, striker, ranged and
  caster;
- **`?scene=equip-ab`:** the same lane before and after equipping a
  converted or extra-projectile weapon, side by side.

**Tests first:**

- `vfxProfile` over hand-built stat blocks (lightning to fire conversion
  turns the colour orange, and the second element becomes the trail);
- ring scale tracks the area multiplier;
- the volley offsets extra projectiles by one frame each.

**Acceptance:** in `?scene=equip-ab`, the upgrade is visible without a
tooltip.

**Review: yes** (`juice`). **Areas:** `src/juice/vfx/`.

### 1.30 Ailment feedback (juice)

Appendix H §8 for shock, chill, freeze, ignite, stun and Armour Break, in
`src/juice/ailments/`:

- overlays and tints, under the H §1.1 alpha rules;
- apply and expire sounds, with their voice caps;
- the freeze buildup meter, and its shatter on expiry;
- `?scene=ailments`.

**Tests first:**

- one cue row per ailment;
- overlays stay at or under 45% alpha;
- the apply-sound cap.

**Acceptance:** each ailment is identifiable at a glance in
`?scene=ailments`.

**Review: yes** (`juice`). **Areas:** `src/juice/ailments/`.

### 1.31 Cards, tooltips and currency orbs

Appendix H §4.1, §4.3, §4.4 and §5.1, and Appendix C's text conventions, in
`src/ui/cards/`:

- the item card: rarity frame, name, base, implicits, and affix lines with
  tier and range on Alt;
- the hero card: skill, level, rarity, support sockets, cost, recharge,
  and "DPS on this card" and EHP;
- the spell card;
- **code-drawn currency orbs** (§4.3), drawn once into an atlas at load;
- tooltips with PoE2's line conventions;
- the Upgrade tag.

**Tests first** (jsdom):

- the affix line format, with tier and range on Alt;
- the DPS and EHP summaries for a fixed hero and items;
- the currency orb recipe for each M1 currency renders without errors.

**Acceptance:** a cold `visual-review` of a sample sheet of every M1 card
kind is resolved in the review bead.

**Review: yes.** **Areas:** `src/ui/cards/`.

### 1.32 Round resume UX

The player-facing half of [P14](decisions.md#p14-rounds-resume-mid-wave):

- boot with a saved round: open the board paused, refuse intents, show the
  3-2-1 countdown, then resume;
- the fallback banner and level restart when a round is rejected;
- an "Abandon round" button in the HUD menu, with confirmation, which ends
  the level as a loss (credited loot kept);
- the play server's live update path: when Vite reloads, the round resumes
  without the player noticing more than the countdown;
- `?scene=resume`: save at a fixed tick, reload, verify.

**Tests first:**

- the boot decision function: no round means the title, a valid round
  means the countdown, and a rejected round means the restart banner;
- intents during the countdown are refused.

**Acceptance:** Browser QA on the play-server configuration:

- reload mid-wave and see the round resume within 1 s of sim time of where
  it left;
- land a no-op change on `staging` mid-wave and see the same.

**Review: yes.** **Areas:** `src/app/boot.ts`, `src/ui/resume/`.

### 1.33 Dev menu

GDD §15's dev menu and Appendix H §14, in `src/ui/dev/`:

- grant items, heroes, spells, currency and gold, at a chosen level and
  rarity;
- set the player level; skip to the level end with a chosen result;
- **overlays:** hitboxes, ailment meters, and DPS meters per hero;
- every §14 knob, and the accessibility toggles;
- save tools: export and import the document, restore one of the last 20 or
  a checkpoint, and load a golden fixture;
- export logs as JSONL;
- toggled with the backquote key; hidden in production builds.

**Tests first** (jsdom):

- each grant produces a valid instance through the real generators;
- knob changes reach the settings store.

**Acceptance:** every control works in the browser, and `caps` is empty.

**Review: yes.** **Areas:** `src/ui/dev/`.

### 1.34 Title, focus select and flow

GDD §15's title and focus select, and the M1 screen flow, in
`src/ui/title/` and `src/app/router.ts`:

- the title screen, with the audio unlock on the first click and the title
  music;
- three focus cards with their starter kit previews (1.31's cards), shown
  when no account exists;
- **the flow:** title → focus → Level 1 → level end → hideout → replay
  Level 1. A one-card campaign stub offers Level 1, with Level 2 shown
  locked as "coming soon";
- the credits screen, from `src/assets/credits.ts`.

**Tests first:**

- the router's transitions, including "continue" when an account or a round
  exists.

**Acceptance:** a new player reaches Level 1 in three clicks; captures at
both sizes; a cold `visual-review` is resolved in the review bead.

**Review: yes.** **Areas:** `src/ui/title/`, `src/app/router.ts`.

### 1.35 Level-end summary

GDD §15 and Appendix H §3.10, in `src/ui/level-end/`:

- won or lost, with the victory or defeat stinger;
- loot sorted by rarity with Upgrade tags, revealed with H §3.10's
  sequence;
- XP gained, with the level-up burst (H §9.3);
- the first-clear reward: "Slot 4 unlocked" and the choose-1-of-3 hero
  pick, with the drop package on reveal;
- buttons for Replay and Hideout.

**Tests first** (jsdom):

- the sort order;
- the choose-1-of-3 pick writes exactly one hero into the account and
  clears the pending choice, and survives a reload before it is picked.

**Acceptance:** captures of a win with a first clear, and of a loss. A cold
`visual-review` is resolved in the review bead.

**Review: yes** (`juice`). **Areas:** `src/ui/level-end/`.

### 1.36 Hideout (M1)

GDD §15's hideout, the M1 subset, in `src/ui/hideout/`:

- **Roster tab:** 6 card slots (locked slots shown locked) and the spell
  slot. Drag a hero from the stash into a slot. Drag items onto a card's
  three slots, honouring weapon lock. Each card shows its DPS and EHP;
- **Stash tab:** uniform cards, sorting and filtering by slot, rarity,
  level and Upgrade;
- **equip feedback** (H §4.5), including the DPS delta as it changes;
- the currency tab, showing orbs and counts only (crafting is Phase 2);
- a disabled "Craft", "Vendors" and "Tree" tab row marked "M2";
- autosave on every change.

**Tests first** (jsdom):

- a drag-to-equip writes the account and refuses a weapon-lock mismatch;
- the stash filters and sorts as specified;
- the roster cannot drop below one hero.

**Acceptance:** equip a drop, replay, and see the change on the board.
Captures at both sizes. A cold `visual-review` is resolved in the review
bead.

**Review: yes** (`juice`). **Areas:** `src/ui/hideout/`.

### 1.37 Headless simulator and calibration

The GDD §17 headless mode, in `scripts/sim/` and `src/sim/policies/`:

- `npm run sim -- --level 1 --focus <f> --policy <p> --runs N` plays
  rounds headless, with scripted placement policies (PvZ opener, ranged
  heavy, wall first);
- it reports kills per minute, the mana curve, time to first drop, drops by
  rarity, leaks, the win rate and the level length;
- **calibration tests** as tolerance bands:
  - Appendix A §1.3: hits to kill and time to kill;
  - Appendix E §2.3: the first-minute mana shape;
  - Appendix E §7: the first gear drop by about 1:30, and Level 1 cleared
    in about 2:30 to 4:00;
  - Appendix D §5.2: 8–20 kills per minute;
- write the first report to `docs/plan/evidence/calibration/<bead-id>.md`.

**Tests first:**

- the policies are deterministic;
- the report schema;
- the tolerance tests themselves. They are allowed to fail here; this bead
  tunes `src/tuning/` until they pass, or records each miss.

**Acceptance:** the calibration tests pass, or the report records each miss
with the tunable that would close it.

**Review: yes.** **Areas:** `scripts/sim/`, `src/sim/policies/`,
`src/tuning/`.

### 1.38 Level 1 assembly and feel pass

The bead that makes the first map **good**:

- play Level 1 with all three focuses, on foot, at 1× and 2×;
- run the Appendix H §14 A/B on the whole level: `juice=0` against
  `juice=1`;
- check the H §15 playtest signals that can be checked solo;
- **tune** cue rows, holds, tiers, mixing and Level 1's definition, within
  `src/tuning/` and `src/monsters/levels/level-1.ts`;
- fix integration seams between the juice beads (draw order, double cues,
  missing cue rows);
- record a short feel log in the bead notes: what changed and why.

**Tests first:** a scenario test for each focus's full Level 1 round
(win rate over 20 seeds with the PvZ-opener policy, at least 90%).

**Acceptance:**

- All three focuses can clear Level 1.
- The A/B difference is obvious in the first 30 seconds.
- No lane is covered for more than 250 ms.
- `caps` is empty.

**Review: yes** (`juice`). **Areas:** `src/tuning/`,
`src/monsters/levels/level-1.ts`, `src/juice/cues.ts`.

### 1.39 M1 playthrough and visual review

The milestone bead ([P5](decisions.md#p5-reviews-are-paired-beads-from-day-one)):

1. **A full playthrough** on the play server, per focus:
   - title, focus, Level 1 with a win and with a deliberate loss;
   - level end, first-clear pick, hideout equip, and a replay that shows the
     upgrade;
   - a reload mid-wave, and a landed no-op build mid-wave.
2. **A cold `visual-review`** of every M1 screen and of the board in play.
3. **Fixes** for the confirmed findings, in one commit. Larger findings get
   their own beads.
4. **Freeze save v1.** Confirm the account and round fixtures match the
   shipped shapes.
5. **Commit the M1 milestone save.** Export the playthrough's document to
   `src/save/fixtures/milestones/m1.json`. The fixture test already loads
   it.

**Acceptance:**

- The playthrough passes with `caps` empty.
- Desktop captures at both sizes, plus key interaction states, are in
  `artifacts/qa/<bead-id>/`.
- The milestone is announced in the epic's notes with its `staging` OID, for
  the operator to play.

**Review:** none; it is the review. **Areas:** any Phase 1 area, for fixes.

### 1.40 Phase 1 refactor and tooling pass

A `mason` audit of the Phase 1 code, plus a review of the phase's friction
tags ([P7](decisions.md#p7-introspection-from-day-one)). It files bounded
refactoring and tooling beads, each with a review bead, and every bead it
files lands within the phase.

### 1.41 Phase 1 retrospective

A read-only `sage` pass over:

- the close notes and friction tags;
- Tollgate history and gate times;
- review dispositions;
- playtest beads.

It writes `docs/plan/evidence/retrospectives/<bead-id>.md` and files
improvement beads.

### 1.42 File Phase 2

Follow [workflow § Filing a phase](workflow.md#filing-a-phase) for
[Phase 2](phase-2-grassland.md). Refine its outline into a full page with a
wide graph, Tests first lists and paired review beads.

### 1.43 Phase 1 gate

1. Confirm every Phase 1 review bead is closed, with no unresolved finding
   left without its own bead.
2. Confirm the beads 1.40 filed have landed.
3. Record the M1 build's `staging` OID in the epic notes, for the operator
   to play whenever they choose. The stream continues.
4. Close the epic.

## Exit gate

- Level 1 is fully juiced and plays end to end for every focus, with the
  loop closed through the hideout and replay.
- Rounds resume mid-wave across reloads and landed builds.
- Save v1 is frozen and the M1 milestone fixture is committed.
- Every review bead is resolved.
- Phase 2 is filed.
