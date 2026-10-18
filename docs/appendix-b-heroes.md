# Appendix B: Heroes, Supports & Spells

Part of the Knights vs Nightmares (KvN) GDD. It covers how a PoE2 skill gem becomes a placeable hero, the 32-hero demo roster, the support gems that roll on heroes, the 8 player spells, and how heroes and spells drop.

**Related files:**

- `docs/gdd.md`: primary GDD
- `docs/appendix-a-combat.md`: damage pipeline, ailments, tuning knobs. It wins on any combat-formula conflict.
- `docs/appendix-c-items.md`: weapon bases, Spirit on gear, currency (Jeweller's Orbs, Gemcutter's Prism, Orb of Realignment)
- `docs/appendix-d-monsters-levels.md`: monster archetypes, terrain (Rock, Chilled Ground)
- `docs/appendix-e-economy.md`: prices, drop rates, the XP curve
- `docs/appendix-f-passives.md`: focuses and the passive tree

**Data:** repoe-fork/poe2 export 4.5.5.2 (PoE2 0.5.x). Mainly `skill_gems.json`, `skills.json`, `base_items.json` and `default_monster_stats.json`. Every hero, support and spell row cites its PoE2 metadata id, so an importer can pull exact per-level values.

**Markers:**

- **KvN custom**: invented for the demo.
- **adapted**: a PoE2 mechanic or stat swapped for a KvN equivalent. The original is named next to it.
- ★: the support is in the gem's PoE2 `recommended_supports`, so it gets 3× roll weight.
- ✦: KvN custom hero.

---

## Contents

