# Mercs vs. Monsters: Game Design Document (Prototype Demo)

> **Status:** a design for a throwaway prototype. All content below that comes from Path of Exile 2 or Plants vs. Zombies is **test scaffolding only**. It exists to answer one question fast, and none of it ships.

**One-line pitch:** *Plants vs. Zombies, but every plant is a Path of Exile 2 skill gem. The loot never stops.*

## Contents

1. [Why this prototype exists](#1-why-this-prototype-exists)
2. [Design pillars](#2-design-pillars)
3. [Borrowed content: the PoE2 and PvZ test scaffolding](#3-borrowed-content-the-poe2-and-pvz-test-scaffolding)
4. [Core loops](#4-core-loops)
5. [Campaign structure](#5-campaign-structure)
6. [In-level gameplay](#6-in-level-gameplay)
7. [Heroes](#7-heroes)
8. [Spells](#8-spells)
9. [Items](#9-items)
10. [Crafting and currency](#10-crafting-and-currency)
11. [Loot, vendors, and the loot filter](#11-loot-vendors-and-the-loot-filter)
12. [Focuses and the passive tree](#12-focuses-and-the-passive-tree)
13. [Monsters, bosses, and terrain](#13-monsters-bosses-and-terrain)
14. [Combat model](#14-combat-model)
15. [Screens and UI](#15-screens-and-ui)
16. [Art and audio](#16-art-and-audio)
17. [Prototype implementation notes](#17-prototype-implementation-notes)
18. [Out of scope for the demo](#18-out-of-scope-for-the-demo)
19. [Risks and what to watch in playtests](#19-risks-and-what-to-watch-in-playtests)
20. [Decision log](#20-decision-log)
21. [Glossary](#21-glossary)

## Appendices

| Appendix | Contents |
|---|---|
| [A: Combat Rules, Formulas & Stat Vocabulary](appendix-a-combat.md) | Grid mapping, the PoE2 damage pipeline, mitigation, ailments, stun, tuning knobs, the closed stat list |
| [B: Heroes, Supports & Spells](appendix-b-heroes.md) | Hero catalog, starter kits, support catalog, spell catalog, hero generation |
| [C: Items, Affixes, Uniques & Currency](appendix-c-items.md) | Base items, affix tiers, uniques, currency behaviour, item generation, loot filter |
| [D: Monsters, Bosses, Campaign & Terrain](appendix-d-monsters-levels.md) | Archetypes, monster affixes, bosses, the 20-level table, waves, terrain, Strongboxes |
| [E: Economy, Loot Rates & Progression Pacing](appendix-e-economy.md) | Mana, drop rates, currency, gold and vendors, XP, time-to-fun |
| [F: Focuses & Passive Tree](appendix-f-passives.md) | Focus definitions, the curated PoE2 sub-tree, keystones, sample builds |
| [G: Art Direction & LPC Asset Map](appendix-g-art.md) | LPC sheet format, hero and monster sprite recipes, tilesets, FX, icons, licensing |
| [H: Game Feel, VFX & Audio](appendix-h-juice.md) | Juice rules, loot drop choreography, per-skill VFX and SFX, crafting feedback, audio mix, music, code-authored assets, open audio sources |

---

## 1. Why this prototype exists

**The question.** Is a lane-based tower defense fun when the "plants" are randomized ARPG loot?

The bet is that two proven compulsion loops multiply rather than compete:

- PvZ's **readable, tactile lane defense**.
- PoE2's **loot-and-build treadmill**.

**What the demo must prove in about 2 hours:**

1. Finding a hero, item, or orb produces an immediate, *visible* change on the board.
2. Players start theory-crafting between levels ("if I convert this spear to lightning, the Plated Skeletons stop mattering") without being told to.
3. The TD layer stays tense. Loot makes you stronger, but placement and roster choice still decide levels.
4. Players want to keep playing when the demo ends.

**How we judge it.** Team **gut check** after playtesting. No formal telemetry or survey. The demo includes a dev cheat menu so the team can jump to any point.

**Audience.** **ARPG-literate** players who already know affixes, rarities, and orbs. We expose real mechanics and keep tutorials light.

---

## 2. Design pillars

1. **Loot you can see working.** Every upgrade changes something on the board: damage numbers, a new projectile lane, a freeze, a cheaper placement. If a stat can't be seen, it isn't in the demo.
2. **PvZ clarity.** One hero per tile. Monsters walk left. Mana falls from the sky. A new player reads the board in 5 seconds.
3. **PoE2 depth, borrowed wholesale.** Real damage pipeline, real affix tiers, real support gems. We don't invent balance; we import it and bridge it with a few tuning knobs.
4. **Fun in the first 15 minutes.** Every core loop (drop, equip, craft, recruit, spend passives) happens before minute 15 ([appendix E §7](appendix-e-economy.md#7-time-to-fun)).

---

## 3. Borrowed content: the PoE2 and PvZ test scaffolding

We skip original balance and creative work by importing two games' numbers.

**From Path of Exile 2** (RePoE export of PoE2 4.5.5.2, early access 0.5.x):

| Data | Used for |
|---|---|
| `skill_gems.json`, `skills.json` | Heroes = active skill gems; hero modifiers = support gems |
| `base_items.json`, `mods.json`, `uniques.json` | Items, affixes, uniques |
| `passive_skill_trees/Default.json` | Passive tree |
| `default_monster_stats.json` | Monster scaling |
| PoE2's glossary (`keywords.json`) | Mechanic definitions |
| — | PoE2 names, used verbatim for skills, items, orbs, and uniques |

- Export location: `https://github.com/repoe-fork/poe2`.
- **Note:** the local checkout at `~/repoe-fork.github.io` is the **PoE1** export (3.29). Use the PoE2 repo instead.
- The [PoE2 wiki](https://www.poe2wiki.net/wiki/Path_of_Exile_2_Wiki) covers anything the data lacks.

**From Plants vs. Zombies (2009):**

- Economy and tempo: sun values, sky-drop schedule, seed recharge tiers, zombie walk speed, wave timing and budgets, lawn geometry.
- Source: the reverse-engineered source, summarised in [appendix E §1](appendix-e-economy.md#1-reference-numbers).

**The bridge.** PvZ sets *tempo*; PoE2 sets *scaling*. Four global knobs translate between them ([appendix A §1.3](appendix-a-combat.md#13-global-tuning-knobs)):

- monster life x4.5;
- monster damage x1.25;
- hero action rate x0.5;
- 4.7 s per tile walk speed.

---

## 4. Core loops

| Loop | Length | The player… |
|---|---|---|
| **Moment** | ~5 s | sees mana arrive → places a hero or casts the spell → watches loot beams pop |
| **Level** | ~4 min | survives ~10 waves and maybe a boss or Strongbox → sees the loot summary |
| **Between rounds** | ~1.5–2 min | equips, crafts, recruits, spends passives, picks the next level, adjusts the roster |
| **Campaign** | ~2 h | climbs 20 levels from area 1 to 29, kills 4 bosses, grows a build |

The intended feeling is the PoE2 refrain *"one more map"*, translated as *"one more level, my new spear needs testing."*

---

## 5. Campaign structure

- **One persistent account.** Stash, roster, gold, currency, passive tree, and player level all persist. There is a single local save.
- **Start.** Pick a **focus** (Warrior, Ranger, or Sorceress; §12). That grants a starter kit of 3 heroes (acolyte, melee, ranged) and 1 spell.
- **Roster slots** 4, 5, and 6 unlock on first clear of levels 1, 2, and 3.
- **20 levels**, about 4 minutes each, in 4 biomes of 5 levels. Area level climbs from 1 to 29.
- **Bosses** at levels 5, 10, 15, and 20. Level 20 is the act boss and ends the demo.
- **First-clear rewards** on every level mirror PoE2 quest rewards: hero choices, orbs, passive points ([appendix E §4.5](appendix-e-economy.md#45-first-clear-rewards-poe2-quest-reward-equivalent)).
- **Replay** any cleared level to farm. It re-randomizes at its own area level, and the PoE2 XP penalty discourages farming far below your level.
- **Failure is cheap.** Each level gives you a **20-point life pool**. Leaking monsters cost 1 (normal), 3 (magic), 10 (rare), or everything (boss). At 0 you lose the level, but **you keep all loot, gold, and XP** from that attempt. Losing only costs time, so experimenting with builds is safe.
- **Pre-level preview** shows only **which monster types** will appear. Terrain is revealed when the level starts.

The full level table is in [appendix D §6](appendix-d-monsters-levels.md#6-campaign-20-levels).

---

## 6. In-level gameplay

### 6.1 The board

- **5 lanes x 9 columns.** Heroes stand on tiles, one per tile, and never move.
- Monsters spawn off the right edge and walk left toward the gate.
- Level 1 uses 3 lanes (the PvZ tutorial convention).

### 6.2 Mana

Mana is the in-level currency, PvZ's sun. **Everything is auto-collected**; the player never clicks pickups.

| Source | Rule |
|---|---|
| Starting mana | 50 (150 on level 1) |
| **Sky mana** | 25 each, roughly every 5–11 s (PvZ schedule) |
| **Acolytes** | 25 mana every ~24 s, scaled by their **Spirit**: `25 × (1 + Spirit / 200)` |

Heroes have no mana stat. Mana is the board's currency, not a character resource.

### 6.3 Placing heroes

The **roster bar** holds 6 hero cards and 1 spell card.

**A card is a loadout.** Each hero card is one hero plus its 3 equipped items. Every copy you place shares that loadout, like a PvZ seed packet. You can place any number of copies.

**Cost and recharge.**

- Cost: `roleBase × Π(support cost multipliers)`, rounded to 25.
- Recharge tiers: fast 7.5 s, slow 30 s, very slow 50 s.
- At level start, slow cards begin with 20 s left and very-slow cards with 35 s.
- **Hero level and items never change cost.** Supports do, so a 4-support Rare is a powerful, expensive card.

**Other controls:**

- **Shovel** removes a hero, with no refund.
- **1x/2x speed** toggle.
- No pause-and-place, and no repositioning.
- The roster is locked during a level.

### 6.4 Hero roles on the board

| Role | PvZ cousin | Job |
|---|---|---|
| **Acolyte** | Sunflower | Generates mana; Spirit gear makes it generate more |
| **Melee** (walls and strikers) | Wall-nut, Squash | Blocks the lane; hits its own tile and 1 ahead; thorns |
| **Ranged** (bow, crossbow, spear) | Peashooter family | Lane projectiles. Pierce, fork, chain, and extra projectiles change lane coverage. |
| **Caster** (wand, staff) | Snow Pea, Melon-pult | Elemental spells, areas, ailments |
| **Curse/Mark** | — | Debuffs monsters in range: lowered resistances, marks |
| **Aura** | Torchwood (positional) | **Global** auras (Heralds, Purities) buff the whole board while alive. **Positional** auras (Banners, Presences) buff or debuff within a tile radius. Copies don't stack. |

### 6.5 The spell

- One **spell card** per roster: the PvZ Cherry Bomb slot.
- Cast it at any tile for ~150 mana, on a 30–50 s cooldown.
- Spells are loot too ([§8](#8-spells)).

### 6.6 Waves, terrain, and events

**Waves.** PvZ structure: the first wave at 18 s, then every 25–31 s, or sooner if you're crushing it. A **flag wave** comes at the end, with a warning. MvM waves are 2–3x denser than PvZ's, because kills are loot.

**Terrain.** It arrives gradually from level 4:

- **Rock** (unplaceable)
- **Shallow Water** (slows monsters; no heroes)
- **Shrine** (buffs the hero standing on it)
- **Burning Ground** and **Chilled Ground** (affect both sides)
- **Grave** (spawns monsters mid-lane on flag waves)

**Strongboxes.** In ~1 of 4 levels from level 4, a chest sits mid-board. Place a hero next to it to trigger an ambush wave; survive it for a guaranteed rare plus a loot burst. This is the demo's only optional event.

Details are in [appendix D](appendix-d-monsters-levels.md).

---

## 7. Heroes

**The central idea.** Each hero is a **PoE2 active skill gem**. Each hero's modifiers are **PoE2 support gems**.

*Example:* a "level 17 Rare Lightning Spear" hero with Shock, Pierce, and Lightning Attunement supports.

### 7.1 Anatomy of a hero

| Property | Rule |
|---|---|
| **Skill** | One PoE2 active skill per hero type. Each skill has its own sprite and a precise lane behaviour ([appendix B](appendix-b-heroes.md)). 32 heroes in the demo. |
| **Weapon lock** | The skill dictates the weapon class: Lightning Spear needs a spear, Ice Shot needs a bow. Acolytes and aura heroes use sceptres. Casters use wands (projectile spells) or staves (area spells). |
| **Level** | On the character-level scale, 1 to ~32 in the demo. It maps to PoE2 gem level through PoE2's own "required level per gem level" table. |
| **XP** | Heroes **in the roster** earn the same XP as the player. Hero level is capped at the highest area level unlocked + 2. |
| **Rarity** | Normal (0 supports), Magic (1–2), Rare (3–4). Jeweller's Orbs can add slots, up to 5. No unique heroes. |
| **Supports** | Rolled from PoE2 supports compatible with the skill, weighted 3x toward PoE2's recommended supports. Tiers I/II/III unlock at hero levels 1/12/24. No duplicates, and no stacking of the same family. |
| **Attributes and life** | Str/Dex/Int come from the gem's attribute profile, the hero's level, items, and passives. Life = `16 + 12/level + 2/Str`, times an archetype multiplier (walls are huge). |
| **Item slots** | Weapon, Armor (body armour or shield), Accessory (amulet, ring, or belt). **No attribute requirements.** |

### 7.2 Where heroes come from

- **Drops:** ~1–2 per level ([appendix E](appendix-e-economy.md#34-expected-yields)).
- **First-clear choices:** "pick 1 of 3".
- **The Recruiter vendor.**
- **Hero gambling.**

Hero drops are mildly **build-shaped**: 35% share a damage type or weapon class with your roster.

---

## 8. Spells

- Spells are their own loot type: big-impact PoE2 spells such as Comet, Frost Bomb, Firestorm, and Hexblast.
- Like heroes, they have **level, rarity, and supports**.
- Each is cast at a target tile with a fixed grid shape (3x3, lane, column).
- They scale with spell level, supports, and global passives.
- Each focus starts with one spell.
- There are 8 in the demo: Frost Bomb, Earthquake, Explosive Grenade, Volcanic Fissure, Comet, Firestorm, Hexblast, and Lightning Conduit ([appendix B §6](appendix-b-heroes.md#6-spell-catalog)).

---

## 9. Items

PoE2 rules apply throughout:

| Concept | Rule |
|---|---|
| **Bases** | Real PoE2 bases with their implicits and properties (damage, attack speed, crit, armour, evasion, ES, block, Spirit) |
| **Item level** | The area level where the item dropped, +1 from rares and +2 from bosses. It gates which affix tiers can roll. |
| **Rarity** | Normal (0 mods), Magic (1 prefix + 1 suffix max), Rare (up to 3 + 3), Unique (fixed) |
| **Affixes** | PoE2 `mods.json`, filtered to MvM's ~100-stat vocabulary. Mana, movement, flask, and minion mods are cut. |
| **Uniques** | 17 build-enablers from PoE2. Each boss guarantees one from its own level-gated pool. |

**Demo weapon classes:** Bow, Crossbow, Spear, One/Two Hand Mace, Quarterstaff, Wand, Staff, Sceptre. Swords, axes, daggers, claws, and flails are cut. Shields are allowed only with one-handed weapons.

**One item powers every copy.** Equipping a +1 projectile bow on your Lightning Arrow card upgrades *every* Lightning Arrow on the board. That is the "loot you can see" pillar at work.

**Team affixes power every hero.** Most affixes are local to their hero, who plays a role: a wall invests in life, a carry in damage. Team affixes ("+12% team fire resistance", "+6% team fire damage") go into one team sheet that buffs every hero instead.

- **Resistances are team-only.** A monster hits only the hero in front of it, so a hero-only resistance was a dead roll.
- **Life, defences and elemental damage** come in both versions. The team version is weaker and rarer, so stacking it is a mid-to-late build, e.g. fire damage on all six heroes' gear to feed one fire carry.
- Each roster hero's items count once, however many copies are placed.
- Biomes lean on one element (Bog lightning, Desert fire, Winter cold), so team resistances answer a threat the player can plan for ([appendix D §2.3](appendix-d-monsters-levels.md)).

Full catalog: [appendix C](appendix-c-items.md).

---

## 10. Crafting and currency

**Items** use the core PoE2 orb ladder:

- Orb of Transmutation
- Orb of Augmentation
- Regal Orb
- Exalted Orb
- Chaos Orb
- Orb of Alchemy
- Orb of Annulment
- Divine Orb
- Vaal Orb (corruption gamble)

Shards come from salvaging.

**Heroes** have their own currencies, which are deliberately rare:

- Lesser, Greater, and Perfect Jeweller's Orbs: +1 support slot.
- Gemcutter's Prism: quality.
- **Orb of Realignment** (MvM custom): rerolls a single support.
- **Orb of Transference** (MvM custom): moves supports between two heroes of the same skill, so a great Rare's supports survive a higher-level drop.

**Cut from the demo:** PoE2 Essences, Omens, runes, soul cores, catalysts, Artificer's Orbs, and Orb of Chance.

**Currency is richer than PoE2's Act 1** (roughly 3x), and its drop levels are compressed, so that Divine and Vaal appear by area 15–20. This is deliberate: crafting is half the hypothesis and has to be reachable in 2 hours ([appendix E §4.4](appendix-e-economy.md#44-why-currency-is-richer-than-poe2)).

Exact behaviours: [appendix C](appendix-c-items.md).

---

## 11. Loot, vendors, and the loot filter

**Drop rates.** Gear and hero drops per minute match PoE2's early campaign: ~1–3 gear drops per minute, campaign-average ~59% normal / 35% magic / 6% rare. Magic and rare monsters drop more and better loot, using PoE2's +rarity-per-monster-modifier rule.

**Presentation.**

- PoE-style rarity colours, beams, and sounds.
- A live **loot ticker** on the right edge.
- An end-of-level summary with **Upgrade** tags.
- Everything is auto-collected.

**Build-aware shaping (mild).**

- 50% of weapon drops are weapon classes your roster uses.
- 35% of hero drops share a damage type or weapon class with your roster.
- Everything else is fully random, so surprise finds still happen.

**Loot filter.** Three presets: Show all / Hide normal / Hide normal + low-tier magic. Hidden drops quietly auto-convert to gold or shards, so nothing feels lost.

**Vendors.** Both are paid in **gold**, which monsters drop.

| Vendor | Sells |
|---|---|
| **Armorer** | Items |
| **Recruiter** | Heroes and spells |

- Each shows ~8–12 offers at your area level and refreshes after every level.
- A **gamble tab** sells a hidden item of a chosen base, or a hidden hero of a chosen role or damage type.
- **Anything sells** for gold.
- Vendors are bad-luck protection, not the main power source: a rare costs ~1–2 levels of gold.

Numbers: [appendix E](appendix-e-economy.md).

---

## 12. Focuses and the passive tree

**Focus** is MvM's class: it picks a start position on the passive tree and a starter kit. Any hero can still go in any roster.

| Focus | PoE2 class start | Fantasy | Starter kit (all Normal, level 1) |
|---|---|---|---|
| **Warrior** | Warrior (Str) | Walls, armour, slams, stun | Ezomyte Acolyte, Rolling Slam, Armour Piercing Rounds; spell: Earthquake |
| **Ranger** | Ranger (Dex) | Bows and spears, projectiles, evasion, crit | Ezomyte Acolyte, Falling Thunder, Lightning Arrow; spell: Explosive Grenade |
| **Sorceress** | Sorceress (Int) | Elemental spells, ES, ailments | Ezomyte Acolyte, Ice Strike, Spark; spell: Comet |

Starter kit details: [appendix B §4](appendix-b-heroes.md#4-starter-kits).

**The passive tree**

- A **curated region of the real PoE2 tree**: 225 nodes around the three starts, with bridges between every pair, so the tree is a ring.
- Real positions, connections, and stat lines are kept where MvM supports the stat. Unsupported nodes are swapped for the nearest supported stat.
- Passives are **global**: they modify every hero and the spell.
- About **37 points** are available by demo end: 1 per player level, plus 2 per boss.
- **No ascendancy** in the demo.

Details: [appendix F](appendix-f-passives.md).

---

## 13. Monsters, bosses, and terrain

**Monsters**

- **12 behaviour archetypes** borrowed from PvZ, skinned as LPC creature families. Examples: Shamblers, armoured skeletons, shield-bearers, leaping goblins, flying bats, burrowing beetles, splitting slimes, minotaur brutes.
- **Stats** come from PoE2's per-level monster table, times archetype multipliers.
- **Magic and rare monsters** roll real PoE2 monster affixes, such as "of the Inferno" (+40% damage as fire) and "of Hexproof".

**Bosses** (PoE2 Act 1 names, test flavour)

| Level | Boss | Shape |
|---|---|---|
| 5 | The Bloated Miller | 2-lane walker |
| 10 | The Rust King | 3-lane walker with phases |
| 15 | Lachlann of Endless Lament | 2-lane walker that shifts lanes |
| 20 | Count Geonor | 5-lane stationary, Dr. Zomboss-style |

- All bosses show PoE2's **heavy-stun bar** as a burst window.
- All bosses guarantee a unique.

Details: [appendix D](appendix-d-monsters-levels.md).

---

## 14. Combat model

MvM runs **PoE2's formulas verbatim** for heroes and monsters, with a trimmed vocabulary of ~100 stats:

- added damage → conversion → gained as extra → increased → more → crit;
- accuracy versus evasion;
- armour (`A / (A + 10 × D)`, capped at 90%);
- resistances (75% cap) and penetration;
- block (50% cap);
- energy shield before life;
- ignite and flammability, bleed (doubled while monsters walk!), poison, chill, freeze, shock, and electrocute;
- light and heavy stun with Primed thresholds;
- exposure, armour break, culling, and leech.

**Grid translation (lane-literal)**

| Mechanic | On the grid |
|---|---|
| Projectiles | fly down their lane |
| Pierce | passes through N monsters |
| Fork | splits into the adjacent lanes |
| Chain | jumps up to 2 tiles in any lane |
| Extra projectiles | fan into adjacent lanes |
| AoE | 1 tile = 1.2 PoE2 metres |
| Melee | hits its own tile and 1 ahead |

**Emergent tensions we want players to discover:**

- **Bleed versus walls.** Bleed does double damage to walking monsters, so stopping them with a wall *halves* your bleed.
- **Conversion versus Plated Skeletons.** Elemental damage ignores armour.
- **Chill and freeze as PvZ's Snow Pea, with buildup.**
- **Shock** is strongest on the monster your wall is holding.

Full rules: [appendix A](appendix-a-combat.md).

---

## 15. Screens and UI

| Screen | Contents |
|---|---|
| **Title / Focus select** | 3 focus cards with starter kit previews |
| **Campaign map** | 20 level nodes. Each node card shows biome, area level, monster types (only these are previewed), first-clear reward, and a Strongbox hint ("possible"). It also shows the biome's element next to the team's resistance to it, e.g. "Fire 34% / 75%". |
| **Hideout (between rounds)** | Tabs: **Roster** (6 cards + spell; drag heroes and items; a **Team** panel sums every team stat, and hovering a line lists the items it comes from), **Stash** (uniform cards, no Tetris; sort and filter by slot, rarity, level, and "Upgrade"), **Craft** (drag an orb onto an item or hero, with a PoE-style tooltip before and after), **Armorer**, **Recruiter**, **Gamble**, **Passive tree**, **Loot filter** |
| **In level (HUD)** | Mana counter (top left). Roster bar with costs and recharge sweeps (top). Spell card. Life pool hearts. Wave progress with flag markers (bottom). Loot ticker (right edge). Shovel. 1x/2x toggle. Damage numbers on heroes show a small shield icon when resistance reduced the hit. |
| **Level end** | Loot summary sorted by rarity with Upgrade tags; XP gained; first-clear reward; "Next level" and "Hideout" buttons |
| **Dev menu** | Grant items, heroes, or currency; set level; skip to any campaign level; toggle overlays (hitboxes, ailment meters, DPS meters) |

**Tooltips** use PoE2's text conventions:

- affix lines with tier and range on hover (Alt);
- hero tooltips listing skill stats per level and support lines;
- "DPS on this card" and "EHP" summaries, to make comparisons fast.

---

## 16. Art and audio

**Art**

- **LPC (Liberated Pixel Cup)** pixel art from `~/Documents/lpc`.
- LPC is a 3/4 top-down style, so the board reads like **PvZ's angled lawn**. Heroes use LPC's right-facing rows and monsters the left-facing rows.
- **Heroes:** one ULPC-composed sprite per hero skill. Its weapon layer matches the hero's locked weapon class, and element palette variants keep 32 heroes distinct. Armour and jewellery aren't drawn on the sprite.
- **Monsters:** ULPC creature bodies and heads (zombie, skeleton, goblin, orc, wolf, minotaur, rat, and others) plus source-of-tales monster sheets (slime, bat, beetle). Rarity is tinted; bosses are scaled up.
- **Licensing:** LPC assets are CC-BY-SA, GPL, or OGA-BY. The prototype ships a credits screen generated from the packs' credit files.

Asset map and licensing: [appendix G](appendix-g-art.md).

**Audio** (not discussed in the design interview; recommendation)

- Use open SFX: 23 CC0 packs are already downloaded and mapped to game events.
- The **drop sounds are the priority**: distinct stingers for rare, unique, hero, and currency drops. PoE players are conditioned to them, and they carry the loot hook. All stingers share one key, so loot bursts play as rising arpeggios.
- Music: per-biome loops with an intensity layer, a hideout theme, and a boss loop.

**Game feel ("the juice")**

- Feedback scales with **hit significance** (damage ÷ target life), so a better item makes hits look and sound chunkier without new art.
- VFX colours and shapes are **derived from each hero's final stats**, so a conversion support visibly recolours its projectiles.
- A drop's 3 seconds (pop, beam, stinger, label, ticker) are choreographed per rarity.

Juice, VFX, SFX, music, and sources: [appendix H](appendix-h-juice.md).

---

## 17. Prototype implementation notes

These are suggestions only. The project's rule is *"do not overarchitect; treat all code as disposable."*

- **Platform:** a web browser, single page, local save in `localStorage`.
- **Data import:** one build-time script reads the PoE2 RePoE JSON and writes trimmed `data/*.json`. It covers the curated heroes, supports, bases, mods, uniques, and passive sub-tree, keyed by the IDs cited in appendices B, C, and F. Re-running it pulls exact per-level values.
- **Simulation:** fixed 60 Hz step. Use the same `Actor` stat block for heroes and monsters ([appendix A §2](appendix-a-combat.md#2-actors)). A headless simulation mode is cheap to add and makes tuning the global knobs much faster.
- **Validation:** `scripts/ci`.

---

## 18. Out of scope for the demo

| Out of scope | Why |
|---|---|
| Minions, totems, shapeshifting, companions, channelling, trigger meta-gems | Don't map cleanly to tiles |
| Hero mana | Removed. "Mana" now means the board currency. |
| Movement and dodge stats | Heroes don't move |
| Helmets, gloves, boots, quivers, foci, bucklers, flasks, charms, jewels | Only 3 slots |
| Attribute requirements on items | Friction without payoff in a 2-hour test |
| Ascendancies | Post-demo hook |
| PoE2 Essences, Omens, runes, soul cores, catalysts | Crafting kept to the core ladder |
| Unique heroes | — |
| Map or waystone endgame | — |
| Telemetry and surveys | Gut check instead |
| Day/night and aquatic level types | PvZ extremes we chose not to copy |
| Multiplayer | — |
| Monetisation | — |

Post-demo candidates if the test succeeds: charges and Rage, ascendancies, a waystone map endgame, more slots, unique heroes.

---

## 19. Risks and what to watch in playtests

| Risk | Signal | First lever |
|---|---|---|
| **Power creep flattens TD tension**: loot makes placement irrelevant | Players stop placing walls or care little where heroes go | Raise `K_monsterLife`; lean on support cost multipliers |
| **Too much to read**: PoE tooltips on a busy board | Players ignore drops or never open the craft tab | Loot filter defaults to "Hide normal"; Upgrade tags; trim the stat vocabulary |
| **Loot drought or flood** | Long gaps between meaningful drops, or a stash overwhelmed by level 8 | Item rolls per kill and the hero share ([appendix E §8](appendix-e-economy.md#8-economy-tuning-knobs)) |
| **Copies of one card dominate** | One overgeared hero card spammed in every lane | Support cost multipliers; area-limited auras; monster counters (Shieldbearer, Flier, Burrower) |
| **Acolyte economy is solved** | Every run opens with 3 acolytes and the same Spirit gear | Fine for the demo. Watch whether Spirit gear feels like a real choice. |
| **PoE2 data surprises**: per-level values that don't suit the grid | Individual heroes far above or below the curve | Fix per hero in appendix B. Never change a global formula for one hero. |
| **LPC art gaps**: no death animations, no sceptres, tiny chibi bats and slimes, no orb icons | Placeholder-looking moments | The fallbacks listed in [appendix G](appendix-g-art.md): a fall-plus-flash death, a crook-staff sceptre stand-in, code-driven bobbing, procedural FX |

---

## 20. Decision log

These decisions came from the design interview on 2026-10-18.

| Topic | Decision |
|---|---|
| Audience | ARPG-literate playtesters; real mechanics exposed |
| Structure | Persistent campaign, 20 levels of ~4 min, bosses at 5/10/15/20 |
| Start | 3 starter heroes + spell from the focus; roster slots 4–6 unlock after levels 1–3; early loot paced like PoE2 (first-clear rewards play the role of PoE2 quest rewards) |
| Vendors | Gold economy; Armorer + Recruiter + gamble tab; everything sellable |
| Pickups | All automatic (mana, gold, loot) |
| In-level currency | Renamed from "essence" to **mana**; heroes have no mana stat |
| Hero cost | Role base × support cost multipliers; PvZ recharge tiers |
| Attributes | Weapon-locked heroes; no attribute requirements on items |
| Slots | Weapon / body armour or shield / amulet, ring, or belt |
| Affix scope | Hero-local by default; team affixes buff every hero. Resistances are team-only at half PoE2 value; life, defences and elemental damage get half-value, half-weight team twins. Roster heroes count once. Biomes lean on one element. |
| Grid mapping | Lane-literal |
| Formulas | PoE2 verbatim with a trimmed ~100-stat vocabulary |
| Scale bridge | PvZ tempo, PoE2 curves, 4 global knobs |
| Acolytes | Spirit-scaled mana generation |
| Auras | Mix: global (Heralds, Purities) and positional (Banners, Presences); no stacking |
| Archetypes | Curses and marks in; minions, totems, companions, and shapeshift out (Banners appear only as positional aura heroes) |
| Supports | Rarity-gated count, tag-compatible, weighted to recommended, tier-gated by hero level |
| Hero level | Earns XP in the roster; capped at area + 2 |
| Spell | Separate loot type with level, rarity, and supports |
| Currency | Core orb ladder + Jeweller's/Gemcutter's + 2 custom hero orbs |
| Loot shaping | Mild (50% weapons, 35% heroes) + 3-preset filter |
| Focuses | Warrior, Ranger, Sorceress |
| Tree | Curated PoE2 sub-tree; no ascendancy |
| Monsters | PvZ behaviours × LPC families; PoE2 monster affixes |
| Bosses | 2-lane, 3-lane, 2-lane walkers, then a 5-lane stationary finale |
| Failure | 20-point life pool; losing costs only time |
| Preview | Monster types only |
| Terrain | 4 biomes, 6 tile types |
| Events | Strongboxes only |
| Art | PvZ-style 3/4 lawn; ULPC sprites; gear not drawn |
| Success | Team gut check |
| Docs | This GDD + 8 appendices of curated tables with RePoE IDs |
| Small calls | PoE2 names verbatim; shovel with no refund; 1x/2x speed; uniform-card stash; no unique heroes; dev cheats; single local save |

---

## 21. Glossary

| MvM term | PoE2 equivalent | PvZ equivalent |
|---|---|---|
| Hero | Active skill gem (as a character) | Plant |
| Hero card / roster slot | Gem + equipment loadout | Seed packet |
| Support (hero modifier) | Support gem | — |
| Mana | — (PoE2 mana is cut) | Sun |
| Acolyte | — (Spirit-scaled, MvM custom) | Sunflower |
| Spell | Spell skill gem | Cherry Bomb, Jalapeño |
| Focus | Character class start | — |
| Area level | Area level | Level number |
| Life pool | Portals / deaths | Lawnmowers + house |
| Strongbox | Strongbox | — |
| Gold | Gold | Coins |
| Wall | — | Wall-nut, Tall-nut |
| Flag wave | — | Huge wave (flag zombie) |
