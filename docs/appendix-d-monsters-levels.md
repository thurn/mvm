# Appendix D: Monsters, Bosses, Campaign & Terrain

Part of the [Mercs vs. Monsters GDD](gdd.md).

This appendix covers:

- everything that walks down the lanes: 12 archetypes, rarity, PoE2 monster affixes, and 4 bosses;
- the 20-level campaign that delivers them;
- waves, terrain, and Strongboxes.

**Related appendices**

- Combat math: [appendix-a-combat.md](appendix-a-combat.md).
- Loot, gold, and XP: [appendix-e-economy.md](appendix-e-economy.md).
- Art: [appendix-g-art.md](appendix-g-art.md).

**Sources**

- PoE2 `default_monster_stats.json` and `mods.json` (domain `monster`), from RePoE PoE2 4.5.5.2.
- PvZ wave and zombie numbers from the reverse-engineered source, summarised in appendix E.
- Monster names are **MvM custom** placeholders. Boss names are PoE2 Act 1 bosses, used verbatim as test flavour.

---

## 1. Monster stat model

Every monster is built the same way. The formula is from [appendix A §2.2](appendix-a-combat.md#22-monster-stat-block):

```
stat = default_monster_stats[areaLevel].stat × archetypeMult × rarityMult × globalKnob
```

**Reference rows from `default_monster_stats.json`**

| Area level | life | physical_damage | armour | evasion | accuracy | experience |
|---|---|---|---|---|---|---|
| 1 | 15 | 9.16 | 3 | 24 | 32 | 17 |
| 5 | 33 | 13.78 | 13 | 49 | 48 | 31 |
| 10 | 67 | 20.44 | 30 | 84 | 72 | 120 |
| 15 | 134 | 28.23 | 54 | 120 | 103 | 308 |
| 20 | 249 | 37.29 | 89 | 160 | 140 | 623 |
| 25 | 400 | 47.80 | 137 | 202 | 186 | 1058 |
| 30 | 593 | 59.94 | 204 | 247 | 242 | 1750 |

The global knobs, from appendix A, are `K_monsterLife` = 4.5 and `K_monsterDamage` = 1.25. So a white Shambler at area 10 has **301 life** and bites for **25.6** per hit.

---

## 2. Archetypes

There are 12 behaviours, with 13 entries because Armoured has two weights, like PvZ's Conehead and Buckethead.

**Columns**

- Mults are relative to a Shambler.
- Speed is seconds per tile; lower is faster.
- Point cost is the wave budget cost (§5).

### 2.1 Stats

| Archetype | MvM name (custom) | PvZ analogue | First level | Point cost | Life x | Dmg x | Armour x | Evasion x | Speed (s/tile) | Attack interval |
|---|---|---|---|---|---|---|---|---|---|---|
| **Shambler** | Shambling Corpse | Zombie | 1 | 1 | 1.0 | 1.0 | 1 | 1 | 4.7 | 1.0 s |
| **Armoured (light)** | Helmed Skeleton | Conehead | 2 | 2 | 1.4 | 1.0 | 6 | 0.5 | 4.7 | 1.0 s |
| **Armoured (heavy)** | Plated Skeleton | Buckethead | 7 | 4 | 1.8 | 1.0 | 14 | 0.3 | 4.7 | 1.0 s |
| **Swarm** | Rat Swarm (pack of 3) | — | 3 | 1 per pack | 0.35 each | 0.4 | 0.5 | 2 | 3.5 | 0.6 s |
| **Leaper** | Goblin Leaper | Pole Vaulter | 4 | 2 | 1.0 | 1.0 | 1 | 1.5 | 3.0 → 5.5 after leap | 1.0 s |
| **Ranged** | Goblin Archer | — | 6 | 3 | 0.8 | 0.7 | 1 | 1.5 | 4.7 | 2.0 s shot |
| **Shieldbearer** | Shield Skeleton | Screen Door | 7 | 3 | 1.2 | 1.0 | 3 | 0.5 | 4.7 | 1.0 s |
| **Runner** | Ghoul Runner | Football | 8 | 3 | 1.3 | 1.2 | 2 | 1 | 2.5 | 0.8 s |
| **Flier** | Bat | Balloon | 9 | 3 | 0.6 | — | 0.5 | 3 | 3.5 | none |
| **Splitter** | Rot Slime | — | 11 | 3 | 1.4 (children 0.4) | 0.8 | 0.5 | 0.5 | 5.0 (children 3.6) | 1.2 s |
| **Shaman** | Orc Shaman | — | 12 | 4 | 1.0 | 0.6 | 1 | 1 | 4.7 | 1.0 s |
| **Burrower** | Burrowing Beetle | Digger | 13 | 4 | 1.2 | 1.0 | 4 | 0.5 | 3.0 underground | 1.0 s |
| **Brute** | Minotaur Brute | Gargantuar | 14 | 10 | 10.0 | 5.0 | 3 | 0.5 | 6.0 | 2.5 s |

### 2.2 Behaviour

**Shambler.** Walks, stops at a hero, bites. The baseline.

**Armoured (light and heavy).**

- High armour, which is PoE2 armour, not a separate HP pool.
- Armour Break brings it to Fully Broken: 0 armour and +20% physical damage taken for 12 s. Elemental damage ignores armour.
- So a "Plated" monster is the first natural test of conversion builds.

**Swarm.**

- Spawns as 3 rats in the same lane, 0.3 tiles apart.
- Weak against armour (many small hits) and area damage.

**Leaper.**

- The first time it reaches a hero, it leaps: it lands 1 tile behind the hero (left), then walks slowly.
- A **Wall** hero (life multiplier ≥ 5) can't be leapt; the leaper just stops and bites. This is PvZ's Tall-nut rule.

**Ranged.**

- Stops at the first of: x = 7.5, or 4 tiles from the nearest hero in its lane.
- Shoots that hero with a projectile. Blocked by shields; avoided by evasion.
- If a hero is adjacent, it keeps shooting rather than meleeing.

**Shieldbearer.**

- Carries a shield with HP = 2x its life. Projectile hits arriving from the front (all hero projectiles) are **blocked 100%**, and their damage goes into the shield's HP.
- Melee, area, and DoT bypass the shield.
- When the shield breaks, it becomes a Shambler. **MvM custom.** Stat: `monster_block_frontal_projectiles_%`.

**Runner.** Fast, slightly tough. Punishes thin lanes.

**Flier.**

- Flies over heroes, never stops, never attacks, and leaks if not killed.
- Melee strikes can't hit it. Projectiles, areas, and spells can. Chain can jump to it.

**Splitter.**

- On death, splits into 2 children at x ± 0.2 in the same lane.
- Children don't split and drop no loot.

**Shaman.**

- Every 6 s: heals monsters within 2 tiles for 8% of their max life.
- Grants them a **Ward** buff: +20% damage for 4 s.
- Its own heal skips itself. Priority target.

**Burrower.**

- Untargetable while tunnelling. Surfaces at column 1 (x = 1.0), then walks **right**, biting heroes from behind.
- Ranged heroes can't target behind themselves. Melee (own tile), novas, areas, and spells can.
- Never leaks.

**Brute.**

- Its smash one-shots most non-wall heroes. Immune to light stun.
- At ≤ 50% life it throws one Rat Swarm pack over the defence to column 3 (PvZ's Imp).

**Archetype resistances** (MvM custom, before affixes)

| Archetype | Resistances |
|---|---|
| Skeletons (Armoured, Shieldbearer) | +20% cold |
| Slime | +30% chaos |
| Orc Shaman | +25% fire, +25% lightning |
| Brute | +20% all elemental |
| All others | 0 |

---

## 3. Monster rarity

PoE2 decides which monsters get modifiers. The life and damage multipliers are **MvM custom**, because the export doesn't carry PoE2's rarity multipliers.

| Rarity | Affixes | Life x | Dmg x | Scale | Loot | XP x |
|---|---|---|---|---|---|---|
| Normal | 0 | 1.0 | 1.0 | 1.0 | base | 1 |
| Magic | 1 | 2.0 | 1.15 | 1.0, blue outline | +100% item rarity per affix (PoE2) | 2 |
| Rare | 2–4 (PoE2: up to 4) | 4.5 | 1.35 | 1.1, yellow outline | +200% rarity and +10% quantity per affix (PoE2 Dec 2024 values) | 5 |
| Unique (bosses) | fixed | per boss | per boss | 2–5 lanes | guaranteed unique (§4) | 20 |

**Rarity chance per spawn**

- Rolled per monster.
- Swarm packs roll once for the whole pack; all 3 rats share the result.
- Splitter children inherit nothing.
- The target kill mix matches PoE2's early campaign estimate (~80% normal / 15–18% magic / 2–4% rare), rising slightly with level.

| Levels | Magic | Rare |
|---|---|---|
| 1–3 | 12% | 2% |
| 4–9 | 14% | 2.5% |
| 10–15 | 16% | 3% |
| 16–20 | 18% | 4% |

**Rare monster names**

- Generated PoE-style from two word lists, e.g. "Gloom Rattler", "Ashen Gnaw". **MvM custom**.
- They show on the health bar.

---

## 4. Monster affixes (PoE2 `mods.json`, domain `monster`)

Magic monsters roll 1 affix; rares roll 2–4. Rules:

- Each affix may be taken only once per monster.
- An affix is legal only if its spawn tag matches the archetype.
- `required_level` gates by area level.

### 4.1 Elemental damage

All four add 40% of damage as extra of the element.

| PoE2 mod id | Name | Req lvl | PoE2 stats | MvM effect / notes |
|---|---|---|---|---|
| `MonsterDamageGainedAsFire1` | of the Inferno | 1 | `non_skill_base_all_damage_%_to_gain_as_fire` 40 | +40% of damage as extra fire |
| `MonsterDamageGainedAsCold1` | of Frostbite | 1 | `…_to_gain_as_cold` 40 | +40% as extra cold; chills heroes |
| `MonsterDamageGainedAsLightning1` | of Thunder | 1 | `…_to_gain_as_lightning` 40 | +40% as extra lightning; shocks heroes |
| `MonsterDamageGainedAsChaos1` | of Armageddon | 1 | `…_to_gain_as_chaos` 40 | +40% as extra chaos; 2x vs ES |

### 4.2 Speed, crit, stun, accuracy

| PoE2 mod id | Name | Req lvl | PoE2 stats | MvM effect / notes |
|---|---|---|---|---|
| `MonsterIncreasedSpeed1` | of Fleeting | 7 | `attack_and_cast_speed_+%` 30, `base_movement_velocity_+%` 30 | +30% walk and attack speed |
| `MonsterCriticalStrikeChance1` | of Incision | 12 | `critical_strike_chance_+%` 300 | Bites can crit (base 5% → 20%) |
| `MonsterStunDamageIncrease1` | of the Brawler | 1 | `hit_damage_stun_multiplier_+%` 100 | Light-stuns heroes far more often |
| `MonsterIncreasedAccuracy1` | of Precision | 1 | `accuracy_rating_+%` 200 | Counters evasion heroes |

### 4.3 Defence

| PoE2 mod id | Name | Req lvl | PoE2 stats | MvM effect / notes |
|---|---|---|---|---|
| `MonsterExtraArmour1` | of Endurance | 1 | `monster_additional_strength_ratio_%_for_armour` 100 | **Adapted:** +100% armour |
| `MonsterExtraEvasion1` | of the Blur | 1 | `monster_additional_dexterity_ratio_%_for_evasion` 100 | **Adapted:** +100% evasion |
| `MonsterExtraEnergyShield1` | of Buffering | 1 | `base_maximum_life_%_to_gain_as_total_energy_shield` 25 | ES = 25% of life; recharges after 4 s |
| `MonsterFireResistance1` | of the Volcano | 1 | `base_fire_damage_resistance_%` 50, `base_maximum_fire_damage_resistance_%` 10 | +50% fire resistance |
| `MonsterColdResistance1` | of the Ice | 1 | `base_cold_damage_resistance_%` 50, max +10 | +50% cold resistance |
| `MonsterLightningResistance1` | of the Tempest | 1 | `base_lightning_damage_resistance_%` 50, max +10 | +50% lightning resistance |
| `MonsterChaosResistance1` | of Exile | 1 | `base_chaos_damage_resistance_%` 50 | +50% chaos resistance |

### 4.4 Ailments on heroes

| PoE2 mod id | Name | Req lvl | PoE2 stats | MvM effect / notes |
|---|---|---|---|---|
| `MonsterAlwaysPoison1` | of Venom | 10 | `global_poison_on_hit` | Hits always poison heroes |
| `MonsterAlwaysBleed1` | of Bloodletting | 16 | `global_bleed_on_hit` | Hits always bleed heroes. Heroes are stationary, so no aggravation. |
| `MonsterIgniteChanceIncrease1` | of Ignition | 12 | `all_damage_can_ignite`, `always_ignite` | Ignites heroes |
| `MonsterFreezeDamageIncrease1` | of Freezing | 12 | `all_damage_can_chill`, `chill_minimum_slow_%` 10 | Chills heroes: slower attacks |
| `MonsterShockChanceIncrease1` | of Shocking | 12 | `all_damage_can_shock`, `always_shock` | Shocks heroes: +20% damage taken |

### 4.5 Ground effects

| PoE2 mod id | Name | Req lvl | PoE2 stats | MvM effect / notes |
|---|---|---|---|---|
| `MonsterBurningGroundOnDeath1` | Heated | 4 | (effect only) | **MvM:** on death, Burning Ground on its tile for 4 s |
| `MonsterChilledGroundOnDeath1` | Frosted | 4 | (effect only) | **MvM:** on death, Chilled Ground on its tile for 6 s |
| `MonsterShockedGroundOnDeath1` | Electrocuting | 4 | (effect only) | **MvM:** on death, Shocked Ground (heroes on it are shocked) for 4 s |
| `MonsterBurningGroundTrail1` / `…ChilledGroundTrail1` / `…ShockedGroundTrail1` | of Flames / Ice / Electricity | 4 | (effect only) | **MvM:** leaves 1-tile ground of that element behind it every 1 tile walked |

### 4.6 Immunities and counters

| PoE2 mod id | Name | Req lvl | PoE2 stats | MvM effect / notes |
|---|---|---|---|---|
| `MonsterImmuneToStun1` | of Stone Skin | 1 | `base_cannot_be_stunned` | Immune to light and heavy stun |
| `MonsterImmuneToSlow1` | of Freedom | 7 | `monster_slow_potency_+%_final` −50 | Slows (chill, hinder, maim) have 50% less effect |
| `MonsterIsHexproof1` | of Hexproof | 1 | `hexproof` | Can't be cursed (marks still apply) |
| `MonsterCannotLeech1` | of Congealment | 14 | `life_leeched_from_-permyriad` 6000 | 60% less life leeched from it |
| `MonsterModReducedCritMulti1` | of Obstruction | 10 | `base_self_critical_strike_multiplier_-%` 80 | Takes 80% less extra crit damage. A crit-build counter. |

### 4.7 Ranged and area

| PoE2 mod id | Name | Req lvl | PoE2 stats | MvM effect / notes |
|---|---|---|---|---|
| `MonsterArmourPenetration1` | of Shattering | 1 | `armour_break_physical_damage_%_dealt_as_armour_break` 1000 | Breaks hero armour fast. A wall counter. |
| `MonsterAdditionalProjectiles1` | of Splintering | 10 | `number_of_additional_projectiles` 4 | Ranged only. **Adapted:** also fires into both adjacent lanes |
| `MonsterAdditionalChains1` | of Chaining | 10 | `number_of_chains` 2 | Ranged only. Shots chain to 2 more heroes within 2 tiles. |
| `MonsterProjectilesGainDamage1` | of Far Shot | 10 | `projectile_damage_+%_max_as_distance_travelled_increases` 60 | Ranged only. **Adapted:** +60% projectile damage |
| `MonsterAreaOfEffect1` | of Giants | 10 | `rare_monster_mod_area_of_effect_+%_final` 100 | Brute and bosses only. Its smash also hits adjacent lanes. |

### 4.8 Timed

| PoE2 mod id | Name | Req lvl | PoE2 stats | MvM effect / notes |
|---|---|---|---|---|
| `MonsterPeriodicEnrage1` | Enraging | 16 | (effect only) | **MvM:** every 8 s, +50% speed for 3 s |

### 4.9 Cut from the pool

| Mod | Why cut |
|---|---|
| `MonsterLifeRegenerationRatePercentage1` (of the Hydra) | Required level 65 is out of demo range. |
| `MonsterPeriodicEnrage2` | Required level 45 is out of demo range. |
| Shrouded, Ethereal, Hungering, Abyssal | Depend on PoE2 visibility, league, or soul systems. |
| Last Gasp | Its name is still "TBD" in data. |

### 4.10 Archetype restrictions

| Archetype | Can't roll |
|---|---|
| Flier | anything that needs hitting heroes |
| Swarm | trails (too noisy) |
| Splitter | the on-death ground affixes |

---

## 5. Waves

The wave system is PvZ's, adjusted for density. PvZ's rules come from the reverse-engineered source; details are in appendix E.

### 5.1 Timing

| Rule | Value |
|---|---|
| First wave | **18 s** after level start. Level 1 waits 25 s, to give time to place the first acolytes. |
| Normal gap | **25–31 s** |
| Early trigger | When the current wave drops to **50–65%** of its spawned life, the next wave comes **2 s** later (minimum 4 s after spawn). |
| Huge wave | Every 10th wave and every level's final wave is a **flag wave**. A banner warning shows 7.5 s ahead: "A huge wave of Monsters approaches!" |
| Level end | The level ends when the final wave and any boss are dead. Remaining drops are collected automatically. |

### 5.2 Budget

```
waveBudget(levelIndex, w) = (floor(w / 3) + 1) × B(levelIndex) × (isFlagWave ? 2.5 : 1)
B(levelIndex) = 2.0 + levelIndex / 19        // 2.0 at level 1 → 3.0 at level 20 (MvM density knob)
```

- PvZ uses B = 1.
- MvM doubles or triples density, because loot comes from kills. The target is about **8–20 kills/min**, at or above PoE2's early 6–15 kills/min.

### 5.3 Composition

1. **Forced introductions.** A level's newly introduced archetype must appear in its middle wave and its final wave, as in PvZ.
2. **Flag waves** first spend `min(budget × 0.4, 8)` points on Shamblers. This is PvZ's "plain zombies plus flag" rule.
3. **Weighted draw.** Spend the rest by weighted random draw from the level's allowed archetypes. An archetype is skipped if its cost exceeds the remaining budget.
4. **Lane assignment.** Assign each monster a uniformly random lane. Never put more than 40% of a wave's points in one lane.
5. **Spawn stagger.** Stagger spawns across the wave by 0–4 s.

### 5.4 Draw weights

These come from PvZ's pick weights, normalised.

| Archetype | Weight |
|---|---|
| Shambler | 4000 |
| Armoured light | 4000 |
| Armoured heavy | 3000 |
| Leaper | 2000 |
| Runner | 2000 |
| Shieldbearer | 3500 |
| Swarm | 3000 |
| Ranged | 2500 |
| Flier | 2000 |
| Splitter | 2500 |
| Shaman | 1500 |
| Burrower | 1500 |
| Brute | 800 |

---

## 6. Campaign: 20 levels

### 6.1 Level table

- Area levels rise from 1 to 29.
- "Boss" levels have fewer normal waves; the boss arrives with the last regular wave.
- Biome names use PoE2 zone names as test flavour.

| Level | Biome | Zone flavour | Area lvl | Waves | Lanes | New monster | New terrain | Special tiles | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Grassland | The Riverbank | 1 | 5 | 3 (rows 1–3) | Shambler | — | 0 | 150 starting mana (PvZ first-level rule). Unlocks roster slot 4. |
| 2 | Grassland | Clearfell | 2 | 6 | 5 | Armoured (light) | — | 0 | Unlocks slot 5 |
| 3 | Grassland | Clearfell | 3 | 8 | 5 | Swarm | — | 0 | Unlocks slot 6 |
| 4 | Grassland | The Grelwood | 5 | 10 | 5 | Leaper | Rock | 2 | Strongboxes possible from here |
| 5 | Grassland | The Red Vale | 6 | 8 + boss | 5 | — | — | 2 | **Boss: The Bloated Miller** |
| 6 | Bog | The Grim Tangle | 8 | 10 | 5 | Ranged | Shallow Water | 3 | |
| 7 | Bog | The Grim Tangle | 9 | 10 | 5 | Shieldbearer, Armoured (heavy) | — | 3 | |
| 8 | Bog | Cemetery of the Eternals | 11 | 10 | 5 | Runner | Shrine | 4 | |
| 9 | Bog | Mausoleum of the Praetor | 12 | 10 | 5 | Flier | — | 4 | |
| 10 | Bog | Tomb of the Consort | 14 | 8 + boss | 5 | — | — | 4 | **Boss: The Rust King** |
| 11 | Desert ruins | Hunting Grounds | 15 | 10 | 5 | Splitter | Burning Ground | 5 | |
| 12 | Desert ruins | Freythorn | 17 | 10 | 5 | Shaman | — | 5 | |
| 13 | Desert ruins | Ogham Farmlands | 18 | 10 | 5 | Burrower | Grave | 6 | |
| 14 | Desert ruins | Ogham Village | 20 | 10 | 5 | Brute | — | 6 | |
| 15 | Desert ruins | Manor Ramparts | 21 | 8 + boss | 5 | — | — | 6 | **Boss: Lachlann of Endless Lament** |
| 16 | Winter keep | Ogham Manor | 23 | 10 | 5 | — | Chilled Ground | 7 | All archetypes allowed from here |
| 17 | Winter keep | Ogham Manor | 24 | 10 | 5 | — | — | 7 | |
| 18 | Winter keep | Root Hollow | 26 | 10 | 5 | — | — | 8 | |
| 19 | Winter keep | Root Hollow | 27 | 10 | 5 | — | — | 8 | |
| 20 | Winter keep | Count's Hall | 29 | 8 + boss | 5 | — | — | 6 | **Act boss: Count Geonor** |

**Expected timing.** About 4 min per level (PvZ: 10 waves ≈ 3–5 min) plus about 1.5–2 min between rounds. Total ≈ **115 min**.

### 6.2 Allowed archetypes per level

A level may use:

- every archetype introduced up to that level, minus Brute before level 14;
- at most 2 Brutes per level until level 18.

### 6.3 Replays

- Any cleared level can be replayed. It re-rolls terrain, waves, and Strongbox placement at its own area level.
- First-clear rewards ([appendix E](appendix-e-economy.md)) are not repeated.
- The PoE2 XP penalty applies once the player is far above the area level, so farming is a choice, not an XP exploit.

---

## 7. Bosses

**Common rules for all four bosses**

- Each boss is a unique-rarity monster that occupies **2–5 lanes**. It counts as present in every lane it covers.
- A hero in front of *any* covered lane blocks it. Its attacks can hit heroes in all covered lanes.
- **Telegraphs.** Every boss ability has a ground telegraph of **1.2–1.5 s**. Abilities flagged **unblockable** glow red (PoE2 convention).
- **Heavy-stun bar.** Shown prominently under the boss health bar. Unique bosses are Primed at 70% (PoE2). Boss stun threshold = **30% of max life** (MvM custom), so a good burst build gets 2–4 stuns per fight. A heavy stun gives **3 s** of no actions: the burst window.
- **Light stun.** Bosses are immune.
- **Leak.** If a boss reaches the gate, the level is lost (it costs 20 life).
- **Loot.**
  - Guaranteed: **1 unique item**, rolled from the boss's unique table in [appendix C](appendix-c-items.md); **1 rare hero**; **3 currency rolls** at rare-monster weights.
  - Plus **8 item rolls** at +3,200% rarity. This approximates PoE2's datamined boss mods: +800% quantity and +1,600–3,200% rarity.
- **Life.** Life multipliers are relative to a white Shambler at that area level, after `K_monsterLife`. Tune by playtesting so that a level-appropriate board needs **60–90 s** of focused fire.

### 7.1 The Bloated Miller (level 5)

| Property | Value |
|---|---|
| Lanes | 2 (picked at random: rows 1–2, 2–3, or 3–4) |
| Life x / damage x | 40 / 3 |
| Speed | 7.0 s/tile |
| Art | Scaled-up zombie (appendix G) |

**Abilities**

- **Grain Slam** (every 7 s): telegraphs the 2x2 tiles in front of it, then deals 3x damage to heroes there.
- **Rotting Brood** (every 18 s): spawns 3 Shamblers, one per covered lane plus one random.
- **Enrage** (at ≤ 50% life): +30% speed.

### 7.2 The Rust King (level 10)

| Property | Value |
|---|---|
| Lanes | 3 (rows 1–3) |
| Life x / damage x | 70 / 3.5 |
| Speed | 8.0 s/tile |
| Art | Skeleton boss sheet (source-of-tales) |

**Phases**

| Phase | Life | Behaviour |
|---|---|---|
| 1 | 100–66% | Walks. **Rust Slam** every 6 s: a 3x1 column strike in front of it. |
| 2 | 66–33% | Stops walking for 10 s and summons a Plated Skeleton in each covered lane. Then resumes. |
| 3 | < 33% | **Rust Wave** (every 9 s, unblockable): a lane-line attack down one covered lane. It deals 2x damage and **breaks 100% of hero armour** in that lane, leaving them Fully Broken for 4 s (the PoE2 player duration). |

### 7.3 Lachlann of Endless Lament (level 15)

| Property | Value |
|---|---|
| Lanes | 2 |
| Life x / damage x | 90 / 4 |
| Speed | 6.0 s/tile |
| Art | Vampire-head ULPC composite (appendix G) |

**Abilities**

- **Lament** (every 10 s): turns the 3 tiles in front of it, across both its lanes, into Chilled Ground for 6 s.
- **Mournful Shift** (at 75%, 50%, and 25% life): becomes untargetable for 2 s and shifts 1 lane up or down. Heavy stun is the counter, because a stunned Lachlann can't shift. This tests lane coverage rather than one stacked lane.
- **Escort.** A rare Shaman spawns with it.

### 7.4 Count Geonor (level 20, act boss)

| Property | Value |
|---|---|
| Lanes | **All 5**. Stationary, Dr. Zomboss-style. It fills columns 8–9, which become unplaceable for the level. |
| Life x / damage x | 160 / 5 |
| Art | Huge wolf-head composite (appendix G) |

**Phase 1 (100–50%).** Regular waves continue. Every 12 s it uses one of:

- **Moonlit Lunge** (unblockable): telegraphs a full lane, then hits every hero in it for 2x damage.
- **Frost Breath:** a 3x3 area anywhere on the board. Heavy freeze buildup on heroes.
- **Call the Pack:** 5 Runners, one per lane.

**Phase 2 (< 50%).** It becomes a werewolf: +40% ability speed, and it adds **Howl** (+20% speed to all monsters for 6 s).

**Exposure.** Only heroes in columns 6–7, and ranged or area attacks reaching column 8, can damage it.

**Kill reward.** Ends the demo campaign and shows the "Act 1 complete" screen with stats.

---

## 8. Terrain

### 8.1 Tile types

Six special tile types are introduced gradually (see the level table).

| Tile | Heroes | Monsters | Rules |
|---|---|---|---|
| **Rock** | Can't place | Walk past (decoration) | Forces formation changes |
| **Shallow Water** | Can't place | 30% slower walk (MvM Hinder-like); Fliers unaffected | Comes in 2–3-tile horizontal strips |
| **Shrine** | Placeable; the hero there gets **+30% damage and +30% max life** (MvM custom) | — | At most 1 per map, in columns 2–6 |
| **Burning Ground** | Placeable, but the hero takes fire DoT | Take fire DoT while on it | DoT = `dms.physical_damage × 0.5` fire per second, scaled to area level. Can ignite. |
| **Chilled Ground** | Placeable; the hero is chilled (30% slower actions) | Chilled 30% while on it (PoE2 Chilled Ground) | — |
| **Grave** | Can't place | Each flag wave and the final wave spawn a Shambler (rarity rolled normally) **at the grave's tile** | Only in columns 5–9. PvZ night graves. |

### 8.2 Map generation

1. **Biome and count.** Pick the biome from the level, and read the special-tile count `N` from the level table.
2. **Draw types.** Draw `N` tile types from the types unlocked so far. The newest type is guaranteed at least 1 tile on its intro level.
3. **Place each tile**, rejecting placements that break any constraint:
   - Every lane keeps **≥ 5 placeable tiles**.
   - Every lane keeps **≥ 2 placeable tiles in columns 1–3**, so there's always a last line of defence.
   - Column 1 never gets Rock or Water.
   - At most 2 Rocks per lane.
4. **Retry.** Retry up to 50 times, then fall back to `N − 1`.
5. **Seeding.** Seed by `(levelIndex, attemptCounter)`. Replays use a fresh seed.

The pre-level preview shows only which monster types will appear. Terrain is revealed when the level loads, and the player gets **~5 s of planning** before the first sky-mana drop. Placement is allowed during this time, since there's no pause.

---

## 9. Strongboxes

| Rule | Value |
|---|---|
| Frequency | 25% chance per level from level 4. Boss levels never get one. |
| Placement | One chest on a random placeable tile in columns 5–7. The tile becomes unplaceable while the chest is closed. |
| Trigger | It opens when the player places a hero on any of the **8 tiles around it**. Opening is the player's choice: they can ignore it. |
| Ambush wave | Spawns immediately from the right edge. Budget = 60% of the level's flag wave, with at least 1 rare and 2 magic monsters. Up to 2 lanes nearest the box get 70% of it. |
| Reward | When every ambush monster is dead: a loot burst on the box tile of **1 guaranteed rare item** (PoE2: strongboxes guarantee a rare), **3 item rolls at rare-monster rarity**, **1 hero roll**, and **2 currency rolls**. All at item level = area level + 1. |
| Leaks | Leaked ambush monsters cost life as usual. If the level is lost first, the reward is lost. |

This is the "risk for loot" beat. It is the demo's only optional event, chosen to reinforce the loot hook cheaply.
