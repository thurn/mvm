# Appendix F: Focuses & Passive Tree

This appendix defines the three **focuses** (MvM's classes) and the **passive tree** they share. The tree is a curated piece of the real PoE2 tree.

- **Machine-readable tree:** [`docs/data/passive-subtree.json`](data/passive-subtree.json). It holds every node, edge, stat line, region, and the three sample builds (§2.7 has the schema).
- **Source data:** repoe-fork/poe2 export 4.5.5.2 (PoE2 0.5.x):
  - `data/passive_skill_trees/Default.json`, the full tree;
  - `data/stat_translations/passive_skill_stat_descriptions.json`, then `stat_descriptions.json`, for the readable stat text;
  - `characters.json`, for class base stats.
- **Related:** [gdd.md §12](gdd.md#12-focuses-and-the-passive-tree), [appendix A](appendix-a-combat.md) (stat vocabulary, attribute rules), [appendix B](appendix-b-heroes.md) (starter kits), [appendix E](appendix-e-economy.md) (XP, gold, acolyte formula).

**At a glance**

| Thing | Value |
|---|---|
| Focuses | Warrior, Ranger, Sorceress |
| Start node ids | Warrior **47175**, Ranger **50459**, Sorceress **54447** |
| Sub-tree size | **225 nodes**, 229 edges, one connected ring |
| Nodes per region | Warrior 62, Ranger 60, Sorceress 68, Bridges 35 |
| Notables per region | 15, 15, 15, 12 (57 total) |
| Keystones | 4: Resolute Technique, Crimson Assault, Chaos Inoculation, Eldritch Battery (**adapted**) |
| Node status | 167 kept, 44 adapted, 11 replaced, plus 3 starts |
| Passive points | 37 by demo end ([appendix E §6.1](appendix-e-economy.md)); sample builds use 33 |
| Respec | **Free in the demo** (recommended, §5.3) |

---

## 1. Focuses

A focus picks two things: where you start on the tree, and your starter kit. Any hero can still go in any roster slot. Passives are global, so they modify every hero and the player spell.

| Focus | PoE2 class (`characters.json`) | Tree start node | Base Str / Dex / Int | Fantasy |
|---|---|---|---|---|
| **Warrior** | Warrior, `Metadata/Characters/Str/StrFourb` | **47175** (`marauder594`, root "MARAUDER") at (−1271, 733) | 15 / 7 / 7 | Melee walls, armour, slams, stun |
| **Ranger** | Ranger, `Metadata/Characters/Dex/DexFour` | **50459** (`ranger596`, root "RANGER") at (1275, 736) | 7 / 15 / 7 | Bow and spear projectiles, evasion, crit |
| **Sorceress** | Sorceress, `Metadata/Characters/Int/IntFourb` | **54447** (`witch595`, root "WITCH") at (0, −1491) | 7 / 7 / 15 | Elemental spells, energy shield, ailments |

All three classes also have base life 16 and base mana 30 in `characters.json`. Mana is cut as a hero stat (brief).

**How the starts were verified.** PoE2 0.5 has twelve classes but only six start nodes, and the start nodes still carry PoE1 names. Each class's ascendancy start nodes link to its real start:

- `Warrior1`–`Warrior3` link to node 47175. The Warrior shares the Marauder start.
- `Ranger1`–`Ranger3` link to node 50459. The Huntress also starts here.
- `Sorceress1`–`Sorceress3` link to node 54447. The Sorceress shares the Witch start.

**Base attributes in MvM: reference only.** The brief says hero attributes come from the gem's profile, hero level, items, and passives. The focus adds none. If the team wants a stronger focus identity later, the simplest knob is to grant the class's 15/7/7 to every hero. It is off by default.

### 1.1 Warrior

**Fantasy:** hold the lane. Strength walls that soak, slam, and stun.

**How the start biases play** (points from the start; the start itself is free):

| Points | What's there |
|---|---|
| 1–3 | Melee Damage, Armour, Stun Buildup, Stun Threshold, Life Regeneration |
| 5 | **Brutal** (+10 Str, melee damage, stun buildup) or **Relentless** (+10 Str, 0.5% regen, armour) |
| 7 | **Smash**, **Sturdy Metal** (armour on the Armor-slot item), **Reverberating Impact** (Armour Break), **Defender's Resolve** (block), **Titan's Determination**, **Devastation** (area) |
| 8–9 | **Burn Away**, **Burning Strikes**: a fire-slam branch |
| 10–11 | **Unstoppable Barrier**, **Perpetual Freeze**, **Tides of Change**, **Beef** (+25 Str), **Hard to Kill** |
| 13 | Keystone **Resolute Technique** |

- **Bridges:** to the Ranger through armour/evasion hybrids (Battle-hardened at 9). To the Sorceress through Relentless Vindicator (9) and the aura nodes (11–12).
- **What changes on the lawn:** every hero gets tankier, since each Strength point is +2 life and walls multiply it. Shield heroes block more. Slam and area heroes hit wider and stun sooner.

Starter kit: see appendix-b-heroes.md

### 1.2 Ranger

**Fantasy:** the back line. Fast, accurate projectile heroes with evasion and crit spikes.

| Points | What's there |
|---|---|
| 1–3 | Projectile Damage, Evasion, Attack Speed |
| 5 | **Honed Instincts** (attack speed, Dex, projectile speed) or **Blur** (Dex, evasion) |
| 7 | **Clean Shot**, **Eagle Eye**, **Vile Wounds**, **Catlike Agility**, **Cautious Concoctions** (the cheapest loot notable: rarity and gold) |
| 8–9 | **Heavy Ammunition**, **Careful Aim** |
| 10–13 | **Taste for Blood**, **Mystic Stance**, **Volatile Catalyst**, **Essence of the Mountain**, then the crit pair **Dispatch Foes** (12) and **Locked On** (13) |
| 12 | Keystone **Crimson Assault** |

- **Bridges:** to the Warrior through Remorseless (9). To the Sorceress through Step Like Mist (9), Life from Death and Mindful Awareness (11).
- **What changes on the lawn:** each Dexterity point is +8 accuracy on every hero. Projectile heroes hit harder and faster, and the crit cluster pays off for bows and spears.

Starter kit: see appendix-b-heroes.md

### 1.3 Sorceress

**Fantasy:** the elemental caster who also runs the economy. ES-shielded heroes, ailments everywhere, acolytes that print mana.

| Points | What's there |
|---|---|
| 1–3 | Spell Damage, Energy Shield, ES Delay, Mana Regeneration (**replaced**: acolyte mana) |
| 5 | **Raw Power** (+10 Int, spell damage) or **Pure Energy** (+10 Int, ES) |
| 7 | **Open Mind** (acolytes), **Practiced Signs** (cast speed), **Dampening Shield**, **Rapid Recharge** |
| 8 | **Elemental Force**, **Affliction Enforcer**, **Mana Blessing** (Spirit plus acolytes) |
| 9–11 | **Infused Flesh**, **Critical Overload**, **Breath of Ice**, **Essence of the Storm**, **Crashing Wave**, **Flow State** |
| 14 / 16 | Keystones **Eldritch Battery** (economy, **adapted**) and **Chaos Inoculation** |

- **Bridges:** to the Ranger through Flow Like Water (9). To the Warrior through Devoted Protector (9) and Bolstering Presence (12).
- **What changes on the lawn:** each 5 Intelligence is +1% ES on every hero ([appendix A §2.1](appendix-a-combat.md)). Spells and the player spell scale. This is the only cheap acolyte-economy cluster.

Starter kit: see appendix-b-heroes.md

---

## 2. Sub-tree extraction method

Everything below can be re-run from the raw export. The scratch scripts were throwaway; this section is the spec.

### 2.1 Inputs and filters

1. Load `Default.json`. It has 5,152 `passives` and 1,623 `groups`.
2. **Position** of each node, in tree units (y grows downward):

   ```
   angle = 2π × position_clockwise / skills_per_orbit[radius]
   x = group.x + orbit_radii[radius] × sin(angle)
   y = group.y − orbit_radii[radius] × cos(angle)
   ```

3. **Edges:** each group passive's `connections` list, made undirected.
4. **Drop** ascendancy nodes (they have an `ascendancy` field) and the 368 icon-only art nodes (`is_icon_only`, the "Mastery" icons). That leaves 4,115 main-tree nodes.
5. **Block** the other three class roots. You can't path through another class's start, as in PoE2.
6. **Stat text:** look each stat id up in `passive_skill_stat_descriptions.json` first, then `stat_descriptions.json`.

### 2.2 Geometry: where the starts really are

The six class roots sit on a ring of radius about 1,470 units, 60° apart.

| Root | Node | Position | Where | Focus |
|---|---|---|---|---|
| WITCH | 54447 | (0, −1491) | top | **Sorceress** |
| SIX (Shadow) | 44683 | (1270, −729) | upper right | — |
| RANGER | 50459 | (1275, 736) | lower right | **Ranger** |
| DUELIST | 50986 | (2, 1470) | bottom | — |
| MARAUDER | 47175 | (−1271, 733) | lower left | **Warrior** |
| TEMPLAR | 61525 | (−1245, −729) | upper left | — |

The three MvM starts are every other vertex, so every pair is the same distance apart:

| Pair | Straight line | Graph steps | Hybrid root in between | Shortest paths |
|---|---|---|---|---|
| Warrior–Ranger | 2,546 | 22 | Duelist | 2 |
| Ranger–Sorceress | 2,565 | 22 | Shadow | 3 |
| Warrior–Sorceress | 2,561 | 22 | Templar | 4 |

Each focus is also exactly 12 steps from its two neighbouring hybrid roots.

**Decision: all three bridges are in.** No pair is "more adjacent" than another, so Warrior–Sorceress connects too, and the sub-tree is a ring.

- Leaving a bridge out would give one focus a dead end that the data doesn't justify.
- It is cheap: all three bridges together are 35 nodes.
- The Warrior–Sorceress bridge (Templar side) holds the aura nodes, Aura Effect and Bolstering Presence, which aura heroes need.

### 2.3 Algorithm

| Parameter | Value |
|---|---|
| Core radius | 3 steps |
| Notables per focus region | 15 |
| Max notable distance | 11 steps (forced picks may go further) |
| Unsupported weight per stat line | keep 0, adapt 0.25, replace or drop 1 |
| Penalty multiplier | 3 |

1. **BFS** from each start to get `dW`, `dR`, `dS` for every node.
2. **Core:** every node within 3 steps of a start (13 per start).
3. **Bridges:**
   - For each pair, list every shortest path (all are 22 steps long).
   - Keep the paths that contain at least one notable: 1 of 2 for Warrior–Ranger, 2 of 3 for Ranger–Sorceress, 3 of 4 for Warrior–Sorceress. Take the union.
   - Add any notable one detour step off a bridge midpoint (`da + db ≤ 24`, both ≥ 7, `|da − db| ≤ 2`) with its BFS path. Only Bolstering Presence qualifies.
4. **Focus notables, 15 per start:**
   - Candidates are notables strictly closer to this start than to the other two, within 11 steps, and not on a bridge.
   - Notables already selected count first, then the forced picks below.
   - Then add greedily: the lowest `new nodes needed + 3 × unsupported fraction` wins. Ties go to the lower distance, then the lower node id.
   - Each pick adds its BFS path. At each step back, prefer a predecessor that is already selected, then the lowest id.
5. **Keystones:** add the BFS path from the owning start to each of the four keystones (§4).
6. **Edges:** keep every original edge whose two ends are both selected. 225 nodes and 229 edges means a few small loops survive.
7. **Regions:** bridge nodes at least 7 steps from both ends of their bridge form the Bridges region. Every other node joins its nearest start. There are no ties.
8. **Map stats** (§2.5) and assign a status (§2.4).
9. **Verify:**
   - The graph is connected from 47175.
   - Every edge is symmetric.
   - Every MvM stat id is in [appendix A §9](appendix-a-combat.md#9-stat-vocabulary) or listed under Deviations.

**Forced picks, and why**

| Focus | Forced notables | Why |
|---|---|---|
| Warrior | Beef (25482), Burning Strikes (6544) | Iconic Strength; a fire-slam option |
| Ranger | Cautious Concoctions (44527), Catlike Agility (20831), Dispatch Foes (58939, 12 steps), Locked On (56999, 13 steps) | A loot node; evasion; the real tree puts crit 10–13 steps out, which the brief's crit fantasy needs |
| Sorceress | Open Mind (59636), Mana Blessing (61027) | The acolyte economy path |

**What the pruning skipped.** The greedy step passed over notables that are mostly cut mechanics, even when they were close:

- Warrior: Price of Freedom and Blood Rush (mana costs to life), Grit and Flare (Endurance Charges), Ancestral Reach and Carved Earth (totems).
- Ranger: Combat Alchemy (flasks), Savagery (Frenzy Charges), Siphon (mana leech), Pin and Run (Pin), Consistent Intake, Flashy Parrying, and Counterstancing (parry), Master Fletching (quivers).
- Sorceress: Principal Infusion (Infusion), Arcane Mixtures (mana flasks), Emboldening Lead, Empowering Remains, and Gravedigger (minions), Efficient Casting and Efficient Killing (mana).

Nodes that had to stay for connectivity were **replaced** instead, such as jewel sockets, a flask small node, Movement Speed, and Life Recoup.

### 2.4 Status definitions

| Status | Meaning | Count |
|---|---|---|
| **kept** | Every line is a vocabulary stat with the PoE2 value. Splitting one PoE2 line into two MvM stats still counts as kept, e.g. "Armour and Evasion". | 167 |
| **adapted** | At least one line was re-scoped, de-conditioned, or swapped, and the node keeps its identity. | 44 |
| **replaced** | Every original line was a cut mechanic and got swapped by the rules below. | 11 |

### 2.5 Stat mapping and the replacement rule

**Replacement rule:** swap an unsupported line for the **nearest supported stat of similar value**. Keep the node where it is so the graph stays connected. When a node has nothing left to say, it inherits a stat that fits its neighbourhood.

**Conditional rule:** MvM's vocabulary has no conditions. Any "if / while / against X" line becomes **unconditional at half value**, rounded half up.

| PoE2 stat family | MvM result | Ratio | Example in the tree |
|---|---|---|---|
| Mana regeneration rate | `acolyte_mana_generated_+%` (**MvM custom** stat) | 50% | Open Mind 25% → 13%; small Mana Regeneration 10% → 5% |
| Maximum mana, flat | `spirit` | 50% | Mana Blessing +20 mana → +10 Spirit |
| Movement speed | `maximum_life_+%` | 1:1 | Blur 4% → 4% increased maximum Life |
| Recoup | `maximum_life_+%` | 50% | Infused Flesh 8% → 4% |
| Life flask recovery rate | `life_regeneration_rate_%_per_second` | 40% → 0.2%/s | Hard to Kill |
| Flask charges gained / flask duration | `item_rarity_+%` / `gold_found_+%` | 1:1 | Cautious Concoctions → 15% rarity, 15% gold |
| Jewel socket | `item_rarity_+%` 8 | — | the 2 sockets on keystone paths |
| Conditional damage, crit, stun, threshold | the same stat, unconditional | 50% | Smash: 40% vs Heavy Stunned → 20% melee damage |
| "Allies in your Presence" buffs | global (passives already reach every hero) | 1:1 | — |
| Skill Speed | attack speed + cast speed | 1:1 | Flow State |
| Attack-only or spell-only area, crit, stun | broadened to the general stat | 1:1 | Devastation, Critical Overload, Locked On |
| Ignite magnitude | `ailment_magnitude_+%` | 1:1 | Burn Away |
| Immobilisation buildup | stun buildup + freeze buildup | 1:1 | Radial Force |
| Threshold "equal to X% of max ES" | `% increased` threshold | 1:1 | Dampening Shield |
| ES recharge rate | faster ES recharge start | 1:1 | Rapid Recharge (12% + 12% → 24%) |
| Slowing potency on you | `self_ailment_duration_-%` | 1:1 | Unstoppable Barrier |
| Chance to pierce | projectile damage | ×⅔ | Clean Shot 15% → 10% |
| "Recover X% of max life on kill" | flat life on kill | 4 life per 1% | Life from Death → 12 |
| Heavy-stun decay on you | +15% stun threshold | — | Defender's Resolve (heroes are never heavy-stunned) |
| Crit damage taken | +10% armour, +10% evasion | — | Battle-hardened |
| Armour applies to elemental damage | +5% all elemental resistances | — | Devoted Protector |
| "Increased Damage" (generic) | physical + elemental + chaos | 1:1 | Relentless Vindicator |
| Movement-skill penalty | dropped | — | Catlike Agility's minor line |

Same-stat results inside one node are summed. Smash, for example, shows one "40% increased Melee Damage" line.

### 2.6 Attribute nodes

PoE2 "Attribute" nodes (`display_passive_attribute_text`) read "+5 to any Attribute", and you choose when you allocate. The sub-tree has **70** of them.

**MvM rule:**

- When you allocate one, a small picker asks for **Str, Dex, or Int**. The default highlight is the focus attribute.
- The choice grants **+5 of that attribute to every hero**:
  - Str: +10 life.
  - Dex: +40 accuracy.
  - Int: +1% maximum ES.
- Changing the pick later costs **0.5×** the per-point respec price, which is PoE2's rule. It is free while respec is free (§5.3).
- The node shows its letter (S / D / I) once chosen.

In the JSON, attribute nodes have `"type": "attribute"` and a pseudo-stat `{"id": "attribute_choice", "value": 5, "options": [...]}`.

### 2.7 JSON schema (`docs/data/passive-subtree.json`)

```jsonc
{
  "meta": { "source": {...}, "method": {...}, "counts": {...},
            "mvm_stats_used": [...], "mvm_stats_not_in_appendix_a": [...] },
  "starts": { "warrior": { "node": 47175, "poe2_root": "MARAUDER", "x": -1271.2, "y": 733.1,
                           "base_attributes": { "strength": 15, "dexterity": 7, "intelligence": 7 } }, ... },
  "rules": { "attribute_node": "...", "respec_gold_per_point_by_player_level": {...}, ... },
  "keystones": [44017, 9085, 56349, 57513],
  "sample_builds": [ { "focus": "warrior", "points": 33, "allocated": [...], "totals": {...} }, ... ],
  "nodes": [ {
    "id": 45363,                         // PoE2 passive hash (stable key)
    "poe2_id": "melee55",                // PoE2 string id
    "name": "Smash",
    "type": "notable",                   // start | small | notable | keystone | attribute
    "region": "warrior",                 // warrior | ranger | sorceress | bridge
    "bridge": null,                      // "warrior-ranger" etc. for bridge nodes
    "x": -3810.9, "y": 1066.8, "group": 556,
    "connections": [58528],              // sub-tree neighbours only, symmetric
    "dist": { "warrior": 7, "ranger": 23, "sorceress": 21 },   // full-tree BFS steps
    "poe2_stats": { "melee_damage_+%": 20, "melee_damage_+%_vs_heavy_stunned_enemies": 40 },
    "poe2_text": ["20% increased Melee Damage", "40% increased Melee Damage against Heavy Stunned enemies"],
    "mvm_stats": [ { "id": "melee_damage_+%", "value": 40 } ],
    "mvm_text": ["40% increased Melee Damage"],
    "status": "adapted",                 // kept | adapted | replaced | start
    "note": "melee_damage_+%_vs_heavy_stunned_enemies: condition removed, value halved"
  } ]
}
```

---

## 3. Node tables

How to read these:

- **Pts W/R/S** is the number of points needed to allocate the node from the Warrior, Ranger, or Sorceress start, inside the sub-tree. The start itself is free.
- Notables and keystones are **bold**. Rows run keystone, then notables, then small nodes, each nearest first.
- Attribute nodes are folded into **one row per region** that lists their ids. The JSON has them individually.
- PoE2 text is verbatim from the export, with glossary markup stripped.

### 3.1 Warrior region

62 nodes: 15 notable, 1 keystone, 27 small, 18 attribute, 1 start. Status: 46 kept, 14 adapted, 1 replaced.

| Node id | Name | Type | PoE2 original | MvM | Status | Pts W/R/S |
|---|---|---|---|---|---|---|
| 47175 | MARAUDER | start | class start (MARAUDER root) | free; the focus starts here | - | 0 / 22 / 22 |
| 44017 | **Resolute Technique** | keystone | Accuracy Rating is Doubled; Never deal Critical Hits | Accuracy Rating is Doubled; Never deal Critical Hits | kept | 13 / 35 / 27 |
| 5710 | **Brutal** | notable | +10 to Strength; 10% increased Stun Buildup; 16% increased Melee Damage | +10 to Strength; 10% increased Stun Buildup; 16% increased Melee Damage | kept | 5 / 27 / 19 |
| 7721 | **Relentless** | notable | +10 to Strength; Regenerate 0.5% of maximum Life per second; 15% increased Armour | +10 to Strength; Regenerate 0.5% of maximum Life per second; 15% increased Armour | kept | 5 / 19 / 27 |
| 32416 | **Sturdy Metal** | notable | 80% increased Armour from Equipped Body Armour | 80% increased Armour from the equipped Armor-slot item | adapted | 7 / 29 / 21 |
| 45363 | **Smash** | notable | 20% increased Melee Damage; 40% increased Melee Damage against Heavy Stunned enemies | 40% increased Melee Damage | adapted | 7 / 29 / 21 |
| 48006 | **Devastation** | notable | 15% increased Attack Area Damage; 12% increased Area of Effect for Attacks | 15% increased Area Damage; 12% increased Area of Effect | adapted | 7 / 19 / 29 |
| 59767 | **Reverberating Impact** | notable | Break 25% increased Armour; 12% increased Area of Effect for Attacks | Break 25% increased Armour; 12% increased Area of Effect | adapted | 7 / 29 / 21 |
| 62732 | **Titan's Determination** | notable | 20% increased Life Regeneration Rate while moving; 25% increased Stun Threshold | Regenerate 0.1% of maximum Life per second; 25% increased Stun Threshold | adapted | 7 / 21 / 29 |
| 64327 | **Defender's Resolve** | notable | 12% increased Block chance; Your Heavy Stun buildup empties 50% faster | 12% increased Block chance; 15% increased Stun Threshold | adapted | 7 / 21 / 29 |
| 53294 | **Burn Away** | notable | 10% increased Ignite Magnitude; Damage Penetrates 10% Fire Resistance; 15% increased Fire Damage | 10% increased Magnitude of Damaging Ailments; Damage Penetrates 10% Fire Resistance; 15% increased Fire Damage | adapted | 8 / 30 / 20 |
| 6544 | **Burning Strikes** | notable | Gain 12% of Physical Damage as Extra Fire Damage | Gain 12% of Physical Damage as Extra Fire Damage | kept | 9 / 31 / 23 |
| 2863 | **Perpetual Freeze** | notable | 15% increased Chill and Freeze Duration on Enemies; 15% increased Magnitude of Chill you inflict; 20% increased Freeze Buildup | 15% increased Ailment Duration; 15% increased Magnitude of Chill you inflict; 20% increased Freeze Buildup | adapted | 10 / 32 / 18 |
| 33978 | **Unstoppable Barrier** | notable | 15% reduced Slowing Potency of Debuffs on You; 10% increased Block chance | 15% reduced Duration of Ailments on You; 10% increased Block chance | adapted | 10 / 32 / 24 |
| 42813 | **Tides of Change** | notable | 25% increased Skill Effect Duration | 25% increased Skill Effect Duration | kept | 10 / 32 / 24 |
| 25482 | **Beef** | notable | +25 to Strength | +25 to Strength | kept | 11 / 33 / 25 |
| 50609 | **Hard to Kill** | notable | 40% increased Flask Life Recovery rate; Regenerate 0.75% of maximum Life per second | Regenerate 0.95% of maximum Life per second | adapted | 11 / 15 / 33 |
| 3936 | Melee Damage | small | 10% increased Melee Damage | 10% increased Melee Damage | kept | 1 / 23 / 21 |
| 38646 | Armour | small | +20 to Armour | +20 to Armour | kept | 1 / 21 / 23 |
| 1913 | Armour | small | +20 to Armour | +20 to Armour | kept | 2 / 22 / 24 |
| 46325 | Melee Damage | small | 10% increased Melee Damage | 10% increased Melee Damage | kept | 2 / 24 / 22 |
| 4665 | Life Regeneration | small | Regenerate 0.2% of maximum Life per second | Regenerate 0.2% of maximum Life per second | kept | 3 / 23 / 25 |
| 33556 | Melee Damage | small | 8% increased Melee Damage | 8% increased Melee Damage | kept | 3 / 25 / 23 |
| 36709 | Stun Threshold | small | 12% increased Stun Threshold | 12% increased Stun Threshold | kept | 3 / 23 / 25 |
| 39581 | Stun Buildup | small | 15% increased Stun Buildup | 15% increased Stun Buildup | kept | 3 / 25 / 23 |
| 6529 | Armour | small | 15% increased Armour | 15% increased Armour | kept | 6 / 28 / 20 |
| 18629 | Block | small | 5% increased Block chance | 5% increased Block chance | kept | 6 / 20 / 28 |
| 18742 | Stun Threshold | small | 12% increased Stun Threshold | 12% increased Stun Threshold | kept | 6 / 20 / 28 |
| 51248 | Fire Damage | small | 10% increased Fire Damage | 10% increased Fire Damage | kept | 6 / 28 / 18 |
| 53443 | Area Damage | small | 10% increased Attack Area Damage | 10% increased Area Damage | adapted | 6 / 28 / 20 |
| 55478 | Attack Area Damage and Area | small | 6% increased Attack Area Damage; 4% increased Area of Effect for Attacks | 6% increased Area Damage; 4% increased Area of Effect | adapted | 6 / 18 / 28 |
| 58528 | Melee Damage | small | 10% increased Melee Damage | 10% increased Melee Damage | kept | 6 / 28 / 20 |
| 39594 | Fire Penetration | small | Damage Penetrates 6% Fire Resistance | Damage Penetrates 6% Fire Resistance | kept | 7 / 29 / 19 |
| 51369 | Damage against Burning Enemies | small | 14% increased Damage with Hits against Burning Enemies | 7% increased Fire Damage | adapted | 7 / 29 / 21 |
| 5692 | Chill Magnitude | small | 12% increased Magnitude of Chill you inflict | 12% increased Magnitude of Chill you inflict | kept | 8 / 30 / 16 |
| 31419 | Increased Duration | small | 10% increased Skill Effect Duration | 10% increased Skill Effect Duration | kept | 8 / 30 / 22 |
| 36163 | Block | small | 5% increased Block chance | 5% increased Block chance | kept | 8 / 30 / 22 |
| 56061 | Damage against Burning Enemies | small | 14% increased Damage with Hits against Burning Enemies | 7% increased Fire Damage | adapted | 8 / 30 / 22 |
| 30390 | Block | small | 5% increased Block chance | 5% increased Block chance | kept | 9 / 31 / 23 |
| 35708 | Chill Magnitude | small | 12% increased Magnitude of Chill you inflict | 12% increased Magnitude of Chill you inflict | kept | 9 / 31 / 17 |
| 35787 | Increased Duration | small | 10% increased Skill Effect Duration | 10% increased Skill Effect Duration | kept | 9 / 31 / 23 |
| 14926 | Life Regeneration | small | Regenerate 0.2% of maximum Life per second | Regenerate 0.2% of maximum Life per second | kept | 10 / 14 / 32 |
| 26725 | [Jewel] Socket | small | Jewel Socket | 8% increased Rarity of Items found | replaced | 10 / 32 / 24 |
| 54485 | Strength | small | +8 to Strength | +8 to Strength | kept | 10 / 32 / 24 |
| 13397, 23570, 1207, 41031, 38323, 54232, 6015, 16168, 22928, 25374, 27373, 35426, 16725, 53405, 54811, 57703, 52298, 4527 | Attribute (x18) | attribute | +5 to any Attribute | +5 to Str, Dex or Int (player picks) | kept | varies |

### 3.2 Ranger region

60 nodes: 15 notable, 1 keystone, 27 small, 16 attribute, 1 start. Status: 45 kept, 11 adapted, 3 replaced.

| Node id | Name | Type | PoE2 original | MvM | Status | Pts W/R/S |
|---|---|---|---|---|---|---|
| 50459 | RANGER | start | class start (RANGER root) | free; the focus starts here | - | 22 / 0 / 22 |
| 9085 | **Crimson Assault** | keystone | Bleeding you inflict is Aggravated; Base Bleeding Duration is 1 second; 50% more Magnitude of Bleeding you inflict | Bleeding you inflict is Aggravated (always counts the monster as moving: +100% extra damage, even against monsters held by a wall); Base Bleeding Duration is 1 second; 50% more Magnitude of Bleeding you inflict | kept | 22 / 12 / 34 |
| 28992 | **Honed Instincts** | notable | 8% increased Attack Speed; +10 to Dexterity; 8% increased Projectile Speed | 8% increased Attack Speed; +10 to Dexterity; 8% increased Projectile Speed | kept | 27 / 5 / 19 |
| 35987 | **Blur** | notable | +10 to Dexterity; 4% increased Movement Speed; 20% increased Evasion Rating | +10 to Dexterity; 4% increased maximum Life; 20% increased Evasion Rating | adapted | 19 / 5 / 27 |
| 19104 | **Eagle Eye** | notable | +30 to Accuracy Rating; 10% increased Accuracy Rating | +30 to Accuracy Rating; 10% increased Accuracy Rating | kept | 21 / 7 / 29 |
| 20831 | **Catlike Agility** | notable | 25% increased Evasion Rating; 40% increased Evasion Rating if you've Dodge Rolled Recently; 3% reduced Movement Speed Penalty from using Skills while moving | 45% increased Evasion Rating | adapted | 21 / 7 / 29 |
| 30695 | **Vile Wounds** | notable | 33% increased Damage with Hits against Enemies affected by Ailments | 17% increased Attack Damage; 17% increased Spell Damage | adapted | 29 / 7 / 21 |
| 42781 | **Clean Shot** | notable | 15% chance to Pierce an Enemy; 15% increased Projectile Damage | 25% increased Projectile Damage | adapted | 29 / 7 / 21 |
| 44527 | **Cautious Concoctions** | notable | 15% increased Flask Charges gained; 15% increased Flask Effect Duration | 15% increased Rarity of Items found; 15% increased Gold found | replaced | 21 / 7 / 29 |
| 11826 | **Heavy Ammunition** | notable | 5% reduced Attack Speed; 40% increased Projectile Damage; 40% increased Projectile Stun Buildup | 5% reduced Attack Speed; 40% increased Projectile Damage; 40% increased Stun Buildup | adapted | 20 / 8 / 30 |
| 50795 | **Careful Aim** | notable | 15% increased Accuracy Rating; 20% increased Projectile Damage | 15% increased Accuracy Rating; 20% increased Projectile Damage | kept | 21 / 9 / 31 |
| 40213 | **Taste for Blood** | notable | Gain 20 Life per enemy killed; 2% chance to Recover all Life when you Kill an Enemy | Gain 25 Life per enemy killed | adapted | 32 / 10 / 18 |
| 11037 | **Volatile Catalyst** | notable | 10% increased Cooldown Recovery Rate; 8% increased Area of Effect | 10% increased Cooldown Recovery Rate; 8% increased Area of Effect | kept | 15 / 11 / 33 |
| 32683 | **Essence of the Mountain** | notable | 20% increased Freeze Buildup; Gain 5% of Damage as Extra Cold Damage | 20% increased Freeze Buildup; Gain 5% of Damage as Extra Cold Damage | kept | 33 / 11 / 15 |
| 63064 | **Mystic Stance** | notable | 12% faster start of Energy Shield Recharge; 30% increased Stun Threshold while on Full Life | 12% faster start of Energy Shield Recharge; 15% increased Stun Threshold | adapted | 33 / 11 / 15 |
| 58939 | **Dispatch Foes** | notable | 40% increased Critical Hit Chance if you haven't dealt a Critical Hit Recently | 20% increased Critical Hit Chance | adapted | 22 / 12 / 34 |
| 56999 | **Locked On** | notable | 15% increased Accuracy Rating; 15% increased Critical Hit Chance for Attacks | 15% increased Accuracy Rating; 15% increased Critical Hit Chance | adapted | 23 / 13 / 35 |
| 13828 | Evasion | small | +16 to Evasion Rating | +16 to Evasion Rating | kept | 21 / 1 / 23 |
| 56651 | Projectile Damage | small | 10% increased Projectile Damage | 10% increased Projectile Damage | kept | 23 / 1 / 21 |
| 35234 | Projectile Damage | small | 10% increased Projectile Damage | 10% increased Projectile Damage | kept | 24 / 2 / 22 |
| 49691 | Evasion | small | +16 to Evasion Rating | +16 to Evasion Rating | kept | 22 / 2 / 24 |
| 6789 | Projectile Damage | small | 8% increased Projectile Damage | 8% increased Projectile Damage | kept | 25 / 3 / 23 |
| 31409 | Evasion | small | 15% increased Evasion Rating | 15% increased Evasion Rating | kept | 23 / 3 / 25 |
| 35660 | Attack Speed | small | 3% increased Attack Speed | 3% increased Attack Speed | kept | 25 / 3 / 23 |
| 61106 | Movement Speed | small | 2% increased Movement Speed | 2% increased maximum Life | replaced | 23 / 3 / 25 |
| 13783 | Ailment Chance | small | 10% increased chance to inflict Ailments | 10% increased Flammability Magnitude; 10% increased Freeze Buildup; 10% increased chance to Shock | adapted | 28 / 6 / 20 |
| 22795 | Projectile Damage | small | 10% increased Projectile Damage | 10% increased Projectile Damage | kept | 28 / 6 / 20 |
| 29582 | Accuracy | small | 8% increased Accuracy Rating | 8% increased Accuracy Rating | kept | 20 / 6 / 28 |
| 29843 | Evasion and Reduced Movement Penalty | small | 10% increased Evasion Rating; 2% reduced Movement Speed Penalty from using Skills while moving | 10% increased Evasion Rating | adapted | 20 / 6 / 28 |
| 33053 | Projectile Damage | small | 10% increased Projectile Damage | 10% increased Projectile Damage | kept | 18 / 6 / 28 |
| 55397 | Flask Charges Gained | small | 15% increased Flask Charges gained | 15% increased Rarity of Items found | replaced | 20 / 6 / 28 |
| 4844 | Projectile Damage | small | 10% increased Projectile Damage | 10% increased Projectile Damage | kept | 19 / 7 / 29 |
| 17726 | Stun Buildup | small | 15% increased Stun Buildup | 15% increased Stun Buildup | kept | 19 / 7 / 29 |
| 24239 | Life on Kill | small | Gain 5 Life per enemy killed | Gain 5 Life per enemy killed | kept | 30 / 8 / 16 |
| 58013 | Projectile Damage | small | 10% increased Projectile Damage | 10% increased Projectile Damage | kept | 20 / 8 / 30 |
| 55846 | Life on Kill | small | Gain 5 Life per enemy killed | Gain 5 Life per enemy killed | kept | 31 / 9 / 17 |
| 26319 | Critical Chance | small | 10% increased Critical Hit Chance | 10% increased Critical Hit Chance | kept | 20 / 10 / 32 |
| 40068 | Freeze Buildup | small | 15% increased Freeze Buildup | 15% increased Freeze Buildup | kept | 32 / 10 / 14 |
| 44014 | Accuracy | small | 8% increased Accuracy Rating | 8% increased Accuracy Rating | kept | 20 / 10 / 32 |
| 57039 | Cooldown Recovery Rate | small | 5% increased Cooldown Recovery Rate | 5% increased Cooldown Recovery Rate | kept | 14 / 10 / 32 |
| 65437 | Energy Shield Delay | small | 6% faster start of Energy Shield Recharge | 6% faster start of Energy Shield Recharge | kept | 32 / 10 / 14 |
| 11855 | Accuracy | small | 8% increased Accuracy Rating | 8% increased Accuracy Rating | kept | 21 / 11 / 33 |
| 30990 | Critical Chance | small | 10% increased Critical Hit Chance | 10% increased Critical Hit Chance | kept | 21 / 11 / 33 |
| 30829 | Accuracy | small | 8% increased Accuracy Rating | 8% increased Accuracy Rating | kept | 22 / 12 / 34 |
| 1140, 38143, 15507, 43746, 16460, 48401, 10909, 24825, 16489, 29479, 48568, 26786, 14340, 42250, 16484, 18923 | Attribute (x16) | attribute | +5 to any Attribute | +5 to Str, Dex or Int (player picks) | kept | varies |

### 3.3 Sorceress region

68 nodes: 15 notable, 2 keystone, 26 small, 24 attribute, 1 start. Status: 48 kept, 12 adapted, 7 replaced.

| Node id | Name | Type | PoE2 original | MvM | Status | Pts W/R/S |
|---|---|---|---|---|---|---|
| 54447 | WITCH | start | class start (WITCH root) | free; the focus starts here | - | 22 / 22 / 0 |
| 57513 | **Eldritch Battery** | keystone | Convert 100% of maximum Energy Shield to maximum Mana; Mana Costs are Doubled | Heroes have no Energy Shield; Acolytes gain Spirit equal to 100% of the maximum Energy Shield they would have had | adapted | 36 / 24 / 14 |
| 56349 | **Chaos Inoculation** | keystone | Maximum Life is 1; Immune to Chaos Damage and Bleeding | Maximum Life is 1; Immune to Chaos Damage and Bleeding (so also immune to Poison) | kept | 38 / 26 / 16 |
| 2254 | **Pure Energy** | notable | +10 to Intelligence; 30% increased maximum Energy Shield | +10 to Intelligence; 30% increased maximum Energy Shield | kept | 27 / 19 / 5 |
| 51184 | **Raw Power** | notable | +10 to Intelligence; 20% increased Spell Damage | +10 to Intelligence; 20% increased Spell Damage | kept | 19 / 27 / 5 |
| 9642 | **Dampening Shield** | notable | Gain additional Ailment Threshold equal to 12% of maximum Energy Shield; 28% increased maximum Energy Shield; Gain additional Stun Threshold equal to 12% of maximum Energy Shield | 12% increased Elemental Ailment Threshold; 28% increased maximum Energy Shield; 12% increased Stun Threshold | adapted | 29 / 21 / 7 |
| 17973 | **Rapid Recharge** | notable | 12% faster start of Energy Shield Recharge; 12% increased Energy Shield Recharge Rate | 24% faster start of Energy Shield Recharge | adapted | 29 / 21 / 7 |
| 36302 | **Practiced Signs** | notable | 6% increased Cast Speed | 6% increased Cast Speed | kept | 21 / 29 / 7 |
| 59636 | **Open Mind** | notable | 25% increased Mana Regeneration Rate | 13% increased Mana generated by Acolytes | replaced | 21 / 29 / 7 |
| 3823 | **Elemental Force** | notable | +3% to all Elemental Resistances; 20% increased Elemental Damage | +3% to all Elemental Resistances; 20% increased Elemental Damage | kept | 22 / 30 / 8 |
| 51335 | **Affliction Enforcer** | notable | 20% increased Freeze Buildup; 40% increased Flammability Magnitude; 20% increased chance to Shock | 20% increased Freeze Buildup; 40% increased Flammability Magnitude; 20% increased chance to Shock | kept | 22 / 30 / 8 |
| 61027 | **Mana Blessing** | notable | +20 to maximum Mana; 20% increased Mana Regeneration Rate | +10 to Spirit; 10% increased Mana generated by Acolytes | replaced | 30 / 22 / 8 |
| 57110 | **Infused Flesh** | notable | +20 to maximum Life; 8% of Damage taken Recouped as Life | +20 to maximum Life; 4% increased maximum Life | adapted | 31 / 19 / 9 |
| 5501 | **Critical Overload** | notable | 15% increased Critical Spell Damage Bonus; 15% increased Critical Hit Chance for Spells | 15% increased Critical Damage Bonus; 15% increased Critical Hit Chance | adapted | 32 / 24 / 10 |
| 18086 | **Breath of Ice** | notable | +10 to Intelligence; Damage Penetrates 15% Cold Resistance | +10 to Intelligence; Damage Penetrates 15% Cold Resistance | kept | 33 / 25 / 11 |
| 34168 | **Crashing Wave** | notable | 25% increased Damage if you've dealt a Critical Hit in the past 8 seconds | 13% increased Attack Damage; 13% increased Spell Damage | adapted | 33 / 15 / 11 |
| 34233 | **Flow State** | notable | 15% increased Mana Regeneration Rate; 5% increased Skill Speed | 8% increased Mana generated by Acolytes; 5% increased Attack Speed; 5% increased Cast Speed | adapted | 33 / 15 / 11 |
| 36479 | **Essence of the Storm** | notable | Gain 5% of Damage as Extra Lightning Damage; 30% increased chance to Shock | Gain 5% of Damage as Extra Lightning Damage; 30% increased chance to Shock | kept | 33 / 15 / 11 |
| 4739 | Spell Damage | small | 10% increased Spell Damage | 10% increased Spell Damage | kept | 21 / 23 / 1 |
| 44871 | Energy Shield | small | +10 to maximum Energy Shield | +10 to maximum Energy Shield | kept | 23 / 21 / 1 |
| 18845 | Spell Damage | small | 10% increased Spell Damage | 10% increased Spell Damage | kept | 22 / 24 / 2 |
| 30346 | Energy Shield | small | +10 to maximum Energy Shield | +10 to maximum Energy Shield | kept | 24 / 22 / 2 |
| 1755 | Spell Damage | small | 8% increased Spell Damage | 8% increased Spell Damage | kept | 23 / 25 / 3 |
| 29695 | Energy Shield Delay | small | 6% faster start of Energy Shield Recharge | 6% faster start of Energy Shield Recharge | kept | 25 / 23 / 3 |
| 34006 | Energy Shield | small | 15% increased maximum Energy Shield | 15% increased maximum Energy Shield | kept | 25 / 23 / 3 |
| 55807 | Mana Regeneration | small | 10% increased Mana Regeneration Rate | 5% increased Mana generated by Acolytes | replaced | 23 / 25 / 3 |
| 3242 | Mana Regeneration | small | 10% increased Mana Regeneration Rate | 5% increased Mana generated by Acolytes | replaced | 20 / 28 / 6 |
| 4748 | Energy Shield Delay | small | 6% faster start of Energy Shield Recharge | 6% faster start of Energy Shield Recharge | kept | 28 / 20 / 6 |
| 14666 | Stun and Ailment Threshold from Energy Shield | small | Gain additional Ailment Threshold equal to 8% of maximum Energy Shield; Gain additional Stun Threshold equal to 8% of maximum Energy Shield | 8% increased Elemental Ailment Threshold; 8% increased Stun Threshold | adapted | 28 / 20 / 6 |
| 22314 | Elemental Damage | small | 8% increased Elemental Damage | 8% increased Elemental Damage | kept | 20 / 28 / 6 |
| 29502 | Cast Speed | small | 3% increased Cast Speed | 3% increased Cast Speed | kept | 20 / 28 / 6 |
| 517 | Stun and Ailment Threshold from Energy Shield | small | Gain additional Ailment Threshold equal to 8% of maximum Energy Shield; Gain additional Stun Threshold equal to 8% of maximum Energy Shield | 8% increased Elemental Ailment Threshold; 8% increased Stun Threshold | adapted | 29 / 21 / 7 |
| 22821 | Elemental Damage | small | 10% increased Elemental Damage | 10% increased Elemental Damage | kept | 21 / 29 / 7 |
| 51968 | Elemental Ailment Chance | small | 10% increased Freeze Buildup; 20% increased Flammability Magnitude; 10% increased chance to Shock | 10% increased Freeze Buildup; 20% increased Flammability Magnitude; 10% increased chance to Shock | kept | 21 / 29 / 7 |
| 59603 | Life Recoup | small | 3% of Damage taken Recouped as Life | 2% increased maximum Life | replaced | 29 / 17 / 7 |
| 15618 | Spell Critical Damage | small | 15% increased Critical Spell Damage Bonus | 15% increased Critical Damage Bonus | adapted | 30 / 22 / 8 |
| 62159 | Life Recoup | small | 3% of Damage taken Recouped as Life | 2% increased maximum Life | replaced | 30 / 18 / 8 |
| 32404 | Spell Critical Chance | small | 10% increased Critical Hit Chance for Spells | 10% increased Critical Hit Chance | adapted | 31 / 23 / 9 |
| 32427 | Cold Penetration | small | Damage Penetrates 6% Cold Resistance | Damage Penetrates 6% Cold Resistance | kept | 31 / 23 / 9 |
| 4157 | Critical Chance | small | 10% increased Critical Hit Chance | 10% increased Critical Hit Chance | kept | 32 / 14 / 10 |
| 14725 | Skill Speed | small | 3% increased Skill Speed | 3% increased Attack Speed; 3% increased Cast Speed | adapted | 32 / 14 / 10 |
| 36778 | Shock Chance | small | 15% increased chance to Shock | 15% increased chance to Shock | kept | 32 / 14 / 10 |
| 62844 | Cold Penetration | small | Damage Penetrates 6% Cold Resistance | Damage Penetrates 6% Cold Resistance | kept | 32 / 24 / 10 |
| 21984 | [Jewel] Socket | small | Jewel Socket | 8% increased Rarity of Items found | replaced | 36 / 24 / 14 |
| 22419, 56216, 9485, 18407, 47555, 60685, 1826, 42736, 53697, 3041, 4203, 39037, 49046, 57710, 4456, 8569, 46034, 41029, 25557, 4059, 55668, 10382, 29240, 61403 | Attribute (x24) | attribute | +5 to any Attribute | +5 to Str, Dex or Int (player picks) | kept | varies |

### 3.4 Bridges

35 nodes: 12 notable, 0 keystone, 11 small, 12 attribute. Status: 28 kept, 7 adapted, 0 replaced.

| Bridge | Nodes | Notables |
|---|---|---|
| warrior-ranger | 9 | Battle-hardened, Feel no Pain, Remorseless |
| ranger-sorceress | 12 | Flow Like Water, Life from Death, Mindful Awareness, Step Like Mist |
| warrior-sorceress | 14 | Bolstering Presence, Devoted Protector, Grounded in the Earth, Radial Force, Relentless Vindicator |

| Node id | Name | Type | PoE2 original | MvM | Status | Pts W/R/S |
|---|---|---|---|---|---|---|
| 6898 | **Relentless Vindicator** (W-S) | notable | +5 to Strength and Intelligence; 10% increased Critical Hit Chance; 10% increased Damage | +5 to Strength; +5 to Intelligence; 10% increased Critical Hit Chance; 10% increased Physical Damage; 10% increased Elemental Damage; 10% increased Chaos Damage | adapted | 9 / 31 / 13 |
| 28950 | **Devoted Protector** (W-S) | notable | +15% of Armour also applies to Elemental Damage; +5 to Strength and Intelligence; 10% faster start of Energy Shield Recharge; 15% increased Armour | +5% to all Elemental Resistances; +5 to Strength; +5 to Intelligence; 10% faster start of Energy Shield Recharge; 15% increased Armour | adapted | 13 / 31 / 9 |
| 44605 | **Remorseless** (W-R) | notable | +5 to Strength and Dexterity; 30% increased Stun Buildup against enemies within 2 metres; 15% increased Projectile Damage | +5 to Strength; +5 to Dexterity; 15% increased Stun Buildup; 15% increased Projectile Damage | adapted | 13 / 9 / 31 |
| 48198 | **Step Like Mist** (R-S) | notable | +5 to Dexterity and Intelligence; 4% increased Movement Speed; 15% increased Mana Regeneration Rate | +5 to Dexterity; +5 to Intelligence; 4% increased maximum Life; 8% increased Mana generated by Acolytes | adapted | 31 / 9 / 13 |
| 49220 | **Flow Like Water** (R-S) | notable | 8% increased Attack and Cast Speed; +5 to Dexterity and Intelligence | 8% increased Attack Speed; 8% increased Cast Speed; +5 to Dexterity; +5 to Intelligence | kept | 31 / 13 / 9 |
| 56910 | **Battle-hardened** (W-R) | notable | Hits against you have 20% reduced Critical Damage Bonus; +5 to Strength and Dexterity; 20% increased Armour and Evasion Rating | 30% increased Armour; 30% increased Evasion Rating; +5 to Strength; +5 to Dexterity | adapted | 9 / 13 / 31 |
| 7344 | **Life from Death** (R-S) | notable | Recover 3% of maximum Life on Kill | Gain 12 Life per enemy killed | adapted | 33 / 11 / 11 |
| 13233 | **Radial Force** (W-S) | notable | 10% increased Area of Effect; 12% increased Immobilisation buildup | 10% increased Area of Effect; 12% increased Stun Buildup; 12% increased Freeze Buildup | adapted | 11 / 33 / 11 |
| 25429 | **Grounded in the Earth** (W-S) | notable | 16% increased Skill Effect Duration; 16% increased Stun Threshold | 16% increased Skill Effect Duration; 16% increased Stun Threshold | kept | 11 / 33 / 11 |
| 44836 | **Feel no Pain** (W-R) | notable | 20% increased Armour and Evasion Rating; 20% increased Stun Threshold | 20% increased Armour; 20% increased Evasion Rating; 20% increased Stun Threshold | kept | 11 / 11 / 33 |
| 62984 | **Mindful Awareness** (R-S) | notable | 24% increased Evasion Rating; 24% increased maximum Energy Shield | 24% increased Evasion Rating; 24% increased maximum Energy Shield | kept | 33 / 11 / 11 |
| 64299 | **Bolstering Presence** (W-S) | notable | Aura Skills have 12% increased Magnitudes | 12% increased Aura Effect | kept | 12 / 34 / 12 |
| 15975 | Evasion and Energy Shield (R-S) | small | 12% increased Evasion Rating; 12% increased maximum Energy Shield | 12% increased Evasion Rating; 12% increased maximum Energy Shield | kept | 32 / 10 / 12 |
| 17517 | Area of Effect (W-S) | small | 5% increased Area of Effect | 5% increased Area of Effect | kept | 10 / 32 / 12 |
| 19873 | Area of Effect (W-S) | small | 5% increased Area of Effect | 5% increased Area of Effect | kept | 12 / 32 / 10 |
| 21336 | Evasion and Energy Shield (R-S) | small | 12% increased Evasion Rating; 12% increased maximum Energy Shield | 12% increased Evasion Rating; 12% increased maximum Energy Shield | kept | 32 / 12 / 10 |
| 26931 | Life on Kill (R-S) | small | Gain 3 Life per enemy killed | Gain 3 Life per enemy killed | kept | 32 / 10 / 12 |
| 38103 | Increased Duration and Stun Threshold (W-S) | small | 8% increased Skill Effect Duration; 8% increased Stun Threshold | 8% increased Skill Effect Duration; 8% increased Stun Threshold | kept | 10 / 32 / 12 |
| 38779 | Armour and Evasion (W-R) | small | 12% increased Armour and Evasion Rating | 12% increased Armour; 12% increased Evasion Rating | kept | 12 / 10 / 32 |
| 41838 | Increased Duration and Stun Threshold (W-S) | small | 8% increased Skill Effect Duration; 8% increased Stun Threshold | 8% increased Skill Effect Duration; 8% increased Stun Threshold | kept | 12 / 32 / 10 |
| 47150 | Armour and Evasion (W-R) | small | 12% increased Armour and Evasion Rating | 12% increased Armour; 12% increased Evasion Rating | kept | 10 / 12 / 32 |
| 58182 | Life on Kill (R-S) | small | Gain 3 Life per enemy killed | Gain 3 Life per enemy killed | kept | 32 / 12 / 10 |
| 17655 | Aura Effect (W-S) | small | Aura Skills have 5% increased Magnitudes | 5% increased Aura Effect | kept | 11 / 33 / 11 |
| 8406, 28556, 30555, 34136, 45969, 59795, 10156, 13411, 28510, 48305, 53960, 59881 | Attribute (x12) | attribute | +5 to any Attribute | +5 to Str, Dex or Int (player picks) | kept | varies |

### 3.5 Economy, Spirit, aura, and loot path

Acolyte and aura builds need somewhere to spend points. These are the nodes that serve them.

| Node | Id | Region | Pts from nearest start | MvM effect |
|---|---|---|---|---|
| Mana Regeneration (small) | 55807 | Sorceress | 3 | 5% increased Mana generated by Acolytes |
| Mana Regeneration (small) | 3242 | Sorceress | 6 | 5% increased Mana generated by Acolytes |
| **Open Mind** | 59636 | Sorceress | 7 | 13% increased Mana generated by Acolytes |
| **Mana Blessing** | 61027 | Sorceress | 8 | +10 Spirit; 10% increased Mana generated by Acolytes |
| **Step Like Mist** | 48198 | Bridge R–S | 9 (Ranger) | +5 Dex, +5 Int; 4% life; 8% increased Mana generated by Acolytes |
| **Flow State** | 34233 | Sorceress | 11 | 8% increased Mana generated by Acolytes; 5% attack and cast speed |
| **Eldritch Battery** | 57513 | Sorceress | 14 | Keystone: hero ES becomes acolyte Spirit (§4) |
| Aura Effect (small) | 17655 | Bridge W–S | 11 | 5% increased Aura Effect |
| **Bolstering Presence** | 64299 | Bridge W–S | 12 | 12% increased Aura Effect |
| **Cautious Concoctions** | 44527 | Ranger | 7 | 15% increased Rarity of Items found; 15% increased Gold found |
| Flask Charges Gained (small) | 55397 | Ranger | 6 | 15% increased Rarity of Items found |
| [Jewel] Socket | 26725, 21984 | Warrior, Sorceress | 10, 14 | 8% increased Rarity of Items found |

**Example economy spend.** Both Mana Regeneration small nodes, Open Mind, and Mana Blessing cost **17 points** from the Sorceress start, passing Raw Power on the way. They give +33% mana generated by acolytes, +10 Spirit, and 20% increased spell damage. Adding Flow State through the Ranger–Sorceress bridge brings it to 24 points and +41%. For scale, +100 Spirit is a sceptre implicit (+50% per orb, [appendix E §2.1](appendix-e-economy.md)).

The tree has **no real PoE2 Spirit node** this close to the starts. The nearest, Profane Commander (4% increased Spirit), is 15 steps from the Sorceress. Spirit is mostly a gear stat; the tree adds acolyte percentages and Eldritch Battery.

---

## 4. Keystones

### 4.1 The four keystones in the tree

| Keystone | Id | Owner | Pts W / R / S | PoE2 effect (verbatim) | MvM effect | Status |
|---|---|---|---|---|---|---|
| **Resolute Technique** | 44017 | Warrior | 13 / 35 / 27 | Accuracy Rating is Doubled. Never deal Critical Hits. | Same, for every hero and the spell | kept |
| **Crimson Assault** | 9085 | Ranger | 22 / 12 / 34 | Bleeding you inflict is Aggravated. Base Bleeding Duration is 1 second. 50% more Magnitude of Bleeding you inflict. | Same. Aggravated = always counts the monster as moving | kept |
| **Chaos Inoculation** | 56349 | Sorceress | 38 / 26 / 16 | Maximum Life is 1. Immune to Chaos Damage and Bleeding. | Same, for every hero (chaos immunity covers Poison) | kept |
| **Eldritch Battery** | 57513 | Sorceress | 36 / 24 / 14 | Convert 100% of maximum Energy Shield to maximum Mana. Mana Costs are Doubled. | Heroes have no Energy Shield. Acolytes gain Spirit equal to 100% of the maximum ES they would have had. | **adapted**, **MvM custom** |

Each keystone is one rule flag in the JSON, e.g. `keystone_resolute_technique`. Each flag is built only from vocabulary mechanics.

**Cost reading:** your own keystone costs 12–16 of your ~33 points, which is real commitment. A keystone from another focus costs 22–38, which is a whole-demo aspiration.

### 4.2 Notes per keystone

**Resolute Technique (Warrior, 13 pts)**

- Attacks almost always hit, and nothing crits, including the player spell.
- Accuracy matters only for attacks ([appendix A §4.4](appendix-a-combat.md)), so spells simply lose crit.
- It fits wall and slam builds that never invested in crit. It wastes the Ranger's crit cluster.

**Crimson Assault (Ranger, 12 pts)**

- Appendix A gives Bleeding +100% while the monster moves, and walls stop monsters, which halves bleed. Crimson Assault removes that tension: held monsters bleed at full rate.
- The 1-second duration needs fast re-application from quick bow or spear attacks.
- Example, a 100-physical hit:
  - Normal bleed on a walking monster: 15/s × 2 for 5 s = 150 total.
  - Crimson Assault: 15/s × 2 × 1.5 for 1 s = 45 per application, but it re-applies on every hit and ignores walls.

**Chaos Inoculation (Sorceress, 16 pts)**

- Every hero has 1 life, so ES must hold the line. Chaos damage and Poison do nothing, and neither does Bleeding.
- Strength's life bonus becomes dead weight. Walls need ES gear.
- **Open question (not locked):** should the wall archetype life multiplier also apply to ES under CI? Otherwise a CI Wall-nut has no reason to exist.

**Eldritch Battery (Sorceress, 14 pts), adapted**

- PoE2's version feeds ES into mana. MvM heroes have no mana, so the battery feeds the acolyte economy instead.
- The price is that **every** hero loses its ES, including the Sorceress's own ES defence. This replaces "Mana Costs are Doubled", because hero costs are fixed by the brief.
- Synergy: the Sorceress ES nodes (Pure Energy, Dampening Shield, Int) now grow acolyte Spirit instead of defence.
- Worked example, from the Battery sample build (§6.3):
  - Take an acolyte with 60 ES on its Armor-slot item, plus 20 flat ES from passives.
  - It has +73% ES from nodes and +21% from 105 passive Int, ignoring its own Int: 80 × 1.94 ≈ 155 "would-be" ES.
  - That becomes +155 Spirit. Add a 100-Spirit sceptre and Mana Blessing's +10 for 265 Spirit: 25 × (1 + 265/200) ≈ **58 mana per orb**, against 37.5 with the sceptre alone.
  - The build's +33% increased mana generated comes on top. Appendix E owns how it stacks.
- **Tuning knob:** the conversion ratio. Start at 100%; drop it to 50% if the economy breaks.

### 4.3 Nearby keystones that were not included

Distances are full-tree BFS steps from the nearest focus start.

| Keystone | Id | Steps | PoE2 effect (short) | Why not in the demo |
|---|---|---|---|---|
| Oasis | 25100 | R 11 | No charms; 30% more flask recovery | Flasks and charms are cut |
| Wildsurge Incantation | 49363 | S 11 | Storm and Plant spells: more damage, less duration | No Storm or Plant spells in the demo |
| Bulwark | 56605 | W 12 | Dodge Roll can't avoid damage; less damage taken while rolling | Dodge roll is cut |
| Unwavering Stance | 14540 | W 12 | Can't be Light Stunned; can't Dodge Roll or Sprint | Half the text is cut. Good post-demo pick ("heroes can't be light-stunned"). |
| Heartstopper | 34497 | R 12 | Damage-over-time timing trick | No "damage over time taken" stat |
| Blackflame Covenant | 42680 | S 13 | Fire spells convert to chaos | Fire-to-chaos conversion isn't in the vocabulary |
| Mind Over Matter | 45918 | S 13 | Damage taken from mana first | Mana is cut |
| Scarred Faith | 49547 | W 13 / S 13 | Recoup to ES per enemy Power | Recoup and Power are cut |
| **Blood Magic** | 51749 | W 14 | You have no Mana; mana costs become life costs | Mana is cut. Sketch if wanted later (**MvM custom**): "placing a hero also costs 1 point of the 20-point life pool; its mana cost is 30% lower". |
| Conduit | 33979 | S 14 | Charges go to allies | Charges are cut |
| Glancing Blows | 19288 | R 14 | Evade Unlucky, Deflect Lucky | Deflection is cut |
| Ritual Cadence | 11230 | S 14 | Invocation timing | Invocations are cut |
| Vaal Pact | 33369 | W 15 | Leech-only recovery | Supported, but it kills every regen node. Later. |
| Whispers of Doom | 47759 | S 15 | +1 curse; double curse delay | Plausible later for curse heroes |
| Dance with Death | 14226 | R 15 | 25% more skill speed with a one-hand weapon and an empty off hand | Plausible (spear without shield); +11 nodes |
| Avatar of Fire | 18684 | W 16 | 75% of damage converted to fire | Supported. The best post-demo addition for fire slams. |
| Giant's Blood | 32349 | W 16 | Two-handers in one hand | Handedness and attribute requirements are cut |
| **Elemental Equilibrium** | 46742 | S 16 | **0.5 rework:** swaps which Infusion Remnant each element creates | Infusion and Remnants are cut. The PoE1 version isn't in this data. |
| **Iron Reflexes** | 28492 | W 19 / R 19 | Converts all Evasion to Armour | Fully supported, but needs 11 extra attribute-highway nodes. The first add after the demo. |
| **Acrobatics** | — | — | — | **Not in the PoE2 0.5 data.** The export has 33 keystones and none is Acrobatics. |

---

## 5. Point budget and respec

### 5.1 Points

```
passivePoints = (playerLevel − 1) + 2 × bossesCleared      // bosses: L5, L10, L15, L20 (first clear)
```

Player levels come from appendix E's XP simulation (`K_xp` = 6).

| Campaign level cleared | 1 | 3 | 5 | 8 | 10 | 12 | 15 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Player level | 3 | 5 | 9 | 13 | 16 | 19 | 23 | 26 | 27 | 29 | 30 |
| Passive points | 2 | 4 | **10** | 14 | **19** | 22 | **28** | 31 | 32 | **34** | **37** |

- **33 points** arrive during campaign level 19, before the final boss. That is the sample-build budget.
- **37 points** at demo end: 29 from levels plus 8 from bosses.

**What a point buys:**

- A notable 5–7 steps out costs about 2 points once you are next to it.
- Your own keystone costs 12–16, roughly 40% of the budget.
- A 33-point build fits about 8–10 notables plus one keystone (§6).

### 5.2 Allocation rules

- The start node is free. You can allocate any node adjacent to an allocated node.
- You can refund a node only if everything else stays connected to the start (PoE rule).
- The tree is edited only between levels. The roster is locked during a level, and passives are part of the loadout.

### 5.3 Respec cost and the demo recommendation

PoE2 charges gold per refunded point, by player level (research notes §1.6, from [poe2db Gold](https://poe2db.tw/us/Gold)):

| Player level | 1 | 5 | 10 | 15 | 20 | 30 |
|---|---|---|---|---|---|---|
| Gold per point | 15 | 39 | 98 | 182 | 273 | 470 |

- Interpolate between columns.
- Changing an attribute node's pick costs 0.5× (PoE2).
- Store the table in `rules.respec_gold_per_point_by_player_level` in the JSON.

**MvM gold reality** ([appendix E §5.1](appendix-e-economy.md)):

- Kills give about 200 gold per level at campaign level 10, and about 5,300 over the whole campaign.
- A full respec of 19 points at campaign level 10 (player level 16) would cost about **3,800 gold**, or 19 levels of income.
- Moving just one keystone path (13 points) at player level 20 costs about **3,550 gold**.

**Recommendation: respec is free in the demo.**

1. The test is whether loot and build crafting are fun. Trying a keystone, hating it, and switching is part of that fun. A gold gate would block the thing being measured.
2. PoE2's table is tuned to PoE2's gold income. In MvM it would cost a large share of all the gold a run earns, and starve the Armorer and Recruiter, the gold sinks the demo actually tests.
3. The keystones here are huge swings: Chaos Inoculation sets every hero to 1 life, and Eldritch Battery removes all ES. A bad pick should cost minutes, not the session.
4. The demo is about 2 hours, with no time to grind back gold.
5. There is no exploit risk: the tree is locked during a level.

**Keep the cost path:** ship the PoE2 table behind a dev toggle (`rules.respec_demo_default = "free"`). If the team wants friction later, start at **10%** of the PoE2 price, which is about one level's gold for a keystone swap.

---

## 6. Sample builds (33 points each)

All three are in the JSON (`sample_builds`) so the dev cheat menu can load them. Attribute nodes take the focus attribute.

### 6.1 Warrior: "Iron Wall Smasher"

| Step | Target | +Pts | Path |
|---|---|---|---|
| 1 | Brutal | 5 | Melee Damage › Attribute ×3 › Brutal |
| 2 | Smash | 2 | Melee Damage › Smash |
| 3 | Relentless | 5 | Armour › Attribute ×3 › Relentless |
| 4 | Sturdy Metal | 2 | Armour › Sturdy Metal |
| 5 | Reverberating Impact | 2 | Area Damage › Reverberating Impact |
| 6 | Defender's Resolve | 2 | Block › Defender's Resolve |
| 7 | **Resolute Technique** | 9 | Attribute ×5 › [Jewel] Socket › Attribute ×2 › Resolute Technique |
| 8 | Beef | 2 | Strength › Beef |
| 9 | Titan's Determination | 2 | Stun Threshold › Titan's Determination |
| 10 | (stun) | 2 | Melee Damage › Stun Buildup |

**Totals:**

- +118 Strength (13 attribute picks, Brutal, Relentless, Beef, and a +8 Str small node)
- 86% increased Melee Damage
- 25% increased Stun Buildup
- +20 Armour, 30% increased Armour, 80% increased Armour on the Armor-slot item
- 17% increased Block chance
- 52% increased Stun Threshold
- 0.6% life regenerated per second
- Break 25% increased Armour
- 12% increased Area of Effect, 10% increased Area Damage
- 8% increased Rarity of Items found
- Resolute Technique

**On the lawn:**

- +118 Str is +236 base life on every hero before the archetype multiplier, so a wall's life roughly grows by half.
- Melee heroes almost never miss and never crit.
- Shield walls block a lot more and strip armour from Armoured skeletons.

**Next points:** Burn Away and Burning Strikes (fire slams), or Bolstering Presence on the W–S bridge for an aura hero.

### 6.2 Ranger: "Crit Archer"

| Step | Target | +Pts | Path |
|---|---|---|---|
| 1 | Honed Instincts | 5 | Projectile Damage › Attribute ×3 › Honed Instincts |
| 2 | Clean Shot | 2 | Projectile Damage › Clean Shot |
| 3 | Blur | 5 | Evasion › Attribute ×3 › Blur |
| 4 | Eagle Eye | 2 | Accuracy › Eagle Eye |
| 5 | Catlike Agility | 2 | Evasion and Reduced Movement Penalty › Catlike Agility |
| 6 | Dispatch Foes | 8 | Attribute ×5 › Critical Chance ×2 › Dispatch Foes |
| 7 | Locked On | 5 | Attribute › Accuracy ×3 › Locked On |
| 8 | Careful Aim | 4 | Projectile Damage ×3 › Careful Aim |

**Totals:**

- +80 Dexterity (+640 accuracy on every hero)
- 95% increased Projectile Damage
- 55% increased Critical Hit Chance
- +30 Accuracy, 72% increased Accuracy
- 8% increased Attack Speed, 8% increased Projectile Speed
- +16 Evasion, 75% increased Evasion
- 4% increased maximum Life

**On the lawn:**

- Bow and spear heroes roughly double their damage and crit far more often.
- Evasion gear on front heroes gets real.

**Next points:**

- +3 for **Crimson Assault**, which turns the build into a bleed spear line.
- +2 for **Cautious Concoctions** (15% rarity, 15% gold).

### 6.3 Sorceress: "Battery Acolyte Caster"

| Step | Target | +Pts | Path |
|---|---|---|---|
| 1 | Pure Energy | 5 | Energy Shield › Attribute ×3 › Pure Energy |
| 2 | Raw Power | 5 | Spell Damage › Attribute ×3 › Raw Power |
| 3 | Open Mind | 2 | Mana Regeneration › Open Mind |
| 4 | Mana Blessing | 4 | Attribute ×2 › Stun and Ailment Threshold from Energy Shield › Mana Blessing |
| 5 | Dampening Shield | 1 | Dampening Shield |
| 6 | Practiced Signs | 2 | Cast Speed › Practiced Signs |
| 7 | **Eldritch Battery** | 10 | Attribute ×9 › Eldritch Battery |
| 8 | (economy) | 2 | Spell Damage › Mana Regeneration |
| 9 | (ES for the battery) | 2 | Energy Shield › Energy Shield (15%) |

**Totals:**

- +105 Intelligence
- 40% increased Spell Damage, 9% increased Cast Speed
- **33% increased Mana generated by Acolytes**, **+10 Spirit**
- +20 ES, 73% increased ES. Under Eldritch Battery these become acolyte Spirit, not defence.
- 20% increased Stun Threshold, 20% increased Elemental Ailment Threshold
- Eldritch Battery

**On the lawn:**

- Acolytes produce roughly 1.5–2× mana (worked example in §4.2), so the player can field expensive casters and auras early.
- No hero has ES, so the board leans on armour and evasion walls.

**Variant:** skip the battery and take **Chaos Inoculation** (16 from the start) for an all-ES defensive caster line. You can't run both: 1 life and 0 ES kills everything.

---

## 7. UI notes: the tree screen

**Data:** load `docs/data/passive-subtree.json` at build time (gdd.md data import). Draw it from `x`, `y`, and `connections` only.

**Layout**

- The tree is a hideout tab, available between levels only.
- Canvas or SVG fills the tab. A top bar shows "Points: 12 / 19", a **Reset tree** button, and the search box.
- A side panel shows **stat totals** for the allocation, grouped like §6, plus the keystones taken.
- Faint tinted backgrounds mark the four regions: red Warrior, green Ranger, blue Sorceress, grey bridges.

**Pan and zoom**

- Drag to pan; the wheel or a pinch zooms. Zoom range is 0.25× to 3×.
- At 1×, use **0.05 px per tree unit**. The sub-tree spans x −7,860 to 6,373 and y −9,522 to 6,933, about 710 × 825 px.
- Open centred on the player's focus start. A **Fit** button shows the whole ring.
- Keystone spokes are long. Double-clicking a keystone pans to it and shows the path cost.

**Node drawing**

| Type | Look |
|---|---|
| start | Focus crest, large |
| small | Small circle |
| attribute | Small diamond with "?" until chosen, then S / D / I in the attribute's colour |
| notable | Larger circle with a gold ring |
| keystone | Large hexagon |

- Edges are dim when locked, bright when allocated, and pulse when allocatable.
- A small corner dot shows status: **adapted** is amber and **replaced** is purple. Kept nodes have no dot.

**Hover path preview:** hovering an unallocated node draws the cheapest path from the current allocation and shows "+5 points".

**Search**

- One box that matches, case-insensitive, against node name, PoE2 text, MvM text, and MvM stat id. Typing "acolyte", "Crit", or "bleed" all work.
- Matches glow; everything else dims. The box shows "7 matches", and Enter cycles through them, panning to each.
- Filter chips: **Notables**, **Keystones**, **Adapted / Replaced**, **Economy**. The Economy chip covers the acolyte, spirit, rarity, and gold stats.

**Tooltip:** show the PoE2 original next to the MvM text, so ARPG-literate testers see exactly what changed.

```
+-- Smash ------------------------- Notable · Warrior · 7 pts --+
| PoE2 original                   | MvM (what you get)          |
| 20% increased Melee Damage      | 40% increased Melee Damage  |
| 40% increased Melee Damage      |                             |
|   against Heavy Stunned enemies |                             |
+---------------------------------------------------------------+
| ADAPTED: condition removed, value halved (no conditions in MvM)|
| PoE2 node 45363 · melee55                                     |
+---------------------------------------------------------------+
```

- **kept** nodes show one column (the texts match) plus a small "same as PoE2" tag.
- **replaced** nodes strike through the PoE2 lines and show the replacement reason from `note`.
- **Keystones** show the full rule text and a one-line warning when the effect is global and drastic, e.g. "Every hero: max life 1".
- **Attribute nodes** show the picker on click and the current pick in the tooltip.

**Allocation feedback**

- Allocating flashes the node and updates the stat panel with green deltas, e.g. "+16% Melee Damage".
- Refunding a node that would disconnect others is blocked, with "would disconnect 4 nodes".

**Dev cheats** (gdd dev menu):

- +10 points.
- Load sample build (§6).
- Toggle respec cost.
- "Show full PoE2 tree ghost", which draws the uncurated neighbours faintly for design review.

---

## 8. Deviations from brief

1. **Bridge geometry.** The task expected Warrior–Ranger and Ranger–Sorceress to be the adjacent pairs. In the data, all three starts are alternate vertices of the six-root hexagon and every pair is exactly 22 steps apart. **All three bridges are included**, and the sub-tree is a ring (§2.2).
2. **Proposed vocabulary additions.** The tree needs these MvM stat ids that aren't in appendix A §9 yet:
   - `stun_threshold_+%`: appendix A lists `stun_threshold`, but PoE2 passives give "% increased Stun Threshold" (on 12 nodes).
   - `armour_break_+%`, "Break X% increased Armour" (Reverberating Impact): a modifier on the existing Armour Break mechanic.
   - `attribute_choice`, a pseudo-stat for attribute nodes that resolves to `strength`, `dexterity`, or `intelligence`.
   - Four keystone rule flags (`keystone_resolute_technique`, `keystone_crimson_assault`, `keystone_chaos_inoculation`, `keystone_eldritch_battery`). Each is built only from vocabulary mechanics.
   - Sturdy Metal uses the existing `local_armour_+%`, applied to the Armor-slot item by a passive.
3. **Keystone set.** There are 4 keystones, within the brief's 3–4, but the Sorceress holds two (CI and EB) and the bridges hold none.
   - Iron Reflexes, from the example list, was left out to stay within the node budget (+11 nodes).
   - Acrobatics does not exist in the PoE2 0.5 data.
   - Elemental Equilibrium was reworked in 0.5 into an Infusion-Remnant effect, which MvM cuts.
   - Blood Magic is cut, with only a design sketch.
4. **Eldritch Battery is a MvM custom adaptation.** ES becomes acolyte Spirit, and the price is that all heroes lose ES. "Mana Costs are Doubled" is dropped, because the brief fixes hero costs.
5. **Point budget.** The brief says about 33 points by demo end. Appendix E's XP curve gives player level 30, so **37**: 29 from levels plus 8 from bosses. The sample builds use 33, which arrive during campaign level 19.
6. **Respec is free in the demo** (recommendation). The brief doesn't set a price, and PoE2's table costs a large share of all MvM gold. The table ships behind a toggle.
7. **Forced Ranger crit picks.** The real tree puts the Ranger's crit 10–13 steps out, beyond the 11-step notable radius for Locked On. Two crit notables were forced to honour the brief's "crit" fantasy.
8. **The Bridges region has 12 notables, not 15.** The brief's "about 15 per region" is met by the three focus regions.
9. **Conditional lines lose their condition at half value.** This touches 9 lines, e.g. Smash and Vile Wounds. "Allies in your Presence" lines become global, since passives are global anyway.
10. **Mana-flavoured lines become economy stats at half value** (`acolyte_mana_generated_+%`, `spirit`), and flask and charm lines become life regen or loot stats. These are swaps to existing vocabulary stats, flagged **adapted** or **replaced**.
11. **Focus base attributes are reference only.** The brief's hero-attribute sources don't include the focus, so they aren't applied (§1).
12. **Chaos Inoculation versus wall archetypes** is an open question: should the life multiplier apply to ES? It is flagged, not decided.
