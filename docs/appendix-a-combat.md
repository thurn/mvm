# Appendix A: Combat Rules, Formulas & Stat Vocabulary

Part of the [Mercs vs. Monsters GDD](gdd.md).

This appendix defines how a fight on the 5x9 board resolves:

- space and time on the board,
- what heroes and monsters do every tick,
- the PoE2 damage and mitigation math,
- ailments and stun,
- the global tuning knobs that bridge PoE2 numbers to PvZ tempo,
- the complete stat vocabulary every other appendix must use.

**Ground rules**

- PoE2 formulas are used **verbatim** for heroes *and* monsters.
- Only the stats in the [Stat vocabulary](#9-stat-vocabulary) exist.
- Anything without a PoE2 equivalent is marked **MvM custom**.
- Anything bent to fit the lanes is marked **adapted**.
- Constants that come from community calculators, not GGG, are marked **(verify)**. The PoE2 wiki was unreachable during research.

**Sources**

- PoE2's glossary: the `keywords.json` RePoE export, PoE2 4.5.5.2.
- `default_monster_stats.json` and `characters.json`.
- Community formula references: [Vulkk defences guide](https://vulkk.com/2025/06/12/path-of-exile-2-defences-explained/), [poe2-mcp defence calculator](https://glama.ai/mcp/servers/@HivemindOverlord/poe2-mcp/blob/27a007d214fe78de40962d230467161b5e81a074/src/calculator/defense_calculator.py), [poe2-mcp stun calculator](https://glama.ai/mcp/servers/@HivemindOverlord/poe2-mcp/blob/20a542602c458050a11aaf36584363dc53470d40/docs/STUN_CALCULATOR.md).
- PvZ timings: the reverse-engineered PvZ source, summarised in [appendix-e-economy.md](appendix-e-economy.md).

---

## 1. Space and time

### 1.1 The board

| Property | Value |
|---|---|
| Lanes (rows) | 5, numbered 0 (top) to 4 (bottom) |
| Columns | 9, numbered 1 (left, next to the gate) to 9 (right) |
| Hero placement | one hero per tile; heroes never move |
| Monster position | continuous `x` in tiles (1.0 = centre of column 1) plus a discrete lane |
| Monster spawn | `x = 9.75 + rand(0, 0.5)`, just off the right edge (PvZ spawns 0.25 to 0.75 tiles past column 9) |
| Leak | a monster whose `x` drops below 0.5 has reached the gate and costs life (see [§7](#7-leaks-and-the-life-pool)) |
| Metres per tile | **1.2 PoE2 metres = 1 tile** (adapted). PoE2 radii are in units, where 10 units = 1 m. Convert with `tiles = units / 12`. |
| Lane spacing for distance checks | 1 tile, so distance = `hypot(dx, dLane)` |

**Unit conversion examples**

| PoE2 value | MvM radius |
|---|---|
| 2 m Ignited Ground radius | ~1.7 tiles |
| 1.5 m slam radius | ~1.25 tiles, which reaches the adjacent lanes |

**Exception: auras.** Presence and Banner radii do **not** use the metre conversion. Converted, PoE2's 4 m Presence would be 3.3 tiles (±3 lanes) and a 6 m Banner 5 tiles. Either would cover nearly the whole 5-lane board, turning "positional" auras into global ones. MvM uses a **1.5-tile Presence** and a **2.5-tile Banner** instead (adapted; see §8).

### 1.2 Time

- Fixed simulation step of **1/60 s**. Durations are in seconds.
- The 2x game-speed toggle runs two steps per frame. It never changes rules.
- Each PvZ centisecond figure is converted 1:1 to seconds, e.g. 750 cs becomes 7.5 s.

### 1.3 Global tuning knobs

Four numbers bridge PoE2's scale to PvZ's tempo. Everything else stays PoE2-relative.

| Knob | Initial value | Applies to | Calibration target |
|---|---|---|---|
| `K_monsterLife` | **4.5** | all monster maximum life | A level-appropriate starter ranged hero kills a white Shambler in **8–10 hits** |
| `K_monsterDamage` | **1.25** | all monster hit damage | A Shambler kills an unarmoured, level-appropriate squishy hero in **~4 s**, and a wall in **~40 s** |
| `K_heroActionRate` | **0.55** | hero attack and cast speed, *after* all modifiers | A 1.2-aps bow attacks every ~1.5 s, PvZ's pea cadence; calibrated so every focus clears Levels 4–5 (plan 2.26) |
| `walkSecondsPerTile` | **4.7** | base Shambler walk speed; archetypes scale it | A Shambler crosses the lawn in ~45 s (PvZ basic zombie) |

**Calibration worked example: level 1 Ranger**

- Starter bow hero damage at hero level 1: about 8 physical per hit (PoE2 starter bow).
- L1 monster life: `default_monster_stats[1].life` = 15, times `K_monsterLife` 4.5 = 67.5 life.
- Hits to kill: 67.5 / 8 ≈ **8.4**.
- At 1.2 aps × 0.5 = 0.6 attacks/s, that is about **14 s**.
- In that time the Shambler walks **~3 tiles**. This matches PvZ: a Peashooter needs about 15 s for one basic zombie.

**Calibration worked example: monster damage at level 1**

- Hero life: base 16 + 12/level + 2/Str, with Str 7 → 42.
- Monster bite: 9.16 × 1.25 = 11.5 per hit, at 1 hit/s.
- 42 / 11.5 ≈ **3.7 s** to kill the hero. On target.

> The knobs are the *only* place to fix global tempo problems. If levels feel slow, change a knob. Don't edit PoE2 numbers.

---

## 2. Actors

Heroes and monsters share one stat block and one damage pipeline.

```ts
interface Actor {
  life: number; maxLife: number;
  es: number; maxEs: number;          // energy shield
  armour: number; evasion: number;
  resist: { fire: number; cold: number; lightning: number; chaos: number };
  blockChance: number;                 // heroes: shields only; monsters: Shieldbearer
  accuracy: number;
  stunThreshold: number;               // = maxLife by default
  ailmentThreshold: number;            // monsters: maxLife; heroes: maxLife / 2 (PoE2 player rule)
  stats: StatSheet;                    // aggregated stat vocabulary values
}
```

### 2.1 Hero stat aggregation

When a level starts, each roster slot computes one stat sheet. Every copy placed from that slot shares it.

1. Skill per-level stats ([appendix-b-heroes.md](appendix-b-heroes.md)), with hero level mapped to PoE2 gem level.
2. Support gem stats.
3. Item stats: local mods first, folded into the item's own properties; then global mods.
4. The **team stat sheet** (below).
5. Passive tree stats (global).
6. Global aura buffs currently active on the board (recomputed whenever an aura hero enters or dies). Positional auras resolve per hero.

**Team stat sheet** (**MvM custom**, [appendix C §C.3.8](appendix-c-items.md)).

- Any item stat with the `team_` prefix goes into one team sheet instead of the carrier's own sheet.
- Each of the 6 roster slots contributes its 3 items **once**, placed or not, however many copies are out. Stashed heroes contribute nothing.
- The sheet is fixed when the level starts, like the rest of step 3.
- Each team stat is applied to every roster slot's sheet as its unprefixed twin: `team_fire_resistance_%` 12 is `fire_resistance_%` 12 on every hero. It adds to the hero's own stats and still respects caps (75% resistance).
- Team damage stats also apply to the player spell, as passives do.

**Attribute bonuses**

| Attribute | Bonus | Source |
|---|---|---|
| Strength | +2 maximum life per point | PoE2 |
| Dexterity | +8 accuracy rating per point | PoE2 |
| Intelligence | +1% increased maximum energy shield per 5 points | **adapted**: PoE2 gives +2 mana per point, but mana is cut |

**Base life**

```
heroMaxLife = (16 + 12 × heroLevel + 2 × Str + flatLife) × (1 + incLife%) × archetypeLifeMultiplier
```

- 16 + 12/level is the PoE2 player formula.
- The archetype multiplier gives walls PvZ-style toughness, e.g. Wall-nut ≈ 13x a normal plant. Values are in [appendix-b-heroes.md](appendix-b-heroes.md).

### 2.2 Monster stat block

```
monsterMaxLife   = dms[level].life            × archetype.lifeMult   × rarityLifeMult   × K_monsterLife
monsterHitDamage = dms[level].physical_damage × archetype.damageMult × rarityDamageMult × K_monsterDamage
monsterArmour    = dms[level].armour  × archetype.armourMult
monsterEvasion   = dms[level].evasion × archetype.evasionMult
monsterAccuracy  = dms[level].accuracy
```

- `dms` is `default_monster_stats.json`, indexed by area level.
- Rarity multipliers and archetype multipliers are in [appendix-d-monsters-levels.md](appendix-d-monsters-levels.md).

---

## 3. What actors do each tick

### 3.1 Hero loop

```ts
function heroTick(h: Hero, dt: number) {
  if (h.stunnedFor > 0) { h.stunnedFor -= dt; return; }
  h.actionTimer -= dt;
  if (h.actionTimer > 0) return;
  const target = acquireTarget(h.skill.targeting, h);   // §3.3
  if (!target) { h.actionTimer = 0; return; }           // idle; fire as soon as something is in range
  performSkill(h, target);                              // creates hits, projectiles, areas
  h.actionTimer = h.skill.baseTime / (h.speedMult * K_heroActionRate);
}
```

- **Light stun** interrupts the wind-up: the timer resets and nothing fires.
- Heroes are never **heavy** stunned, matching the PoE2 player rule.
- Heroes do not move, so they are always "stationary" for PoE2 conditions. Bleeding on heroes is never aggravated by movement.

### 3.2 Monster loop

```ts
function monsterTick(m: Monster, dt: number) {
  if (m.immobilised()) return;                          // frozen, heavy stunned, electrocuted
  const blocker = heroInFront(m);                       // hero whose tile overlaps m.x in m's lane
  if (blocker && !m.archetype.ignoresBlockers) {
    m.attackTimer -= dt * m.actionSpeed;                // chill and slows reduce actionSpeed
    if (m.attackTimer <= 0) { hit(m, blocker); m.attackTimer = m.archetype.attackTime; }
  } else {
    m.x -= dt * m.moveSpeed / walkSecondsPerTile;       // moveSpeed: 1.0 = Shambler
  }
}
```

| Behaviour | Rule |
|---|---|
| Default melee attack interval | **1.0 s**. Archetypes override it ([appendix-d](appendix-d-monsters-levels.md)). |
| Speed | Monster speed is **not** scaled by `K_heroActionRate`. Monsters are tuned directly in seconds. |
| Ranged monsters | Stop at their range column and shoot the nearest hero in their lane, using the same pipeline. |
| Slow floor | Monsters can't be slowed below 25% of base speed (PoE2). |
| Slow effect by rarity | Slows have 15%, 30%, or 50% less effect on magic, rare, or unique monsters (PoE2). |

### 3.3 Targeting primitives

Each hero skill in [appendix-b-heroes.md](appendix-b-heroes.md) picks one targeting rule and one shape.

| Targeting rule | Picks |
|---|---|
| `LaneFirst(range)` | The monster in the hero's lane with the smallest `x` greater than or equal to the hero's column, within `range` tiles. |
| `LaneMostAdvanced(range)` | The monster in the hero's lane closest to the gate (smallest `x`), within range. Used by lobbed and area spells so they don't overshoot. |
| `NearbyMostAdvanced(radius)` | The most-advanced monster in any lane within `radius`. Used by curses and marks. |
| `SelfTile` | Always valid while any monster is within the skill's reach. Used by melee and novas. |

| Shape | Effect |
|---|---|
| **Lane projectile** | Spawns at the hero and travels right at projectile speed. It hits the first monster it overlaps. |
| **Melee strike** | Hits monsters in the hero's own tile and one tile ahead. A single-target strike hits the most advanced of those. |
| **Slam / area at point** | A circle of radius `r` tiles centred on the target point. It hits every monster inside, across lanes. |
| **Nova** | A circle of radius `r` around the hero. |
| **Lane line** | Every monster in the lane from the hero to `range`. Used by beams and Lightning Conduit-style skills. |
| **Column** | Every monster in a column, across all 5 lanes. Used by some player spells. |

Projectile speeds are cosmetic and fast: about 8 tiles/s. "Increased projectile speed" only shortens travel time.

### 3.4 Projectile modifiers on the grid (adapted)

Resolution order follows PoE2: **Split/Pierce/Fork take priority over Chain**.

| Modifier | Grid behaviour |
|---|---|
| **Pierce N** | Passes through the first N monsters hit, damaging each, and continues down the lane. |
| **Fork** | On its first non-pierced hit, the projectile splits into two. One copy continues in the lane above and one in the lane below, from the same `x`. If an adjacent lane doesn't exist, that copy is lost. |
| **Chain N** | After a hit, redirects to the nearest unhit monster **within 2 tiles**, in any lane. This is adapted: PoE2's 6 m chain range would cover half the board. A monster can't be hit twice by the same chain. |
| **+N projectiles** | Extra copies fan out into adjacent lanes in order: +1 goes to the lane above, +2 to the lane below, +3 to the same lane, staggered 0.1 s. Like a Threepeater. Copies that would leave the board are re-assigned to the hero's own lane. |
| **Area-on-impact** | Explodes with radius `r` at the impact point. |

Example: a Lightning Arrow hero in lane 2 with Fork and +1 projectile fires two arrows, in lanes 2 and 1. Each forks on its first hit, so up to four lanes see arrows.

---

## 4. The damage pipeline

MvM uses PoE2's order exactly. A **hit** goes through steps 1–8, then the target's mitigation (§5). **Damage over time** (§6) skips accuracy, crit, armour, and block.

### 4.1 Base damage

| Skill kind | Base damage |
|---|---|
| **Attacks** | Weapon physical min–max (after local % increased physical and local quality), plus local added elemental/chaos, plus global "adds X–Y to Attacks". The sum is multiplied by the skill's **attack damage %** at its gem level. |
| **Spells** | Skill base damage per gem level, plus global "adds X–Y to Spells" × the skill's damage effectiveness (100% if unlisted). |

### 4.2 Conversion and "gained as extra"

1. Skill-inherent conversion applies first, then all other conversion. If total conversion from one type exceeds 100%, scale it down proportionally.
2. "Gained as extra Y" is computed from the post-conversion amount and added on top.
3. **PoE2 rule:** converted damage scales **only** with modifiers to its *final* type. Phys-converted-to-cold does not benefit from "increased physical". It also only inflicts the final type's ailments.

### 4.3 Increased and more

```
typeDamage = base[type] × (1 + Σ increased% applicable to (type, skill tags, weapon)) × Π (1 + more%)
```

"Applicable" means the stat matches the damage type, a skill tag (attack, spell, melee, projectile, area), or the weapon class.

### 4.4 Accuracy (attacks only)

Spells always hit.

```
chanceToHit = clamp(5%, 100%, (accuracy × 1.25) / (accuracy + evasion × 0.3))   // (verify) constants
```

- Use a plain RNG roll; PoE2's entropy smoothing is not needed in the prototype.
- PoE2's distance accuracy penalty is **cut**. On a 9-tile lane it would gut every bow (adapted).

### 4.5 Critical hits

```
critChance = clamp(0, 100%, baseCrit × (1 + Σ increasedCrit%))
critBonus  = 100% + Σ critDamageBonus%                     // +100% default: a crit deals 2x
```

- Attacks use the weapon's base crit; spells use the skill's listed base crit.

### 4.6 Hit roll output

A hit produces per-type damage `{phys, fire, cold, lightning, chaos}` plus an `isCrit` flag. The pre-mitigation value is kept for ailment magnitudes; bleed and poison use pre-mitigation damage.

---

## 5. Mitigation (the target's side)

Applied in this order.

### 5.1 Avoidance

1. **Evasion**: the attacker's chance-to-hit roll (§4.4). Spells and DoTs can't be evaded.
2. **Block**:

   | Rule | Value |
   |---|---|
   | Blockable hits | attack and spell hits; not DoTs, and not boss attacks flagged unblockable (red glow) |
   | Block cap | **50%** in PoE2, unlike PoE1's 75% (verify) |
   | What block stops | all damage from the hit, but its stun and freeze buildup still apply (PoE2) |
   | Heroes | block only with a shield |

### 5.2 Damage reduction

**Physical damage: armour**

```
physDR = min(90%, armour / (armour + 10 × physDamage))
```

- Armour is strong against many small hits, which suits walls versus Swarms.
- Armour Break lowers target armour. At 0 armour it is **Fully Broken** for 12 s, and non-player targets take 20% increased physical damage.
- Heroes break 3x armour against normal monsters and 2x against magic (PoE2's player rule).

**Elemental and chaos damage: resistances**

```
effectiveRes = min(resist, maxResist) − penetration      // maxResist default 75%; hard cap 90%
taken        = damage × (1 − effectiveRes)
```

- Penetration can't lower resistance below 0 (PoE2) (verify).
- Exposure lowers elemental resistances, by −20% for 4 s by default. Its effect is reduced on tougher monsters: 15% less on magic, 30% less on rare, 50% less on unique. Exposure *can* push resistance negative.
- **Monster resistances by area level** (MvM rule): white monsters have 0 base elemental resistances. Archetypes and affixes add resistance ([appendix-d](appendix-d-monsters-levels.md)).
- **Hero resistances** (MvM rule): heroes start at 0. This mirrors PoE2 Act 1, which has no resistance penalty, and makes resistance affixes immediately readable.

### 5.3 Damage-taken multipliers

```
taken × (1 + Σ increasedDamageTaken%)
```

Sources:

- Shock: 20% increased damage taken.
- Withered: 5% increased chaos damage taken per stack, up to 10 stacks.
- Fully Broken Armour: 20% increased physical damage taken.
- Curses: values in [appendix-b](appendix-b-heroes.md).

### 5.4 Energy shield, then life

- Energy shield absorbs damage before life.
- Chaos damage removes **2x** as much ES.
- Bleed and poison bypass ES and hit life directly.
- **ES recharge:** 12.5% of maximum ES per second, starting **4 s** after the last ES loss. Further loss resets the delay.

### 5.5 Thorns

When a melee attacker hits a hero that has thorns, the attacker takes thorns damage: a physical hit that can't crit and can't be evaded. Walls love it, and so does a PvZ Spikeweed-style design.

### 5.6 Death

- **Heroes** at 0 life are removed. Their tile becomes free immediately.
- **Monsters** at 0 life die. On death they:
  - drop loot (see [appendix-e](appendix-e-economy.md));
  - grant XP;
  - trigger on-death affixes such as explode or split.

---

## 6. Ailments, stun, and debuffs

The magnitude rules are PoE2's in-game definitions, quoted from the glossary.

- Monsters' **ailment threshold = their maximum life**.
- Heroes' ailment threshold = **half** their maximum life, which is the PoE2 player rule.
- Duration on monsters is the PoE2 "non-player" duration; duration on heroes is the "player" duration.

### 6.1 Damaging ailments

**Ignite** (fire)

- *Chance:* Fire hits add **Flammability**: 1% ignite chance per 5% of the target's ailment threshold dealt as fire. The hit then rolls against the total Flammability.
- *Magnitude:* 20% of the hit's fire damage per second.
- *Duration:* 4 s.
- *TD notes:* Ignited Ground uses 2 m, about 1.7 tiles.

**Bleeding** (physical)

- *Chance:* needs an explicit chance; damage doesn't contribute.
- *Magnitude:* 15% of pre-mitigation physical hit damage per second, **+100% while the target moves**.
- *Duration:* 5 s.
- *TD notes:* **Walking monsters bleed double.** Walls that stop monsters halve bleed damage. This is a real build tension.

**Poison** (chaos)

- *Chance:* needs an explicit chance.
- *Magnitude:* 20% of pre-mitigation physical + chaos hit damage per second.
- *Duration:* 2 s.
- *TD notes:* Stacks; each poison is separate.

All three bypass ES and can't be blocked or evaded.

### 6.2 Non-damaging elemental ailments

**Chill** (cold)

- *Trigger:* any cold hit can chill. The magnitude scales with damage relative to the ailment threshold, with a 30% minimum and a 50% default maximum. Chills below 30% are ignored.
- *Effect:* slows both walk and action speed.
- *Duration:* 8 s on monsters, 2 s on heroes.
- *TD notes:* The PvZ Snow Pea: a 50% chill halves walk and bite rate.

**Freeze** (cold)

- *Trigger:* cold hits build up freeze. Buildup = cold hit damage / ailment threshold, which the MvM prototype simplifies to a 0→100% meter. Freeze triggers at 100%.
- *Effect:* frozen targets can't move or act.
- *Duration:* 4 s.
- *TD notes:* The meter decays after 2 s without buildup (MvM custom simplification). Uniques take more buildup to fill.

**Shock** (lightning)

- *Trigger:* 1% chance per 4% of the ailment threshold dealt as lightning.
- *Effect:* 20% increased damage taken.
- *Duration:* 8 s on monsters, 4 s on heroes.
- *TD notes:* Strongest against the monster a wall is holding.

**Electrocute** (lightning)

- *Trigger:* buildup only from skills or supports that say they Electrocute.
- *Effect:* can't act or move.
- *Duration:* 5 s.

### 6.3 Stun

**Light stun**

- Chance = damage / target max life, up to 100% at 100% of max life. Chances below 15% become 0.
- Physical damage counts **50% more**. Hero melee counts **50% more** again, so physical melee counts 2.25x.
- Effect: interrupts the current action. A monster's next bite is delayed by 0.3 s; a hero's attack wind-up resets.

**Heavy stun** (monsters only)

- Each hit adds `damage / stunThreshold` to a stun bar, using the same 1.5x bonuses. The bar fills at 100%.
- Effect: **3 s** heavy stun (verify). The monster counts as immobilised, and the bar is harder to refill for 4 s afterwards (MvM rule: 50% less buildup).

**Primed for Stun**

- Monsters become Primed at **40% / 50% / 60% / 70%** heavy-stun buildup for normal / magic / rare / unique.
- **Crushing Blows** heavy-stun a Primed target instantly.

**Bosses** show the heavy-stun bar prominently. It is their burst window ([appendix-d](appendix-d-monsters-levels.md)).

### 6.4 Debuffs

| Debuff | Effect | Default duration |
|---|---|---|
| Exposure | −20% elemental resistance of one element (by source). Reduced on magic, rare, and unique monsters per §5.2. | 4 s |
| Armour Break | Removes X armour per hit. At 0, Fully Broken for 12 s with 20% increased physical damage taken. | — |
| Withered | 5% increased chaos damage taken per stack, up to 10 stacks | per source |
| Maim | 30% slower movement, 15% reduced evasion | 4 s |
| Hinder | 30% slower movement | 4 s |
| Blind | 20% less accuracy and evasion | 4 s |
| Curse | Per curse skill (appendix B). One curse per monster by default; a new curse replaces the oldest. | per skill |
| Mark | One mark per monster. Activation conditions per skill (appendix B). | per skill |
| Culling Strike | Kills at or below 35% / 20% / 10% / 5% life for normal / magic / rare / unique, checked before damage | — |

### 6.5 Recovery

| Effect | Rule |
|---|---|
| Life leech | Recovers a % of physical attack hit damage dealt, over 1 s. Only one leech instance at a time; all leech stops when life is full. Monster leech resistance is ignored in the prototype (adapted). |
| Life on kill | Flat life whenever this hero lands a killing blow. |
| Life regeneration | Flat per second and/or % of max life per second. |
| ES recharge | See §5.4. |

---

## 7. Leaks and the life pool

- The player has **20 life** per level. It refills on every level start.
- Leak costs by monster rarity:

  | Normal | Magic | Rare | Unique | Boss |
  |---|---|---|---|---|
  | 1 | 3 | 10 | 10 | 20, i.e. all of it |

- At 0 life the level is lost. Loot, gold, and XP already earned are kept ([gdd.md](gdd.md)).
- A leaked monster despawns and drops nothing.

---

## 8. Auras

| Kind | Scope | Stacking |
|---|---|---|
| **Global** (Heralds, Purities, Discipline, and other self-buff persistent skills) | Every hero on the board, while at least one copy of the aura hero is alive | The same aura from several copies applies **once**. If copies come from different roster slots with different stats, the strongest applies. Different auras stack. |
| **Positional** (Banners, Presences, `aura`-tagged skills) | Heroes, or monsters for debuff presences, within the aura's radius in tiles of a copy. **Presence radius: 1.5 tiles. Banner radius: 2.5 tiles.** Both are adapted (§1.1), measured with `hypot(dx, dLane)`. A Presence centred in lane 2 reaches lanes 1–3 near its own column; a Banner reaches ±2 lanes. | Same as global: per aura type, the strongest copy covering that hero or monster wins. |

- "Increased aura effect" scales the buff's numeric values.
- "Increased presence area" scales the radius only.
- Auras are recomputed whenever an aura hero is placed or dies. Positional coverage is cached per tile.

---

## 9. Stat vocabulary

This is the closed list of stats. Every hero, support, item mod, unique, passive node, and monster affix must use only these.

- **Local** stats live on an item and fold into that item's base properties.
- **Global** stats apply to the hero (all placed copies) or, for passives, to every hero.
- Exact PoE2 stat id mappings per mod live in the appendix that uses them (B, C, F). The patterns below show the family.

### 9.1 Offence: base damage

| MvM stat | Meaning | PoE2 stat id family |
|---|---|---|
| `local_added_{type}_damage` | Adds X–Y {physical, fire, cold, lightning, chaos} damage (weapon) | `local_minimum_added_{type}_damage`, `local_maximum_added_…` |
| `local_physical_damage_+%` | % increased physical damage (weapon) | `local_physical_damage_+%` |
| `local_attack_speed_+%` | % increased attack speed (weapon) | `local_attack_speed_+%` |
| `local_critical_strike_chance` | +X% to critical hit chance (weapon). PoE2 weapon crit affixes are flat additions to base crit. | `local_critical_strike_chance` family |
| `local_accuracy_rating` | + accuracy (weapon; flat) | `local_accuracy_rating` |
| `attack_added_{type}_damage` | Adds X–Y {type} damage to attacks | `attack_minimum_added_{type}_damage` … |
| `spell_added_{type}_damage` | Adds X–Y {type} damage to spells | `spell_minimum_added_{type}_damage` … |

### 9.2 Offence: scaling

| MvM stat | Meaning |
|---|---|
| `{type}_damage_+%` | % increased {physical, fire, cold, lightning, chaos, elemental} damage |
| `{tag}_damage_+%` | % increased {spell, attack, melee, projectile, area, damage over time} damage |
| `{weapon}_damage_+%` | % increased damage with {bow, crossbow, spear, mace, quarterstaff, wand, staff} |
| `more_damage_%` (supports only) | % more damage, optionally limited to a type or tag |
| `attack_speed_+%`, `cast_speed_+%` | global speed |
| `critical_strike_chance_+%`, `spell_base_critical_strike_chance` | crit chance |
| `critical_strike_multiplier_+` | + % critical damage bonus |
| `accuracy_rating`, `accuracy_rating_+%` | accuracy |
| `{element}_penetration_%`, `elemental_penetration_%` | resistance penetration |
| `physical_converted_to_{element}_%` | conversion |
| `damage_gained_as_{type}_%` | gained as extra {fire, cold, lightning, chaos} |

### 9.3 Offence: projectile and area

| MvM stat | Meaning |
|---|---|
| `additional_projectiles` | + number of projectiles (§3.4) |
| `pierce_count` | pierce +N |
| `chain_count` | chain +N |
| `projectiles_fork` | projectiles fork (flag) |
| `projectile_speed_+%` | cosmetic and travel time only |
| `area_of_effect_+%` | radius scales by `sqrt(1 + area%)`, as in PoE |
| `skill_effect_duration_+%` | duration |
| `cooldown_recovery_+%` | cooldown recovery rate (spells and cooldown skills) |

### 9.4 Offence: ailments and debuffs

| MvM stat | Meaning |
|---|---|
| `bleed_chance_%`, `poison_chance_%` | chance to inflict |
| `flammability_magnitude_+%` | % increased Flammability, i.e. ignite chance |
| `freeze_buildup_+%` | % increased freeze buildup |
| `chill_magnitude_+%` | % increased chill effect |
| `shock_chance_+%`, `shock_magnitude_+%` | shock chance and effect |
| `electrocute_buildup` | flag plus amount: this skill builds Electrocute |
| `ailment_magnitude_+%` | % increased magnitude of damaging ailments |
| `ailment_duration_+%` | % increased ailment duration |
| `stun_buildup_+%` | % increased stun buildup |
| `heavy_stun_buildup_vs_primed_+%` | buildup vs Primed enemies |
| `crushing_blows` | flag |
| `armour_break_on_hit`, `armour_break_+%` | break X armour; % increased armour break |
| `exposure_on_hit_{element}` | inflicts Exposure |
| `culling_strike` | flag |
| `curse_effect_+%`, `curse_area_+%` | curse scaling |

### 9.5 Sustain

| MvM stat | Meaning |
|---|---|
| `life_leech_from_physical_attack_damage_%` | life leech |
| `life_gained_on_kill` | flat life per kill |
| `life_regeneration_rate_per_second` | flat regen |
| `life_regeneration_rate_%_per_second` | % of max life regen |

### 9.6 Defence

| MvM stat | Meaning |
|---|---|
| `base_maximum_life`, `maximum_life_+%` | life |
| `armour`, `armour_+%`, `local_armour`, `local_armour_+%` | armour |
| `evasion`, `evasion_+%`, `local_evasion`, `local_evasion_+%` | evasion |
| `energy_shield`, `energy_shield_+%`, `local_energy_shield`, `local_energy_shield_+%` | energy shield |
| `local_hybrid_defence_+%` | e.g. % increased armour and evasion (local) |
| `energy_shield_recharge_start_faster_%` | faster ES recharge start |
| `local_block_chance_%`, `block_chance_+%` | block |
| `{type}_resistance_%` | fire, cold, lightning, chaos |
| `all_elemental_resistances_%` | all elemental resistances |
| `maximum_{element}_resistance_%` | rare; capped at 90% |
| `stun_threshold`, `stun_threshold_+%`, `ailment_threshold_+%`, `self_ailment_duration_-%` | stun and ailment protection |
| `thorns_physical_damage` | X–Y thorns (§5.5) |

### 9.7 Attributes, Spirit, auras, economy, loot

| MvM stat | Meaning |
|---|---|
| `strength`, `dexterity`, `intelligence`, `all_attributes` | attributes (§2.1) |
| `attribute_choice` | passive-tree attribute node: +5 to an attribute the player picks ([appendix F](appendix-f-passives.md)) |
| `keystone_*` | one flag per keystone (Resolute Technique, Crimson Assault, Chaos Inoculation, Eldritch Battery); effects are in [appendix F](appendix-f-passives.md) |
| `spirit` | Spirit: drives acolyte mana output ([appendix-e](appendix-e-economy.md)) |
| `aura_effect_+%`, `presence_area_+%` | aura scaling |
| `team_<stat>` | **MvM custom** wrapper: summed into the team stat sheet (§2.1) and applied as `<stat>` to every hero. Only the stats in [appendix C §C.3.8](appendix-c-items.md) take it. |
| `allies_in_presence: <stat>` | Wrapper: applies `<stat>` to *other* heroes inside this hero's Presence radius (1.5 tiles, §8). The inner stat must itself be in this vocabulary. Same non-stacking rule as positional auras (§8). Comes from sceptre affixes and Fixation of Yix ([appendix C](appendix-c-items.md)). |
| `unique_*` | Unique-only mechanic flags, e.g. cull on block or unlimited poison stacks. The list and each flag's fallback are in [appendix C §C.4.4](appendix-c-items.md). |
| `acolyte_mana_generated_+%` | **MvM custom**: increased mana per orb |
| `acolyte_mana_interval_-%` | **MvM custom**: faster orb interval |
| `acolyte_mana_per_orb` | **MvM custom**: + flat mana per orb |
| `item_rarity_+%` | % increased rarity of items dropped by monsters **this hero kills** (adapted from "items found") |
| `gold_found_+%` | % increased gold dropped by monsters this hero kills |

### 9.8 Monster-only

| MvM stat | Meaning |
|---|---|
| `monster_movement_speed_+%` | walk speed |
| `monster_life_+%`, `monster_damage_+%` | rarity and affix scaling |
| `monster_extra_{element}_damage_%` | adds X% of physical as extra {fire, cold, lightning, chaos} |
| `monster_physical_damage_converted_to_{element}_%` | **MvM custom**: converts X% of the monster's physical hit damage to {fire, cold, lightning, chaos}. Comes from native archetype elements and the biome element ([appendix D §2.3](appendix-d-monsters-levels.md)). Applied before "gained as extra". |
| `monster_{type}_resistance_%` | resistances |
| `monster_armour_+%`, `monster_evasion_+%`, `monster_energy_shield` | defences |
| `monster_block_frontal_projectiles_%` | **MvM custom**: Shieldbearer front block vs projectiles only |
| `monster_aura_{effect}` | buffs nearby monsters (Shaman, rare affixes) |
| `monster_on_death_{effect}` | explode, split, corrupted ground |
| `cannot_be_{ailment}` | ailment immunity flags |

### 9.9 Deliberately cut

These PoE2 stats exist in the data but are **not** in MvM. Strip them from imported pools, or swap them per the importing appendix.

- Mana: max mana, mana regen, mana cost, mana leech, mana on kill.
- Movement speed (heroes), dodge roll, sprint.
- Flasks, charms, life recovery from flasks.
- Minions, totems, companions, shapeshift.
- Weapon sets, weapon swap.
- Light radius; deflection rating; parry and active block.
- Sockets, runes, soul cores, augments.
- Rage, Glory, combo, Infusion, Remnants, Charges (frenzy, power, endurance).

Charges and Rage are the most tempting to add back after the demo.

---

## 10. Worked hit example

**Setup.** The level 17 Rare Lightning Spear from [appendix B §3](appendix-b-heroes.md#3-worked-example-level-17-rare-lightning-spear) (gem level 5.75) hits a **magic Plated Skeleton** at area level 16.

- **Supports:** Elemental Armament II, Lightning Attunement, Rapid Attacks I.
- **Weapon:** a magic Winged Spear, base 12–22 physical, with the T3 "Snapping" prefix rolled at 2–25 lightning (local) from [appendix C](appendix-c-items.md).
- **Passives:** +30% increased lightning damage.

| Step | Physical | Lightning |
|---|---|---|
| 1. Base: weapon × 165.25% attack damage at gem 5.75 | 19.8–36.4 | 3.3–41.3 |
| 2. Skill conversion: 80% of physical becomes lightning | 4.0–7.3 | 19.2–70.4 |
| 3. Lightning Attunement: +25% of *all* damage as extra lightning | 4.0–7.3 | 25.0–89.8 |
| 4. Increased: +30% lightning (passives). There are no physical mods. | 4.0–7.3 | 32.4–116.8 |
| 5. More: Elemental Armament II, 25% more elemental attack damage | 4.0–7.3 | **40.6–146.0** |
| 6. Crit roll: 5% base. Suppose it misses. | — | — |
| 7. Accuracy: 376 (from 47 Dex) vs evasion 128 × 0.3 archetype = 38. `376 × 1.25 / (376 + 38 × 0.3)` > 100%, so it always hits. | — | — |
| 8. Mitigation: armour 60 × 14 (Plated) = 840 vs a 5.6 physical hit → DR capped at 90%. Lightning resistance 0. | **~0.6** | **~93** (avg) |

**The plate barely matters.** The hit lands for ~94 average.

- The same weapon on an unconverted physical hero would hit for ~28 physical before armour.
- Armour then takes about 75% (`840 / (840 + 280)`), leaving **~7**.
- Conversion is a 13x upgrade against this archetype. That's exactly the kind of build discovery the demo exists to test.

**Shock barely happens.**

- The monster's ailment threshold is its max life: 158 × 1.8 × 2.0 (magic) × 4.5 = 2,560.
- A 93-lightning hit is 3.6% of that, so the base shock chance is 0.9%. The spear's built-in "100% more shock chance" doubles it to ~1.8%.
- Shocking tanky monsters needs real investment, such as a Shock support or shock-chance affixes. Players can discover that too.

**Time to kill.**

- About 27 spear hits, before the chain bolts. At 0.59 attacks/s that is ~46 s.
- For a *magic, heavy-armour* monster with mid-demo gear, that's in line with PvZ, where a Buckethead takes ~65 peas.