1. [Hero model](#1-hero-model)
2. [Hero catalog](#2-hero-catalog)
3. [Worked example: level 17 Rare Lightning Spear](#3-worked-example-level-17-rare-lightning-spear)
4. [Starter kits](#4-starter-kits)
5. [Support catalog](#5-support-catalog)
6. [Spell catalog](#6-spell-catalog)
7. [Hero and spell drops and generation](#7-hero-and-spell-drops-and-generation)
8. [Deviations from brief](#8-deviations-from-brief)

---

## 1. Hero model

### 1.1 From gem to hero in one table

| PoE2 gem field | Becomes, for the hero | Example (Lightning Spear) |
|---|---|---|
| `skill_gems.json` key | Hero id | `Metadata/Items/Gems/SkillGemLightningSpear` |
| `grants_skills[0]` → `skills.json` | Behaviour plus per-level numbers | `LightningSpearPlayer` |
| `crafting_types` + skill type | Locked weapon class (§1.3) | Spear |
| `requirement_weights` | Attribute profile (§1.4) | Dex 100 |
| `active_skill.types` | Support compatibility (§1.10) | Attack, Projectile, Lightning, Area… |
| `recommended_supports` | 3× roll weight | Lightning Attunement, Elemental Armament I… |
| `crafting_level` (gem tier) | Drop unlock area level (§1.8) | tier 3 → AL 3 |
| `quality_stats` | Gemcutter's Prism bonus (§1.7) | +0.1 bolts per 1% |
| `stat_sets[].per_level` | Numbers at each gem level (§1.5) | Attack damage 110% → 211% |

Each top-level skill is **one hero**. A hero is the skill plus three gear slots (weapon, armour, accessory), a level, a rarity and 0–5 supports.

### 1.2 Grid conventions (lane-literal)

These apply to every hero spec below.

| Term | Meaning |
|---|---|
| Board | 5 lanes (1 = top) × 9 columns (1 = house side). Monsters walk right to left. |
| Tile | 1.2 PoE2 metres. "Radius 2.8 m" = 2.33 tiles. |
| Ahead | Toward higher columns (where monsters come from). |
| Lane projectile | Spawns at the hero, flies right along its lane and hits the first monster. Its range is the whole lane unless stated. |
| Pierce N | Passes through N monsters in the lane. |
| Fork | Splits into the two adjacent lanes at the hit point. |
| Chain | Jumps to the nearest monster within 2 tiles, in any lane, not already hit by this chain. |
| Extra projectiles | Fan into adjacent lanes (Threepeater). |
| Radius R area | Hits every monster with `dx² + dlane² ≤ R²`. `dx` is the continuous distance along the lane in tiles; `dlane` is the lane difference. R = 1.42 hits adjacent lanes only within 1.0 tile of the centre. |
| Melee | Own tile plus 1 tile ahead. Strikes hit one monster in that zone; slams use their radius. |
| Square N×N | Player spells only: whole tiles, centred on the target tile. |

Heroes only act when a valid target exists, so they never waste an attack. Attack and cast times below are **raw PoE2** times. In play, appendix A's `K_heroActionRate` (0.5) halves hero attack and cast speed after all modifiers. Durations, delays and cooldowns are not scaled. Targeting helpers such as `LaneFirst` and `NearbyMostAdvanced` are defined in appendix A §3.

### 1.3 Weapon lock

Each hero uses exactly one class from the brief's fixed list.

| Hero kind | Weapon class | Rule source |
|---|---|---|
| Bow skills | Bow | `crafting_types: Bow` |
| Crossbow (ammunition) skills | Crossbow | `crafting_types: Crossbow` |
| Spear skills | Spear (shield allowed) | `crafting_types: Spear` |
| Mace walls (need a shield) | One Hand Mace + shield | `crafting_types: Mace` + `RequiresShield` / wall role |
| Mace strikers and slams | Two Hand Mace | `crafting_types: Mace` |
| Quarterstaff skills | Quarterstaff (item class `Warstaff`) | `crafting_types: Quarterstaff` |
| Projectile and single-target spells | Wand | brief |
| Area spells and curses | Staff | brief |
| Acolytes and aura heroes | Sceptre | brief |
| Mark heroes | Bow | `crafting_types` lists Bow |

Shields are allowed only with Spear and One Hand Mace (brief). Spell heroes take no damage from their wand or staff. Those slots carry spell and caster mods (appendix C).

### 1.4 Attributes and life

**Attributes.** These grow from the gem's `requirement_weights` (w = weight / 100). The base matches PoE2's class starts: 15/7/7 for pure, 11/11/7 for a 50/50 hybrid.

```
Attr = 7 + 8·w + 2·(level − 1)·w      (floor; plus items and passives)
```

Examples at hero level 30: pure Str = 73 Str; Str 50 / Dex 50 = 40 / 40.

**Attribute effects (brief):**

- Str: +2 life per point.
- Dex: +8 accuracy per point.
- Int: +1% increased maximum Energy Shield per 5 points (**KvN**).

**Life:**

```
Life = (16 + 12·level + 2·Str) × archetype life multiplier
```

| Archetype | Life × | Heroes |
|---|---|---|
| Squishy | ×1.0 | Bows, spell heroes, curses, marks, basic and twin acolytes |
| Hybrid ranged | ×1.25 | Spears (can hold a shield), crossbows |
| Aura | ×1.5 | All 4 aura heroes (30 s recharge makes them costly to lose) |
| Quarterstaff striker | ×2.0 | Ice Strike, Falling Thunder |
| Heavy striker | ×2.5 | Boneshatter, Rolling Slam, Sunder, Fangs of Frost |
| Sturdy | ×4.0 | Shrinewarden, Shield Wall (whose wall segments tank instead) |
| Wall | ×8.0 | Armour Breaker |

Calibration: a level 1 squishy has 42 life and the level 1 Armour Breaker has 464. That ×11 gap, before shield block and Armour, matches the brief's 3–5 s versus about 40 s survival target.

### 1.5 Hero level and PoE2 gem level

Hero level uses the character scale (1 to about 32). Skill numbers come from the PoE2 gem level, found through PoE2's "required character level per gem level" table. Values between rows interpolate linearly.

| Gem level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Hero level | 1 | 3 | 6 | 10 | 14 | 18 | 22 | 26 | 31 | 36 |

```
gemLevel(h) = g + (h − req[g]) / (req[g+1] − req[g])     where req[g] ≤ h < req[g+1]
value(h)    = v[g] + frac · (v[g+1] − v[g])               (continuous stats)
count(h)    = v[floor(gemLevel)]                          (projectiles, chains, Limit, pierce: no interpolation)
```

| Hero level | 1 | 10 | 17 | 20 | 30 | 32 |
|---|---|---|---|---|---|---|
| Gem level | 1.0 | 4.0 | 5.75 | 6.5 | 8.8 | 9.2 |

A `damage_multiplier` missing from a level means **100%**. RePoE omits defaults; for example, Shield Wall jumps 93 → (none) → 108 at gems 5 → 6 → 7.

### 1.6 XP and the level cap

Appendix E §6.2 owns the XP rules. In short:

- **Who earns XP:** every hero in the 6 roster slots plus the spell slot gains **100% of the XP the player gains**. Stashed heroes gain nothing.
- **Curve:** the player curve (PoE2's table, appendix E §6.1, with `K_xp` = 6).
- **Cap:** hero level ≤ **highest area level unlocked + 2** (hard cap 32). This is appendix E's reading of the brief's "area level + 2". XP past the cap is discarded.
- **Levelling does not change** a hero's mana cost or supports. Supports keep their tier until rerolled.

### 1.7 Quality (Gemcutter's Prism)

- Each Prism adds **+5% quality**, up to **20%**. The 5% step is from PoE2's Dec 2024 tuning in the research file.
- The bonus is the gem's own PoE2 `quality_stats`: **value × quality / 1000**. Example: Armour Breaker `armour_break_amount_+%: 1000` gives 1% per 1%, so 20% increased Armour Break at 20%.
- Each hero block lists its 20% bonus. Bonuses that are dead in KvN (Reservation Efficiency, a Limit on once-per-cooldown spells) are **adapted** and marked.
- Acolytes (**KvN custom**): +1% increased mana generated per 1% quality.

### 1.8 Unlock gate (when a skill can drop)

PoE2 gates skills behind uncut-gem level. A gem's `crafting_level` is its tier (1, 3, 5 … 13). The real breakpoints (research §1.7) would hide tier 9+ skills until area level 33, which is past the demo. KvN compresses them about 2×:

```
minimum area level to drop or sell = max(1, 2 × tier − 3)
```

| Tier | 1 | 3 | 4 | 5 | 7 | 9 | 11 | 13 |
|---|---|---|---|---|---|---|---|---|
| Unlock AL | 1 | 3 | 5 | 7 | 11 | 15 | 19 | 23 |

- Purity of Fire and Malice have `crafting_level 0`, so they are not in PoE2 0.5's uncut pool. They unlock at **AL 9** (**KvN custom**).
- KvN custom acolytes: basic AL 1, Shrinewarden AL 5, Twin Votaries AL 7.
- Starter-kit grants ignore the gate.

### 1.9 Rarity and support slots

| Rarity | Supports | Roll split | Colour |
|---|---|---|---|
| Normal | 0 | – | white |
| Magic | 1–2 | 60% → 1, 40% → 2 | blue |
| Rare | 3–4 | 65% → 3, 35% → 4 | yellow |
| (cap) | 5 | Jeweller's Orbs only | – |

- **Jeweller's Orbs** (appendix C §C.5): each adds one slot and immediately rolls a support into it with the §1.10 algorithm, at the hero's current level. Lesser works below 3 slots, Greater below 4, Perfect below 5 (the hard cap).
- **Rarity follows the support count.** A Normal hero given a slot becomes Magic, and a 2-support Magic hero becomes Rare at 3.
- **Small pools:** some heroes have few compatible supports (for example, Purity of Fire has 3). If a roll asks for more than the pool holds, the hero takes the whole pool and its rarity drops to match.
- **No unique heroes** (brief).

### 1.10 Support roll algorithm

**Inputs:** the hero's skill types, hero level, the gem's `recommended_supports`, and the KvN support catalog (§5).

1. **Pool = KvN catalog** (66 PoE2 supports + 5 KvN custom). Lineage supports and supports with `crafting_level 0` never roll.
2. **PoE2 compatibility.** Evaluate the support's `allowed_types` and `excluded_types` against the skill's `active_skill.types`. Both are RPN with `AND` / `OR` / `NOT`; leftover stack items are OR-ed. For crossbow heroes, use the union of the shot skill's and the Ammo skill's types; for War Banner, the banner's and the reservation skill's. Acolytes use KvN types `Buff, Persistent, KvNAcolyte`.
3. **Tier gate:** tier I needs hero level 1+, tier II needs **12+**, tier III needs **24+**. Tier = the Roman numeral in the name; unnumbered supports map from `crafting_level` (1–2 → I, 3–4 → II, 5 → III).
4. **No dead rolls (KvN).** Drop supports that cannot do anything on this hero:
   - **Implicit "cannot" flags.** Lightning Spear has `cannot_pierce`, `projectiles_cannot_fork` and `base_projectiles_cannot_chain`, so it never gets Pierce, Fork or Chain. Pierce-all skills (Explosive Spear, Frostbolt) never get Pierce, Fork or Chain.
   - **Damage-type gates.** Fire supports need fire damage, Bleed needs Physical, Brutality needs a mostly-Physical skill, and Attunements must not cut the hero's main element.
   - **Role gates.** Longshot is for non-melee, Close Combat for melee, Stun supports are excluded on Boneshatter (−100% stun), and Exploit Weakness is excluded on Armour Break heroes.
5. **Weights:** 1 each, **×3** if the support's id is in the gem's `recommended_supports`.
6. **Draw without replacement.** After each pick, remove:
   - the same support;
   - every other tier of the same family (Brutality I blocks II and III);
   - conflict partners (table below).
7. Repeat until the rolled count is reached or the pool is empty.

**Conflict groups (KvN, anti-synergy blockers):**

| If the hero has… | …it cannot also roll |
|---|---|
| any Attunement | another Attunement |
| any Brutality | Elemental Armament, Elemental Focus, Attunements, Ignite, Freeze, Frost Nexus, Shock, Shock Conduction, Lightning Exposure, all Penetration |
| Elemental Focus | Ignite, Fiery Death, Freeze, Frost Nexus, Shock, Shock Conduction, Lightning Exposure |
| Controlled Destruction | Pinpoint Critical, Supercritical, Ambush |
| Exploit Weakness | Armour Break I |

```python
def roll_supports(hero, count, catalog):
    pool = [s for s in catalog
            if poe2_compatible(s, hero.skill_types)
            and s.tier_min_level <= hero.level            # 1 / 12 / 24
            and not dead_on(s, hero)]
    picked = []
    while len(picked) < count and pool:
        weights = [3 if s.id in hero.gem.recommended_supports else 1 for s in pool]
        s = random.choices(pool, weights)[0]
        picked.append(s)
        pool = [p for p in pool if p.family != s.family and not conflicts(p, s)]
    return picked
```

### 1.11 Mana cost and recharge

```
cost = round_to_nearest_25( role_base × Π support cost multipliers )      (minimum 25; .5 rounds up)
```

- Cost multipliers are PoE2 `skills.json → static.cost_multiplier` (120 means ×1.20).
- **Efficiency I** is **adapted**: its PoE2 "30% less Cost" becomes ×0.70 in the product.
- Hero level and items never change cost (brief).

| Example | Calculation | Cost |
|---|---|---|
| Normal Lightning Arrow | 100 | **100** |
| Rare Lightning Spear (worked example) | 150 × 1.20 × 1.00 × 1.00 = 180 | **175** |
| Magic Fireball with Efficiency I + Ignite I | 150 × 0.70 × 1.20 = 126 | **125** |
| Rare Rain of Arrows with Brutality I, Magnified Area I, Longshot I | 200 × 1.20 × 1.30 × 1.20 = 374.4 | **375** |

**Role bases and recharge** (brief ranges, tiers from PvZ):

| Role | Base mana | Recharge tier | Start-of-level delay |
|---|---|---|---|
| Acolyte | 50 (Shrinewarden 75, Twin Votaries 125) | fast 7.5 s (Shrinewarden slow, Twin very slow) | none / 20 s / 35 s |
| Wall | 50–75 | slow 30 s | 20 s |
| Basic ranged | 100 | fast 7.5 s | none |
| Advanced ranged / striker | 125–200 | fast 7.5 s (Rain of Arrows slow) | none |
| Spellcaster | 125–175 | fast 7.5 s | none |
| Curse / mark | 100–125 | fast 7.5 s | none |
| Aura | 150–200 | slow 30 s | 20 s |

---

## 2. Hero catalog

### 2.1 Roster at a glance

32 heroes: 3 acolytes, 8 melee, 8 ranged, 6 spellcasters, 3 curse/mark, 4 aura. Every PoE2 gem below exists in the export with `release_state: released`. None is a "Coming Soon" or [DNT] entry.

| # | Hero | Role | Weapon | Attr. | Unlock AL | Mana | Recharge | Life × | Damage |
|---|---|---|---|---|---|---|---|---|---|
| H01 | Ezomyte Acolyte ✦ | Acolyte (basic) | Sceptre | Int 100 | 1 | 50 | fast | ×1 | – |
| H02 | Twin Votaries ✦ | Acolyte (twin) | Sceptre | Int 100 | 7 | 125 | very slow | ×1 | – |
| H03 | Shrinewarden ✦ | Acolyte (sturdy) | Sceptre | Str 50 / Int 50 | 5 | 75 | slow | ×4 | – |
| H04 | Shield Wall | Wall | One Hand Mace + Shield | Str 100 | 11 | 75 | slow | ×4 | phys |
| H05 | Armour Breaker | Wall | One Hand Mace | Str 100 | 3 | 50 | slow | ×8 | phys |
| H06 | Boneshatter | Striker | Two Hand Mace | Str 100 | 1 | 125 | fast | ×2.5 | phys |
| H07 | Rolling Slam | Striker | Two Hand Mace | Str 100 | 1 | 150 | fast | ×2.5 | phys |
| H08 | Sunder | Striker | Two Hand Mace | Str 100 | 15 | 175 | fast | ×2.5 | phys |
| H09 | Ice Strike | Striker | Quarterstaff | Dex 50 / Int 50 | 7 | 125 | fast | ×2 | cold, phys |
| H10 | Falling Thunder | Striker | Quarterstaff | Dex 50 / Int 50 | 1 | 125 | fast | ×2 | lightning, phys |
| H11 | Fangs of Frost | Striker | Spear | Dex 100 | 3 | 125 | fast | ×2.5 | cold, phys |
| H12 | Lightning Arrow | Basic ranged | Bow | Dex 100 | 1 | 100 | fast | ×1 | lightning, phys |
| H13 | Ice Shot | Advanced ranged | Bow | Dex 100 | 15 | 150 | fast | ×1 | cold, phys |
| H14 | Rain of Arrows | Advanced ranged | Bow | Dex 100 | 15 | 200 | slow | ×1 | phys |
| H15 | Poisonburst Arrow | Basic ranged | Bow | Dex 100 | 1 | 100 | fast | ×1 | chaos, phys |
| H16 | Lightning Spear | Advanced ranged | Spear | Dex 100 | 3 | 150 | fast | ×1.25 | lightning, phys |
| H17 | Explosive Spear | Advanced ranged | Spear | Dex 100 | 1 | 125 | fast | ×1.25 | fire, phys |
| H18 | Armour Piercing Rounds | Basic ranged | Crossbow | Str 50 / Dex 50 | 1 | 100 | fast | ×1.25 | phys |
| H19 | Permafrost Bolts | Advanced ranged | Crossbow | Str 50 / Dex 50 | 1 | 150 | fast | ×1.25 | cold, phys |
| H20 | Fireball | Spellcaster | Wand | Int 100 | 3 | 150 | fast | ×1 | fire |
| H21 | Flame Wall | Spellcaster | Staff | Int 100 | 1 | 175 | fast | ×1 | fire |
| H22 | Frostbolt | Spellcaster | Wand | Int 100 | 7 | 150 | fast | ×1 | cold |
| H23 | Ice Nova | Spellcaster | Staff | Int 100 | 1 | 150 | fast | ×1 | cold |
| H24 | Spark | Spellcaster | Wand | Int 100 | 1 | 125 | fast | ×1 | lightning |
| H25 | Essence Drain | Spellcaster | Wand | Int 100 | 3 | 150 | fast | ×1 | chaos |
| H26 | Despair | Curse | Staff | Int 100 | 15 | 100 | fast | ×1 | – |
| H27 | Vulnerability | Curse | Staff | Int 100 | 11 | 100 | fast | ×1 | – |
| H28 | Freezing Mark | Mark | Bow | Dex 50 / Int 50 | 11 | 125 | fast | ×1 | – |
| H29 | Herald of Ice | Aura (global) | Sceptre | Dex 50 / Int 50 | 5 | 175 | slow | ×1.5 | cold |
| H30 | Purity of Fire | Aura (global) | Sceptre | Str 25 / Int 75 | 9 | 150 | slow | ×1.5 | – |
| H31 | War Banner | Aura (positional) | Sceptre | Str 50 / Dex 50 | 5 | 200 | slow | ×1.5 | – |
| H32 | Malice | Aura (positional) | Sceptre | Str 25 / Int 75 | 9 | 175 | slow | ×1.5 | – |

**How to read a hero block:**

- **Header:** PoE2 ids, role, weapon, attribute weights, tier → unlock AL, mana, recharge, life multiplier.
- **TD behaviour:** targeting, range, shape and on-hit rules on the 5×9 grid.
- **Key numbers:** hero levels 1, 10, 20 and 30, which are gem levels 1, 4, 6.5 and 8.8.
  - For attacks, the table also shows a **reference base**: the normal weapon of that class with the highest drop level ≤ hero level, and the hit and attack time it gives. These rows are for calibration only, since real gear varies.
  - Reference hits are shown before conversion and before any support or passive.
- **Recommended supports:** 6–8 picks (★ = PoE2's own list, 3× roll weight), with the tier in brackets. Freezing Mark and the aura heroes list 3–5, because that is their whole compatible pool.

### 2.2 Acolytes (economy)

All three are **KvN custom**. They wield sceptres, never attack, and make mana orbs.

**Shared formula** (brief): `mana per orb = 25 × (1 + Spirit / 200)`, plus **KvN custom** support modifiers:

```
orb = (25 + flat mana per orb) × (1 + Spirit/200) × (1 + increased mana generated)
interval = base interval × (1 − reduced mana generation interval)
```

### H01. Ezomyte Acolyte (KvN custom)

`KvN/Heroes/EzomyteAcolyte` · **KvN custom**: no PoE2 gem

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Acolyte (basic) | Sceptre | Int 100 | – → AL 1 | 50 | fast 7.5 s | ×1 |

PoE2 tags: kvn_acolyte, buff, persistent (KvN custom types).

**TD behaviour**

- **Targeting:** None. Never attacks.
- **Output:** Drops one mana orb on its own tile every **24 s**. The first orb comes **3–12.5 s** (uniform) after placement, as with the PvZ Sunflower.
- **Orb value:** `25 × (1 + Spirit / 200)` mana, rounded down to a whole number when collected.
- **Special:** Spirit comes from the sceptre, amulet, body armour and passives, plus +2 per hero level above 1 (**KvN custom**).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Spirit from hero level (+2 per level above 1) | 0 | 18 | 38 | 58 |
| Mana per orb, no gear (25 × (1 + Spirit/200)) | 25 | 27.25 | 29.75 | 32.25 |
| Mana per orb with +100 Spirit from gear | 37.5 | 39.75 | 42.25 | 44.75 |

Fixed at every level: Orbs per cycle · cycle: 1 · 24 s.

**Quality (Gemcutter's Prism, 20% max):** +1% increased mana generated per 1% quality (+20% at 20%). **KvN custom**.

**Recommended supports:** Abundant Offering (I), Fervent Prayer (I), Steadfast Devotion (I), Spirit Conduit (II), Heavy Tithe (III), Vitality I (I).

**TD notes:** The cheap opener. Buy two or three before anything else on levels 1–3. Squishy: put it in column 1 or 2, behind a wall.

### H02. Twin Votaries (KvN custom)

`KvN/Heroes/TwinVotaries` · **KvN custom**: no PoE2 gem

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Acolyte (twin) | Sceptre | Int 100 | – → AL 7 | 125 | very slow 50 s | ×1 |

PoE2 tags: kvn_acolyte, buff, persistent (KvN custom types).

**TD behaviour**

- **Targeting:** None. Never attacks.
- **Output:** Drops **two** orbs every 24 s, each worth `25 × (1 + Spirit / 200)`. The first pair comes 3–12.5 s after placement.
- **Special:** PvZ Twin Sunflower analogue: double output per tile for 2.5× the price and a very slow recharge.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Spirit from hero level (+2 per level above 1) | 0 | 18 | 38 | 58 |
| Mana per orb, no gear (25 × (1 + Spirit/200)) | 25 | 27.25 | 29.75 | 32.25 |
| Mana per orb with +100 Spirit from gear | 37.5 | 39.75 | 42.25 | 44.75 |

Fixed at every level: Orbs per cycle · cycle: 2 · 24 s.

**Quality (Gemcutter's Prism, 20% max):** +1% increased mana generated per 1% quality. **KvN custom**.

**Recommended supports:** Abundant Offering (I), Fervent Prayer (I), Spirit Conduit (II), Heavy Tithe (III), Vitality I (I), Thornskin I (I).

**TD notes:** Space saver for later levels, where tiles matter more than mana. It does not need an existing acolyte underneath (unlike PvZ).

### H03. Shrinewarden (KvN custom)

`KvN/Heroes/Shrinewarden` · **KvN custom**: no PoE2 gem

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Acolyte (sturdy) | Sceptre | Str 50 / Int 50 | – → AL 5 | 75 | slow 30 s | ×4 |

PoE2 tags: kvn_acolyte, buff, persistent (KvN custom types).

**TD behaviour**

- **Targeting:** None. Never attacks.
- **Output:** One orb every **30 s** (25% slower than the basic acolyte), worth `25 × (1 + Spirit / 200)`.
- **Special:** Life multiplier ×4, so it survives a leak or a Burrower (appendix D) that would kill a basic acolyte.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×4) | 200 | 704 | 1264 | 1824 |
| Str / Dex / Int | 11 / 7 / 11 | 20 / 7 / 20 | 30 / 7 / 30 | 40 / 7 / 40 |
| Spirit from hero level (+2 per level above 1) | 0 | 18 | 38 | 58 |
| Mana per orb, no gear (25 × (1 + Spirit/200)) | 25 | 27.25 | 29.75 | 32.25 |
| Mana per orb with +100 Spirit from gear | 37.5 | 39.75 | 42.25 | 44.75 |

Fixed at every level: Orbs per cycle · cycle: 1 · 30 s.

**Quality (Gemcutter's Prism, 20% max):** +1% increased mana generated per 1% quality. **KvN custom**.

**Recommended supports:** Steadfast Devotion (I), Spirit Conduit (II), Abundant Offering (I), Fervent Prayer (I), Vitality I (I), Thornskin I (I).

**TD notes:** For maps with Burrowers, Leapers or Graves, where the back row is not safe.


### 2.3 Melee: walls and strikers

### H04. Shield Wall

`Metadata/Items/Gem/SkillGemShieldWall` · skill `ShieldWallPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Wall | One Hand Mace + Shield (required) | Str 100 | tier 7 → AL 11 | 75 | slow 30 s | ×4 |

PoE2 tags: strength, attack, area, melee, physical, duration.

**TD behaviour**

- **Targeting:** Raises an earth **wall segment** on the first empty tile among the 1st and 2nd tiles ahead in its lane. It recasts when fewer than Limit (2) segments exist.
- **Cadence:** One raise per **2 × attack time** (base attack time 1.0 s, so 2.0 s raw, or 4.0 s in play at appendix A's `K_heroActionRate` 0.5; attack speed shortens it). It never raises onto a tile a monster occupies. **Adapted**: PoE2 has no cooldown here, but an instant re-raise would stall lanes forever.
- **Segment:** Has its own life (table below). It blocks monsters like a hero, so they stop and attack it. It lasts 6 s.
- **Explosion:** When a segment breaks, it explodes for the skill's hit along its lane: its own tile plus 3 tiles ahead (explosion length 4 m = 3.33 tiles). It deals 80% less if monsters break it within 0.5 s of being raised. When it **expires**, it counts as "destroyed by your skills" and deals 100% more.
- **Damage source:** Off-hand (shield) damage: the skill's base off-hand Physical damage plus 5–7 Physical per 15 Armour on the shield, times the attack damage %.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×4) | 232 | 808 | 1448 | 2088 |
| Str / Dex / Int | 15 / 7 / 7 | 33 / 7 / 7 | 53 / 7 / 7 | 73 / 7 / 7 |
| Attack damage | 65% | 86% | 104% | 119.8% |
| Base off-hand Physical (min) | 4 | 13 | 23.5 | 34 |
| Base off-hand Physical (max) | 6 | 20 | 35 | 51.4 |
| Wall segment life | 36 | 164 | 397 | 790 |

Fixed at every level: Wall duration · Limit: 6 s · 2; Crit (skill base): 5%.

**Quality (Gemcutter's Prism, 20% max):** +40% more damage when destroyed by its own skills (PoE2 2.0 per 1%).

**Recommended supports:** ★Magnified Area I (I), ★Brutality I (I), ★Brutality II (II), ★Heft (III), ★Brutality III (III), Overabundance I (I), Life Leech I (I), Close Combat I (I).

**TD notes:** The Wall-nut. Its segments soak hits while the hero stays safe behind them. Rarely kills anything, but it makes lanes "sticky" for area heroes behind it.

### H05. Armour Breaker

`Metadata/Items/Gems/SkillGemArmourBreaker` · skill `ArmourBreakerPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Wall | One Hand Mace (+ Shield) | Str 100 | tier 3 → AL 3 | 50 | slow 30 s | ×8 |

PoE2 tags: strength, attack, area, melee, strike, physical.

**TD behaviour**

- **Targeting:** Melee strike on the nearest monster in its own tile or 1 tile ahead.
- **Shape:** Single target (PoE2 MeleeSingleTarget).
- **On hit:** Breaks the listed Armour. Players break 3× against Normal and 2× against Magic monsters (PoE2 rule), and heroes count as players. At 0 Armour the target is Fully Broken for 12 s and takes 20% increased Physical damage from Hits.
- **Special:** PoE2 Knockback is cut (see Deviations).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×8) | 464 | 1616 | 2896 | 4176 |
| Str / Dex / Int | 15 / 7 / 7 | 33 / 7 / 7 | 53 / 7 / 7 | 73 / 7 / 7 |
| Attack damage | 50% | 66% | 80% | 92% |
| Reference base (normal, best drop level ≤ hero level) | Wooden Club 6–10, 0.690 s | Slim Mace 11–17, 0.645 s | Spiked Club 15–24, 0.690 s | Plated Mace 18–38, 0.714 s |
| Reference hit (Physical) | 3–5 | 7.3–11.2 | 12–19.2 | 16.6–35 |
| Attack time with reference base | 0.86 s | 0.81 s | 0.86 s | 0.89 s |
| Armour Break per hit (×3 vs Normal) | 3 | 24 | 74 | 171 |

Fixed at every level: Attack speed: 80% of base.

**Quality (Gemcutter's Prism, 20% max):** 20% increased Armour Break (1% per 1%).

**Recommended supports:** ★Rapid Attacks I (I), Brutality I (I), Brink I (I), Stun I (I), Life Leech I (I), Heft (III), Close Combat I (I), Impact Shockwave (I).

**TD notes:** The cheap Wall-nut: 50 mana with a ×8 life multiplier, plus block from a shield. It turns Armoured monsters (appendix D) into soft targets for physical heroes behind it.

### H06. Boneshatter

`Metadata/Items/Gems/SkillGemBoneshatter` · skill `BoneshatterPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Striker | Two Hand Mace | Str 100 | tier 1 → AL 1 | 125 | fast 7.5 s | ×2.5 |

PoE2 tags: strength, attack, area, melee, strike.

**TD behaviour**

- **Targeting:** Melee strike on the nearest monster in its own tile or 1 tile ahead.
- **On hit:** Deals the Initial Strike. Boneshatter itself builds **no** Stun (PoE2: −100% stun multiplier).
- **Shockwave:** If the target is **Primed for Stun** (40% Heavy Stun buildup on Normal, 50% Magic, 60% Rare, 70% Unique), the hit Heavy Stuns it and releases a Shockwave. The Shockwave has radius 2 m = **1.67 tiles** around the target, so it reaches adjacent lanes within 1.33 tiles. It deals 50% more if the target is Unique.
- **Special:** It needs a partner to prime monsters: Rolling Slam, Earthquake, Armour Breaker, Brink I, or physical ranged hits.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×2.5) | 145 | 505 | 905 | 1305 |
| Str / Dex / Int | 15 / 7 / 7 | 33 / 7 / 7 | 53 / 7 / 7 | 73 / 7 / 7 |
| Initial Strike damage | 100% | 132% | 158.5% | 180.4% |
| Shockwave damage | 200% | 264% | 320.5% | 370% |
| Reference base (normal, best drop level ≤ hero level) | Felled Greatclub 13–18, 0.909 s | Oak Greathammer 16–30, 1.000 s | Studded Greatclub 32–48, 0.909 s | Temple Maul 35–72, 0.833 s |
| Reference Strike hit | 13–18 | 21.1–39.6 | 50.7–76.1 | 63.1–129.9 |
| Reference Shockwave hit | 26–36 | 42.2–79.2 | 102.6–153.8 | 129.5–266.4 |
| Attack time with reference base | 1.52 s | 1.67 s | 1.52 s | 1.39 s |

Fixed at every level: Attack speed: 60% of base.

**Quality (Gemcutter's Prism, 20% max):** 20% increased attack speed.

**Recommended supports:** ★Impact Shockwave (I), ★Brutality I (I), ★Brutality II (II), ★Close Combat I (I), ★Heft (III), Rapid Attacks I (I), Exploit Weakness (I), Life Leech I (I).

**TD notes:** The payoff striker. It is weak alone and devastating behind a stun builder. It is the best answer to Brutes (Gargantuar archetype), because Primed Brutes take a Shockwave every swing.

### H07. Rolling Slam

`Metadata/Items/Gems/SkillGemRollingSlam` · skill `RollingSlamPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Striker | Two Hand Mace | Str 100 | tier 1 → AL 1 | 150 | fast 7.5 s | ×2.5 |

PoE2 tags: strength, attack, area, melee, slam.

**TD behaviour**

- **Targeting:** Swings when any monster is within 2 tiles ahead in its lane.
- **First slam:** Centred 1 tile ahead, radius 1.4 m = **1.17 tiles**: its own lane plus adjacent lanes within 0.6 tiles of the centre. It has 50% more Stun buildup, and PoE2 Knockback is cut.
- **Second slam:** Centred **2 tiles** ahead (PoE2: the hero "rolls forward"; the KvN hero stays put and the slam lands further on). Radius 1.8 m = **1.5 tiles**. It deals 50% more damage to Heavy Stunned monsters.
- **Timing:** The total attack time is weapon time ÷ 100% + **1.0 s** (PoE2 "+1 second to Total Attack Time").

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×2.5) | 145 | 505 | 905 | 1305 |
| Str / Dex / Int | 15 / 7 / 7 | 33 / 7 / 7 | 53 / 7 / 7 | 73 / 7 / 7 |
| First Slam damage | 75% | 99% | 120.5% | 138.6% |
| Second Slam damage | 150% | 198% | 240.5% | 277% |
| Reference base (normal, best drop level ≤ hero level) | Felled Greatclub 13–18, 0.909 s | Oak Greathammer 16–30, 1.000 s | Studded Greatclub 32–48, 0.909 s | Temple Maul 35–72, 0.833 s |
| Reference First Slam hit | 9.8–13.5 | 15.8–29.7 | 38.6–57.8 | 48.5–99.8 |
| Reference Second Slam hit | 19.5–27 | 31.7–59.4 | 77–115.4 | 97–199.4 |
| Total attack time with reference base | 1.91 s | 2.00 s | 1.91 s | 1.83 s |

**Quality (Gemcutter's Prism, 20% max):** 100% increased Stun Threshold while using the skill (PoE2 5.0 per 1%).

**Recommended supports:** ★Brink I (I), ★Brutality I (I), ★Brutality II (II), ★Close Combat I (I), ★Heft (III), ★Heavy Swing (II), ★Stun I (I), Armour Break I (I).

**TD notes:** The Warrior starter striker. It primes lanes for Boneshatter, and its second slam makes the 2nd tile ahead a kill zone.

### H08. Sunder

`Metadata/Items/Gems/SkillGemSunder` · skill `SunderPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Striker | Two Hand Mace | Str 100 | tier 9 → AL 15 | 175 | fast 7.5 s | ×2.5 |

PoE2 tags: strength, attack, area, melee, slam, duration, payoff.

**TD behaviour**

- **Targeting:** Slams when any monster is within 5 tiles ahead in its own lane.
- **Shape:** A **lane wave** of 5 sequential areas on tiles +1 to +5 ahead, each about 0.1 s apart. Wave radius is 0.9 m + 0.2 m per step = 0.75 tiles growing to 1.42 tiles, so the last steps clip adjacent lanes.
- **Shockwaves:** Up to 7 monsters hit per area each release a Shockwave of radius 1.2 m = **1.0 tile** (adjacent lanes at the same x).
- **Sundered Armour:** Hitting a Fully Armour Broken monster applies Sundered Armour for 6 s: +20% increased Physical damage taken, on top of Fully Broken.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×2.5) | 145 | 505 | 905 | 1305 |
| Str / Dex / Int | 15 / 7 / 7 | 33 / 7 / 7 | 53 / 7 / 7 | 73 / 7 / 7 |
| Wave damage | 160% | 214% | 261% | 305.4% |
| Shockwave damage | 65% | 87% | 106% | 123.6% |
| Reference base (normal, best drop level ≤ hero level) | Felled Greatclub 13–18, 0.909 s | Oak Greathammer 16–30, 1.000 s | Studded Greatclub 32–48, 0.909 s | Temple Maul 35–72, 0.833 s |
| Reference Wave hit | 20.8–28.8 | 34.2–64.2 | 83.5–125.3 | 106.9–219.9 |
| Attack time with reference base | 2.27 s | 2.50 s | 2.27 s | 2.08 s |

Fixed at every level: Attack speed: 40% of base.

**Quality (Gemcutter's Prism, 20% max):** PoE2: 50% reduced accuracy penalty by distance. **Adapted**: +50% accuracy against monsters 3 or more tiles away.

**Recommended supports:** ★Brutality I (I), ★Brutality II (II), ★Heavy Swing (II), ★Heft (III), Armour Break I (I), Magnified Area I (I), Rapid Attacks I (I), Brutality III (III).

**TD notes:** Mid-demo lane clearer. It pairs with Armour Breaker or Armour Piercing Rounds (Fully Broken leads to Sundered). It is slow, so put a wall in front of it.

### H09. Ice Strike

`Metadata/Items/Gems/SkillGemIceStrike` · skill `IceStrikePlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Striker | Quarterstaff | Dex 50 / Int 50 | tier 5 → AL 7 | 125 | fast 7.5 s | ×2 |

PoE2 tags: dexterity, intelligence, attack, area, melee, strike, cold.

**TD behaviour**

- **Targeting:** Melee strike on the nearest monster in its own tile or 1 tile ahead.
- **Combo:** Strikes 1 and 2 are fast (140% attack speed). **Strike 3 is the Final Strike**: 50% less attack speed, +0.7 m reach (it hits up to **2 tiles ahead**) and higher damage.
- **On hit:** Converts 80% of Physical to Cold, so it builds Chill and Freeze.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×2) | 84 | 300 | 540 | 780 |
| Str / Dex / Int | 7 / 11 / 11 | 7 / 20 / 20 | 7 / 30 / 30 | 7 / 40 / 40 |
| Normal Strike damage | 60% | 79% | 95% | 108% |
| Third Strike damage | 130% | 171% | 206% | 234.8% |
| Reference base (normal, best drop level ≤ hero level) | Wrapped Quarterstaff 7–12, 0.714 s | Long Quarterstaff 9–18, 0.714 s | Crescent Quarterstaff 19–39, 0.667 s | Steelpoint Quarterstaff 28–51, 0.714 s |
| Reference Normal Strike hit (pre-conversion) | 4.2–7.2 | 7.1–14.2 | 18.1–37 | 30.2–55.1 |
| Normal Strike time with reference base | 0.51 s | 0.51 s | 0.48 s | 0.51 s |

Fixed at every level: Attack speed: 140% of base (Third Strike: ×0.5); Weapon crit: 10% (quarterstaff base).

**Quality (Gemcutter's Prism, 20% max):** 20% increased attack speed.

**Recommended supports:** ★Cold Attunement (I), ★Elemental Armament I (I), ★Freeze (I), ★Close Combat I (I), Frost Nexus (I), Cold Penetration (I), Rapid Attacks I (I), Elemental Armament II (II).

**TD notes:** The Sorceress starter melee (it is Dex/Int). It is the best Freeze builder for Herald of Ice, and the quarterstaff base crit of 10% suits Malice.

### H10. Falling Thunder

`Metadata/Items/Gems/SkillGemFallingThunder` · skill `FallingThunderPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Striker | Quarterstaff | Dex 50 / Int 50 | tier 1 → AL 1 | 125 | fast 7.5 s | ×2 |

PoE2 tags: dexterity, intelligence, attack, area, melee, slam, projectile, lightning.

**TD behaviour**

- **Targeting:** Slams when any monster is within 3 tiles ahead in its lane.
- **Shape:** A **cone** 4 m = 3.33 tiles long: its own lane from +1 to +3 tiles, plus adjacent lanes from +2 to +3 tiles.
- **Charged slam (adapted):** PoE2 consumes Power Charges, but appendix A §9.9 cuts Charges. KvN instead makes **every 3rd slam** act as if 1 Power Charge were consumed. It fires **3 lightning projectiles** that Pierce all, spread over its own and adjacent lanes. Each deals 100% × 2 ("100% more if charged") × 1.5 ("50% more per charge") = **300%** attack damage.
- **On hit:** Converts 60% of Physical to Lightning (100% for the projectiles).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×2) | 84 | 300 | 540 | 780 |
| Str / Dex / Int | 7 / 11 / 11 | 7 / 20 / 20 | 7 / 30 / 30 | 7 / 40 / 40 |
| Slam damage | 140% | 185% | 221.5% | 252.6% |
| Reference base (normal, best drop level ≤ hero level) | Wrapped Quarterstaff 7–12, 0.714 s | Long Quarterstaff 9–18, 0.714 s | Crescent Quarterstaff 19–39, 0.667 s | Steelpoint Quarterstaff 28–51, 0.714 s |
| Reference slam hit (pre-conversion) | 9.8–16.8 | 16.7–33.3 | 42.1–86.4 | 70.7–128.8 |
| Attack time with reference base | 1.19 s | 1.19 s | 1.11 s | 1.19 s |

Fixed at every level: Projectile damage (before charge bonuses): 100%; Attack speed: 60% of base.

**Quality (Gemcutter's Prism, 20% max):** +20% more damage per Power Charge consumed, so a charged-slam projectile deals 100% × 2 × 1.7 = 340%.

**Recommended supports:** ★Lightning Attunement (I), ★Elemental Armament II (II), Elemental Armament I (I), Shock (I), Lightning Penetration (I), Multishot I (I), Shock Conduction (I), Close Combat I (I).

**TD notes:** The Ranger starter melee. A 3-tile cone every slam, and every 3rd slam adds a volley of piercing bolts down three lanes.

### H11. Fangs of Frost

`Metadata/Items/Gem/SkillGemFangsOfFrost` · skill `FangsOfFrostPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Striker | Spear (+ Shield) | Dex 100 | tier 3 → AL 3 | 125 | fast 7.5 s | ×2.5 |

PoE2 tags: dexterity, attack, area, melee, strike, cold.

**TD behaviour**

- **Targeting:** Melee stab on the nearest monster in its own tile or 1 tile ahead (+0.4 m reach).
- **On hit:** Converts 80% of Physical to Cold and has more Chill and Freeze buildup (table).
- **Off-balance burst (adapted):** PoE2 Parry needs a buckler, and appendix A §9.9 cuts parry and active block. KvN uses **passive shield block** instead. When this hero blocks a monster's attack, that monster is marked **Off Balance** (the PoE2 Parried debuff). The next stab on it consumes the mark for a frost **Explosion** of radius 2.2 m = **1.83 tiles**, and leaves that tile as Chilled Ground for 8 s.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×2.5) | 105 | 375 | 675 | 975 |
| Str / Dex / Int | 7 / 15 / 7 | 7 / 33 / 7 | 7 / 53 / 7 | 7 / 73 / 7 |
| Stab damage | 95% | 125% | 150.5% | 171.4% |
| Explosion damage | 110% | 147% | 180% | 209.6% |
| Stab: more Chill / Freeze buildup | 100% | 109% | 116.5% | 123.4% |
| Explosion: more Chill / Freeze buildup | 200% | 218% | 233% | 246.8% |
| Reference base (normal, best drop level ≤ hero level) | Hardwood Spear 5–9, 0.625 s | Hunting Spear 10–17, 0.645 s | Winged Spear 12–22, 0.588 s | Forked Spear 13–38, 0.645 s |
| Reference stab hit (pre-conversion) | 4.8–8.5 | 12.5–21.2 | 18.1–33.1 | 22.3–65.1 |
| Attack time with reference base | 0.74 s | 0.76 s | 0.69 s | 0.76 s |

Fixed at every level: Attack speed: 85% of base.

**Quality (Gemcutter's Prism, 20% max):** 15% chance not to consume Parried (0.75% per 1%).

**Recommended supports:** ★Cold Attunement (I), ★Elemental Armament I (I), ★Elemental Armament II (II), Freeze (I), Frost Nexus (I), Cold Penetration (I), Rapid Attacks I (I), Close Combat I (I).

**TD notes:** A spear-and-shield brawler. The shield turns block chance into explosions, so give it a high-block shield.


### 2.4 Ranged attackers

**Crossbow rule (adapted):** the export has no crossbow reload time. A crossbow hero fires its clip at the shot skill's attack speed, then spends the **Ammo skill's cast time** reloading.

### H12. Lightning Arrow

`Metadata/Items/Gems/SkillGemLightningArrow` · skill `LightningArrowPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Basic ranged | Bow | Dex 100 | tier 1 → AL 1 | 100 | fast 7.5 s | ×1 |

PoE2 tags: dexterity, attack, area, projectile, lightning, chaining.

**TD behaviour**

- **Targeting:** The first monster ahead in its own lane, at any distance.
- **Shape:** A lane projectile. The arrow itself **cannot Chain**.
- **On hit:** Fires lightning **beams** at up to N extra monsters within 3.2 m = **2.67 tiles** of the target, in any lane. Each beam Chains 2 times, to the nearest monster within 2 tiles (brief rule).
- **Conversion:** Arrow 80% Physical to Lightning; beams 100%.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 15 / 7 | 7 / 33 / 7 | 7 / 53 / 7 | 7 / 73 / 7 |
| Arrow damage | 80% | 106% | 126.5% | 144.6% |
| Reference base (normal, best drop level ≤ hero level) | Crude Bow 6–9, 0.833 s | Shortbow 7–14, 0.800 s | Recurve Bow 15–31, 0.909 s | Dualstring Bow 19–35, 0.870 s |
| Reference arrow hit (pre-conversion) | 4.8–7.2 | 7.4–14.8 | 19–39.2 | 27.5–50.6 |
| Attack time with reference base | 0.93 s | 0.89 s | 1.01 s | 0.97 s |

Fixed at every level: Beam damage (no per-level value; flat): 100%; Extra beam targets: 2; Attack speed: 90% of base.

**Quality (Gemcutter's Prism, 20% max):** 40% more chance to Shock (2.0 per 1%).

**Recommended supports:** ★Chain I (I), ★Lightning Attunement (I), ★Shock Conduction (I), ★Fork (II), ★Charged Shots I (I), Elemental Armament I (I), Lightning Penetration (I), Longshot I (I).

**TD notes:** The Ranger starter ranged hero and the calibration hero for "8–10 hits per white monster". Its beams make it a soft area hero against packs.

### H13. Ice Shot

`Metadata/Items/Gem/SkillGemIceShot` · skill `IceShotPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Advanced ranged | Bow | Dex 100 | tier 9 → AL 15 | 150 | fast 7.5 s | ×1 |

PoE2 tags: dexterity, attack, projectile, cold.

**TD behaviour**

- **Targeting:** The first monster ahead in its own lane.
- **On hit:** The arrow (80% to Cold, 50% more Chill, 25% more Freeze buildup) sprays a cone of **shards** forward from the target. Lane-literal split: half the shards continue in its own lane and a quarter go into each adjacent lane. Each shard hits the first monster within 3.75 tiles (4.5 m) behind the target.
- **Special:** The shards are the Snow Pea effect spread over 3 lanes.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 15 / 7 | 7 / 33 / 7 | 7 / 53 / 7 | 7 / 73 / 7 |
| Arrow damage | 95% | 126% | 152.5% | 176% |
| Shards | 8 | 8 | 9 | 9 |
| Reference base (normal, best drop level ≤ hero level) | Crude Bow 6–9, 0.833 s | Shortbow 7–14, 0.800 s | Recurve Bow 15–31, 0.909 s | Dualstring Bow 19–35, 0.870 s |
| Reference arrow hit (pre-conversion) | 5.7–8.5 | 8.8–17.6 | 22.9–47.3 | 33.4–61.6 |
| Attack time with reference base | 0.93 s | 0.89 s | 1.01 s | 0.97 s |

Fixed at every level: Shard damage (flat): 100%; Attack speed: 90% of base.

**Quality (Gemcutter's Prism, 20% max):** 30% more Chill magnitude (1.5 per 1%).

**Recommended supports:** ★Chain I (I), ★Cold Attunement (I), ★Elemental Armament II (II), ★Longshot I (I), ★Deliberation (II), ★Pierce III (III), Freeze (I), Cold Penetration (I).

**TD notes:** The chill backbone of cold teams. It slows packs before they reach the walls.

### H14. Rain of Arrows

`Metadata/Items/Gems/SkillGemRainOfArrows` · skill `RainOfArrowsPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Advanced ranged | Bow | Dex 100 | tier 9 → AL 15 | 200 | slow 30 s | ×1 |

PoE2 tags: dexterity, attack, area, projectile, sustained.

**TD behaviour**

- **Targeting:** The point with the most monsters within a 3-tile radius, in any lane, up to 8 tiles ahead.
- **Shape:** A **rain zone** of radius 3.6 m = **3.0 tiles**, which reaches every lane within 3 of the centre. Arrows land one every 0.08 s at random points in the zone. Each impact has radius 0.7 m = 0.58 tiles. A monster can be hit at most once per 0.12 s.
- **Limit:** One rain at a time. A new attack replaces the old rain.
- **Special:** The Frenzy Charge bonus (+150% arrows) is cut, because KvN has no frenzy charges.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 15 / 7 | 7 / 33 / 7 | 7 / 53 / 7 | 7 / 73 / 7 |
| Arrow damage | 50% | 66% | 80% | 92% |
| Arrows per rain | 30 | 31 | 32 | 33 |
| Reference base (normal, best drop level ≤ hero level) | Crude Bow 6–9, 0.833 s | Shortbow 7–14, 0.800 s | Recurve Bow 15–31, 0.909 s | Dualstring Bow 19–35, 0.870 s |
| Reference arrow hit (Physical) | 3–4.5 | 4.6–9.2 | 12–24.8 | 17.5–32.2 |
| Attack time with reference base | 1.04 s | 1.00 s | 1.14 s | 1.09 s |

Fixed at every level: Rain length: arrows × 0.08 s (2.4 s at 30); Attack speed: 80% of base.

**Quality (Gemcutter's Prism, 20% max):** Arrows fall 20% faster.

**Recommended supports:** ★Armour Break I (I), ★Brutality II (II), ★Deliberation (II), ★Brutality III (III), ★Brutality I (I), Longshot I (I), Bleed I (I), Magnified Area I (I).

**TD notes:** The board-wide physical carpet. It is expensive and slow to recharge, and it covers about 3 lanes by 6 columns. It pairs with Vulnerability.

### H15. Poisonburst Arrow

`Metadata/Items/Gem/SkillGemPoisonBurstArrow` · skill `PoisonBurstArrowPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Basic ranged | Bow | Dex 100 | tier 1 → AL 1 | 100 | fast 7.5 s | ×1 |

PoE2 tags: dexterity, attack, area, projectile, chaos, duration.

**TD behaviour**

- **Targeting:** The first monster ahead in its own lane.
- **On hit:** The arrow hits for Physical. It then releases a **Poison Burst** around the target: radius 1.5 m = 1.25 tiles, rising to 1.9 m = 1.58 tiles at gem 9. The Burst does not Hit; it Poisons every monster in range as though hitting them. The Poison lasts 3 s and is affected by skill effect duration.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 15 / 7 | 7 / 33 / 7 | 7 / 53 / 7 | 7 / 73 / 7 |
| Arrow damage | 88% | 116% | 139.5% | 158.6% |
| Burst radius (m) | 1.5 | 1.6 | 1.75 | 1.88 |
| Reference base (normal, best drop level ≤ hero level) | Crude Bow 6–9, 0.833 s | Shortbow 7–14, 0.800 s | Recurve Bow 15–31, 0.909 s | Dualstring Bow 19–35, 0.870 s |
| Reference arrow hit (Physical) | 5.3–7.9 | 8.1–16.2 | 20.9–43.2 | 30.1–55.5 |
| Attack time with reference base | 0.83 s | 0.80 s | 0.91 s | 0.87 s |

Fixed at every level: Burst (poison basis, flat): 100%; Attack speed: 100% of base.

**Quality (Gemcutter's Prism, 20% max):** 10% more Poison magnitude (0.5 per 1%).

**Recommended supports:** ★Pierce I (I), ★Prolonged Duration I (I), ★Deliberation (II), ★Pierce III (III), Poison I (I), Magnified Area I (I), Multishot I (I), Fork (II).

**TD notes:** A cheap area-damage-over-time hero for swarm levels. Poison ignores Energy Shield (PoE2 rule).

### H16. Lightning Spear

`Metadata/Items/Gems/SkillGemLightningSpear` · skill `LightningSpearPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Advanced ranged | Spear (+ Shield) | Dex 100 | tier 3 → AL 3 | 150 | fast 7.5 s | ×1.25 |

PoE2 tags: dexterity, attack, area, projectile, lightning.

**TD behaviour**

- **Targeting:** The first monster ahead in its own lane.
- **Shape:** A single thrown spear, a lane projectile. It **cannot Pierce, Fork or Chain**.
- **On hit:** Bursts into **5 lightning bolts** (+ projectile modifiers) aimed at up to 5 **other** monsters within 5 m = **4.17 tiles** of the target, in any lane. Each bolt hits its target; bolts never return to the main target.
- **Special:** The Frenzy-Charge split is cut. Multishot-type supports add bolts, not spears.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1.25) | 52 | 188 | 338 | 488 |
| Str / Dex / Int | 7 / 15 / 7 | 7 / 33 / 7 | 7 / 53 / 7 | 7 / 73 / 7 |
| Spear damage | 110% | 145% | 174% | 199% |
| Bolt damage | 75% | 99% | 119% | 135.6% |
| Reference base (normal, best drop level ≤ hero level) | Hardwood Spear 5–9, 0.625 s | Hunting Spear 10–17, 0.645 s | Winged Spear 12–22, 0.588 s | Forked Spear 13–38, 0.645 s |
| Reference spear hit (pre-conversion) | 5.5–9.9 | 14.5–24.6 | 20.9–38.3 | 25.9–75.6 |
| Attack time with reference base | 1.04 s | 1.08 s | 0.98 s | 1.08 s |

Fixed at every level: Bolts: 5; Attack speed: 60% of base.

**Quality (Gemcutter's Prism, 20% max):** +2 bolts (0.1 per 1%).

**Recommended supports:** ★Lightning Attunement (I), ★Elemental Armament I (I), ★Elemental Armament II (II), Multishot I (I), Lightning Penetration (I), Shock (I), Longshot I (I), Rapid Attacks I (I).

**TD notes:** The worked-example hero. It is a single-target spear plus 5 smart bolts, so it is strong into spread-out mixed waves. It can hold a shield.

### H17. Explosive Spear

`Metadata/Items/Gem/SkillGemExplosiveSpear` · skill `ExplosiveSpearPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Advanced ranged | Spear (+ Shield) | Dex 100 | tier 1 → AL 1 | 125 | fast 7.5 s | ×1.25 |

PoE2 tags: dexterity, attack, area, projectile, fire, duration, detonator.

**TD behaviour**

- **Targeting:** The tile of the first monster ahead in its own lane.
- **Shape:** The spear **Pierces all** monsters on the way (spear damage, 60% to Fire). It **lodges** at the target point.
- **Detonation:** It explodes after **2.5 s** (or when another hero's Detonator hit, such as an Explosive Shot, lands within 1 tile). Explosion radius 2.8 m = **2.33 tiles**, which reaches ±2 lanes. The explosion is 100% Fire.
- **Limit:** 1 lodged spear, or 2 from gem 8. The hero does not throw while at Limit.
- **Special:** The Frenzy-Charged cross explosion is cut.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1.25) | 52 | 188 | 338 | 488 |
| Str / Dex / Int | 7 / 15 / 7 | 7 / 33 / 7 | 7 / 53 / 7 | 7 / 73 / 7 |
| Spear (pierce) damage | 50% | 66% | 79.5% | 90.2% |
| Explosion damage | 135% | 179% | 216.5% | 249.4% |
| Lodged spear Limit | 1 | 1 | 1 | 2 |
| Reference base (normal, best drop level ≤ hero level) | Hardwood Spear 5–9, 0.625 s | Hunting Spear 10–17, 0.645 s | Winged Spear 12–22, 0.588 s | Forked Spear 13–38, 0.645 s |
| Reference explosion hit (pre-conversion) | 6.8–12.2 | 17.9–30.4 | 26–47.6 | 32.4–94.8 |
| Attack time with reference base | 0.78 s | 0.81 s | 0.73 s | 0.81 s |

Fixed at every level: Attack speed: 80% of base.

**Quality (Gemcutter's Prism, 20% max):** +0.4 m explosion radius (2.8 to 3.2 m = 2.67 tiles).

**Recommended supports:** ★Elemental Armament I (I), ★Magnified Area I (I), ★Short Fuse I (I), ★Elemental Armament II (II), ★Deliberation (II), ★Ignite III (III), ★Fire Penetration II (II), Overabundance I (I).

**TD notes:** A Potato Mine-style delayed area hero. It is great against slow, dense waves and bad against Runners, which leave the blast before it goes off.

### H18. Armour Piercing Rounds

`Metadata/Items/Gem/SkillGemArmourPiercingRounds` · skill `ArmourPiercingBoltsPlayer` · ammo skill `ArmourPiercingBoltsAmmoPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Basic ranged | Crossbow | Str 50 / Dex 50 | tier 1 → AL 1 | 100 | fast 7.5 s | ×1.25 |

PoE2 tags: strength, dexterity, attack, ammunition, projectile, physical.

**TD behaviour**

- **Targeting:** The first monster ahead in its own lane.
- **Shape:** Rapid single bolts down its lane (Gatling Pea).
- **Clip:** Fires a clip of 12–16 bolts at +325% attack speed, then **reloads** for 0.6 s. **Adapted**: the export has no crossbow reload time, so KvN uses the Ammo skill's cast time.
- **On hit:** Each bolt Breaks Armour (×3 vs Normal). PoE2 Knockback is cut.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1.25) | 62 | 220 | 395 | 570 |
| Str / Dex / Int | 11 / 11 / 7 | 20 / 20 / 7 | 30 / 30 / 7 | 40 / 40 / 7 |
| Bolt damage | 25% | 33% | 40.5% | 46.4% |
| Bolts per clip | 12 | 13 | 14 | 15 |
| Armour Break per bolt | 1 | 5 | 14.5 | 32.8 |
| Reference base (normal, best drop level ≤ hero level) | Makeshift Crossbow 7–12, 0.625 s | Sturdy Crossbow 11–26, 0.645 s | Dyad Crossbow 9–37, 0.625 s | Alloy Crossbow 12–50, 0.588 s |
| Reference bolt hit (Physical) | 1.8–3 | 3.6–8.6 | 3.6–15 | 5.6–23.2 |
| Time per bolt with reference base | 0.15 s | 0.15 s | 0.15 s | 0.14 s |

Fixed at every level: Attack speed · reload: 425% of base · 0.6 s.

**Quality (Gemcutter's Prism, 20% max):** 20% increased Armour Break.

**Recommended supports:** ★Chain I (I), ★Multishot I (I), Brutality I (I), Pierce I (I), Longshot I (I), Heft (III), Bleed I (I), Rapid Attacks I (I).

**TD notes:** The Warrior starter ranged hero. It strips Armoured monsters for Rolling Slam and Sunder. It is a Str/Dex hybrid, so its life is a little higher.

### H19. Permafrost Bolts

`Metadata/Items/Gem/SkillGemPermafrostBolts` · skill `PermafrostBoltsPlayer` · ammo skill `PermafrostBoltsAmmoPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Advanced ranged | Crossbow | Str 50 / Dex 50 | tier 1 → AL 1 | 150 | fast 7.5 s | ×1.25 |

PoE2 tags: strength, dexterity, attack, area, ammunition, projectile, cold.

**TD behaviour**

- **Targeting:** The first monster ahead in its own lane.
- **Shape:** Each shot fires **10 fragments** down its own lane (80% to Cold). Fragments Pierce 2 (3 from gem 8) and can all hit the same target (PoE2 crossbow rule).
- **Cone:** After the last pierce, fragments shatter in a cone 2.7 m = **2.25 tiles** deep behind the final target, reaching adjacent lanes from 1 tile behind.
- **Clip:** 1 bolt per clip, then a 0.8 s reload (Ammo cast time; **adapted**).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1.25) | 62 | 220 | 395 | 570 |
| Str / Dex / Int | 11 / 11 / 7 | 20 / 20 / 7 | 30 / 30 / 7 | 40 / 40 / 7 |
| Fragment damage (each) | 17% | 22% | 27% | 30.6% |
| Pierce | 2 | 2 | 2 | 3 |
| More Chill / Freeze buildup | 200% | 248% | 288% | 324.8% |
| Reference base (normal, best drop level ≤ hero level) | Makeshift Crossbow 7–12, 0.625 s | Sturdy Crossbow 11–26, 0.645 s | Dyad Crossbow 9–37, 0.625 s | Alloy Crossbow 12–50, 0.588 s |
| Reference fragment hit (pre-conversion) | 1.2–2 | 2.4–5.7 | 2.4–10 | 3.7–15.3 |

Fixed at every level: Fragments per shot: 10; Attack speed · reload: 100% of base · 0.8 s.

**Quality (Gemcutter's Prism, 20% max):** +2 fragments per shot (0.1 per 1%).

**Recommended supports:** ★Pierce I (I), ★Elemental Armament I (I), ★Frost Nexus (I), ★Freeze (I), Cold Penetration (I), Cold Attunement (I), Longshot I (I), Elemental Armament II (II).

**TD notes:** The freeze cannon. One shot often Freezes a Normal monster outright, which sets up Herald of Ice shatters.


### 2.5 Spellcasters

Spell heroes use the skill's PoE2 base damage, cast time and base crit. Their wand or staff adds spell mods only.

### H20. Fireball

`Metadata/Items/Gem/SkillGemFireball` · skill `FireballPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Spellcaster | Wand | Int 100 | tier 3 → AL 3 | 150 | fast 7.5 s | ×1 |

PoE2 tags: intelligence, spell, area, projectile, fire.

**TD behaviour**

- **Targeting:** The first monster ahead in its own lane, up to **10 tiles** (12 m range override).
- **On hit:** The projectile hits the collided monster. Then it **explodes**: radius 1.7 m = **1.42 tiles**, hitting every other monster in range, which includes adjacent lanes within 1.0 tile.
- **Special:** The Fire-Infusion firebolt ring is cut (Infusions are cut).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Projectile base Fire damage | 8–12 | 19–29 | 33–48.5 | 48.4–72.8 |
| Explosion base Fire damage | 8–12 | 19–29 | 33–48.5 | 48.4–72.8 |

Fixed at every level: Cast time · crit: 1.20 s · 7%.

**Quality (Gemcutter's Prism, 20% max):** 10% chance to fire 2 additional projectiles (they fan into adjacent lanes).

**Recommended supports:** ★Ignite I (I), ★Controlled Destruction (I), ★Fiery Death (I), ★Fire Penetration I (I), ★Deliberation (II), ★Fire Penetration II (II), Multishot I (I), Magnified Area I (I).

**TD notes:** The Peashooter-with-splash of caster teams. It ignites through Flammability, so it combos with Flame Wall.

### H21. Flame Wall

`Metadata/Items/Gems/SkillGemFlameWall` · skill `FlameWallPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Spellcaster | Staff | Int 100 | tier 1 → AL 1 | 175 | fast 7.5 s | ×1 |

PoE2 tags: intelligence, spell, area, fire, duration.

**TD behaviour**

- **Targeting:** Casts a **column wall** 2 tiles ahead of itself. Wall length is 5 m = 4.17 tiles, centred on its own lane, so it covers its lane ±2 (the full column when placed in lane 3).
- **Burn:** Monsters standing in the wall take the listed Fire damage per second, and the wall Ignites as though dealing the listed hit.
- **Torchwood:** Any **allied projectile** passing through the wall gains the listed added Fire damage, once per projectile.
- **Limit:** Up to 3 walls. While one is active, further casts go 3 and then 4 tiles ahead. The hero recasts as walls expire.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Wall Fire damage over time | 1.8/s | 4.2/s | 7.3/s | 11.2/s |
| Ignite basis (as if dealing) | 5–8 | 13–19 | 22–33.5 | 33.8–50.4 |
| Added Fire to projectiles | 2–3 | 4–6 | 6.5–9.5 | 8.8–13.6 |
| Wall duration (s) | 4.5 | 4.8 | 5.05 | 5.28 |

Fixed at every level: Cast time · crit: 1.00 s · 5%.

**Quality (Gemcutter's Prism, 20% max):** 20% more Flammability magnitude.

**Recommended supports:** ★Prolonged Duration I (I), ★Considered Casting (I), ★Ignite III (III), Swift Affliction I (I), Ignite I (I), Magnified Area I (I), Fire Penetration I (I), Spell Echo (I).

**TD notes:** It is literally Torchwood. Put it in the middle lane in front of a bank of bows or crossbows. Permafrost Bolts' 10 fragments each pick up the added Fire.

### H22. Frostbolt

`Metadata/Items/Gems/SkillGemFrostbolt` · skill `FrostboltPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Spellcaster | Wand | Int 100 | tier 5 → AL 7 | 150 | fast 7.5 s | ×1 |

PoE2 tags: intelligence, spell, area, projectile, cold.

**TD behaviour**

- **Targeting:** Fires when any monster is ahead in its own lane.
- **Shape:** A slow projectile that **Pierces all** monsters along the whole lane.
- **Explosion:** When the bolt hits "terrain" it explodes with radius 2.4 m = **2.0 tiles**. Terrain means a Rock tile, a Shieldbearer's shield, or the right board edge. **Adapted**: lanes have no walls.
- **Combo:** An Ice Nova hero whose nova would reach a live Frostbolt casts its nova from the bolt instead (PoE2 rule).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Projectile base Cold damage | 5–8 | 12–18 | 21–31 | 31–46.6 |
| Explosion base Cold damage | 9–13 | 21–31 | 35–52 | 51.4–77.6 |
| More Chill magnitude | 100% | 115% | 127.5% | 139% |

Fixed at every level: Cast time · crit: 0.80 s · 12%.

**Quality (Gemcutter's Prism, 20% max):** 20% more projectile damage after piercing.

**Recommended supports:** ★Multishot I (I), ★Considered Casting (I), ★Deliberation (II), Controlled Destruction (I), Cold Penetration (I), Freeze (I), Magnified Area I (I), Rapid Casting I (I).

**TD notes:** The lane-long chill line. With Ice Nova behind it, novas pop deep in the lane.

### H23. Ice Nova

`Metadata/Items/Gems/SkillGemIceNova` · skill `IceNovaPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Spellcaster | Staff | Int 100 | tier 1 → AL 1 | 150 | fast 7.5 s | ×1 |

PoE2 tags: intelligence, spell, area, cold, duration, nova.

**TD behaviour**

- **Targeting:** Casts when any monster is within the nova radius, or when an allied Frostbolt is within 2.67 tiles (it then casts from the bolt).
- **Shape:** **Nova around self**: radius 3.2 m = **2.67 tiles**, reaching ±2 lanes and behind the hero too.
- **On hit:** Cold hit with more Chill and Freeze buildup. Knockback is cut. The Cold-Infused Chilled Ground variant is cut (Infusions).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Base Cold damage | 6–8 | 11–17 | 19–28.5 | 28.2–42.6 |
| More Chill / Freeze buildup | 100% | 109% | 116.5% | 123.4% |

Fixed at every level: Cast time · crit: 1.00 s · 12%.

**Quality (Gemcutter's Prism, 20% max):** 20% more damage against Chilled monsters.

**Recommended supports:** ★Magnified Area I (I), ★Considered Casting (I), Freeze (I), Frost Nexus (I), Cold Penetration (I), Controlled Destruction (I), Spell Echo (I).

**TD notes:** A frontline caster. Put it behind a wall so monsters bunch up inside its radius. It is great against Burrowers that pop up in column 1.

### H24. Spark

`Metadata/Items/Gems/SkillGemSpark` · skill `SparkPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Spellcaster | Wand | Int 100 | tier 1 → AL 1 | 125 | fast 7.5 s | ×1 |

PoE2 tags: intelligence, spell, projectile, lightning, duration.

**TD behaviour**

- **Targeting:** Casts when any monster is within 6 tiles ahead in its own or an adjacent lane.
- **Shape:** Fires N sparks, dealt round-robin to its own lane, the lane above and the lane below. With 4 sparks that is 2 in its own lane and 1 in each neighbour. Each spark travels **6 tiles** (2 s duration; **adapted** range) and hits the first monster it meets.
- **Rule:** Sparks from one cast hit the same monster at most once per 0.66 s.
- **Special:** The Cold-Infused circle is cut.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Base Lightning damage | 1–10 | 1–21 | 2–35 | 2.8–51.4 |
| Sparks per cast | 4 | 5 | 5 | 6 |

Fixed at every level: Cast time · crit: 0.70 s · 9%.

**Quality (Gemcutter's Prism, 20% max):** 30% increased projectile speed.

**Recommended supports:** ★Pierce I (I), ★Prolonged Duration I (I), ★Considered Casting (I), ★Lightning Exposure (II), ★Pierce III (III), Shock (I), Lightning Penetration (I), Fork (II).

**TD notes:** The Sorceress starter ranged hero: a cheap Threepeater with very swingy Lightning (1–10 at gem 1). Its wide range makes it a strong Shock source.

### H25. Essence Drain

`Metadata/Items/Gems/SkillGemEssenceDrain` · skill `EssenceDrainPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Spellcaster | Wand | Int 100 | tier 3 → AL 3 | 150 | fast 7.5 s | ×1 |

PoE2 tags: intelligence, spell, projectile, chaos, duration.

**TD behaviour**

- **Targeting:** The first monster ahead in its own lane that is **not already drained**, otherwise the first monster.
- **On hit:** A Chaos hit plus a **Chaos damage-over-time debuff** for 4 s. Spell damage modifiers apply to the debuff.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Projectile base Chaos damage | 5–9 | 11–20 | 19–35 | 28.2–53.2 |
| Debuff Chaos damage over time | 9.2/s | 26.1/s | 47.9/s | 75.3/s |

Fixed at every level: Debuff duration · cast time · crit: 4 s · 0.80 s · 7%.

**Quality (Gemcutter's Prism, 20% max):** +1 s debuff duration.

**Recommended supports:** ★Prolonged Duration I (I), ★Swift Affliction I (I), Considered Casting (I), Multishot I (I), Fork (II), Rapid Casting I (I).

**TD notes:** The anti-Brute caster: its DoT ignores Armour and Evasion. Pairs with Despair.


### 2.6 Curse and mark heroes

**Curse spam rule:** a curse hero never re-casts onto monsters that are already cursed. Without this, a 0.7 s cast time would let one hero cover the whole board.

### H26. Despair

`Metadata/Items/Gems/SkillGemDespair` · skill `DespairPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Curse | Staff | Int 100 | tier 9 → AL 15 | 100 | fast 7.5 s | ×1 |

PoE2 tags: intelligence, spell, area, chaos, duration, curse.

**TD behaviour**

- **Targeting:** The point within 6 tiles ahead, in its own or an adjacent lane, that would curse the most monsters not already cursed. It does not cast if no uncursed monster is in range.
- **Shape:** A curse zone of radius 1.5 m = **1.25 tiles**, growing to 2.2 m = 1.83 tiles at gem 9. It erupts after a **1.5 s delay** and curses every monster inside.
- **Effect:** Cursed monsters get the listed **Chaos Resistance** reduction (it can go negative).
- **Rules:** One curse per monster (PoE2). Magic monsters take 15% less curse effect, Rares 30% less, Uniques 50% less (glossary). Monsters above the level cap are immune.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Chaos Resistance on cursed monsters | -35% | -37% | -38.5% | -40.8% |
| Curse radius (m) | 1.5 | 1.8 | 1.95 | 2.18 |
| Curse duration (s) | 6 | 6.2 | 6.4 | 6.6 |
| Max monster level affected | 20 | 29 | 36 | 43 |

Fixed at every level: Delay · cast time: 1.5 s · 0.70 s.

**Quality (Gemcutter's Prism, 20% max):** 10% increased Curse magnitude (0.5 per 1%).

**Recommended supports:** ★Prolonged Duration I (I), ★Heightened Curse (I), ★Focused Curse (I), Magnified Area I (I), Spell Echo (I), Rapid Casting I (I), Efficiency I (I).

**TD notes:** A force multiplier for Essence Drain and Poisonburst Arrow.

### H27. Vulnerability

`Metadata/Items/Gems/SkillGemVulnerability` · skill `VulnerabilityPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Curse | Staff | Int 100 | tier 7 → AL 11 | 100 | fast 7.5 s | ×1 |

PoE2 tags: intelligence, spell, area, physical, duration, curse.

**TD behaviour**

- **Targeting:** The point within 6 tiles ahead, in its own or an adjacent lane, that would curse the most monsters not already cursed. It does not cast if no uncursed monster is in range.
- **Shape:** A curse zone of radius 1.5 m = **1.25 tiles**, growing to 2.2 m = 1.83 tiles at gem 9. It erupts after a **1.5 s delay** and curses every monster inside.
- **Effect:** Hits against cursed monsters treat their **total Armour** as lowered by the listed amount. **Adapted**: the PoE2 wording is "ignore a portion of Armour"; the data stat is flat −X total Armour.
- **Rules:** One curse per monster (PoE2). Magic monsters take 15% less curse effect, Rares 30% less, Uniques 50% less (glossary). Monsters above the level cap are immune.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 7 / 15 | 7 / 7 / 33 | 7 / 7 / 53 | 7 / 7 / 73 |
| Total Armour on cursed monsters | −16 | −108 | −324 | −738 |
| Curse radius (m) | 1.5 | 1.8 | 1.95 | 2.18 |
| Curse duration (s) | 6 | 6.2 | 6.4 | 6.6 |
| Max monster level affected | 20 | 29 | 36 | 43 |

Fixed at every level: Delay · cast time: 1.5 s · 0.70 s.

**Quality (Gemcutter's Prism, 20% max):** 10% increased Curse magnitude.

**Recommended supports:** ★Prolonged Duration I (I), ★Heightened Curse (I), ★Focused Curse (I), Magnified Area I (I), Spell Echo (I), Rapid Casting I (I), Efficiency I (I).

**TD notes:** Answer to Armoured and Shieldbearer waves (appendix D). It doubles the value of Rain of Arrows and Rolling Slam.

### H28. Freezing Mark

`Metadata/Items/Gem/SkillGemFreezingMark` · skill `FreezingMarkPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Mark | Bow | Dex 50 / Int 50 | tier 7 → AL 11 | 125 | fast 7.5 s | ×1 |

PoE2 tags: mark, dexterity, intelligence, buff, cold, duration.

**TD behaviour**

- **Targeting:** Marks the highest-rarity unmarked monster ahead in its own or an adjacent lane (Rare, then Magic, then Normal; nearest wins ties). Cast time 0.5 s, cooldown 0.5 s. Limit 1 marked monster.
- **Mark:** Lasts 8 s. Hits against the marked monster get more Freeze buildup (table). If hit while Primed for Freeze, it becomes Frozen.
- **Activation:** When the marked monster Freezes, the Mark is consumed. The Mark hero and every hero on the **8 tiles around it** (3×3) gain **30% of damage as extra Cold** for 10 s. **Adapted**: PoE2 buffs only "you". Re-marking while that buff is up removes the buff (PoE2 rule), so the hero waits for it to end.
- **Filler:** Between marks, it shoots its Bow with the PoE2 default **Bow Shot** (`Metadata/Items/Gem/SkillGemPlayerDefaultBow`, 100% damage at gem 1).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1) | 42 | 150 | 270 | 390 |
| Str / Dex / Int | 7 / 11 / 11 | 7 / 20 / 20 | 7 / 30 / 30 | 7 / 40 / 40 |
| More Freeze buildup vs marked | 25% | 27% | 28% | 29% |
| Filler Bow Shot damage | 100% | 132% | 158.5% | 180.4% |

Fixed at every level: Buff: 30% of damage gained as extra Cold, 10 s; Mark duration · cooldown: 8 s · 0.5 s.

**Quality (Gemcutter's Prism, 20% max):** 20% more Freeze buildup against the marked monster.

**Recommended supports:** ★Prolonged Duration I (I), ★Cooldown Recovery I (I), ★Efficiency I (I), ★Mark for Death (I), Second Wind I (I).

**TD notes:** Put it in the middle of a 3×3 block of cold heroes. With Permafrost Bolts or Ice Strike in range, Rares freeze and the whole block gains extra Cold.


### 2.7 Aura heroes

| Kind | Scope | Stacking |
|---|---|---|
| Global (Herald of Ice, Purity of Fire) | Whole board while the hero lives | The same aura never stacks from two copies |
| Positional (War Banner, Malice) | `hypot(dx, dLane)` radius around the hero: **Presence 1.5 tiles, Banner 2.5 tiles**. These are adapted from PoE2's 4 m and 6 m, which would cover the whole board (appendix A §1.1 and §8). | Same; the strongest copy covering a target wins |

Aura heroes have **no attack** (brief). PoE2 Spirit reservation is ignored, because heroes do not have a Spirit pool for skills; only acolytes use Spirit.

### H29. Herald of Ice

`Metadata/Items/Gems/SkillGemHeraldOfIce` · skill `HeraldOfIcePlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Aura (global) | Sceptre | Dex 50 / Int 50 | tier 4 → AL 5 | 175 | slow 30 s | ×1.5 |

PoE2 tags: buff, dexterity, intelligence, attack, persistent, area, cold, herald, payoff.

**TD behaviour**

- **Scope:** **Global**: the whole board while this hero lives. It does not stack with a second Herald of Ice.
- **Trigger:** When **any** hero kills a Frozen monster with a non-Herald Attack hit, the monster Shatters and explodes.
- **Explosion:** Radius 1.6 m = **1.33 tiles** around the corpse. Damage = explosion % × the killing hero's weapon damage, 100% converted to Cold. It can't be Evaded. **Adapted**: PoE2 uses the player's weapon; KvN uses the killer's.
- **Attack:** None (aura heroes have no attack).

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1.5) | 63 | 225 | 405 | 585 |
| Str / Dex / Int | 7 / 11 / 11 | 7 / 20 / 20 | 7 / 30 / 30 | 7 / 40 / 40 |
| Explosion damage (of killer's weapon) | 70% | 93% | 114.5% | 133.4% |

Fixed at every level: Radius: 1.6 m = 1.33 tiles.

**Quality (Gemcutter's Prism, 20% max):** +0.4 m explosion radius.

**Recommended supports:** ★Cold Attunement (I), ★Deadly Herald (II), Elemental Armament I (I), Cold Penetration (I), Magnified Area I (I), Freeze (I), Vitality I (I).

**TD notes:** Explosions can Freeze neighbours, which then shatter in turn. It is the payoff for Permafrost Bolts, Ice Strike and Ice Shot.

### H30. Purity of Fire

`Metadata/Items/Gems/SkillGemPurityOfFire` · skill `PurityOfFirePlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Aura (global) | Sceptre | Str 25 / Int 75 | tier 0 (not in uncut pool) → AL 9 | 150 | slow 30 s | ×1.5 |

PoE2 tags: strength, intelligence, buff, persistent, aura, fire.

**TD behaviour**

- **Scope:** **Global**: every hero gets the listed **Fire Resistance**, which still caps at 75%.
- **Attack:** None.
- **Unlock:** PoE2 lists crafting_level 0, so it is not in the 0.5 uncut-gem pool. **KvN custom** unlock at area level 9.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1.5) | 69 | 243 | 438 | 633 |
| Str / Dex / Int | 9 / 7 / 13 | 13 / 7 / 26 | 18 / 7 / 41 | 23 / 7 / 56 |
| Fire Resistance granted | +22% | +25% | +27.5% | +29.8% |

**Quality (Gemcutter's Prism, 20% max):** +8% Fire Resistance (0.4 per 1%).

**Recommended supports:** ★Vitality I (I), Thornskin I (I), ★Warm Blooded (II).

**TD notes:** A reactive pick for fire-heavy levels: the desert biome, Burning Ground, monsters with Extra Fire Damage, and fire bosses. The pre-level preview shows monster types, so players can plan for it.

### H31. War Banner

`Metadata/Items/Gem/SkillGemWarBanner` · skill `WarBannerPlayer` · reservation skill `WarBannerReservationPlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Aura (positional) | Sceptre | Str 50 / Dex 50 | tier 4 → AL 5 | 200 | slow 30 s | ×1.5 |

PoE2 tags: strength, dexterity, banner, buff, persistent, area, aura, duration.

**TD behaviour**

- **Scope:** **Positional**: heroes within the banner radius of **2.5 tiles** (adapted from PoE2's 6 m; appendix A §8, `hypot(dx, dLane)`). From a middle lane that reaches ±2 lanes at its own column, or the adjacent lanes about ±2 columns away.
- **Banner cycle (adapted):** PoE2 builds Glory (200 from attack hits), but appendix A §9.9 cuts Glory. KvN replaces it with a **12 s charge timer** that starts when the hero is placed. The timer only runs while a monster is on the board.
- **Banner:** When charged, the hero plants the banner. For the listed duration, allies in radius get **25% more Attack damage, 25% increased attack speed and 50% increased Accuracy**. The timer restarts when the banner falls, giving about 35% uptime at gem 1.
- **Attack:** None.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1.5) | 75 | 264 | 474 | 684 |
| Str / Dex / Int | 11 / 11 / 7 | 20 / 20 / 7 | 30 / 30 / 7 | 40 / 40 / 7 |
| Banner duration (s) | 6 | 6.6 | 7.1 | 7.56 |

Fixed at every level: Aura: 25% more Attack damage · 25% inc. attack speed · 50% inc. Accuracy; Charge time (replaces 200 Glory): 12 s.

**Quality (Gemcutter's Prism, 20% max):** PoE2: 10% increased Reservation Efficiency (dead in KvN). **Adapted**: 10% increased banner duration.

**Recommended supports:** ★Prolonged Duration I (I), ★Magnified Area I (I), Vitality I (I), Thornskin I (I), Warm Blooded (II).

**TD notes:** The burst aura. Plant it in the middle of a cluster of attack heroes. It covers a block of roughly 5x3 tiles, but only about a third of the time. Time big waves to the banner.

### H32. Malice

`Metadata/Items/Gem/SkillGemMalice` · skill `MalicePlayer`

| Role | Weapon | Attributes | PoE2 tier → unlock | Mana | Recharge | Life × |
|---|---|---|---|---|---|---|
| Aura (positional) | Sceptre | Str 25 / Int 75 | tier 0 (not in uncut pool) → AL 9 | 175 | slow 30 s | ×1.5 |

PoE2 tags: strength, intelligence, buff, persistent, aura, duration.

**TD behaviour**

- **Scope:** **Positional**: monsters within its Presence of **1.5 tiles** (adapted from PoE2's 4 m; appendix A §8). That is its own lane ±1.5 columns, or the adjacent lanes about ±1 column away.
- **Effect:** At the listed interval, applies a stack of **Critical Weakness** to every monster in range. Each stack gives +0.5% to Critical Hit chance against that monster (added to base). Stacks last 4 s, up to 20 stacks. In steady state that is about 4 s ÷ interval ≈ 6 stacks, or +3% base crit.
- **Unlock:** PoE2 crafting_level 0, so **KvN custom** unlock at area level 9.
- **Attack:** None.

**Key numbers**

| | Hero 1 | Hero 10 | Hero 20 | Hero 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| Life (×1.5) | 69 | 243 | 438 | 633 |
| Str / Dex / Int | 9 / 7 / 13 | 13 / 7 / 26 | 18 / 7 / 41 | 23 / 7 / 56 |
| Stack interval (s) | 0.7 | 0.67 | 0.645 | 0.622 |
| Steady-state stacks (4 s ÷ interval) | 5.7 | 6 | 6.2 | 6.4 |

**Quality (Gemcutter's Prism, 20% max):** +1 s Critical Weakness duration (5 s), so about 7–8 stacks in steady state.

**Recommended supports:** ★Prolonged Duration I (I), ★Vitality I (I), Thornskin I (I), Warm Blooded (II).

**TD notes:** Put it one tile behind the wall. Monsters held there soak up stacks. Strong with quarterstaff heroes (10% base crit) and crit spells (Frostbolt and Ice Nova at 12%).


---

## 3. Worked example: level 17 Rare Lightning Spear

**The setup.** A Rare monster at area level 16 drops a Rare Lightning Spear. Its base level is 17 (area level + 1 for a Rare monster, §7.2), and it rolls offset 0.

- **Gem level:** 5 + (17 − 14) / (18 − 14) = **5.75**.
- **Tier gate:** at hero level 17, tier I and II supports can roll; tier III cannot.
- **Rolled supports (3):**

| Support | PoE2 id | Tier | Cost × | Why it rolled |
|---|---|---|---|---|
| Elemental Armament II | `SupportGemPrimalArmamentTwo` | II | ×1.20 | ★ PoE2 recommended (3× weight) |
| Lightning Attunement | `SupportGemLightningInfusion` | I | ×1.00 | ★ PoE2 recommended |
| Rapid Attacks I | `SupportGemMartialTempo` | I | ×1.00 | compatible (Attack) |

**Gear for the example.** A normal **Winged Spear** (`FourSpear4`, drop level 16): 12–22 Physical, 0.588 s attack time (1.70 APS), 5% crit. It has no item mods, quality or passives, so only hero and support numbers appear.

**Step by step:**

| Step | Spear (main hit) | Lightning bolts (×5) |
|---|---|---|
| Attack damage at gem 5.75 | 157 + 0.75 × (168 − 157) = **165.25%** | 107 + 0.75 × (115 − 107) = **113%** |
| Base hit (12–22 × %) | 19.83–36.36 | 13.56–24.86 |
| Skill conversion | 80% → Lightning: 3.97–7.27 Phys, 15.86–29.08 Light. | 100% → Lightning |
| Lightning Attunement: gain 25% of all damage as extra Lightning | +4.96–9.09 Light. → 20.82–38.17 Light. | ×1.25 → 16.95–31.07 |
| Elemental Armament II: 25% more Elemental Attack damage | Light. ×1.25 → 26.03–47.72 | ×1.25 → 21.19–38.84 |
| **Final hit** | **30–55** (4–7 Phys + 26–48 Light.) | **21–39 Lightning each** |

**Tooltip as shown in game:**

```
LIGHTNING SPEAR                                   Rare · Level 17 (gem 5.75)
Spear · Dex 47 · Life 292 · Mana 175 · Recharge 7.5 s
Supports: Elemental Armament II · Lightning Attunement · Rapid Attacks I
-------------------------------------------------------------------------
Spear hit         30–55   (4–7 Physical, 26–48 Lightning)
Lightning bolts   5 × 21–39 Lightning  (other monsters within 4.17 tiles)
Attacks/second    0.59 in play (1.17 PoE2 × K_heroActionRate 0.5)
Critical chance   5.00%   · Critical damage bonus +100%
Shock             100% more chance (spear) · 200% more (bolts)
Average hit       42.5    (44.6 with crits)  →  ~26 single-target DPS in play (~52 raw)
Accuracy from Dex +376
```

**Where the tooltip numbers come from:**

- **APS:** 1.70 × 60% (skill `attack_speed_multiplier −40`) × 1.15 (Rapid Attacks I) = **1.17** raw. Appendix A's `K_heroActionRate` 0.5 makes that 0.59 in play.
- **Crit:** the weapon's 5%. PoE2's base critical damage bonus is +100%. Average with crits: 42.5 × (1 + 0.05 × 1.0) = 44.6.
- **Cost:** 150 × 1.20 × 1.00 × 1.00 = 180, which rounds to **175**.
- **Life:** (16 + 12 × 17 + 2 × 7 Str) × 1.25 = **292**.
- **Dex:** 7 + 8 + 2 × 16 = **47**, so +376 accuracy.
- **Against an area level 16–17 white monster:** 158–178 base life, × `K_monsterLife` 4.5 = 711–801. That is about 18 spear hits for this un-geared hero, plus the bolts if the pack is spread. Mid-demo gear (added Lightning, increased damage, passives) cuts it several-fold.
- **Appendix A §10** walks the same hero through the full hit pipeline with illustrative gear numbers. The per-level skill numbers here (80% conversion, 165.25% at gem 5.75) are the data values.

---

## 4. Starter kits

The focus grants 4 cards at hero level 1, all **Normal** (no supports). Slots 4–6 unlock after levels 1, 2 and 3 and fill from drops and the Recruiter. Each starter hero comes with the level-1 normal base of its weapon class: Wrapped Quarterstaff, Crude Bow, Makeshift Crossbow, Felled Greatclub, Withered Wand or Rattling Sceptre (appendix C).

| Focus | Acolyte | Melee | Ranged | Spell |
|---|---|---|---|---|
| **Warrior** (Str) | Ezomyte Acolyte (50) | Rolling Slam (150) | Armour Piercing Rounds (100) | Earthquake (150, 35 s) |
| **Ranger** (Dex) | Ezomyte Acolyte (50) | Falling Thunder (125) | Lightning Arrow (100) | Explosive Grenade (125, 30 s) |
| **Sorceress** (Int) | Ezomyte Acolyte (50) | Ice Strike (125) | Spark (125) | Comet (175, 45 s) |

**Why each kit clears levels 1–3.** White monster base life is 15 / 20 / 24 at AL 1 / 2 / 3. Appendix A's `K_monsterLife` 4.5 makes that **67.5 / 90 / 108**. Damage per second below is raw PoE2; halve it for play (`K_heroActionRate` 0.5).

| Hero (level 1, starter weapon) | Hit | Cadence | Damage / s | Shape |
|---|---|---|---|---|
| Lightning Arrow | 6.0 (+2 beams of 7.5) | 1.08 APS | 6.5 | lane + beams |
| Armour Piercing Rounds | 2.4 per bolt, 12-bolt clip | 6.8 bolts/s, 0.6 s reload | 12.1 | lane, Breaks Armour |
| Spark | 1–10 per spark | 0.7 s cast | 7.9 per target | 3 lanes |
| Rolling Slam | 11.6 + 23.3 | 1.91 s | 18.3 | 2-tile area |
| Falling Thunder | 13.3 | 1.19 s | 11.2 | 3-tile cone |
| Ice Strike | 5.7 / 5.7 / 12.4 | 2.04 s per 3-hit combo | 11.6 | melee, Freezes |
| Earthquake (spell) | 132–182 Aftershock | 35 s | – | full column |
| Explosive Grenade (spell) | 83–142 | 30 s | – | 3×3 after a 3 s fuse |
| Comet (spell) | 126–192 | 45 s | – | 3×3 |

**Kit identities:**

- **Warrior:** "hold and smash". Armour Piercing Rounds strips Armour and Rolling Slam primes Stun, which sets up Boneshatter drops. Earthquake wipes a column.
- **Ranger:** "lanes and beams". Lightning Arrow covers lanes, and every 3rd Falling Thunder slam adds a volley of piercing bolts.
- **Sorceress:** "slow, freeze, crush". Ice Strike freezes, Spark spreads Shock over 3 lanes, and Comet deletes a 3×3.

Every kit has a cheap acolyte opener (50 mana), a 100–125 mana ranged hero and a melee hero with at least ×2 life to hold the line. Its spell clears a white pack. Earthquake's Aftershock (132–182) and Comet (126–192) one-shot AL 1–3 whites. Explosive Grenade (83–142) one-shots AL 1 whites and most AL 2–3 ones, and the spell levels up with XP during those levels.

---

## 5. Support catalog

### 5.1 How to read the tables

- **Tier (PoE2 lvl):** the KvN tier (I/II/III, gated at hero level 1/12/24), then PoE2 `crafting_level` in brackets.
- **Cost ×:** PoE2 `cost_multiplier` ÷ 100.
- **Rolls on:** PoE2 `allowed_types`, then "not" `excluded_types`, written in infix.
- **Rollable on:** the number of demo heroes plus spells that can roll it after the dead-roll filter.
- Effects are rewritten in the brief's stat vocabulary. Numbers are PoE2's.

### 5.2 PoE2 supports (66), by theme

#### Damage

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Brutality I | `SupportGemBrutality` | I (1) | ×1.20 | 25% more Physical damage; deals no Elemental or Chaos damage | Damage OR Attack OR DamageOverTime OR CrossbowAmmoSkill | 9 | Best on unconverted physical heroes (Armour Breaker, Boneshatter, Rolling Slam, APR). |
| Brutality II | `SupportGemBrutalityTwo` | II (2) | ×1.20 | 30% more Physical damage; no Elemental or Chaos damage | Damage OR Attack OR DamageOverTime OR CrossbowAmmoSkill | 9 |  |
| Brutality III | `SupportGemBrutalityThree` | III (5) | ×1.20 | 30% more Physical damage; no Elemental or Chaos damage; Hits have 20% chance to ignore the target's Armour | Damage OR Attack OR DamageOverTime OR CrossbowAmmoSkill | 9 |  |
| Close Combat I | `SupportGemCloseCombat` | I (3) | ×1.20 | Up to 20% more Attack damage by distance: full within 1 tile, 0% at 3 tiles or further | Attack OR CrossbowAmmoSkill | 8 | **adapted** from 1 m / 3.5 m. Melee always gets the full bonus. |
| Considered Casting | `SupportGemConsideredCasting` | I (2) | ×1.15 | 35% more Spell damage; 15% less cast speed | Spell; not UsedByProxy OR Triggered OR Persistent OR FixedCastTime OR (HasReservation AND NOT ReservationBecomesCost) | 11 |  |
| Controlled Destruction | `SupportGemControlledDestruction` | I (1) | ×1.00 | 25% more Spell Hit damage; cannot Critically Hit | Damage AND Spell | 11 |  |
| Deliberation | `SupportGemDeliberation` | II (3) | ×1.00 | 20% more damage | UsableWhileMoving | 18 | **adapted**: PoE2's '30% more movement-speed penalty' is dropped (heroes never move). Rolls only on skills PoE2 marks UsableWhileMoving. |
| Elemental Armament I | `SupportGemPrimalArmament` | I (1) | ×1.20 | 20% more Elemental Attack damage | Attack OR CrossbowAmmoSkill | 11 |  |
| Elemental Armament II | `SupportGemPrimalArmamentTwo` | II (2) | ×1.20 | 25% more Elemental Attack damage | Attack OR CrossbowAmmoSkill | 11 |  |
| Elemental Focus | `SupportGemElementalFocus` | II (3) | ×1.00 | 25% more Elemental damage; cannot inflict Elemental Ailments | Damage OR Attack OR CrossbowAmmoSkill | 20 | Conflicts with every ailment support (see conflict table). |
| Heavy Swing | `SupportGemHeavySwing` | II (4) | ×1.00 | 35% more Melee Physical damage; 10% less attack speed | Melee | 8 |  |
| Heft | `SupportGemHeft` | III (5) | ×1.20 | 30% more maximum Physical Hit damage (raises only the top of the range) | Damage OR Attack OR CrossbowAmmoSkill | 19 |  |
| Longshot I | `SupportGemLongshot` | I (2) | ×1.20 | Up to 25% more Attack damage by distance: 0% at 3 tiles or closer, full at 6 tiles or further, linear between | Attack OR CrossbowAmmoSkill | 8 | **adapted**: PoE2 3.5 m and 7 m become 3 and 6 tiles. Rewards back-row placement. |

#### Conversion and gained-as-extra

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Cold Attunement | `SupportGemColdInfusion` | I (1) | ×1.00 | Gain 25% of damage as extra Cold; 50% less Fire and Lightning damage | Attack OR CrossbowAmmoSkill OR Damage | 18 |  |
| Fire Attunement | `SupportGemFireInfusion` | I (1) | ×1.00 | Gain 25% of damage as extra Fire; 50% less Cold and Lightning damage | Attack OR CrossbowAmmoSkill OR Damage | 15 |  |
| Lightning Attunement | `SupportGemLightningInfusion` | I (1) | ×1.00 | Gain 25% of damage as extra Lightning; 50% less Cold and Fire damage | Attack OR CrossbowAmmoSkill OR Damage | 14 |  |

#### Projectile

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Chain I | `SupportGemChain` | I (1) | ×1.00 | Chain +1 (nearest monster within 2 tiles, any lane); 30% less Hit damage | Chains OR Projectile; not CannotChain OR ProjectileNoCollision | 8 |  |
| Charged Shots I | `SupportGemChargedShots` | I (3) | ×1.10 | Every 3rd shot is Charged and gains 30% of damage as extra Lightning | Attack AND Bow | 4 | **adapted**: PoE2's 'recover 100% of mana cost' clause is cut (no hero mana). |
| Fork | `SupportGemFork` | II (3) | ×1.10 | Projectiles Fork into the two adjacent lanes on first hit; 30% less damage after forking | Projectile; not ProjectileNoCollision | 8 | Lane-literal fork (brief). |
| Multishot I | `SupportGemScattershot` | I (1) | ×1.00 | +2 projectiles (fan into the two adjacent lanes, Threepeater-style); 35% less damage; 20% less skill speed | Projectile OR ProjectileNumber; not ProjectilesNumberModifiersNotApplied | 12 |  |
| Pierce I | `SupportGemPierce` | I (1) | ×1.00 | Pierce +1 monster; 20% less damage after piercing | Projectile; not ProjectileNoCollision | 8 |  |
| Pierce III | `SupportGemPierceThree` | III (5) | ×1.00 | Pierce all monsters in the lane; 20% less damage for each monster pierced | Projectile; not ProjectileNoCollision | 8 |  |

#### Area and duration

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Aftershock I | `SupportGemAftershock` | I (2) | ×1.00 | Slams: 25% chance to cause an extra Aftershock (repeats the impact in the same area) | Slam; not UsedByProxy OR Triggered OR Persistent | 5 |  |
| Concentrated Area | `SupportGemConcentratedEffect` | I (1) | ×1.00 | 30% more Area damage; 50% less Area of Effect (radius x0.71) | Area OR MinionsCanExplode | 27 |  |
| Impact Shockwave | `SupportGemImpactShockwave` | I (1) | ×1.00 | Strikes cause an Aftershock (radius 1.25 tiles) when they Heavy Stun a monster; the Aftershock cannot Stun | MeleeSingleTarget OR (Wind AND Attack); not Slam | 4 |  |
| Magnified Area I | `SupportGemMagnifiedEffect` | I (1) | ×1.30 | 35% increased Area of Effect (radius x1.16) | Area OR MinionsCanExplode | 30 |  |
| Overabundance I | `SupportGemOverabundance` | I (1) | ×1.00 | +1 to Limit; 50% less skill effect duration | Limit | 2 |  |
| Prolonged Duration I | `SupportGemPersistence` | I (1) | ×1.20 | 30% more skill effect duration | Duration | 16 |  |
| Short Fuse I | `SupportGemExpedite` | I (2) | ×1.15 | 40% less detonation time | DetonatesAfterTime | 3 |  |

#### Ailments and penetration

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Bleed I | `SupportGemLacerate` | I (1) | ×1.20 | 50% chance to inflict Bleeding | Damage OR Attack OR CrossbowAmmoSkill | 19 |  |
| Cold Penetration | `SupportGemColdPenetration` | I (2) | ×1.20 | Penetrate 30% Cold Resistance | Damage OR Attack OR CrossbowAmmoSkill | 9 |  |
| Fiery Death | `SupportGemFieryDeath` | I (2) | ×1.20 | Monsters Ignited by this hero have 60% chance to explode on death | Damage OR Attack OR CrossbowAmmoSkill; not SkillGrantedBySupport | 6 | Explosion uses PoE2's Fiery Death trigger values; see appendix-a-combat.md. |
| Fire Penetration I | `SupportGemFirePenetration` | I (2) | ×1.20 | Penetrate 30% Fire Resistance | Damage OR Attack OR CrossbowAmmoSkill | 6 |  |
| Fire Penetration II | `SupportGemFirePenetrationTwo` | II (5) | ×1.20 | Hits ignore monster Fire Resistance | Damage OR Attack OR CrossbowAmmoSkill | 6 | **adapted**: written as 100% Fire penetration (resistance treated as 0, never negative). |
| Freeze | `SupportGemGlaciation` | I (2) | ×1.20 | 50% more Freeze buildup | Damage OR Attack OR CrossbowAmmoSkill | 9 |  |
| Frost Nexus | `SupportGemFrostNexus` | I (2) | ×1.20 | Freezing a monster turns its tile into Chilled Ground for 8 s | Damage OR Attack OR CrossbowAmmoSkill | 9 | Uses the Chilled Ground terrain type from appendix-d. |
| Ignite I | `SupportGemIgnition` | I (1) | ×1.20 | 100% more Flammability magnitude | Damage OR Attack OR CrossbowAmmoSkill | 6 |  |
| Ignite III | `SupportGemIgnitionThree` | III (5) | ×1.20 | 200% more Flammability magnitude; Ignites deal damage 15% faster | Damage OR Attack OR CrossbowAmmoSkill | 6 |  |
| Lightning Exposure | `SupportGemLightningExposure` | II (4) | ×1.20 | Shocking a monster inflicts Exposure for 8 s | Attack OR Damage OR CrossbowAmmoSkill | 5 |  |
| Lightning Penetration | `SupportGemLightningPenetration` | I (2) | ×1.20 | Penetrate 30% Lightning Resistance | Damage OR Attack OR CrossbowAmmoSkill | 5 |  |
| Poison I | `SupportGemEnvenom` | I (1) | ×1.20 | 40% chance to Poison on Hit | Damage OR Attack OR CrossbowAmmoSkill | 21 |  |
| Shock | `SupportGemConduction` | I (1) | ×1.20 | 100% more chance to Shock | Damage OR Attack OR CrossbowAmmoSkill | 5 |  |
| Shock Conduction | `SupportGemCoursingCurrent` | I (2) | ×1.20 | Shocking Hits have 50% chance to also Shock monsters within 2.1 tiles | Damage OR Attack OR CrossbowAmmoSkill | 5 |  |
| Swift Affliction I | `SupportGemSwiftAffliction` | I (1) | ×1.00 | 30% more non-ailment damage over time; 20% less duration of the skill and its damaging ailments | Damage OR Attack OR DamageOverTime OR CrossbowAmmoSkill | 2 |  |

#### Critical

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Ambush | `SupportGemAmbush` | I (1) | ×1.00 | 100% more Critical Hit chance against monsters on full life | Attack OR Damage OR CrossbowAmmoSkill | 31 | Strong on first-hit heroes at the back of a lane. |
| Pinpoint Critical | `SupportGemPinpointCritical` | I (2) | ×1.00 | 60% more Critical Hit chance; 30% less Critical damage bonus | Damage OR Attack OR CrossbowAmmoSkill | 31 |  |
| Supercritical | `SupportGemSupercritical` | II (3) | ×1.00 | 100% increased Critical damage bonus; 20% less Critical Hit chance | Damage OR Attack OR CrossbowAmmoSkill | 31 |  |

#### Stun and Armour

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Armour Break I | `SupportGemSplinter` | I (2) | ×1.00 | Break Armour equal to 15% of Physical damage dealt | Attack OR Damage OR CrossbowAmmoSkill | 19 |  |
| Brink I | `SupportGemBrink` | I (1) | ×1.00 | 30% more Stun buildup; Stun buildup cannot reach 100% | Melee | 9 | Primes monsters for a partner's Heavy Stun (Boneshatter, Rolling Slam). |
| Exploit Weakness | `SupportGemExploitWeakness` | I (2) | ×1.30 | Consume Fully Broken Armour to deal 40% more damage; cannot Break Armour | Damage OR Attack OR CrossbowAmmoSkill; not ConsumesFullyBrokenArmour AND NOT SupportedByExploitWeakness | 28 |  |
| Stun I | `SupportGemOverpower` | I (2) | ×1.20 | 50% more Stun buildup | Attack OR Damage OR CrossbowAmmoSkill | 30 |  |

#### Defence

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Life Leech I | `SupportGemLifeThief` | I (2) | ×1.00 | Leech 12% of Physical Attack damage as life | Attack OR CrossbowAmmoSkill | 16 |  |
| Thornskin I | `SupportGemThornskin` | I (2) | ×1.00 | 40% increased Thorns damage | Persistent AND Buff | 7 | Persistent skills only (acolytes, auras). Thorns hit melee attackers. |
| Vitality I | `SupportGemVitality` | I (1) | ×1.00 | Regenerate 1% of maximum life per second | Persistent AND Buff | 7 | Persistent skills only: acolytes and auras. |
| Warm Blooded | `SupportGemWarmBlooded` | II (3) | ×1.00 | 50% less Freeze duration on this hero | Persistent AND Buff | 7 | **adapted** to the 'reduced duration of ailments on self' stat (Freeze only). Persistent skills only. |

#### Utility, curse, mark, herald

| Support | PoE2 id | Tier (PoE2 lvl) | Cost × | Effect (KvN vocabulary) | Rolls on (PoE2 skill types) | Rollable on | TD notes |
|---|---|---|---|---|---|---|---|
| Cooldown Recovery I | `SupportGemIngenuity` | I (3) | ×1.30 | 25% increased cooldown recovery rate | Cooldown OR AffectedByCooldownRate | 9 | Marks and player spells. |
| Deadly Herald | `SupportGemDeadlyHeralds` | II (3) | ×1.00 | Herald skills deal 30% more damage | Herald | 1 |  |
| Efficiency I | `SupportGemInspiration` | I (1) | ×1.00 | x0.70 placement cost | any; not Persistent | 33 | **adapted**: PoE2 '30% less Cost' applies to KvN placement mana. Cannot roll on Persistent skills (auras, acolytes), as in PoE2. |
| Focused Curse | `SupportGemFocusedCurse` | I (2) | ×1.20 | Curse zones erupt after 50% less delay (1.5 s to 0.75 s) | AppliesCurse | 2 |  |
| Heightened Curse | `SupportGemHeightenedCurse` | I (1) | ×1.40 | 25% increased Curse magnitudes | AppliesCurse OR IsBlasphemy | 2 |  |
| Mark for Death | `SupportGemSingleOut` | I (2) | ×1.20 | Hits against the Marked monster Break Armour equal to 10% of Physical damage | Mark | 1 |  |
| Rapid Attacks I | `SupportGemMartialTempo` | I (1) | ×1.00 | 15% increased attack speed | Attack OR CrossbowAmmoSkill; not Herald OR NoAttackOrCastTime | 16 |  |
| Rapid Casting I | `SupportGemArcaneTempo` | I (1) | ×1.00 | 15% increased cast speed | Spell; not Instant OR FixedCastTime OR NoAttackOrCastTime | 8 |  |
| Second Wind I | `SupportGemSecondWind` | I (2) | ×1.50 | Twice as many cooldown uses; 50% less cooldown recovery rate | Cooldown OR AffectedByCooldownRate; not Triggered OR Instant OR Meta | 9 | Player spells: 2 charges, each recharging at half speed. |
| Spell Echo | `SupportGemSpellEcho` | I (2) | ×1.50 | Spells Echo once (repeat in the same area); echoes have 40% increased AoE; 30% less cast speed | Cascadable; not Triggered OR UsedByProxy OR Persistent | 8 |  |


### 5.3 KvN custom acolyte supports (5)

These roll only on acolytes (KvN type `KvNAcolyte`). They use the brief's acolyte-only stats: % increased mana generated, % reduced mana generation interval, + mana per orb, and + Spirit.

| Support | KvN id | Tier | Cost × | Effect | TD notes |
|---|---|---|---|---|---|
| Abundant Offering **(KvN custom)** | `KvN/Supports/AbundantOffering` | I | ×1.20 | 25% increased mana generated | The simple pick. |
| Fervent Prayer **(KvN custom)** | `KvN/Supports/FerventPrayer` | I | ×1.25 | 20% reduced mana generation interval (24 s to 19.2 s) | Also brings the first orb forward by 20%. |
| Steadfast Devotion **(KvN custom)** | `KvN/Supports/SteadfastDevotion` | I | ×1.10 | 50% increased maximum life; 10% increased mana generated | For exposed acolytes. |
| Spirit Conduit **(KvN custom)** | `KvN/Supports/SpiritConduit` | II | ×1.20 | +60 Spirit (+30% orb value through the Spirit formula) | Stacks with gear Spirit. |
| Heavy Tithe **(KvN custom)** | `KvN/Supports/HeavyTithe` | III | ×1.15 | +20 mana per orb (added before the Spirit multiplier); 25% increased mana generation interval | Lumpy but strongest with high Spirit. |

Rough value check for a no-gear level 1 acolyte making 25 mana per 24 s (1.04/s):

| Support | Output | Gain |
|---|---|---|
| Abundant Offering | 31.25 / 24 s | +25% |
| Fervent Prayer | 25 / 19.2 s | +25% |
| Spirit Conduit | 32.5 / 24 s | +30% |
| Heavy Tithe | 45 / 30 s | +44% |
| Heavy Tithe with +100 gear Spirit | 67.5 / 30 s | +44% (versus 37.5 / 24 s) |

### 5.4 What was cut or adapted, and why

| PoE2 support group | Examples | Decision |
|---|---|---|
| Mana and cost | Clarity, Lifetap, Zenith, Arcane Surge, Mana Flare, Mysticism, Soul Drain | **Cut**: heroes have no mana (brief). Efficiency is kept, **adapted** to placement cost. |
| Minions and totems | Bidding, Feeding Frenzy, Meat Shield, Minion Pact, Hardy Totems, Urgent Totems | **Cut**: minions and totems are out of scope. |
| Movement | Mobility, Momentum, Hit and Run, Stomping Ground, Advancing Storm | **Cut**: heroes never move. Deliberation is kept with its movement clause dropped. |
| Flasks, charms, corpses | Ambrosia, Concoct, Bounty, Gorge, Herbalism, Profanity, Corpse Conservation | **Cut**: no flasks, charms or corpses. |
| Channelling, combo, timing | Burgeon, Steadfast, Combo Finisher, Culmination, Window of Opportunity, Perfection | **Cut**: no channelled or player-timed skills. |
| Charges, infusions, remnants | Abiding Hex, Heightened Charges, Perpetual Charge, Inhibitor, Harmonic Remnants | **Cut**: KvN has no charge or infusion economy (appendix A §9.9). Falling Thunder's charged slam is **adapted** to work without charges. |
| Grenade and ammo niche | Adhesive Grenades, Long Fuse, Payload, Double Barrel, Ammo Conservation | **Cut** for scope: no grenade heroes; crossbow heroes stay simple. |
| Lineage and `crafting_level 0` | e.g. Arjun's Medal, Daze, Ricochet III | **Cut**: they are not in PoE2's normal uncut pool. |
| Knockback, Maim, Blind, Pin, Impale, Daze | Knockback, Maim, Blind I, Pin I, Impale, Opening Move | **Cut**: their mechanics are not in the stat vocabulary (see §8). |

---

## 6. Spell catalog

### 6.1 Spell rules

Eight spells, all verified as released gems in the export. Fireball is deliberately **not** a spell, because it is already hero H20 and one skill should not be two cards.

| Rule | Value |
|---|---|
| Cast | Tap the spell card, then a target tile. The effect is PvZ-instant: no cast time, so cast- and attack-speed supports never roll on spells. |
| Mana | Base about 150 × support cost multipliers, rounded to the nearest 25. |
| Cooldown | 30–50 s (below). Cooldown Recovery and Second Wind apply. |
| Start of level | Cooldown ≤ 35 s starts with **20 s left**; ≥ 40 s starts with **35 s left** (PvZ slow / very-slow rule). |
| Level, rarity, supports, XP, quality | Same rules as heroes; the spell slot earns XP. |
| Damage | PoE2 per-level base × **spell power E(L) = 5 + 0.5 × spell level** (**KvN custom**), then supports and global passives. |
| Attack spells (**adapted**) | Earthquake, Explosive Grenade and Volcanic Fissure are PoE2 Attacks. They use a **virtual weapon**: the normal base of their class with the highest drop level ≤ spell level. They have 5% crit and always hit. |
| Shapes | Grid shapes (3×3, column, lane). **Adapted** from PoE2 radii so the player can read them at a glance. |

**Why E(L) exists.** Player spells have no gear. Monster life grows about 40× from AL 1 to 30 (15 → 593), while spell base damage grows only about 6×. E(L) stands in for the item scaling heroes get. It is tuned so that the burst spells (Comet, Earthquake, Hexblast, Grenade) kill same-level white monsters in their shape at appendix A's `K_monsterLife` = 4.5. If appendix A changes that knob, scale E(L) by the same ratio.

### 6.2 Spells

### S1. Frost Bomb

`Metadata/Items/Gems/SkillGemFrostBomb` · skill `FrostBombPlayer` · PoE2 tier 1 → unlock AL 1

| Mana | Cooldown | Starts level with | Crit |
|---|---|---|---|
| 125 | 30 s | 20 s left | 13% |

**Shape:** **3×3, delayed 4 s.** An orb sits on the target tile and pulses every 0.5 s (**adapted**: the export has no pulse rate) across the 3×3. The first pulse applies 20% Elemental Exposure, and each later pulse adds 2%, up to 50%. Pulses Chill as though dealing 300% more damage. At 4 s the orb detonates for the Cold hit across the 3×3.

| | Spell 1 | Spell 10 | Spell 20 | Spell 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| KvN spell power E(L) | 5.5 | 10 | 15 | 20 |
| Hit: PoE2 hit | 7–11 | 18–27 | 31–46.5 | 46.6–70.6 |
| Hit: **KvN hit (× E)** | **38–60** | **180–270** | **465–698** | **932–1412** |

**Supports that can roll:** Controlled Destruction (I), Considered Casting (I), Deliberation (II), Elemental Focus (II), Cold Attunement (I), Magnified Area I (I), Concentrated Area (I), Prolonged Duration I (I), Short Fuse I (I), Freeze (I), Frost Nexus (I), Pinpoint Critical (I), Supercritical (II), Ambush (I), Stun I (I), Exploit Weakness (I), Efficiency I (I), Cooldown Recovery I (I), Second Wind I (I), Spell Echo (I), Cold Penetration (I).

**Quality (20%):** Exposure cap +10% (50% to 60%; PoE2 0.5 per 1%).

**Notes:** A setup tool: a whole wave walks into the 3×3, gets Exposed and Chilled, and then every elemental hero behind it hits about 30–50% harder.

### S2. Earthquake

`Metadata/Items/Gems/SkillGemEarthquake` · skill `EarthquakePlayer` · PoE2 tier 1 → unlock AL 1 · **adapted** (PoE2 Attack)

| Mana | Cooldown | Starts level with | Crit |
|---|---|---|---|
| 150 | 35 s | 20 s left | 5% |

**Shape:** **Full column** (all 5 lanes of the target column). The impact hits at once and leaves Jagged Ground on those 5 tiles for 4 s. Jagged Ground slows monsters like Chilled Ground (**adapted**: Jagged Ground is not in the vocabulary). When it expires, it erupts in an **Aftershock** that hits the same column.

| | Spell 1 | Spell 10 | Spell 20 | Spell 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| KvN spell power E(L) | 5.5 | 10 | 15 | 20 |
| Impact: virtual weapon | Felled Greatclub | Oak Greathammer | Studded Greatclub | Temple Maul |
| Impact: PoE2 hit | 5.2–7.2 | 8.5–15.9 | 20.3–30.5 | 25.3–52 |
| Impact: **KvN hit (× E)** | **29–40** | **85–159** | **305–457** | **505–1040** |
| Aftershock: PoE2 hit | 23.9–33.1 | 38.9–72.9 | 94.2–141.4 | 119.1–244.9 |
| Aftershock: **KvN hit (× E)** | **132–182** | **389–729** | **1414–2120** | **2381–4899** |

**Supports that can roll:** Brutality I (I), Brutality II (II), Heft (III), Fire Attunement (I), Cold Attunement (I), Lightning Attunement (I), Magnified Area I (I), Concentrated Area (I), Aftershock I (I), Prolonged Duration I (I), Bleed I (I), Poison I (I), Pinpoint Critical (I), Supercritical (II), Ambush (I), Stun I (I), Brink I (I), Armour Break I (I), Exploit Weakness (I), Efficiency I (I), Cooldown Recovery I (I), Second Wind I (I), Brutality III (III).

**Quality (20%):** PoE2: +2 Jagged Ground Limit, which does nothing on a once-per-cooldown spell. **Adapted**: 20% increased cooldown recovery rate.

**Notes:** The Warrior starter spell. **Adapted**: it is a PoE2 slam Attack. It uses a virtual normal Two Hand Mace, the base with the highest drop level ≤ spell level. The impact is weak; the Aftershock is the payload. Cast it 1 column ahead of a wave.

### S3. Explosive Grenade

`Metadata/Items/Gem/SkillGemExplosiveGrenade` · skill `ExplosiveGrenadePlayer` · PoE2 tier 1 → unlock AL 1 · **adapted** (PoE2 Attack)

| Mana | Cooldown | Starts level with | Crit |
|---|---|---|---|
| 125 | 30 s | 20 s left | 5% |

**Shape:** **3×3 after a 3 s fuse.** The grenade lands on the target tile, then rolls 1 tile left with the wave (**adapted** bounce). It explodes in the 3×3 around its resting tile. Explosion radius is 2.0 m, rising to 2.2 m at gem 9. 80% of Physical converts to Fire.

| | Spell 1 | Spell 10 | Spell 20 | Spell 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| KvN spell power E(L) | 5.5 | 10 | 15 | 20 |
| Hit: virtual weapon | Makeshift Crossbow | Sturdy Crossbow | Dyad Crossbow | Alloy Crossbow |
| Hit: PoE2 hit | 15–25.8 | 31.6–74.6 | 31.6–130.1 | 49.2–205.1 |
| Hit: **KvN hit (× E)** | **83–142** | **316–746** | **475–1951** | **984–4102** |

**Supports that can roll:** Elemental Armament I (I), Elemental Armament II (II), Deliberation (II), Heft (III), Elemental Focus (II), Fire Attunement (I), Multishot I (I), Magnified Area I (I), Concentrated Area (I), Short Fuse I (I), Ignite I (I), Fiery Death (I), Bleed I (I), Poison I (I), Pinpoint Critical (I), Supercritical (II), Ambush (I), Stun I (I), Armour Break I (I), Exploit Weakness (I), Efficiency I (I), Cooldown Recovery I (I), Second Wind I (I), Ignite III (III), Fire Penetration I (I), Fire Penetration II (II).

**Quality (20%):** 20% increased cooldown recovery rate (PoE2 1.0 per 1%).

**Notes:** The Ranger starter spell, and literally a cherry bomb with a fuse. **Adapted**: it is a PoE2 crossbow Attack, using a virtual normal Crossbow. Short Fuse I is its best support.

### S4. Volcanic Fissure

`Metadata/Items/Gems/SkillGemVolcanicFissure` · skill `VolcanicFissurePlayer` · PoE2 tier 7 → unlock AL 11 · **adapted** (PoE2 Attack)

| Mana | Cooldown | Starts level with | Crit |
|---|---|---|---|
| 150 | 40 s | 35 s left | 5% |

**Shape:** **Lane line + 2 branches.** A fissure runs from the target tile right to the board edge, hitting each monster once as it passes. It branches into each adjacent lane 2 tiles past the target. The fissure stays for 12 s. Any **hero Slam** that lands on a fissure tile triggers an Aftershock along the whole fissure, with that slam's damage (PoE2 rule).

| | Spell 1 | Spell 10 | Spell 20 | Spell 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| KvN spell power E(L) | 5.5 | 10 | 15 | 20 |
| Hit: virtual weapon | Felled Greatclub | Oak Greathammer | Studded Greatclub | Temple Maul |
| Hit: PoE2 hit | 8.2–11.3 | 13.1–24.6 | 31.4–47 | 38.5–79.2 |
| Hit: **KvN hit (× E)** | **45–62** | **131–246** | **470–706** | **770–1584** |

**Supports that can roll:** Elemental Armament I (I), Elemental Armament II (II), Heft (III), Elemental Focus (II), Fire Attunement (I), Magnified Area I (I), Concentrated Area (I), Aftershock I (I), Prolonged Duration I (I), Ignite I (I), Fiery Death (I), Bleed I (I), Poison I (I), Pinpoint Critical (I), Supercritical (II), Ambush (I), Stun I (I), Brink I (I), Armour Break I (I), Exploit Weakness (I), Efficiency I (I), Cooldown Recovery I (I), Second Wind I (I), Ignite III (III), Fire Penetration I (I), Fire Penetration II (II).

**Quality (20%):** 20% chance to cause an additional Aftershock.

**Notes:** **Adapted**: it is a PoE2 slam Attack using a virtual Two Hand Mace. It is weak alone; with Rolling Slam or Sunder it becomes a 3-lane bomb every swing for 12 s.

### S5. Comet

`Metadata/Items/Gems/SkillGemComet` · skill `CometPlayer` · PoE2 tier 11 → unlock AL 19

| Mana | Cooldown | Starts level with | Crit |
|---|---|---|---|
| 175 | 45 s | 35 s left | 13% |

**Shape:** **3×3, instant-ish.** The ice lands 0.55 s after the cast and hits the 3×3. **Adapted**: the PoE2 2.8 m radius is compressed to 3×3.

| | Spell 1 | Spell 10 | Spell 20 | Spell 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| KvN spell power E(L) | 5.5 | 10 | 15 | 20 |
| Hit: PoE2 hit | 23–35 | 56–83 | 96.5–145.5 | 148–221.6 |
| Hit: **KvN hit (× E)** | **126–192** | **560–830** | **1448–2182** | **2960–4432** |

**Supports that can roll:** Controlled Destruction (I), Considered Casting (I), Elemental Focus (II), Cold Attunement (I), Magnified Area I (I), Concentrated Area (I), Freeze (I), Frost Nexus (I), Pinpoint Critical (I), Supercritical (II), Ambush (I), Stun I (I), Exploit Weakness (I), Efficiency I (I), Cooldown Recovery I (I), Second Wind I (I), Spell Echo (I), Cold Penetration (I).

**Quality (20%):** 10% chance to Echo (the 3×3 is hit again 0.55 s later).

**Notes:** The pure Cherry Bomb: the biggest single hit in the list. It is also the **Sorceress starter spell** (granted despite PoE2 tier 11; drops still unlock at AL 19). The Fire-Infused version is cut.

### S6. Firestorm

`Metadata/Items/Gems/SkillGemFirestorm` · skill `FirestormPlayer` · PoE2 tier 11 → unlock AL 19

| Mana | Cooldown | Starts level with | Crit |
|---|---|---|---|
| 175 | 45 s | 35 s left | 7% |

**Shape:** **3 lanes × 4 columns for 6 s.** A bolt lands every 0.2 s at a random point (30 bolts), with impact radius 1 m = 0.83 tiles. Each monster is hit at most once per 0.15 s. **Adapted**: the PoE2 3 m storm radius becomes a rectangle.

| | Spell 1 | Spell 10 | Spell 20 | Spell 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| KvN spell power E(L) | 5.5 | 10 | 15 | 20 |
| Hit: PoE2 hit | 3–5 | 8–13 | 14.5–22 | 22.2–32.8 |
| Hit: **KvN hit (× E)** | **16–28** | **80–130** | **218–330** | **444–656** |

**Supports that can roll:** Controlled Destruction (I), Considered Casting (I), Deliberation (II), Elemental Focus (II), Fire Attunement (I), Magnified Area I (I), Concentrated Area (I), Prolonged Duration I (I), Ignite I (I), Fiery Death (I), Pinpoint Critical (I), Supercritical (II), Ambush (I), Stun I (I), Exploit Weakness (I), Efficiency I (I), Cooldown Recovery I (I), Second Wind I (I), Spell Echo (I), Ignite III (III), Fire Penetration I (I), Fire Penetration II (II).

**Quality (20%):** +0.2 m bolt impact radius (1.0 to 1.2 m).

**Notes:** Sustained area denial. Damage per bolt is small, but a monster that stays inside takes many bolts. It is best on a held lane, behind a wall. Infusion variants are cut.

### S7. Hexblast

`Metadata/Items/Gems/SkillGemHexblast` · skill `HexblastPlayer` · PoE2 tier 11 → unlock AL 19

| Mana | Cooldown | Starts level with | Crit |
|---|---|---|---|
| 150 | 40 s | 35 s left | 7% |

**Shape:** **3×3 + curse detonations.** It hits every monster in the 3×3 (**adapted**: PoE2 only hits cursed monsters). Each **Cursed** monster in the 3×3 also explodes, removing its curse, for the same hit in radius 2 m = 1.67 tiles around it. That is at most 10 explosions. As in PoE2, a curse detonates only once at least half its duration has elapsed.

| | Spell 1 | Spell 10 | Spell 20 | Spell 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| KvN spell power E(L) | 5.5 | 10 | 15 | 20 |
| Hit: PoE2 hit | 21–39 | 51–95 | 89–165.5 | 135.6–252.6 |
| Hit: **KvN hit (× E)** | **116–214** | **510–950** | **1335–2482** | **2712–5052** |

**Supports that can roll:** Controlled Destruction (I), Considered Casting (I), Deliberation (II), Magnified Area I (I), Concentrated Area (I), Poison I (I), Pinpoint Critical (I), Supercritical (II), Ambush (I), Stun I (I), Exploit Weakness (I), Efficiency I (I), Cooldown Recovery I (I), Second Wind I (I), Spell Echo (I).

**Quality (20%):** 10% more damage per 1 s of curse duration remaining on a detonated monster.

**Notes:** The payoff for Despair and Vulnerability heroes. Despair's −Chaos Resistance boosts the explosions too.

### S8. Lightning Conduit

`Metadata/Items/Gems/SkillGemLightningConduit` · skill `LightningConduitPlayer` · PoE2 tier 13 → unlock AL 23

| Mana | Cooldown | Starts level with | Crit |
|---|---|---|---|
| 175 | 50 s | 35 s left | 10% |

**Shape:** **Full lane** (Jalapeño): every monster in the target lane, from column 1 to the spawn edge. The PoE2 cone is 10 m = 8.33 tiles long. It deals 10% more damage per 5% Shock effect on the target (+40% against a default 20% Shock). If any monster hit is Shocked, 1–2 extra bolts strike random monsters hit.

| | Spell 1 | Spell 10 | Spell 20 | Spell 30 |
|---|---|---|---|---|
| PoE2 gem level | 1 | 4 | 6.5 | 8.8 |
| KvN spell power E(L) | 5.5 | 10 | 15 | 20 |
| Hit: PoE2 hit | 6–17 | 13–40 | 23.5–70 | 35.8–106.4 |
| Hit: **KvN hit (× E)** | **33–94** | **130–400** | **352–1050** | **716–2128** |

**Supports that can roll:** Controlled Destruction (I), Considered Casting (I), Elemental Focus (II), Lightning Attunement (I), Magnified Area I (I), Concentrated Area (I), Shock (I), Shock Conduction (I), Lightning Exposure (II), Pinpoint Critical (I), Supercritical (II), Ambush (I), Stun I (I), Exploit Weakness (I), Efficiency I (I), Cooldown Recovery I (I), Second Wind I (I), Lightning Penetration (I).

**Quality (20%):** 20% more Lightning damage.

**Notes:** The lane wipe. Pair it with Spark, Lightning Arrow or the Shock support.


---

## 7. Hero and spell drops and generation

**Who owns what.** Appendix E owns rates, the rarity pipeline, loot shaping, vendor stock and every price (`appendix-e-economy.md` §3, §4.5, §5.3). This section repeats E's numbers so it can be read alone, and adds the hero-specific parts: level roll, support roll and unlock gate. **If the two ever disagree, appendix E wins.**

### 7.1 Where heroes and spells come from

| Source | Heroes | Spells | Owner |
|---|---|---|---|
| Kill drops | 11% of item rolls | 4% of item rolls | E §3.1–3.2 |
| First-clear rewards | "Choose 1 of 3" at a fixed rarity and level (levels 1, 4, 8, 10, 12, 16) | Level 6 | E §4.5 |
| Recruiter | 6 per refresh | 2 per refresh | E §5.3 |
| Gamble tab | 1 per purchase | – | E §5.3 |

Every generated hero or spell then follows the same three steps: **pick the skill (§7.4), roll the level (§7.2), roll the rarity and supports (§7.3, §1.10).**

### 7.2 Level roll

```
base   = area level (+1 from a Rare monster, +2 from a boss: appendix E's item-level rule)
level  = clamp(base + offset, 1, min(32, highest area level unlocked + 2))
```

| Offset | −2 | −1 | 0 | +1 |
|---|---|---|---|---|
| Kill drops | 15% | 25% | 40% | 20% |

- **Recruiter:** highest area level unlocked, −2 to +0 (E §5.3), uniform.
- **Gamble:** exactly the highest area level unlocked.
- **First-clear rewards:** the fixed level E lists.
- **Quality** is always 0%; Gemcutter's Prisms are the only source.

### 7.3 Rarity

Appendix E §3.2 rolls rarity with **base weights Normal 75 / Magic 20 / Rare 3.5**. The source's rarity bonus multiplies every non-Normal weight by `(1 + bonus)`. Heroes drop E's 0.12 Unique weight (no unique heroes, brief) and renormalise.

| Source (E's rarity bonus) | Normal | Magic | Rare |
|---|---|---|---|
| Normal monster (0%) | 76% | 20% | 4% |
| Magic monster (+100%) | 61% | 33% | 6% |
| Rare monster (about +600%) | 31% | 59% | 10% |
| Boss (+3,200%) | 9% | 78% | 14% |
| **Campaign average** (E) | **~59%** | **~35%** | **~6%** |

- **Sanity check:** the brief suggested 70 / 25 / 5. The research file puts PoE2 campaign gear at 55–70 / 25–35 / 4–10. E's numbers sit inside both.
- **Killing hero's rarity of items found** adds to the bonus (E §3.1).
- **Fixed rarities:** Recruiter Normal 40 / Magic 50 / Rare 10; Gamble Magic 70 / Rare 30 (both E §5.3).
- **Support count:** Magic → 1 (60%) or 2 (40%); Rare → 3 (65%) or 4 (35%). Supports then roll with §1.10, which includes the 3× weight for ★ recommended supports.

### 7.4 Which skill (loot shaping)

1. **Unlock gate (this appendix, §1.8).** Only skills with unlock AL ≤ the source's area level can appear. **Proposal for appendix E:** apply this filter before its shaping, so tier 9–13 skills arrive mid-demo as PoE2 gem tiers intend.
2. **E §3.3 shaping:**
   - **35%:** uniform among heroes that share ≥ 1 **damage-type tag** or **weapon class** with a roster hero. Damage tags are in the "Damage" column of §2.1; weapon classes are in §1.3. Acolytes and auras match through Sceptre.
   - **65%:** uniform over all eligible heroes.
3. **Spells are unshaped** (E §3.3): uniform over unlocked spells. Unlock ALs: Frost Bomb, Earthquake and Explosive Grenade from AL 1; Volcanic Fissure from 11; Comet, Firestorm and Hexblast from 19; Lightning Conduit from 23.
4. **Duplicates are allowed**; the roster may hold two heroes of the same skill (brief).

### 7.5 Recruiter

- Stock and refresh are from E §5.3: **6 heroes**, at least 3 sharing roster tags, plus **2 spells**. The 8 offers refresh after every level, won or lost.
- **Hero-side rules (this appendix):** apply the unlock gate (§7.4), and roll supports with §1.10.
- **Proposals:** no two offers with the same skill and rarity in one refresh; at least 1 acolyte while the highest unlocked AL ≤ 10.
- **Prices:** see `appendix-e-economy.md`.

### 7.6 Gamble tab

- **The choice (E §5.3):** the player picks a **role** or a **damage tag**. That is the hero "base" from the brief's "unidentified item or hero of a chosen base".
- **Role mapping:**

| Gamble role | Hero roles included |
|---|---|
| melee | Wall, Striker |
| ranged | Basic ranged, Advanced ranged |
| caster | Spellcaster |
| curse | Curse, Mark |
| aura | Aura (global and positional) |
| acolyte | Acolyte |

- **Skill pick:** uniform among unlocked heroes matching that role or tag.
- **Card:** level is the highest area level unlocked. The card is unidentified until it reveals on purchase: **Magic 70 / Rare 30**. Supports roll with §1.10.
- **Price:** see `appendix-e-economy.md`.

---

## 8. Deviations from brief

Things the data forced, or that the brief left open and this appendix had to decide. Each is marked in place. Items 1–4 align this appendix with appendices A, C and E.

**Alignment with the other appendices**

1. **Positional aura radius is adapted** (resolved during GDD integration). Converted at the standard 1.2 m per tile, PoE2's Presence would be 3.33 tiles and Banner 5 tiles, which covers most of the board. Appendix A §8 now sets **Presence to 1.5 tiles and Banner to 2.5 tiles**, measured with `hypot(dx, dLane)`. If positional auras still feel global in playtest, try Presence 1 tile and Banner 2 tiles.
2. **Mechanics appendix A §9.9 cuts are replaced, not used:**
   - War Banner's Glory becomes a **12 s charge timer**.
   - Falling Thunder's Power Charges become **every 3rd slam is charged**.
   - Fangs of Frost's Parry becomes **Off Balance on a passive shield block**.
   - Infusions, Frenzy-Charge variants and Knockback are cut outright.
3. **Hero XP and level cap follow appendix E §6.2:** 100% of player XP, and the cap is highest area level unlocked + 2.
4. **Drops, rarity, shaping, Recruiter and Gamble follow appendix E §3 and §5.3.** That means base rarity 75 / 20 / 3.5 rather than the 70 / 25 / 5 suggested to this appendix, uniform shaping, unshaped spells, 6 + 2 Recruiter stock, and role- or tag-based gambling. This appendix adds the level roll, the support roll and the unlock gate.

**Spell power and shapes**

5. **Player-spell power E(L) = 5 + 0.5 × level** (**KvN custom**), tuned to appendix A's `K_monsterLife` 4.5. Without gear, PoE2 spell numbers cannot kill same-level monsters.
6. **Attack spells use a virtual weapon** (Earthquake and Volcanic Fissure: Two Hand Mace; Explosive Grenade: Crossbow), because PoE2 slams and grenades need one.
7. **Player-spell shapes are grid shapes** (3×3, column, lane, 3×4), adapted from PoE2 radii. Hero areas stay continuous radii in tiles, per the brief and appendix A §3.

**Gating and rolls**

8. **Unlock gate** `AL ≥ 2 × tier − 3`, a 2× compression of PoE2's uncut-gem breakpoints. It is proposed for adoption in appendix E's shaping. Purity of Fire and Malice have tier 0 in the data, so they get a **custom AL 9**.
9. **Support tiers for unnumbered supports** come from `crafting_level` (1–2 → I, 3–4 → II, 5 → III). Lineage and `crafting_level 0` supports never roll.
10. **Extra roll rules** beyond "no duplicates, no same family": a dead-roll filter and conflict groups (§1.10).
11. **Small aura pools.** Purity of Fire (3), Malice (4) and War Banner (5) cannot always fill Rare slots, so their rarity drops to match.

**Mechanics outside the stat vocabulary** (skill-intrinsic only; proposed additions to appendix A §9)

12. **Critical Weakness** (Malice): +0.5% base crit taken per stack, up to 20.
13. **Off Balance** (Fangs of Frost), **Sundered Armour** (Sunder) and **Jagged Ground** (Earthquake, treated as Chilled Ground).
14. **Skill-intrinsic "more" multipliers** are kept, such as War Banner's 25% more Attack damage and Rolling Slam's 50% more vs Heavy Stunned. The brief's "% more (support multipliers only)" is read as applying to items, passives and affixes, not to gem stat sets.
15. **Knockback** is cut everywhere. A "Knockback N tiles" stat is a natural post-demo addition.

**Engine adaptations**

16. **Crossbow reload time** is missing from `base_items.json`. KvN uses the Ammo skill's `cast_time`: Armour Piercing Rounds 0.6 s, Permafrost Bolts 0.8 s.
17. **Shield Wall cadence:** one raise per 2 × attack time (4 s in play). PoE2 has no cooldown, and an instant re-raise would stall lanes forever.
18. **Frostbolt's "terrain"** is a Rock tile, a Shieldbearer's shield, or the board edge.
19. **Herald of Ice's explosion** uses the killing hero's weapon, not the herald's.
20. **Vulnerability** is written as flat −X total Armour, per its data stat.
21. **Freezing Mark's buff** goes to the Mark hero and its 8 neighbours. In PoE2 it goes only to "you".

**Economy and progression**

22. **Acolyte Spirit per level** (+2 per hero level above 1, **KvN custom**) makes acolyte levels matter. The brief's formula is unchanged. Appendix C's 100 base Spirit on every sceptre is the main source, so a white sceptre already makes 37.5 mana per orb.
23. **Hero attribute growth** (`7 + 8w + 2(L−1)w`) is defined here because the brief names the inputs but not the formula.
24. **Starter grants ignore the tier gate.** The Sorceress gets Comet (tier 11) and Ice Strike (tier 5).
25. **Efficiency I is adapted** to multiply placement cost by ×0.70. As in PoE2, it cannot roll on Persistent heroes (auras, acolytes).
26. **Mark heroes have a filler attack** (PoE2's default Bow Shot). The brief's "weak or no attacks" rule applies to aura heroes only.
