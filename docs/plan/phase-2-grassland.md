# Phase 2: Grassland (M2)

**Goal:** the whole Grassland biome, levels 1–5, with the loops that make
loot matter between rounds:

1. The player clears Levels 2–5 from the campaign map: 5 lanes, Rock
   terrain, three new archetypes, and an optional Strongbox ambush.
2. Level 5 ends with the Bloated Miller: telegraphs, a heavy-stun burst
   window, and a loot fountain with the first guaranteed unique.
3. Between rounds they craft with the item orb ladder and Lesser Jeweller's
   Orbs, salvage into shards, and shop at the Armorer, Recruiter and gamble
   tab. Every craft has its Appendix H reveal.
4. The loot filter hides clutter, which converts to gold or shards at level
   end.

Rounds still resume mid-wave across builds, and the M1 save keeps loading
([P14](decisions.md#p14-rounds-resume-mid-wave),
[P15](decisions.md#p15-never-break-a-save)).

**Read first:**

- the Phase 1 retrospective,
  [`evidence/retrospectives/hv-7ic2.79.md`](evidence/retrospectives/hv-7ic2.79.md);
- [GDD](../gdd.md) §10, §11, §13 and §15;
- [Appendix B](../appendix-b-heroes.md) §1.8 and the heroes and spell this
  phase adds (2.9–2.11);
- [Appendix C](../appendix-c-items.md) §C.4.1, §C.5.1, §C.5.2, §C.5.4
  (Jeweller's only), §C.5.6 and §C.7;
- [Appendix D](../appendix-d-monsters-levels.md) §2 (Armoured light, Swarm,
  Leaper), §6, §7 (common rules and §7.1), §8 (Rock and §8.2) and §9;
- [Appendix E](../appendix-e-economy.md) §4.5, §5 and §7;
- [Appendix G](../appendix-g-art.md) for the new archetypes, the Miller and
  the chest;
- [Appendix H](../appendix-h-juice.md) §2.8, §3.7–§3.9, §7.1, §7.5, §9.2
  and §9.3.

[Back to the plan](README.md)

**Earliest start:** the M1 playthrough bead (1.39). Phase 1's open
follow-ups (hv-7ic2.85–.95) run alongside; the serialization edges below
order the ones that touch the same seams.

**Held back to Phase 3.** Poisonburst Arrow (H15) needs poison, and Herald
of Ice (H29) and War Banner (H31) need auras, which are Phase 3 mechanics.
They stay out of the drop, vendor and offer pools until Phase 3 lands them.
The boss uses the existing music with its intensity layer; boss music is
Phase 3's.

## Task graph

Each task depends on the tasks after its arrow. **Review: yes** tasks get a
paired `review-qa` bead, numbered `<n>r` (for example 2.2r), which depends
on its task. Review beads gate only 2.27.

**Wave 1** (seven at once, ready on filing):

- 2.1 Grassland data
- 2.2 Terrain and map generation
- 2.3 Armoured (light) and Swarm
- 2.4 Leaper
- 2.6 Item crafting
- 2.7 Vendors and gamble
- 2.8 First-clear rewards and passive points

**Wave 2:**

- 2.5 ← 2.1
- 2.9 ← 2.1
- 2.10 ← 2.1
- 2.11 ← 2.1
- 2.12 ← 2.2
- 2.13 ← 2.6
- 2.15 ← 2.3, 2.4
- 2.16 ← 2.2
- 2.19 ← 2.6

**Wave 3:**

- 2.14 ← 2.13
- 2.17 ← 2.5
- 2.20 ← 2.13, 2.19
- 2.21 ← 2.7, 2.19
- 2.23 ← 2.2, 2.3, 2.4, 2.5, 2.8, 2.12

**Wave 4:**

- 2.18 ← 2.12, 2.17
- 2.22 ← 2.14, 2.19
- 2.24 ← 2.8, 2.23
- 2.25 ← 2.9, 2.10, 2.11, 2.23

**Close:**

- 2.26 ← 2.15–2.18, 2.20–2.22, 2.24, 2.25
- 2.27 ← 2.26, and every Phase 2 review bead
- 2.28 ← 2.27
- 2.29 ← 2.28
- 2.30 ← 2.27
- 2.31 ← 2.27, 2.28 and the beads it files, 2.29, 2.30

**The widest point** is waves 1 and 2 together: seven roots, then nine
more as soon as 2.1, 2.2 and 2.6 land, plus trailing review beads.

**The critical path** is
2.1 → 2.5 → 2.23 → 2.25 → 2.26 → 2.27. Sessions pick critical-path beads
first ([workflow § Selection order](workflow.md#selection-order)).

**Presentation does not wait for levels.** Each sim bead ships a dev scene
(`?scene=<name>`) that stages its feature on the Level 1 board, so 2.15–2.18
build and QA their feel before 2.23 assembles the levels.

**Known overlaps that need no edge:**

- Most beads add variants to `src/sim/events.ts`, rows to
  `src/juice/cues.ts`, scenes to `src/dev/scenes/`, and IDs to
  `src/types/ids.ts`.
- 2.3 and 2.4 both add rows to `src/monsters/archetypes.ts` and behaviors
  to locomotion.
- 2.9–2.11 each add catalog entries, sprite recipes and VFX profile rows.
- 2.7, 2.8 and 2.14 each add account fields with defaults; none bumps a
  `schemaVersion`.
- 2.17 adds the heavy-stun bar to `src/ui/hud/Hud.tsx`, which hv-7ic2.93
  also changes.

Owners resolve these textual conflicts with `tg --no-launch update`.

**Serialization edges:**

- 2.19 → 2.21 and 2.19 → 2.22: 2.19 introduces the hideout's tab bar
  (Roster, Stash, Craft), and the vendor and filter screens are tabs on it.
- hv-7ic2.87 → 2.1: both regenerate `data/*.json` through the importer.
- hv-7ic2.89 → 2.3, 2.4 and 2.5: it changes how an archetype's hit element
  is defined, and these beads add archetypes and the boss's own spec.
- hv-7ic2.94 → 2.8: both change `src/account/rewards.ts`'s first-clear
  rules.
- hv-7ic2.86 → 2.17: the boss telegraphs reuse hv-7ic2.86's spell landing
  telegraph (H §2.8).
- hv-7ic2.88 → 2.24 and hv-7ic2.85 → 2.24: 2.24 replaces the campaign stub
  that .88 adds an element preview to, and adds a reward line to the level
  end that .85 refits above the fold.
- Any two beads that bump the same save section's `schemaVersion` get an
  edge ([workflow § Serialization](workflow.md#serialization)).

**The save schema during Phase 2.** Save v1 is frozen and
`src/save/fixtures/milestones/m1.json` is the oldest real document. Additive
fields take a default. Anything else ships a migration, a version bump and
a fixture. 2.27 commits the M2 milestone save.

**Reviews.** Where capacity allows, a session other than the implementer
claims the `review-qa` bead, especially for UI and juice work, where Phase
1's reviews found the most.

## Tasks

### 2.1 Grassland data

Extend the importer's ID lists (`scripts/import-poe2/ids/`) for everything
Levels 1–5 can produce, and regenerate `data/`:

- item bases and mods up to area level 8 (Strongbox loot is area level + 1,
  and the gamble tab sells at the highest unlocked area level);
- the uniques that can drop by level 5 (C §C.4.1), including the Bloated
  Miller's unique table;
- the gems of the heroes 2.9–2.11 add, and Frost Bomb (S1);
- Lesser Jeweller's Orb and the Transmutation and Regal shards (C §C.5.1).

**Tests first:**

- every ID the catalog, the level table and the first-clear rewards name
  resolves in `data/`;
- an item rolled at area level 8 draws only mods whose required level
  allows it;
- the importer is deterministic: a second run leaves `data/` unchanged.

**Acceptance:** the tests pass, and `data/` stays within the import's size
budget.

**Review: yes.** **Areas:** `scripts/import-poe2/`, `data/`, `src/data/`.

### 2.2 Terrain and map generation (core)

The terrain seam (D §8), in a new `src/sim/terrain/`:

- a tile grid in `RoundState` with the Rock tile: heroes can't be placed on
  it, and monsters walk past it;
- map generation per D §8.2: biome, count and type draws, the four
  placement constraints, 50 retries, then `N − 1`, seeded by
  `(levelIndex, attemptCounter)`;
- the generated map is written into state when the round begins, never
  re-derived on load ([P16](decisions.md#p16-outcomes-not-seeds));
- the level definition gains its special-tile count and unlocked types;
- about 5 s of planning before the first sky-mana drop (D §8.2), with
  placement allowed.

**Tests first:**

- every generated map over 500 seeds satisfies all four constraints;
- the newest type appears at least once on its intro level;
- placement on Rock is refused with a reason;
- a round saved mid-wave reloads with the same tiles;
- a v1 round fixture with no terrain loads as an empty grid.

**Acceptance:** the tests pass, and `?scene=terrain` shows a generated
Level 4 map.

**Review: yes** (`core`). **Areas:** `src/sim/terrain/`,
`src/heroes/board/place.ts`, `src/monsters/levels/types.ts`,
`src/tuning/terrain.ts`, `src/sim/state.ts`, `src/sim/events.ts`.

### 2.3 Armoured (light) and Swarm

Two archetypes from D §2.1–§2.2:

- **Helmed Skeleton** (Armoured light): life 1.4×, armour 6×, evasion 0.5×,
  +20% cold resistance; Armour Break takes it to Fully Broken through the
  existing ailment;
- **Rat Swarm**: spawns as 3 rats in one lane 0.3 tiles apart, each 0.35×
  life and 0.4× damage, costing 1 point per pack;
- their wave draw weights (D §5.4).

**Tests first:**

- a Swarm spawn produces 3 monsters in one lane at the stated spacing;
- a Helmed Skeleton takes reduced physical damage until Fully Broken, then
  +20% physical;
- elemental hits ignore its armour;
- the wave budget charges the stated point costs.

**Acceptance:** the tests pass, and `?scene=archetypes` shows both walking
and fighting.

**Review: yes.** **Areas:** `src/monsters/`, `src/sim/systems/`,
`src/tuning/waves.ts`.

### 2.4 Leaper

The Goblin Leaper (D §2.2): 3.0 s per tile, and on first reaching a hero it
lands 1 tile behind it, then walks at 5.5 s per tile. A Wall hero (life
multiplier ≥ 5) can't be leapt; the leaper stops and bites.

**Tests first:**

- the leap lands exactly one tile behind the hero, once;
- a wall stops the leap;
- the slower post-leap speed applies;
- a leap that would land past the gate leaks.

**Acceptance:** the tests pass, and `?scene=archetypes` shows a leap over a
striker and a stop at a wall.

**Review: yes.** **Areas:** `src/monsters/`, `src/sim/systems/`.

### 2.5 Bosses and the Bloated Miller (core)

The boss seam (D §7 common rules) and its first boss (D §7.1), in
`src/monsters/bosses/`:

- multi-lane occupancy: a boss counts as present in each covered lane, any
  covered lane's hero blocks it, and its attacks reach all of them;
- telegraphs as sim events: a start with tiles and a duration of 1.2–1.5 s,
  then the impact;
- the heavy-stun bar: Primed at 70%, a threshold of 30% of max life, 3 s
  of no actions; immunity to light stun;
- a leaked boss loses the level;
- boss loot (D §7): one unique from the boss's table, one rare hero, three
  currency rolls at rare weights and eight item rolls at +3,200% rarity,
  emitted as one burst event the fountain (2.17) stages;
- **the Bloated Miller:** 2 lanes, life 40×, damage 3×, 7.0 s per tile;
  Grain Slam every 7 s, Rotting Brood every 18 s, and Enrage at ≤ 50%
  life;
- logging per [P23](decisions.md#p23-logging): spawn, each ability, each
  stun and the kill, by ID.

**Tests first:**

- a hero in either covered lane blocks the Miller;
- Grain Slam hits only its telegraphed 2×2 tiles, after the telegraph;
- Rotting Brood spawns three Shamblers in the stated lanes;
- the stun bar's thresholds and the 3 s window, against seeded hits;
- the loot burst's contents match the spec, with a unique always present;
- a round saved mid-fight reloads with the boss's timers and bar intact.

**Acceptance:** the tests pass, and `?scene=boss` stages the Miller on a
5-lane board.

**Review: yes** (`core`). **Areas:** `src/monsters/bosses/`,
`src/sim/systems/`, `src/combat/`, `src/loot/`, `src/tuning/bosses.ts`,
`src/sim/state.ts`, `src/sim/events.ts`.

### 2.6 Item crafting (core)

The item orb ladder that drops by area level 6 (C §C.5.2): Transmutation,
Augmentation, Regal, Exalted and Alchemy, in `src/loot/craft/`.

- One entry point applies an orb to a stash item and returns the new item,
  or a typed reason it can't apply (wrong rarity, full affixes, corrupted).
- Rolls use the item generator's pool, ilvl gating and the 3-prefix,
  3-suffix limits.
- The orb is spent only when the craft applies.
- Each craft is logged with the item's ID, the orb and the result.

**Tests first:**

- each orb's valid and invalid targets, from the C §C.5.2 table;
- Regal keeps the magic mods and adds one; Alchemy discards them and rolls
  four;
- Exalted refuses a 6-mod rare;
- crafting is deterministic for a seed;
- a refused craft leaves the account unchanged.

**Acceptance:** the tests pass, and the dev menu can grant and apply each
orb.

**Review: yes** (`core`). **Areas:** `src/loot/craft/`, `src/account/`,
`src/tuning/loot.ts`, `src/ui/dev/`.

### 2.7 Vendors and gamble

The Armorer, Recruiter, buyback and gamble rules (E §5.2–§5.3), as pure
account functions:

- stock: the Armorer's 10 offers and the Recruiter's 6 heroes and 2 spells,
  at the stated rarity splits and levels, refreshed after every level, won
  or lost;
- prices, buying and selling at 20% of the buy price, and a 10-entry
  buyback;
- gamble: an item of a chosen base, revealed at Magic 75% / Rare 22% /
  Unique 3% (only where the base has a demo unique), or a hero of a chosen
  role or damage tag, at Magic 70% / Rare 30%;
- stock and buyback persist in the account with defaults; the stock is
  rolled once and stored ([P16](decisions.md#p16-outcomes-not-seeds)).

**Tests first:**

- price formulas against E §5.2's worked prices;
- a purchase with too little gold is refused and changes nothing;
- the stock refreshes after a win and after a loss, and not on reload;
- gamble odds over 10,000 seeded rolls;
- the M1 fixture loads with fresh stock.

**Acceptance:** the tests pass.

**Review: yes.** **Areas:** `src/account/`, `src/loot/prices.ts`,
`src/tuning/economy.ts`, `src/account/state.ts`, `src/save/registry.ts`.

### 2.8 First-clear rewards and passive points

E §4.5's rewards for Levels 2–5:

- Level 2: slot 5, 2 Orbs of Augmentation and 2 of Transmutation;
- Level 3: slot 6 and a Lesser Jeweller's Orb;
- Level 4: choose 1 of 3 Magic heroes at level 6;
- Level 5: +2 passive points and a Regal Orb.

Passive points are derived, never stored: player level − 1, plus 2 per boss
first clear (E §6.1). The hideout shows the unspent count; Phase 3 spends
them.

**Tests first:**

- each level's first clear grants its reward exactly once, and a replay
  grants nothing;
- the Level 4 offer's three heroes are Magic, level 6, distinct, and at
  least one matches the roster;
- the passive-point count for a sample account.

**Acceptance:** the tests pass.

**Review: yes.** **Areas:** `src/account/rewards.ts`,
`src/account/lifecycle.ts`, `src/tuning/progression.ts`,
`src/ui/hideout/` (the unspent-points line).

### 2.9 Melee and acolyte heroes

The lane behaviors, catalog entries, sprite recipes and VFX profile rows of
Shrinewarden (H03), Armour Breaker (H05), Boneshatter (H06) and Fangs of
Frost (H11), per Appendix B. Each enters the drop pool at its unlock area
level (B §1.8).

**Tests first**, one scenario per hero against seeded Shamblers:

- B §4's damage per second, within tolerance;
- Shrinewarden's orb cadence and its 4× life;
- Armour Breaker's break reaches Fully Broken;
- each hero first drops at its unlock area level and never before.

**Acceptance:** the tests pass, and `?scene=heroes` shows each hero
fighting.

**Review: yes.** **Areas:** `src/heroes/`, `src/assets/recipes/heroes.ts`,
`src/tuning/heroes.ts`, `src/juice/vfx/`.

### 2.10 Ranged heroes

As 2.9, for Lightning Spear (H16), Explosive Spear (H17) and Permafrost
Bolts (H19).

**Tests first:** as 2.9, plus Explosive Spear's detonation area and
Permafrost Bolts' freeze buildup.

**Acceptance:** the tests pass, and `?scene=heroes` shows each hero
fighting.

**Review: yes.** **Areas:** `src/heroes/`, `src/assets/recipes/heroes.ts`,
`src/tuning/heroes.ts`, `src/juice/vfx/`.

### 2.11 Spellcaster heroes and Frost Bomb

As 2.9, for Fireball (H20), Flame Wall (H21), Ice Nova (H23) and Essence
Drain (H25), plus the Frost Bomb spell (S1) with its shape, cooldown and
start-of-level rule (B §6.1).

**Tests first:** as 2.9, plus Flame Wall's burning tiles, Essence Drain's
damage over time, and Frost Bomb's shape and timing.

**Acceptance:** the tests pass, and `?scene=heroes` and `?scene=spells`
show each.

**Review: yes.** **Areas:** `src/heroes/`, `src/spells/`,
`src/assets/recipes/heroes.ts`, `src/tuning/heroes.ts`,
`src/tuning/spells.ts`, `src/juice/vfx/`.

### 2.12 Strongboxes

D §9's Strongbox, in the sim:

- a 25% chance per level from Level 4, never on boss levels, rolled when
  the round begins and stored;
- the chest blocks its tile, on a random placeable tile in columns 5–7;
- placing a hero on any of its 8 neighbours triggers it;
- the ambush wave: 60% of the flag wave's budget, at least 1 rare and 2
  magic, 70% of it in up to 2 lanes nearest the box;
- the reward when the ambush is dead: 1 rare item, 3 item rolls at
  rare-monster rarity, 1 hero roll and 2 currency rolls, all at area level
  + 1, emitted as one burst event;
- a lost level loses the reward.

**Tests first:**

- the chance and placement rules over 1,000 seeds;
- only a neighbouring placement triggers it;
- the ambush budget, rarity floor and lane bias;
- the reward appears only after the last ambush monster dies;
- a mid-ambush save reloads with the ambush and chest state.

**Acceptance:** the tests pass, and `?scene=strongbox` stages a trigger.

**Review: yes.** **Areas:** `src/sim/terrain/`, `src/monsters/`,
`src/loot/`, `src/tuning/loot.ts`, `src/sim/state.ts`,
`src/sim/events.ts`.

### 2.13 Hero crafting and salvage

C §C.5.4's Lesser Jeweller's Orb and C §C.5.6's salvage, on 2.6's seam:

- Lesser Jeweller's adds one support slot below 3 and fills it with a
  random compatible support, then recomputes rarity;
- salvage turns stash items and heroes into shards per the C §C.5.6 table;
- 10 shards merge into their orb automatically.

**Tests first:**

- Jeweller's respects the ceiling, no duplicates and no two tiers of one
  family;
- rarity is recomputed after a new slot;
- each salvage row's output;
- 10 Transmutation Shards become 1 Orb of Transmutation.

**Acceptance:** the tests pass.

**Review: yes.** **Areas:** `src/loot/craft/`, `src/account/stash.ts`,
`src/heroes/gen/`, `src/tuning/loot.ts`.

### 2.14 Loot filter

C §C.7's three presets, as account rules:

- the preset persists in the account, defaulting to Show all;
- an item is hidden by preset 2 if Normal, and by preset 3 if Normal or
  low-tier Magic (every affix rank ≥ 3 at its ilvl);
- hidden drops still drop, flagged hidden, and convert at level end into
  gold (Normal) or 1 Transmutation Shard (low-tier Magic);
- heroes, spells, currency, rares and uniques are never hidden.

**Tests first:**

- C §C.7's three worked examples;
- conversion at level end, for a win and a loss;
- a v1 account loads with Show all.

**Acceptance:** the tests pass.

**Review: yes.** **Areas:** `src/loot/filter.ts`, `src/account/`,
`src/account/state.ts`, `src/save/registry.ts`.

### 2.15 Monster presentation (juice)

H §7.1 for the three new archetypes: sprites from Appendix G's recipes,
material-aware hit sounds (bone for the Helmed Skeleton), the helm flying
off at Fully Broken, the leap's whoosh and landing dust, and one vocal per
swarm rather than per rat.

**Tests first:** the cue table covers every new event and archetype, and
`npm run assets` bakes every new recipe.

**Acceptance:** the juice A/B in `?scene=archetypes` reads at a glance, and
`caps` is empty.

**Review: yes** (`juice`). **Areas:** `src/assets/`, `src/juice/`,
`src/render/`, `src/audio/`.

### 2.16 Terrain presentation

Rock tiles drawn on the board, unplaceable tiles marked during placement
drag, and the planning beat before the first sky-mana drop (a short
"Prepare your defence" banner).

**Tests first:** the placement preview refuses a Rock tile, and the banner
appears once per round.

**Acceptance:** `?scene=terrain` reads at both desktop sizes.

**Review: yes.** **Areas:** `src/render/`, `src/ui/hud/`, `src/assets/`,
`src/juice/`.

### 2.17 Boss presentation and loot fountains (juice)

H §7.5 for the Bloated Miller, and H §3.9's loot fountain:

- the intro: music cut, rumble and the name card;
- telegraphs on hv-7ic2.86's ground-telegraph layer, with a whoosh timed to
  the impact;
- the heavy-stun bar under the boss health bar, Primed flash, and the
  heavy-stun moment;
- Grain Slam's grain burst and Rotting Brood's ground bulge;
- the death and the fountain: items 120 ms apart in ascending rarity, the
  unique last after 600 ms, on the loot pitch ladder.

**Tests first:** fountain ordering and timing from a scripted burst, and
the cue table covers every boss event.

**Acceptance:** the A/B in `?scene=boss` is obvious, `fx.peaks()` shows the
T5 death, and `caps` is empty.

**Review: yes** (`juice`). **Areas:** `src/juice/`, `src/render/`,
`src/ui/hud/`, `src/audio/`, `src/assets/`.

### 2.18 Strongbox presentation (juice)

H §3.8: the idle glow column, the lid rattle and "Strongbox ambush!"
banner, dust bursts at spawn, and the opening with a light burst and a
loot fountain (2.17).

**Tests first:** the cue table covers every Strongbox event.

**Acceptance:** the A/B in `?scene=strongbox` reads, and `caps` is empty.

**Review: yes** (`juice`). **Areas:** `src/juice/`, `src/render/`,
`src/assets/`, `src/audio/`.

### 2.19 Craft tab and item reveals (juice)

The hideout gains a tab bar (Roster, Stash, Craft), and the Craft tab
(GDD §15) with H §9.2's shared flow and the reveals for the five item orbs:
pick up an orb, valid targets pulse, the slam, the 120 ms suspense pause,
the rarity sweep with typed-in mod lines, and the T1 jackpot stamp.

**Tests first:** a component test that applies each orb through the UI and
sees the account change; an invalid target refuses the drop.

**Acceptance:** a real-browser drag applies each orb, the A/B reads, and
`caps` is empty.

**Review: yes** (`juice`). **Areas:** `src/ui/hideout/`, `src/ui/craft/`,
`src/juice/`.

### 2.20 Hero craft and salvage screens (juice)

The Jeweller's reveal (a socket opens on the hero card), and a Salvage
action beside Sell in the stash, with shard counts and merges shown.

**Tests first:** a component test that salvages an item and applies a
Jeweller's Orb through the UI.

**Acceptance:** a real-browser drag applies the orb, and `caps` is empty.

**Review: yes** (`juice`). **Areas:** `src/ui/craft/`, `src/ui/hideout/`,
`src/juice/`.

### 2.21 Vendor and gamble screens

Armorer, Recruiter and Gamble tabs (GDD §15) on 2.7's rules, with H §9.3's
feedback: the coin pour on buy, the card flying to the stash, coin clinks
on sell, and the gamble card's shake and flip with its rarity stinger.

**Tests first:** a component test that buys, sells and gambles, and is
refused when gold is short.

**Acceptance:** all three tabs work in the browser, and `caps` is empty.

**Review: yes.** **Areas:** `src/ui/vendors/`, `src/ui/hideout/`,
`src/juice/`.

### 2.22 Loot filter screen and hidden drops

A Loot filter tab with the three presets, and H §3.7's hidden-drop
presentation: no beam, label, stinger or ticker line, just a 3-particle
grey puff and a muted coin tick. The level-end summary lists what hidden
drops became.

**Tests first:** a hidden drop emits no ticker line and no stinger cue.

**Acceptance:** preset 3 visibly quiets a Level 2 round, and `caps` is
empty.

**Review: yes** (`juice`). **Areas:** `src/ui/hideout/`, `src/juice/loot/`,
`src/ui/level-end/`.

### 2.23 Levels 2–5

The D §6.1 rows for Levels 2–5 in `src/monsters/levels/`: area levels,
waves, 5 lanes, archetypes per D §6.2, Rock and its count from Level 4,
Strongboxes from Level 4, and the Miller arriving with Level 5's last
regular wave. Level unlocks follow first clears, and any cleared level can
be replayed with a fresh seed (D §6.3).

**Tests first:**

- each level's definition matches the D §6.1 row;
- a scenario test per level: the PvZ-opener policy, with a fitting roster,
  wins at least 80% of 20 seeds;
- Level 5 spawns exactly one Miller, with its last wave.

**Acceptance:** the tests pass, and each level plays in the browser.

**Review: yes.** **Areas:** `src/monsters/levels/`, `src/tuning/waves.ts`,
`src/account/lifecycle.ts`.

### 2.24 Campaign map

The campaign map (GDD §15) for Levels 1–5, replacing the Phase 1 stub:
one node per level, each card showing biome, area level, monster types, the
first-clear reward, a "Strongbox possible" hint and the biome element
preview. H §9.3: a parchment rustle, the dotted path, and sparkling
first-clear rewards. The level end shows the first-clear reward that was
granted.

**Tests first:** a component test that locked levels can't start and
cleared ones replay.

**Acceptance:** the map reads at both desktop sizes, and `caps` is empty.

**Review: yes.** **Areas:** `src/ui/title/`, `src/ui/level-end/`,
`src/app/router.ts`.

### 2.25 Headless calibration through Level 5

Extend 1.37's simulator and calibration to Levels 1–5:

- policies that play a campaign: they clear each level, take first-clear
  rewards, equip upgrades and spend orbs by a fixed rule;
- E §7's time-to-fun beats up to minute 30: the first craft by about
  minute 7, the Jeweller's Orb by about minute 12, Rock and a possible
  Strongbox by minutes 15–20, and the Miller by minutes 25–30;
- D §5.2's 8–20 kills per minute and D §7's 60–90 s boss fight on a
  level-appropriate board;
- the report in `docs/plan/evidence/calibration/<bead-id>.md`.

**Tests first:** the campaign policy is deterministic, and the tolerance
tests themselves. They may fail here; this bead tunes `src/tuning/` until
they pass, or records each miss.

**Acceptance:** the calibration tests pass, or the report records each miss
with the tunable that would close it.

**Review: yes.** **Areas:** `scripts/sim/`, `src/sim/policies/`,
`src/tuning/`.

### 2.26 Grassland assembly and feel pass

The bead that makes Grassland **good**: play Levels 1–5 with all three
focuses at 1× and 2×; run the H §14 A/B on each new system; tune cue rows,
holds, tiers, mixing and level definitions; fix integration seams; and
record a short feel log in the bead notes.

**Tests first:** a scenario test that a fresh account clears Levels 1–5
in order with the campaign policy, for each focus, on at least 80% of 10
seeds.

**Acceptance:** every M2 system reads at a glance with `juice=1`, and
`caps` is empty.

**Review: yes** (`juice`). **Areas:** `src/tuning/`,
`src/monsters/levels/`, `src/juice/cues.ts`.

### 2.27 M2 playthrough and visual review

The milestone bead:

1. **A full playthrough** on the play server, from a new account to the
   Miller's defeat, for one focus, plus Levels 2–3 for the other two:
   crafting each orb, salvaging, buying, gambling, setting the filter, a
   Strongbox, a reload mid-boss and a landed no-op build mid-wave.
2. **A cold `visual-review`** of every new screen and the boss fight.
3. **Fixes** for the confirmed findings, in one commit. Larger findings get
   their own beads.
4. **Commit the M2 milestone save** to
   `src/save/fixtures/milestones/m2.json`, and confirm `m1.json` still
   loads.

**Acceptance:** the playthrough passes with `caps` empty; captures at both
desktop sizes are in `artifacts/qa/<bead-id>/`; the milestone is announced
in the epic's notes with its `staging` OID.

**Review:** none; it is the review. **Areas:** any Phase 2 area, for fixes.

### 2.28 Phase 2 refactor and tooling pass

A `mason` audit of the Phase 2 code, plus a review of the phase's friction
tags ([P7](decisions.md#p7-introspection-from-day-one)). It files bounded
refactoring and tooling beads, each with a review bead, and every bead it
files lands within the phase.

### 2.29 Phase 2 retrospective

A read-only `sage` pass over the close notes and friction tags, Tollgate
history and gate times, review dispositions and playtest beads. It writes
`docs/plan/evidence/retrospectives/<bead-id>.md` and files improvement
beads.

### 2.30 File Phase 3

Follow [workflow § Filing a phase](workflow.md#filing-a-phase) for
[Phase 3](phase-3-build-depth.md). Refine its outline into a full page with
a wide graph, Tests first lists and paired review beads.

### 2.31 Phase 2 gate

1. Confirm every Phase 2 review bead is closed, with no unresolved finding
   left without its own bead.
2. Confirm the beads 2.28 filed have landed.
3. Record the M2 build's `staging` OID in the epic notes. The stream
   continues.
4. Close the epic.

## Exit gate

- Levels 1–5 are playable from a new account to the Bloated Miller's
  defeat, with every M2 system juiced.
- The Appendix E §7 time-to-fun beats up to minute 30 hold in the headless
  simulator, or the calibration report records each miss.
- The M1 and M2 milestone saves load.
- Every review bead is resolved.
- The Phase 2 mason pass and retrospective are done, and Phase 3 is filed.
