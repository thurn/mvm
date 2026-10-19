# Appendix C: Items, Affixes, Uniques & Currency

Part of the Mercs vs. Monsters (MvM) GDD. Primary doc: `gdd.md`. Related appendices:

- `appendix-a-combat.md`: damage pipeline, stat vocabulary ids (§9), grid mapping, projectile fan rule (§3.4).
- `appendix-b-heroes.md`: heroes, supports, hero quality effects.
- `appendix-d-monsters-levels.md`: monster rarity, boss levels, area level per level.
- `appendix-e-economy.md`: absolute drop rates, gold values, vendors, loot shaping for heroes.

**Data source.** All ids, values and drop levels come from the repoe-fork/poe2 export 4.5.5.2 (PoE2 0.5.x): `base_items.json`, `mods.json`, `mods_by_base.json`, `uniques.json`. Facts the export does not hold (Spirit on sceptres, quality rules, unique bases, currency drop levels) come from poe2db.tw pages and the shared research file `research_loot_economy.md`. Every row cites its PoE2 id.

## TL;DR

- 3 hero slots: **Weapon** (locked class), **Armor** (body armour, or a shield for Spear and One Hand Mace heroes), **Accessory** (amulet, ring or belt).
- One item buffs **every placed copy** of that roster hero. Nothing is split between copies.
- **Team affixes** ("+12% team fire resistance") buff every hero instead (C.3.8). Resistances exist only as team affixes; life, defences and elemental damage have a hero version and a rarer, weaker team version.
- Rarities and mod counts follow PoE2. Item level gates mod tiers by `required_level`.
- **Everything auto-identifies.** The loot ticker shows real affixes the moment an item drops.
- Catalog: **45 weapon bases** across 9 classes, **12 body armours**, **5 shields**, **13 jewellery bases**.
- **101 affix families**: 73 core, 18 team families (C.3.8), plus 10 sceptre "Allies in your Presence" families that need one vocabulary addition.
- **17 uniques**. Each boss draws its guaranteed unique from a level-gated pool.
- **13 currency families** (Jeweller's Orb counts once, in 3 grades), 2 PoE2 shards, and 1 MvM custom shard.
- Six of these currencies have PoE2 drop levels of 25–65, at or past the demo's end. MvM lowers them (see Deviations).

## Conventions used in this appendix

| Term | Meaning |
|---|---|
| `rl` | PoE2 `required_level` of a mod tier. A tier can roll only if item level ≥ rl. |
| T1, T2… | Tier index counting **up from the weakest** (T1 = lowest rl). It counts only tiers that can spawn on MvM slots.<br>It usually matches the PoE2 mod id suffix (`…Percent1`, `…Percent2`). The exception is life leech: `LifeLeech1` and `LifeLeechLocal1` have spawn weight 0 in PoE2, so T1 there is `…2`.<br>PoE2's in-game tooltip counts the other way. |
| Weight | MvM spawn weight **per tier**. PoE2's client data only has 0/1 spawn flags: all 7,140 spawn-weight entries on item prefixes and suffixes in `mods.json` are 0 or 1, and poe2db notes that weights cannot be read from game files. MvM keeps PoE2's 0/1 allow-list and sets the numbers. |
| 1H+Bow / 2H+Xbw | PoE2 gives bows the one-hand values of added-damage mods and crossbows the two-hand values. The tables follow the data. |
| **adapted** | A PoE2 stat swapped for a MvM vocabulary stat; the original is named. |
| **MvM custom** | Invented for MvM. |
| **deviation** | Needs something the brief does not allow yet; listed under Deviations from brief. |

---

## C.1 Item model

### C.1.1 Hero slots

Each roster slot holds one hero and exactly 3 items.

| Slot | Accepts (PoE2 item class) | Rule |
|---|---|---|
| Weapon | `Bow`, `Crossbow`, `Spear`, `One Hand Mace`, `Two Hand Mace`, `Warstaff` (shown as Quarterstaff), `Wand`, `Staff`, `Sceptre` | Only the hero's locked class (from its skill gem). A bow hero takes only bows. |
| Armor | `Body Armour` **or** `Shield` | Shield only if the hero's weapon class is `Spear` or `One Hand Mace`. A shield gives block; a body armour gives more defence and can roll Spirit. |
| Accessory | `Amulet`, `Ring`, `Belt` | Any hero, any one of the three. |

Not in the demo: swords, axes, daggers, claws, flails, helmets, gloves, boots, quivers, foci, bucklers, flasks, charms, jewels.

### C.1.2 Rarity and item level

| Rarity | Mods (PoE2) | How it is made |
|---|---|---|
| Normal (white) | 0 explicit | Drops, vendor |
| Magic (blue) | 1–2: at most 1 prefix + 1 suffix | Drops, Transmutation |
| Rare (yellow) | 1–6: at most 3 prefixes + 3 suffixes; drops have 4–6 (C.6) | Drops, Regal, Alchemy |
| Unique (orange) | Fixed list (C.4) | Drops, bosses |

**Item level (ilvl).**

- ilvl = area level of the level where the item dropped.
- +1 if it dropped from a **rare monster**, +2 if from a **boss**. This is PoE2's rule (research file §1.3: "rare monsters give +1 item level and unique monsters give +2"). The brief says "rares +1, uniques +2", which MvM reads as monster rarity. See Deviations.
- A mod tier is eligible only if `required_level ≤ ilvl`.
- A base is eligible only if its `drop_level ≤ ilvl`.
- Vendors and gambles use the current area level as ilvl (`appendix-e-economy.md`).

### C.1.3 Implicits

- A base's implicits come from its `implicits` list in `base_items.json`. They roll inside their range when the item drops.
- Implicits are not affixes. They don't count toward the 3 + 3 limit.
- Divine Orb rerolls **explicit** mods only. In PoE2, rerolling implicits needs "Omen of the Blessed", and omens are cut.
- Some implicits are cut or adapted because their mechanic is cut, for example "Grants Skill: Spear Throw". The base tables in C.2 give each one's fate.

### C.1.4 Quality

The default maximum is 20%, as in PoE2. A corruption outcome can push it to 23% (C.5.3).

| Class | PoE2 effect (poe2db Quality page and glossary) | MvM |
|---|---|---|
| Martial weapons: Bow, Crossbow, Spear, One/Two Hand Mace, Quarterstaff | 1% more Physical damage per 1% quality | Same. Applied as a separate × (1 + Q/100) on the weapon's physical damage. |
| Body armour, Shield | 1% more Armour, Evasion and ES per 1% quality | Same. Applied as × (1 + Q/100) on the item's local defences. |
| Wand, Staff, Sceptre | Quality boosts the skill the item grants | **adapted**: granted skills are cut (the hero is the skill). Wand and Staff get 1% increased Spell damage per 1% quality. Sceptre gets 1% increased Spirit (local) per 1% quality, so 20% quality = +20 Spirit. |
| Amulet, Ring | Quality type set by catalysts | Catalysts are cut, so no quality. |
| Belt | No quality effect in PoE2 | No quality. |

**Where quality comes from.** The brief's 13 currencies have no item-quality orb (Armourer's Scrap, Blacksmith's Whetstone and Arcanist's Etcher are not listed). In MvM, quality comes only from:

- drops: **MvM custom**, 10% of non-unique weapon and armour drops roll quality uniformly from 1 to 20%;
- the Vaal Orb quality outcome.

See Deviations for the option of adding the three PoE2 quality currencies.

### C.1.5 Identification: auto-identify (recommended)

In PoE2, magic, rare and unique drops are unidentified until you use a Scroll of Wisdom. **MvM identifies every item and hero on drop.**

Why:

- **The live loot ticker needs it.** "Rare Ironhead Spear: Serrated, of Ease…" mid-wave is the dopamine hit the test is about. "Unidentified Rare" is not.
- **The loot filter needs it.** Preset 3 (C.7) sorts magic items by affix tier, which it cannot do for unidentified items.
- **It is pure friction in a 2-hour test.** Identifying in PoE2 has no decision attached: you identify everything you might keep.
- **No currency is lost.** Scroll of Wisdom is not one of the brief's 13 currencies.
- **The gamble tab keeps the mystery.** Its item or hero is unidentified until bought and revealed on purchase.

### C.1.6 Corruption

- The Vaal Orb corrupts any non-corrupted item: Normal, Magic, Rare or Unique. Outcome table: C.5.3.
- A corrupted item **cannot be changed by any currency**, not even Divine or another Vaal. It can still be equipped, sold and salvaged as usual.
- Corrupted items show a red "Corrupted" line.
- No item drops already corrupted in the demo (**MvM custom**; PoE2 has some). This keeps corruption a choice the player makes.

### C.1.7 Local vs global mods, with many copies of a hero

**Copies.**

- Every placed copy of a roster hero uses the same 3 items.
- Each copy gets the **full** value of every mod. Five copies of a spear hero with "+50 to maximum Life" all have +50 life. Nothing is shared out or divided.
- "% increased Rarity of Items found" and "% increased Gold found" apply to monsters killed by that copy (brief).

**Local mods** change the item itself, before the hero sees it.

- On weapons: "Adds X to Y Physical/Fire/Cold/Lightning/Chaos Damage", "% increased Physical Damage", "% increased Attack Speed", "+% to Critical Hit Chance", "+ to Accuracy Rating", "+% to Critical Damage Bonus", leech ("Leeches X% of Physical Damage as Life").
- On armour: local flat and % Armour, Evasion and ES, and shield block chance.
- Stat ids start with `local_`.

**Global mods** go into the hero's stat sheet: life, resistances, attributes, Spirit, "Adds X to Y … to Attacks" on rings, "% increased Fire Damage" on rings, and so on.

They stay on that hero and its copies. They never buff other heroes. The exceptions are team mods and "Allies in your Presence" (below).

**Team mods** (**MvM custom**, C.3.8) go into one team stat sheet that buffs every hero ([appendix A §2.1](appendix-a-combat.md)).

- Stat ids start with `team_`. Tooltips say "team": "+12% team fire resistance", "+6% team fire damage".
- Each roster hero's items count **once**, placed or not. Copies don't multiply them.
- **Why.** A monster hits only the hero in front of it. A hero-only resistance roll on a back-row archer did nothing, so it competed with real affixes and lost. A team roll pays off for the whole board, and stacking one element's damage across six heroes' gear feeds one carry, as stacking across slots does in PoE.

**Weapon calculation order** (PoE2, local first):

```
phys      = (base_phys + local_added_phys) × (1 + Σ local_%_phys) × (1 + quality/100)
ele/chaos = local_added_fire|cold|lightning|chaos            # not scaled by local % phys
attack_time = base_attack_time / (1 + Σ local_%_attack_speed)
crit      = base_crit + Σ local_flat_crit                    # e.g. 5% + 1.2%
accuracy  = hero_accuracy + Σ local_accuracy
→ the weapon's numbers then enter the hero's global pipeline (appendix-a-combat.md):
  global added (rings) → conversion/gained-as → increased/more → crit
```

**Example.** A spear hero has an Ironhead Spear (9–12) with "Adds 4 to 7 Physical" (local) and "50% increased Physical Damage" (local). The hero also wears an Iron Ring with "Adds 1 to 4 Physical Damage to Attacks" (global).

1. Weapon: (9+4)–(12+7) = 13–19, × 1.5 = **20–29** (rounded to nearest).
2. The skill adds the ring's 1–4 as attack base damage: 21–33 before global increases.
3. If the ring said "50% increased Physical Damage" instead, it would scale everything, the ring adds included.

**Allies in your Presence (sceptre mods and Fixation of Yix) — deviation.**

- These apply to *other* heroes standing inside a copy's Presence radius. That is **1.5 tiles**, adapted from PoE2's 4 m, per `appendix-a-combat.md` §8.
- Same rule as auras: one ally gets each distinct "Allies in your Presence" mod **once**, from the strongest source in range. Two copies of the same acolyte never stack their sceptre buffs on one ally.

### C.1.8 Spirit

- Spirit is a hero stat: sceptre + body armour mods + amulet implicit/mods + uniques + passives.
- **Every PoE2 sceptre has a base 100 Spirit.** poe2db lists "Spirit: 100" for all 16 sceptre bases; the export does not store it.
- The local "% increased Spirit" mods on sceptres scale that 100, so "20–26% increased Spirit" = +20–26 Spirit.
- With the brief's formula (mana per cycle = 25 × (1 + Spirit/200)), an acolyte with a white sceptre already makes **37.5 mana per cycle**. `appendix-e-economy.md` must calibrate against that 100 floor.

---

## C.2 Base item catalog (area levels 1 to ~35)

**How to read the weapon tables.**

- Damage, attack time (ms), crit (base, in %) and range are PoE2 `properties`.
- APS = 1000 / attack time.
- Range is in raw PoE2 units (10 = 1 m). It is informational only: melee is lane-literal in MvM.
- Attribute requirements are dropped (MvM has none).
- PoE2 body armours and shields also list a movement-speed penalty. It is ignored, since heroes don't move.

### C.2.1 Weapons (45 bases, 5 per class)

**Bow**

| Base (PoE2 id) | Drop lvl | Phys dmg | Attack time (APS) | Crit | Range | Implicit → MvM | Unique on base |
|---|---|---|---|---|---|---|---|
| Crude Bow (`FourBow1`) | 1 | 6–9 | 833 ms (1.20) | 5% | 120 | — |  |
| Shortbow (`FourBow2`) | 5 | 7–14 | 800 ms (1.25) | 5% | 120 | — |  |
| Warden Bow (`FourBow3`) | 11 | 12–20 | 870 ms (1.15) | 5% | 120 | `BowImplicitLocalChanceToChain1` (25-35)% chance to Chain an additional time → **adapted**: `chain_count` +1 with 25–35% chance per projectile |  |
| Composite Bow (`FourBow5`) | 22 | 19–31 | 833 ms (1.20) | 5% | 120 | — | Doomfletch |
| Dualstring Bow (`FourBow6`) | 28 | 19–35 | 870 ms (1.15) | 5% | 120 | `BowImplicitAdditionalArrows1` +50% Surpassing chance to fire an additional Arrow → **adapted**: `additional_projectiles` +1 with 50% chance (Surpassing); fans per appendix-a §3.4 | Death's Harp |

**Crossbow**

| Base (PoE2 id) | Drop lvl | Phys dmg | Attack time (APS) | Crit | Range | Implicit → MvM | Unique on base |
|---|---|---|---|---|---|---|---|
| Makeshift Crossbow (`FourCrossbow1`) | 1 | 7–12 | 625 ms (1.60) | 5% | 120 | — | Mist Whisper |
| Sturdy Crossbow (`FourCrossbow3`) | 10 | 11–26 | 645 ms (1.55) | 5% | 120 | — |  |
| Varnished Crossbow (`FourCrossbow4`) | 16 | 12–36 | 625 ms (1.60) | 5% | 120 | — |  |
| Dyad Crossbow (`FourCrossbow5`) | 20 | 9–37 | 625 ms (1.60) | 5% | 120 | `CrossbowImplicitAdditionalAmmo1` Loads an additional bolt → cut: appendix-a has no crossbow reload model (revisit if one is added) |  |
| Alloy Crossbow (`FourCrossbow6`) | 26 | 12–50 | 588 ms (1.70) | 5% | 120 | — |  |

**Spear**

| Base (PoE2 id) | Drop lvl | Phys dmg | Attack time (APS) | Crit | Range | Implicit → MvM | Unique on base |
|---|---|---|---|---|---|---|---|
| Hardwood Spear (`FourSpear1`) | 1 | 5–9 | 625 ms (1.60) | 5% | 15 | `SpearImplicitDisplaySpearThrow1` Grants Skill: Spear Throw → cut: grants Spear Throw (the hero is the skill) | Splinter of Lorrata |
| Ironhead Spear (`FourSpear2`) | 5 | 9–12 | 625 ms (1.60) | 5% | 15 | `SpearImplicitDisplaySpearThrow1` Grants Skill: Spear Throw → cut: grants Spear Throw (the hero is the skill) |  |
| Winged Spear (`FourSpear4`) | 16 | 12–22 | 588 ms (1.70) | 5% | 15 | `SpearImplicitDisplaySpearThrow1` Grants Skill: Spear Throw → cut: grants Spear Throw (the hero is the skill) |  |
| War Spear (`FourSpear5`) | 21 | 16–27 | 625 ms (1.60) | 5% | 15 | `SpearImplicitDisplaySpearThrow1` Grants Skill: Spear Throw → cut: grants Spear Throw (the hero is the skill)<br>`SpearImplicitLocalProjectileSpeed1` (25-35)% increased Projectile Speed with this Weapon → kept: % increased projectile speed (local) |  |
| Forked Spear (`FourSpear6`) | 26 | 13–38 | 645 ms (1.55) | 5% | 15 | `SpearImplicitDisplaySpearThrow1` Grants Skill: Spear Throw → cut: grants Spear Throw (the hero is the skill) |  |

**One Hand Mace**

| Base (PoE2 id) | Drop lvl | Phys dmg | Attack time (APS) | Crit | Range | Implicit → MvM | Unique on base |
|---|---|---|---|---|---|---|---|
| Wooden Club (`FourOneHandMace1`) | 1 | 6–10 | 690 ms (1.45) | 5% | 13 | — |  |
| Smithing Hammer (`FourOneHandMace2`) | 4 | 11–18 | 690 ms (1.45) | 5% | 13 | `MaceImplicitFireDamage1` (hidden) 50% of base damage is Fire → **adapted**: 50% of physical converted to fire (local) |  |
| Slim Mace (`FourOneHandMace3`) | 10 | 11–17 | 645 ms (1.55) | 5% | 13 | — | Frostbreath |
| Warpick (`FourOneHandMace5`) | 22 | 18–24 | 690 ms (1.45) | 7% | 13 | `MaceImplicitCriticalMultiplier1` +(5-10)% to Critical Damage Bonus → kept: +% critical damage bonus | Sculpted Suffering |
| Plated Mace (`FourOneHandMace6`) | 26 | 18–38 | 714 ms (1.40) | 5% | 13 | — |  |

**Two Hand Mace**

| Base (PoE2 id) | Drop lvl | Phys dmg | Attack time (APS) | Crit | Range | Implicit → MvM | Unique on base |
|---|---|---|---|---|---|---|---|
| Felled Greatclub (`FourTwoHandMace1`) | 1 | 13–18 | 909 ms (1.10) | 5% | 15 | — |  |
| Oak Greathammer (`FourTwoHandMace2`) | 4 | 16–30 | 1000 ms (1.00) | 5% | 15 | `MaceImplicitStunDamageIncrease1` Causes (20-40)% increased Stun Buildup → kept: % increased stun buildup |  |
| Studded Greatclub (`FourTwoHandMace4`) | 16 | 32–48 | 909 ms (1.10) | 5% | 15 | — | Brain Rattler |
| Cultist Greathammer (`FourTwoHandMace5`) | 22 | 36–49 | 952 ms (1.05) | 5% | 15 | `MaceImplicitSplashDamage1` Strikes deal Splash Damage → **adapted**: hits also strike monsters within 1.25 tiles of the target (PoE2 splash radius 1.5 m) |  |
| Temple Maul (`FourTwoHandMace6`) | 28 | 35–72 | 833 ms (1.20) | 5% | 15 | — |  |

**Quarterstaff (item class "Warstaff")**

| Base (PoE2 id) | Drop lvl | Phys dmg | Attack time (APS) | Crit | Range | Implicit → MvM | Unique on base |
|---|---|---|---|---|---|---|---|
| Wrapped Quarterstaff (`FourQuarterstaff1`) | 1 | 7–12 | 714 ms (1.40) | 10% | 14 | — | The Blood Thorn |
| Gothic Quarterstaff (`FourQuarterstaff3`) | 11 | 16–26 | 714 ms (1.40) | 12% | 14 | — |  |
| Crackling Quarterstaff (`FourQuarterstaff4`) | 16 | 5–22 | 714 ms (1.40) | 10% | 14 | `QuarterstaffImplicitBaseLightningDamage1` (hidden) base 1–35 Lightning damage → kept: hidden base 1–35 Lightning = adds 1–35 Lightning (local) |  |
| Crescent Quarterstaff (`FourQuarterstaff5`) | 20 | 19–39 | 667 ms (1.50) | 10% | 14 | — |  |
| Steelpoint Quarterstaff (`FourQuarterstaff6`) | 28 | 28–51 | 714 ms (1.40) | 10% | 14 | — |  |

**Wand**

| Base (PoE2 id) | Drop lvl | Spell-mod lock (PoE2 tags) | PoE2 granted skill (cut) | Unique on base |
|---|---|---|---|---|
| Withered Wand (`FourWand1`) | 1 | Chaos only | Chaos Bolt |  |
| Bone Wand (`FourWand2`) | 2 | Physical only | Bone Blast | Sanguine Diviner |
| Attuned Wand (`FourWand3`) | 2 | any element | Mana Drain |  |
| Volatile Wand (`FourWand5`) | 16 | Fire only | Volatile Dead |  |
| Galvanic Wand (`FourWand6`) | 25 | Lightning only | Galvanic Field |  |

**Staff**

| Base (PoE2 id) | Drop lvl | Spell-mod lock (PoE2 tags) | PoE2 granted skill (cut) | Unique on base |
|---|---|---|---|---|
| Ashen Staff (`FourStaff1`) | 1 | Fire only | Firebolt |  |
| Gelid Staff (`FourStaff2`) | 2 | Cold only | Freezing Shards |  |
| Voltaic Staff (`FourStaff3`) | 2 | Lightning only | Lightning Bolt |  |
| Spriggan Staff (`FourStaff4`) | 11 | any element | Firebolt |  |
| Chiming Staff (`FourStaff6`) | 25 | any element | Sigil of Power | Sire of Shards |

**Sceptre**

| Base (PoE2 id) | Drop lvl | Spirit | PoE2 granted skill (cut) | Unique on base |
|---|---|---|---|---|
| Rattling Sceptre (`FourSceptre1`) | 1 | 100 | Skeletal Warrior |  |
| Stoic Sceptre (`FourSceptre2`) | 6 | 100 | Discipline |  |
| Omen Sceptre (`FourSceptre4`) | 16 | 100 | Malice | Font of Power |
| Ochre Sceptre (`FourSceptre5`) | 21 | 100 | Skeletal Warrior |  |
| Shrine Sceptre (`FourSceptre6a`) | 26 | 100 | Purity of Fire |  |

**Notes on caster weapons.**

- Wands and staves have **no base damage**. Their value is the mod pool, and the base decides which spell elements can roll.
- A base with PoE2 tags like `no_cold_spell_mods` can only roll its own element's spell mods.
- On an "any element" base, the **first** element-specific spell mod adds the other elements' `no_*_spell_mods` tags (PoE2 `adds_tags`) and locks the item to that element.
- Sceptres cannot attack or cast in PoE2. In MvM they are the acolyte and aura weapon, and their value is Spirit plus mods.

### C.2.2 Body armours (12)

Defence values are fixed base values from `properties`. ES = energy shield.

| Base (PoE2 id) | Type | Drop lvl | Armour | Evasion | ES | Unique on base |
|---|---|---|---|---|---|---|
| Rusted Cuirass (`FourBodyStr1`) | Str | 1 | 45 | — | — | Bramblejack |
| Iron Cuirass (`FourBodyStr3`) | Str | 11 | 115 | — | — |  |
| Steel Plate (`FourBodyStr6`) | Str | 27 | 228 | — | — |  |
| Leather Vest (`FourBodyDex1`) | Dex | 1 | — | 30 | — |  |
| Pathfinder Coat (`FourBodyDex3`) | Dex | 11 | — | 96 | — |  |
| Studded Vest (`FourBodyDex6`) | Dex | 26 | — | 194 | — |  |
| Tattered Robe (`FourBodyInt1`) | Int | 1 | — | — | 28 |  |
| Hexer's Robe (`FourBodyInt3`) | Int | 11 | — | — | 45 |  |
| Keth Raiment (`FourBodyInt6`) | Int | 28 | — | — | 74 |  |
| Chain Mail (`FourBodyStrDex1`) | Str/Dex | 1 | 25 | 16 | — |  |
| Pilgrim Vestments (`FourBodyStrInt1`) | Str/Int | 1 | 25 | — | 16 | Enfolding Dawn |
| Waxed Jacket (`FourBodyDexInt2`) | Dex/Int | 11 | — | 53 | 25 |  |

### C.2.3 Shields (5)

- Base block chance is local to the shield.
- PoE2 shields grant the "Raise Shield" skill. In MvM, block is passive (`appendix-a-combat.md`) and Raise Shield is cut.

| Base (PoE2 id) | Type | Drop lvl | Armour | Evasion | ES | Block | Unique on base |
|---|---|---|---|---|---|---|---|
| Splintered Tower Shield (`FourShieldStr1`) | Str | 1 | 18 | — | — | 26% |  |
| Hardwood Targe (`FourShieldStrDex1`) | Str/Dex | 1 | 10 | 7 | — | 25% |  |
| Braced Tower Shield (`FourShieldStr3`) | Str | 12 | 50 | — | — | 26% | Doomgate |
| Emblem Crest Shield (`FourShieldStrInt3`) | Str/Int | 16 | 34 | — | 12 | 25% |  |
| Rampart Tower Shield (`FourShieldStr6`) | Str | 28 | 96 | — | — | 26% |  |

### C.2.4 Amulets, rings, belts (13)

| Base (PoE2 id) | Class | Drop lvl | Implicit → MvM | Unique on base |
|---|---|---|---|---|
| Crimson Amulet (`FourAmulet1`) | Amulet | 1 | `AmuletImplicitLifeRegeneration1` (2-4) Life Regeneration per second → kept: + life regen per second |  |
| Amber Amulet (`FourAmulet3`) | Amulet | 8 | `AmuletImplicitStrength1` +(10-15) to Strength → kept |  |
| Jade Amulet (`FourAmulet4`) | Amulet | 8 | `AmuletImplicitDexterity1` +(10-15) to Dexterity → kept |  |
| Lapis Amulet (`FourAmulet5`) | Amulet | 8 | `AmuletImplicitIntelligence1` +(10-15) to Intelligence → kept |  |
| Stellar Amulet (`FourAmulet8`) | Amulet | 25 | `AmuletImplicitAllAttributes1` +(5-7) to all Attributes → kept | Fixation of Yix |
| Solar Amulet (`FourAmulet9`) | Amulet | 30 | `AmuletImplicitBaseSpirit1` +(10-15) to Spirit → kept: + Spirit |  |
| Iron Ring (`FourRing1`) | Ring | 1 | `RingImplicitPhysicalDamage1` Adds 1 to 4 Physical Damage to Attacks → kept: adds Physical to Attacks |  |
| Ruby Ring (`FourRing3`) | Ring | 8 | `RingImplicitFireResistance1` +(20-30)% to Fire Resistance → **adapted**: +(10-15)% team fire resistance (C.3.8) |  |
| Sapphire Ring (`FourRing4`) | Ring | 12 | `RingImplicitColdResistance1` +(20-30)% to Cold Resistance → **adapted**: +(10-15)% team cold resistance (C.3.8) |  |
| Topaz Ring (`FourRing5`) | Ring | 16 | `RingImplicitLightningResistance1` +(20-30)% to Lightning Resistance → **adapted**: +(10-15)% team lightning resistance (C.3.8) | Levinstone |
| Amethyst Ring (`FourRing6`) | Ring | 20 | `RingImplicitChaosResistance1` +(7-13)% to Chaos Resistance → **adapted**: +(4-6)% team chaos resistance (C.3.8) | Ming's Heart |
| Rawhide Belt (`FourBelt1`) | Belt | 1 | `BeltImplicitFlaskLifeRecovery1` (20-30)% increased Life Recovery from Flasks → cut: flasks are cut (belt has no implicit in MvM) |  |
| Plate Belt (`FourBelt5`) | Belt | 25 | `BeltImplicitPhysicalDamageReductionRating1` +(140-180) to Armour → kept: + armour (global) |  |

**Not used, and why:**

- Azure Amulet, Lazuli Ring, Linen Belt: mana implicits.
- Wide, Long and Ornate Belt: flask or charm implicits.
- Dusk, Gloam, Penumbra, Tenebrous, Twisted and Distorted Amulets and Rings: prefix/suffix-allowance implicits. They could be added later as advanced bases.
- Gold Amulet (dl 35) and Gold Ring (dl 40): past the demo range.

### C.2.5 Bases excluded from every pool

- **`Runeforged …` bases** (`FourBowVerisium2a` etc.): Verisium/runeforging content, dl 38+.
- **Garment** (`FourBodyStrDexIntBase`): no defences; a unique-only shell.
- **Golden Plate / Golden Shield** (`FourBodyDemigod`, `FourShieldDemigod`): demigod items.
- **Cruel-difficulty copies** (`…Cruel`, dl 45).
- **`[DNT] Cragbreaker Staff`** (`FourStaffUnique2`): internal.

---

## C.3 Affix catalog

**Source filter.** `mods.json` with `domain = "item"`, `generation_type` prefix or suffix, `is_essence_only = false`, a PoE2 spawn flag of 1 on at least one MvM slot tag set, and `required_level ≤ 40`. That yields 149 PoE2 mod types. 37 are cut (C.3.7). The other 112 are kept and shown as **88 family rows**, because defence types that share one mod group are merged into one row.

**Rules that apply to every roll.**

- **One mod per PoE2 mod group per item** (the `groups` field). Example: `WeaponDamageTypePrefix` covers the Fire, Cold, Lightning, Chaos and Physical spell % prefixes, so a wand gets only one of them.
- **Separate groups can stack.** `LocalPhysicalDamagePercent` and the hybrid `LocalIncreasedPhysicalDamagePercentAndAccuracyRating` are different groups, so both can roll.
- **Max 3 prefixes and 3 suffixes on a rare, 1 + 1 on a magic item.**
- **Weights: Common 1000, Uncommon 500, Rare 250, per tier.** A family with 3 unlocked tiers has 3× its tier weight in the pool, as in PoE. This is a MvM proposal (see Conventions).
- **Values roll uniformly** inside the tier range, as integers, except stats with decimals.
- **Defence-typed families.** The "by type" rows list one variant per defence type. A base can only roll the variant matching its PoE2 tag (`str_armour`, `dex_int_armour`…).
- **Value units.** Life regeneration is stored per minute (60 = 1 life/s). Leech is in 1/100 % (600 = 6%). Local crit is in 1/100 % (150 = +1.5%).

### C.3.1 Martial weapon affixes (Bow, Crossbow, Spear, Maces, Quarterstaff)

| # | Family (PoE2 type) / mod group / PoE2 stat ids | P/S | MvM stat → appendix-a stat id | Tiers (T1 = weakest): name, required level (rl), `mod id`, values |
|---|---|---|---|---|
| 1 | `LocalPhysicalDamagePercent`<br>group `LocalPhysicalDamagePercent`<br>`local_physical_damage_+%` | P | % increased Physical damage (local) → `local_physical_damage_+%` | T1 Heavy rl1: `LocalIncreasedPhysicalDamagePercent1` 40–49<br>T2 Serrated rl8: `LocalIncreasedPhysicalDamagePercent2` 50–64<br>T3 Wicked rl16: `LocalIncreasedPhysicalDamagePercent3` 65–84<br>T4 Vicious rl33: `LocalIncreasedPhysicalDamagePercent4` 85–109 |
| 2 | `LocalIncreasedPhysicalDamagePercentAndAccuracyRating`<br>group `LocalIncreasedPhysicalDamagePercentAndAccuracyRating`<br>`local_physical_damage_+%`, `local_accuracy_rating` | P | % increased Physical damage (local) + accuracy (local) → `local_physical_damage_+%, local_accuracy_rating` | T1 Squire's rl8: `LocalIncreasedPhysicalDamagePercentAndAccuracyRating1` 15–19 / 16–20<br>T2 Journeyman's rl14: `LocalIncreasedPhysicalDamagePercentAndAccuracyRating2` 20–24 / 21–46<br>T3 Reaver's rl23: `LocalIncreasedPhysicalDamagePercentAndAccuracyRating3` 25–34 / 47–72<br>T4 Mercenary's rl38: `LocalIncreasedPhysicalDamagePercentAndAccuracyRating4` 35–44 / 73–97 |
| 3 | `LocalPhysicalDamage`<br>group `PhysicalDamage`<br>`local_minimum_added_physical_damage`, `local_maximum_added_physical_damage` | P | adds X–Y Physical (local) → `local_added_physical_damage` | T1 Glinting rl1: 1H+Bow `LocalAddedPhysicalDamage1` (1–2) to (4–5); 2H+Xbw `LocalAddedPhysicalDamageTwoHand1` (2–3) to (5–7)<br>T2 Burnished rl8: 1H+Bow `LocalAddedPhysicalDamage2` (4–6) to (7–11); 2H+Xbw `LocalAddedPhysicalDamageTwoHand2` (5–8) to (10–15)<br>T3 Polished rl16: 1H+Bow `LocalAddedPhysicalDamage3` (6–9) to (11–16); 2H+Xbw `LocalAddedPhysicalDamageTwoHand3` (8–12) to (15–22)<br>T4 Honed rl33: 1H+Bow `LocalAddedPhysicalDamage4` (8–12) to (14–21); 2H+Xbw `LocalAddedPhysicalDamageTwoHand4` (11–17) to (20–30) |
| 4 | `LocalFireDamage`<br>group `FireDamage`<br>`local_minimum_added_fire_damage`, `local_maximum_added_fire_damage` | P | adds X–Y Fire (local) → `local_added_fire_damage` | T1 Heated rl1: 1H+Bow `LocalAddedFireDamage1` (1–2) to (3–5); 2H+Xbw `LocalAddedFireDamageTwoHand1` (2–4) to (5–7)<br>T2 Smouldering rl8: 1H+Bow `LocalAddedFireDamage2` (4–6) to (7–10); 2H+Xbw `LocalAddedFireDamageTwoHand2` (6–9) to (10–16)<br>T3 Smoking rl16: 1H+Bow `LocalAddedFireDamage3` (7–11) to (13–19); 2H+Xbw `LocalAddedFireDamageTwoHand3` (11–17) to (19–28)<br>T4 Burning rl33: 1H+Bow `LocalAddedFireDamage4` (13–19) to (21–29); 2H+Xbw `LocalAddedFireDamageTwoHand4` (19–27) to (30–42) |
| 5 | `LocalColdDamage`<br>group `ColdDamage`<br>`local_minimum_added_cold_damage`, `local_maximum_added_cold_damage` | P | adds X–Y Cold (local) → `local_added_cold_damage` | T1 Frosted rl1: 1H+Bow `LocalAddedColdDamage1` (1–2) to (3–4); 2H+Xbw `LocalAddedColdDamageTwoHand1` (2–3) to (4–6)<br>T2 Chilled rl8: 1H+Bow `LocalAddedColdDamage2` (3–5) to (6–9); 2H+Xbw `LocalAddedColdDamageTwoHand2` (5–8) to (9–14)<br>T3 Icy rl16: 1H+Bow `LocalAddedColdDamage3` (6–9) to (10–16); 2H+Xbw `LocalAddedColdDamageTwoHand3` (10–14) to (15–23)<br>T4 Frigid rl33: 1H+Bow `LocalAddedColdDamage4` (11–15) to (17–24); 2H+Xbw `LocalAddedColdDamageTwoHand4` (16–23) to (25–35) |
| 6 | `LocalLightningDamage`<br>group `LightningDamage`<br>`local_minimum_added_lightning_damage`, `local_maximum_added_lightning_damage` | P | adds X–Y Lightning (local) → `local_added_lightning_damage` | T1 Humming rl1: 1H+Bow `LocalAddedLightningDamage1` 1 to (4–6); 2H+Xbw `LocalAddedLightningDamageTwoHand1_` 1 to (7–10)<br>T2 Buzzing rl8: 1H+Bow `LocalAddedLightningDamage2` 1 to (13–19); 2H+Xbw `LocalAddedLightningDamageTwoHand2` (1–2) to (19–27)<br>T3 Snapping rl16: 1H+Bow `LocalAddedLightningDamage3` (1–2) to (20–30); 2H+Xbw `LocalAddedLightningDamageTwoHand3` (1–3) to (31–43)<br>T4 Crackling rl33: 1H+Bow `LocalAddedLightningDamage4` (1–2) to (36–52); 2H+Xbw `LocalAddedLightningDamageTwoHand4` (1–4) to (53–76) |
| 7 | `IncreasedWeaponElementalDamagePercent`<br>group `IncreasedWeaponElementalDamagePercent`<br>`elemental_damage_with_attack_skills_+%` | P | % increased Elemental damage → `elemental_damage_+%` — **adapted**: PoE2 "Elemental damage with Attacks"; on an attack hero all damage is attack damage | T1 Catalysing rl4: 1H+Bow `WeaponElementalDamage1` 19–35; 2H+Xbw `WeaponElementalDamageOnTwohandWeapon1` 34–47<br>T2 Infusing rl16: 1H+Bow `WeaponElementalDamage2` 36–52; 2H+Xbw `WeaponElementalDamageOnTwohandWeapon2____` 48–71<br>T3 Empowering rl33: 1H+Bow `WeaponElementalDamage3` 53–62; 2H+Xbw `WeaponElementalDamageOnTwohandWeapon3` 72–85 |
| 8 | `LocalAccuracyRating`<br>group `IncreasedAccuracy`<br>`local_accuracy_rating` | P | + accuracy rating (local) → `local_accuracy_rating` | T1 Precise rl8: `LocalIncreasedAccuracy1` 11–32<br>T2 Reliable rl13: `LocalIncreasedAccuracy2` 33–60<br>T3 Focused rl18: `LocalIncreasedAccuracy3` 61–84<br>T4 Deliberate rl26: `LocalIncreasedAccuracy4` 85–123<br>T5 Consistent rl36: `LocalIncreasedAccuracy5` 124–167 |
| 9 | `LocalIncreasedAttackSpeed`<br>group `IncreasedAttackSpeed`<br>`local_attack_speed_+%` | S | % increased attack speed (local) → `local_attack_speed_+%` | T1 of Skill rl1: `LocalIncreasedAttackSpeed1` 5–7<br>T2 of Ease rl11: `LocalIncreasedAttackSpeed2` 8–10<br>T3 of Mastery rl22: `LocalIncreasedAttackSpeed3` 11–13<br>T4 of Renown rl30: `LocalIncreasedAttackSpeed4` 14–16<br>T5 of Acclaim rl37: `LocalIncreasedAttackSpeed5` 17–19 |
| 10 | `LocalBaseCriticalStrikeChance`<br>group `CriticalStrikeChanceIncrease`<br>`local_critical_strike_chance` | S | crit chance (local) → `local_critical_strike_chance_+%` (see Deviations 7) — PoE2 adds flat base crit: +1.01–1.5% (stat in hundredths) | T1 of Menace rl1: `LocalCriticalStrikeChance1` 101–150<br>T2 of Havoc rl20: `LocalCriticalStrikeChance2` 151–210<br>T3 of Disaster rl30: `LocalCriticalStrikeChance3` 211–270 |
| 11 | `LocalCriticalStrikeMultiplier`<br>group `CriticalStrikeMultiplier`<br>`local_critical_strike_multiplier_+` | S | +% critical damage bonus → `critical_strike_multiplier_+` | T1 of Ire rl8: `LocalCriticalMultiplier1` 10–11<br>T2 of Anger rl21: `LocalCriticalMultiplier2` 12–13<br>T3 of Rage rl30: `LocalCriticalMultiplier3` 14–16 |
| 12 | `LifeLeechLocalPermyriad`<br>group `LifeLeech`<br>`local_life_leech_from_physical_damage_permyriad` | S | % of physical attack damage leeched as life → `life_leech_from_physical_attack_damage_%` — value in 1/100 %: 600 = 6% | T1 of the Locust rl21: `LifeLeechLocal2` 600–690<br>T2 of the Remora rl38: `LifeLeechLocal3` 700–790 |
| 13 | `LifeGainedFromEnemyDeath`<br>group `LifeGainedFromEnemyDeath`<br>`base_life_gained_on_enemy_death` | S | + life on kill → `life_gained_on_kill` — also on Wnd, Stf, Rng | T1 of Success rl1: `LifeGainedFromEnemyDeath1` 4–6<br>T2 of Victory rl11: `LifeGainedFromEnemyDeath2` 7–9<br>T3 of Triumph rl22: `LifeGainedFromEnemyDeath3` 10–18<br>T4 of Conquest rl33: `LifeGainedFromEnemyDeath4` 19–28 |
| 14 | `LocalStunDamageIncrease`<br>group `StunDamageIncrease`<br>`local_hit_damage_stun_multiplier_+%` | S | % increased stun buildup → `stun_buildup_+%` | T1 of the Pugilist rl5: `StunDamageIncrease1` 21–30<br>T2 of the Brawler rl20: `StunDamageIncrease2` 31–40<br>T3 of the Boxer rl30: `StunDamageIncrease3` 41–50 |
| 15 | `LocalLightRadiusAndAccuracy`<br>group `LightRadiusAndAccuracy`<br>`light_radius_+%`, `local_accuracy_rating` | S | + accuracy rating (local) → `local_accuracy_rating` — **adapted**: light-radius half dropped | T1 of Shining rl8: `LocalLightRadiusAndAccuracy1` 5 / 10–20<br>T2 of Light rl15: `LocalLightRadiusAndAccuracy2` 10 / 21–40<br>T3 of Radiance rl30: `LocalLightRadiusAndAccuracy3` 15 / 41–60 |

### C.3.2 Caster weapon affixes (Wand, Staff)

| # | Family (PoE2 type) / mod group / PoE2 stat ids | P/S | MvM stat → appendix-a stat id | Tiers (T1 = weakest): name, required level (rl), `mod id`, values |
|---|---|---|---|---|
| 16 | `WeaponSpellDamage`<br>group `WeaponCasterDamagePrefix`<br>`spell_damage_+%` | P | % increased Spell damage → `spell_damage_+%` | T1 Apprentice's rl1: Wnd `SpellDamageOnWeapon1` 25–34; Stf `SpellDamageOnTwoHandWeapon1` 50–68<br>T2 Adept's rl8: Wnd `SpellDamageOnWeapon2` 35–44; Stf `SpellDamageOnTwoHandWeapon2` 69–88<br>T3 Scholar's rl16: Wnd `SpellDamageOnWeapon3` 45–54; Stf `SpellDamageOnTwoHandWeapon3` 89–108<br>T4 Professor's rl33: Wnd `SpellDamageOnWeapon4` 55–64; Stf `SpellDamageOnTwoHandWeapon4` 109–128 |
| 17 | `WeaponSpellDamageAndMana`<br>group `SpellDamageAndMana`<br>`spell_damage_+%`, `base_maximum_mana` | P | % increased Spell damage → `spell_damage_+%` — **adapted**: + max mana half dropped | T1 Caster's rl2: Wnd `SpellDamageAndManaOnWeapon1` 15–19 / 17–20; Stf `SpellDamageAndManaOnTwoHandWeapon1` 30–38 / 34–40<br>T2 Conjuror's rl11: Wnd `SpellDamageAndManaOnWeapon2` 20–24 / 21–24; Stf `SpellDamageAndManaOnTwoHandWeapon2` 39–48 / 41–48<br>T3 Wizard's rl23: Wnd `SpellDamageAndManaOnWeapon3` 25–29 / 25–28; Stf `SpellDamageAndManaOnTwoHandWeapon3` 49–58 / 49–56<br>T4 Warlock's rl38: Wnd `SpellDamageAndManaOnWeapon4` 30–34 / 29–33; Stf `SpellDamageAndManaOnTwoHandWeapon4` 59–68 / 57–66 |
| 18 | `FireDamageWeaponPrefix`<br>group `WeaponDamageTypePrefix`<br>`fire_damage_+%` | P | % increased Fire damage → `fire_damage_+%` — locks wand/staff to Fire (adds no_cold/lightning/chaos/physical_spell_mods) | T1 Searing rl2: Wnd `FireDamagePrefixOnWeapon1` 25–34; Stf `FireDamagePrefixOnTwoHandWeapon1` 50–68<br>T2 Sizzling rl8: Wnd `FireDamagePrefixOnWeapon2` 35–44; Stf `FireDamagePrefixOnTwoHandWeapon2___` 69–88<br>T3 Blistering rl16: Wnd `FireDamagePrefixOnWeapon3` 45–54; Stf `FireDamagePrefixOnTwoHandWeapon3` 89–108<br>T4 Cauterising rl33: Wnd `FireDamagePrefixOnWeapon4` 55–64; Stf `FireDamagePrefixOnTwoHandWeapon4` 109–128 |
| 19 | `ColdDamageWeaponPrefix`<br>group `WeaponDamageTypePrefix`<br>`cold_damage_+%` | P | % increased Cold damage → `cold_damage_+%` — locks to Cold | T1 Bitter rl2: Wnd `ColdDamagePrefixOnWeapon1` 25–34; Stf `ColdDamagePrefixOnTwoHandWeapon1` 50–68<br>T2 Biting rl8: Wnd `ColdDamagePrefixOnWeapon2` 35–44; Stf `ColdDamagePrefixOnTwoHandWeapon2` 69–88<br>T3 Alpine rl16: Wnd `ColdDamagePrefixOnWeapon3_` 45–54; Stf `ColdDamagePrefixOnTwoHandWeapon3` 89–108<br>T4 Snowy rl33: Wnd `ColdDamagePrefixOnWeapon4` 55–64; Stf `ColdDamagePrefixOnTwoHandWeapon4_` 109–128 |
| 20 | `LightningDamageWeaponPrefix`<br>group `WeaponDamageTypePrefix`<br>`lightning_damage_+%` | P | % increased Lightning damage → `lightning_damage_+%` — locks to Lightning | T1 Charged rl2: Wnd `LightningDamagePrefixOnWeapon1_` 25–34; Stf `LightningDamagePrefixOnTwoHandWeapon1` 50–68<br>T2 Hissing rl8: Wnd `LightningDamagePrefixOnWeapon2` 35–44; Stf `LightningDamagePrefixOnTwoHandWeapon2` 69–88<br>T3 Bolting rl16: Wnd `LightningDamagePrefixOnWeapon3` 45–54; Stf `LightningDamagePrefixOnTwoHandWeapon3` 89–108<br>T4 Coursing rl33: Wnd `LightningDamagePrefixOnWeapon4` 55–64; Stf `LightningDamagePrefixOnTwoHandWeapon4` 109–128 |
| 21 | `ChaosDamageWeaponPrefix`<br>group `WeaponDamageTypePrefix`<br>`chaos_damage_+%` | P | % increased Chaos damage → `chaos_damage_+%` — locks to Chaos | T1 Impure rl2: Wnd `ChaosDamagePrefixOnWeapon1` 25–34; Stf `ChaosDamagePrefixOnTwoHandWeapon1` 50–68<br>T2 Tainted rl8: Wnd `ChaosDamagePrefixOnWeapon2` 35–44; Stf `ChaosDamagePrefixOnTwoHandWeapon2` 69–88<br>T3 Clouded rl16: Wnd `ChaosDamagePrefixOnWeapon3` 45–54; Stf `ChaosDamagePrefixOnTwoHandWeapon3` 89–108<br>T4 Darkened rl33: Wnd `ChaosDamagePrefixOnWeapon4` 55–64; Stf `ChaosDamagePrefixOnTwoHandWeapon4` 109–128 |
| 22 | `PhysicalSpellDamageWeaponPrefix`<br>group `WeaponDamageTypePrefix`<br>`spell_physical_damage_+%` | P | % increased Physical damage → `physical_damage_+%` — **adapted**: PoE2 "Spell Physical damage"; a caster deals only spell damage. Locks to Physical | T1 Punishing rl2: Wnd `PhysicalDamagePrefixOnWeapon1` 25–34; Stf `PhysicalDamagePrefixOnTwoHandWeapon1` 50–68<br>T2 Unforgiving rl8: Wnd `PhysicalDamagePrefixOnWeapon2` 35–44; Stf `PhysicalDamagePrefixOnTwoHandWeapon2` 69–88<br>T3 Vengeful rl16: Wnd `PhysicalDamagePrefixOnWeapon3` 45–54; Stf `PhysicalDamagePrefixOnTwoHandWeapon3` 89–108<br>T4 Sadistic rl33: Wnd `PhysicalDamagePrefixOnWeapon4` 55–64; Stf `PhysicalDamagePrefixOnTwoHandWeapon4` 109–128 |
| 23 | `DamageGainedAsFire`<br>group `FireDamage`<br>`non_skill_base_all_damage_%_to_gain_as_fire` | P | % of damage gained as extra Fire → `damage_gained_as_fire_%` | T1 Fervent rl5: Wnd `SpellDamageGainedAsFire1` 13–15; Stf `SpellDamageGainedAsFireTwoHand1` 26–30<br>T2 Ardent rl16: Wnd `SpellDamageGainedAsFire2` 16–18; Stf `SpellDamageGainedAsFireTwoHand2` 31–36<br>T3 Fanatic's rl33: Wnd `SpellDamageGainedAsFire3` 19–21; Stf `SpellDamageGainedAsFireTwoHand3` 37–42 |
| 24 | `DamageGainedAsCold`<br>group `ColdDamage`<br>`non_skill_base_all_damage_%_to_gain_as_cold` | P | % of damage gained as extra Cold → `damage_gained_as_cold_%` | T1 Malignant rl5: Wnd `SpellDamageGainedAsCold1` 13–15; Stf `SpellDamageGainedAsColdTwoHand1` 26–30<br>T2 Pernicious rl16: Wnd `SpellDamageGainedAsCold2` 16–18; Stf `SpellDamageGainedAsColdTwoHand2` 31–36<br>T3 Destructive rl33: Wnd `SpellDamageGainedAsCold3` 19–21; Stf `SpellDamageGainedAsColdTwoHand3` 37–42 |
| 25 | `DamageGainedAsLightning`<br>group `LightningDamage`<br>`non_skill_base_all_damage_%_to_gain_as_lightning` | P | % of damage gained as extra Lightning → `damage_gained_as_lightning_%` | T1 Deadly rl5: Wnd `SpellDamageGainedAsLightning1` 13–15; Stf `SpellDamageGainedAsLightningTwoHand1` 26–30<br>T2 Lethal rl16: Wnd `SpellDamageGainedAsLightning2` 16–18; Stf `SpellDamageGainedAsLightningTwoHand2` 31–36<br>T3 Fatal rl33: Wnd `SpellDamageGainedAsLightning3` 19–21; Stf `SpellDamageGainedAsLightningTwoHand3` 37–42 |
| 26 | `IncreasedCastSpeed`<br>group `IncreasedCastSpeed`<br>`base_cast_speed_+%` | S | % increased cast speed → `cast_speed_+%` — also Amu, Rng (CastSpeedJewellery*) | T1 of Talent rl1: Wnd `IncreasedCastSpeed1` 9–12; Stf `IncreasedCastSpeedTwoHand1_` 14–19; Amu/Rng `CastSpeedJewellery1` 9–12<br>T2 of Nimbleness rl15: Wnd `IncreasedCastSpeed2` 13–16; Stf `IncreasedCastSpeedTwoHand2` 20–25; Amu/Rng `CastSpeedJewellery2` (rl18) 13–15<br>T3 of Expertise rl30: Wnd `IncreasedCastSpeed3` 17–20; Stf `IncreasedCastSpeedTwoHand3` 26–31; Amu/Rng `CastSpeedJewellery3` (rl35) 16–18 |
| 27 | `SpellCriticalStrikeChance`<br>group `SpellCriticalStrikeChanceIncrease`<br>`spell_critical_strike_chance_+%` | S | % increased critical hit chance → `critical_strike_chance_+%` — spells only; a caster hero only casts spells | T1 of Menace rl11: Wnd `SpellCriticalStrikeChance1` 27–33; Stf `SpellCriticalStrikeChanceTwoHand1` 40–49<br>T2 of Havoc rl21: Wnd `SpellCriticalStrikeChance2` 34–39; Stf `SpellCriticalStrikeChanceTwoHand2` 50–59<br>T3 of Disaster rl28: Wnd `SpellCriticalStrikeChance3` 40–46; Stf `SpellCriticalStrikeChanceTwoHand3` 60–69 |
| 28 | `SpellCriticalStrikeMultiplier`<br>group `CriticalStrikeMultiplier`<br>`base_spell_critical_strike_multiplier_+` | S | +% critical damage bonus → `critical_strike_multiplier_+` — spells only | T1 of Ire rl8: Wnd `SpellCriticalStrikeMultiplier1` 10–14; Stf `SpellCriticalStrikeMultiplierTwoHand1` 15–21<br>T2 of Anger rl21: Wnd `SpellCriticalStrikeMultiplier2` 15–19; Stf `SpellCriticalStrikeMultiplierTwoHand2` 23–29<br>T3 of Rage rl30: Wnd `SpellCriticalStrikeMultiplier3` 20–24; Stf `SpellCriticalStrikeMultiplierTwoHand3` 30–36 |
| 29 | `IgniteChanceIncrease`<br>group `IgniteChanceIncrease`<br>`ignite_chance_+%` | S | % increased Flammability magnitude → `flammability_magnitude_+%` — Fire lock | T1 of Ignition rl15: `IgniteChanceIncrease1` 51–60<br>T2 of Scorching rl30: `IgniteChanceIncrease2` 61–70 |
| 30 | `FreezeDamageIncrease`<br>group `FreezeDamageIncrease`<br>`hit_damage_freeze_multiplier_+%` | S | % increased Freeze buildup → `freeze_buildup_+%` — Cold lock | T1 of Freezing rl15: `FreezeDamageIncrease1` 31–40<br>T2 of Bleakness rl30: `FreezeDamageIncrease2` 41–50 |
| 31 | `ShockChanceIncrease`<br>group `ShockChanceIncrease`<br>`shock_chance_+%` | S | % increased Shock chance → `shock_chance_+%` — Lightning lock | T1 of Shocking rl15: `ShockChanceIncrease1` 51–60<br>T2 of Zapping rl30: `ShockChanceIncrease2` 61–70 |

### C.3.3 Sceptre affixes

| # | Family (PoE2 type) / mod group / PoE2 stat ids | P/S | MvM stat → appendix-a stat id | Tiers (T1 = weakest): name, required level (rl), `mod id`, values |
|---|---|---|---|---|
| 32 | `LocalIncreasedSpiritPercent`<br>group `LocalIncreasedSpiritPercent`<br>`local_spirit_+%` | P | + Spirit → `spirit` — **adapted**: local % of the sceptre's base 100 Spirit, so 20–26% = +20–26 Spirit | T1 Lord's rl1: `LocalIncreasedSpiritPercent1` 20–26<br>T2 Baron's rl8: `LocalIncreasedSpiritPercent2` 27–32<br>T3 Viscount's rl16: `LocalIncreasedSpiritPercent3` 33–38<br>T4 Marquess' rl33: `LocalIncreasedSpiritPercent4` 39–44 |
| 33 | `LocalIncreasedSpiritAndMana`<br>group `LocalIncreasedSpiritAndMana`<br>`local_spirit_+%`, `base_maximum_mana` | P | + Spirit → `spirit` — **adapted**: local % Spirit as above; mana half dropped | T1 Advisor's rl2: `LocalIncreasedSpiritAndMana1` 10–14 / 17–20<br>T2 Counselor's rl11: `LocalIncreasedSpiritAndMana2` 15–18 / 21–24<br>T3 Emissary's rl26: `LocalIncreasedSpiritAndMana3` 19–22 / 25–28<br>T4 Minister's rl36: `LocalIncreasedSpiritAndMana4` 23–26 / 29–33 |
| 34 | `AlliesInPresenceAllDamage`<br>group `AllDamage`<br>`allies_in_presence_damage_+%` | P | Allies in Presence: % increased damage → `allies_in_presence: damage_+%` (generic; also new) — **deviation**: needs "Allies in your Presence" wrapper (see Deviations) | T1 Coercive rl1: `NearbyAlliesAllDamage1` 25–34<br>T2 Agitative rl8: `NearbyAlliesAllDamage2` 35–44<br>T3 Instigative rl16: `NearbyAlliesAllDamage3` 45–54<br>T4 Provocative rl33: `NearbyAlliesAllDamage4` 55–64 |
| 35 | `AlliesInPresenceAddedPhysicalDamage`<br>group `PhysicalDamage`<br>`allies_in_presence_attack_minimum_added_physical_damage`, `allies_in_presence_attack_maximum_added_physical_damage` | P | Allies in Presence: adds X–Y Physical to Attacks → `allies_in_presence: attack_added_physical_damage` — **deviation** | T1 Glinting rl1: `NearbyAlliesAddedPhysicalDamage1` (1–2) to (3–4)<br>T2 Burnished rl8: `NearbyAlliesAddedPhysicalDamage2` (2–3) to (4–6)<br>T3 Polished rl16: `NearbyAlliesAddedPhysicalDamage3` (2–4) to (5–8)<br>T4 Honed rl33: `NearbyAlliesAddedPhysicalDamage4` (4–6) to (8–11) |
| 36 | `AlliesInPresenceAddedFireDamage`<br>group `FireDamage`<br>`allies_in_presence_attack_minimum_added_fire_damage`, `allies_in_presence_attack_maximum_added_fire_damage` | P | Allies in Presence: adds X–Y Fire to Attacks → `allies_in_presence: attack_added_fire_damage` — **deviation** | T1 Heated rl1: `NearbyAlliesAddedFireDamage1` (1–2) to (3–4)<br>T2 Smouldering rl8: `NearbyAlliesAddedFireDamage2` (3–5) to (6–9)<br>T3 Smoking rl16: `NearbyAlliesAddedFireDamage3` (6–8) to (10–13)<br>T4 Burning rl33: `NearbyAlliesAddedFireDamage4` (9–11) to (14–17) |
| 37 | `AlliesInPresenceAddedColdDamage`<br>group `ColdDamage`<br>`allies_in_presence_attack_minimum_added_cold_damage`, `allies_in_presence_attack_maximum_added_cold_damage` | P | Allies in Presence: adds X–Y Cold to Attacks → `allies_in_presence: attack_added_cold_damage` — **deviation** | T1 Frosted rl1: `NearbyAlliesAddedColdDamage1` (1–2) to (3–4)<br>T2 Chilled rl8: `NearbyAlliesAddedColdDamage2` (3–4) to (5–8)<br>T3 Icy rl16: `NearbyAlliesAddedColdDamage3` (5–6) to (9–11)<br>T4 Frigid rl33: `NearbyAlliesAddedColdDamage4` (7–8) to (12–14) |
| 38 | `AlliesInPresenceAddedLightningDamage`<br>group `LightningDamage`<br>`allies_in_presence_attack_minimum_added_lightning_damage`, `allies_in_presence_attack_maximum_added_lightning_damage` | P | Allies in Presence: adds X–Y Lightning to Attacks → `allies_in_presence: attack_added_lightning_damage` — **deviation** | T1 Humming rl1: `NearbyAlliesAddedLightningDamage1` 1 to (5–7)<br>T2 Buzzing rl8: `NearbyAlliesAddedLightningDamage2` 1 to (10–15)<br>T3 Snapping rl16: `NearbyAlliesAddedLightningDamage3` 1 to (16–22)<br>T4 Crackling rl33: `NearbyAlliesAddedLightningDamage4` 1 to (23–27) |
| 39 | `AlliesInPresenceIncreasedAttackSpeed`<br>group `IncreasedAttackSpeed`<br>`allies_in_presence_attack_speed_+%` | S | Allies in Presence: % increased attack speed → `allies_in_presence: attack_speed_+%` — **deviation** | T1 of Skill rl5: `NearbyAlliesIncreasedAttackSpeed1` 5–7<br>T2 of Ease rl20: `NearbyAlliesIncreasedAttackSpeed2` 8–10<br>T3 of Mastery rl35: `NearbyAlliesIncreasedAttackSpeed3` 11–13 |
| 40 | `AlliesInPresenceIncreasedCastSpeed`<br>group `IncreasedCastSpeed`<br>`allies_in_presence_cast_speed_+%` | S | Allies in Presence: % increased cast speed → `allies_in_presence: cast_speed_+%` — **deviation** | T1 of Talent rl6: `NearbyAlliesIncreasedCastSpeed1` 5–8<br>T2 of Nimbleness rl21: `NearbyAlliesIncreasedCastSpeed2` 9–12<br>T3 of Expertise rl36: `NearbyAlliesIncreasedCastSpeed3` 13–16 |
| 41 | `AlliesInPresenceCriticalStrikeChance`<br>group `CriticalStrikeChanceIncrease`<br>`allies_in_presence_critical_strike_chance_+%` | S | Allies in Presence: % increased crit chance → `allies_in_presence: critical_strike_chance_+%` — **deviation** | T1 of Menace rl11: `NearbyAlliesCriticalStrikeChance1` 10–14<br>T2 of Havoc rl21: `NearbyAlliesCriticalStrikeChance2` 15–19<br>T3 of Disaster rl28: `NearbyAlliesCriticalStrikeChance3` 20–24 |
| 42 | `AlliesInPresenceCriticalStrikeMultiplier`<br>group `CriticalStrikeMultiplier`<br>`allies_in_presence_critical_strike_multiplier_+` | S | Allies in Presence: +% crit damage bonus → `allies_in_presence: critical_strike_multiplier_+` — **deviation** | T1 of Ire rl8: `NearbyAlliesCriticalMultiplier1` 10–14<br>T2 of Anger rl21: `NearbyAlliesCriticalMultiplier2` 15–19<br>T3 of Rage rl30: `NearbyAlliesCriticalMultiplier3` 20–24 |
| 43 | `AlliesInPresenceAllResistances`<br>group `AllResistances`<br>`allies_in_presence_resist_all_elements_%` | S | Allies in Presence: +% all elemental res → `allies_in_presence: all_elemental_resistances_%` — **deviation** | T1 of Adjustment rl12: `NearbyAlliesAllResistances1` 3–5<br>T2 of Acclimatisation rl26: `NearbyAlliesAllResistances2` 6–8<br>T3 of Adaptation rl40: `NearbyAlliesAllResistances3` 9–11 |
| 44 | `AlliesInPresenceLifeRegeneration`<br>group `LifeRegeneration`<br>`allies_in_presence_life_regeneration_rate_per_minute` | S | Allies in Presence: + life regen per second → `allies_in_presence: life_regeneration_rate_per_second` — **deviation**; value per minute in data: 60 = 1/s | T1 of the Newt rl1: `NearbyAlliesLifeRegeneration1` 60–120<br>T2 of the Lizard rl5: `NearbyAlliesLifeRegeneration2` 126–180<br>T3 of the Flatworm rl11: `NearbyAlliesLifeRegeneration3` 186–240<br>T4 of the Starfish rl17: `NearbyAlliesLifeRegeneration4` 246–360<br>T5 of the Hydra rl26: `NearbyAlliesLifeRegeneration5` 366–540<br>T6 of the Troll rl35: `NearbyAlliesLifeRegeneration6` 546–780 |
| 45 | `PresenceRadius`<br>group `PresenceRadius`<br>`presence_area_+%` | S | % increased presence area of effect → `presence_area_+%` | T1 of Direction rl23: `PresenceRadius1` 36–45<br>T2 of Outreach rl40: `PresenceRadius2` 46–55 |

### C.3.4 Body armour and shield affixes

| # | Family (PoE2 type) / mod group / PoE2 stat ids | P/S | MvM stat → appendix-a stat id | Tiers (T1 = weakest): name, required level (rl), `mod id`, values |
|---|---|---|---|---|
| 46 | 6 variants by defence type<br>group `BaseLocalDefences`<br>`local_base_physical_damage_reduction_rating`, `local_base_evasion_rating`, `local_energy_shield` | P | local + armour / + evasion / + ES, by base type → `local_armour / local_evasion / local_energy_shield` | **Body Str, Shld Str** `LocalPhysicalDamageReductionRating`:<br>&nbsp;&nbsp;T1 Lacquered rl1: `LocalIncreasedPhysicalDamageReductionRating1` 16–27<br>&nbsp;&nbsp;T2 Studded rl8: `LocalIncreasedPhysicalDamageReductionRating2` 28–56<br>&nbsp;&nbsp;T3 Ribbed rl16: `LocalIncreasedPhysicalDamageReductionRating3` 57–77<br>&nbsp;&nbsp;T4 Fortified rl25: `LocalIncreasedPhysicalDamageReductionRating4` 78–98<br>&nbsp;&nbsp;T5 Plated rl33: `LocalIncreasedPhysicalDamageReductionRating5` 99–127<br>**Body Dex** `LocalEvasionRating`:<br>&nbsp;&nbsp;T1 Agile rl1: `LocalIncreasedEvasionRating1` 11–18<br>&nbsp;&nbsp;T2 Dancer's rl8: `LocalIncreasedEvasionRating2` 19–46<br>&nbsp;&nbsp;T3 Acrobat's rl16: `LocalIncreasedEvasionRating3` 47–66<br>&nbsp;&nbsp;T4 Fleet rl25: `LocalIncreasedEvasionRating4` 67–87<br>&nbsp;&nbsp;T5 Blurred rl33: `LocalIncreasedEvasionRating5` 88–116<br>**Body Int** `LocalEnergyShield`:<br>&nbsp;&nbsp;T1 Shining rl1: `LocalIncreasedEnergyShield1` 10–17<br>&nbsp;&nbsp;T2 Glimmering rl8: `LocalIncreasedEnergyShield2` 18–24<br>&nbsp;&nbsp;T3 Glittering rl16: `LocalIncreasedEnergyShield3` 25–30<br>&nbsp;&nbsp;T4 Glowing rl25: `LocalIncreasedEnergyShield4` 31–35<br>&nbsp;&nbsp;T5 Radiating rl33: `LocalIncreasedEnergyShield5` 36–41<br>**Body Str/Dex, Shld Str/Dex** `LocalBaseArmourAndEvasionRating`:<br>&nbsp;&nbsp;T1 Supple rl1: `LocalBaseArmourAndEvasionRating1` 9–16 / 6–10<br>&nbsp;&nbsp;T2 Pliant rl16: `LocalBaseArmourAndEvasionRating2` 17–46 / 11–41<br>&nbsp;&nbsp;T3 Flexible rl33: `LocalBaseArmourAndEvasionRating3` 47–71 / 42–64<br>**Body Str/Int, Shld Str/Int** `LocalBaseArmourAndEnergyShield`:<br>&nbsp;&nbsp;T1 Blessed rl1: `LocalBaseArmourAndEnergyShield1` 9–16 / 5–8<br>&nbsp;&nbsp;T2 Anointed rl16: `LocalBaseArmourAndEnergyShield2_` 17–46 / 9–15<br>&nbsp;&nbsp;T3 Sanctified rl33: `LocalBaseArmourAndEnergyShield3` 47–71 / 16–21<br>**Body Dex/Int** `LocalBaseEvasionRatingAndEnergyShield`:<br>&nbsp;&nbsp;T1 Will-o-wisp's rl1: `LocalBaseEvasionRatingAndEnergyShield1` 6–10 / 5–8<br>&nbsp;&nbsp;T2 Nymph's rl16: `LocalBaseEvasionRatingAndEnergyShield2` 11–41 / 9–15<br>&nbsp;&nbsp;T3 Sylph's rl33: `LocalBaseEvasionRatingAndEnergyShield3` 42–64 / 16–21 |
| 47 | 6 variants by defence type<br>group `DefencesPercent`<br>`local_physical_damage_reduction_rating_+%`, `local_evasion_rating_+%`, `local_energy_shield_+%`, `local_armour_and_evasion_+%`, `local_armour_and_energy_shield_+%`, `local_evasion_and_energy_shield_+%` | P | local % increased armour / evasion / ES, or hybrid local defence % → `local_armour_+% / local_evasion_+% / local_energy_shield_+% / local_hybrid_defence_+%` | **Body Str, Shld Str** `LocalPhysicalDamageReductionRatingPercent`:<br>&nbsp;&nbsp;T1 Reinforced rl2: `LocalIncreasedPhysicalDamageReductionRatingPercent1` 15–26<br>&nbsp;&nbsp;T2 Layered rl16: `LocalIncreasedPhysicalDamageReductionRatingPercent2` 27–42<br>&nbsp;&nbsp;T3 Lobstered rl35: `LocalIncreasedPhysicalDamageReductionRatingPercent3` 43–55<br>**Body Dex** `LocalEvasionRatingIncreasePercent`:<br>&nbsp;&nbsp;T1 Shade's rl2: `LocalIncreasedEvasionRatingPercent1` 15–26<br>&nbsp;&nbsp;T2 Ghost's rl16: `LocalIncreasedEvasionRatingPercent2` 27–42<br>&nbsp;&nbsp;T3 Spectre's rl33: `LocalIncreasedEvasionRatingPercent3` 43–55<br>**Body Int** `LocalEnergyShieldPercent`:<br>&nbsp;&nbsp;T1 Protective rl2: `LocalIncreasedEnergyShieldPercent1` 15–26<br>&nbsp;&nbsp;T2 Strong-Willed rl16: `LocalIncreasedEnergyShieldPercent2` 27–42<br>&nbsp;&nbsp;T3 Resolute rl33: `LocalIncreasedEnergyShieldPercent3` 43–55<br>**Body Str/Dex, Shld Str/Dex** `LocalArmourAndEvasion`:<br>&nbsp;&nbsp;T1 Scrapper's rl2: `LocalIncreasedArmourAndEvasion1` 15–26<br>&nbsp;&nbsp;T2 Brawler's rl16: `LocalIncreasedArmourAndEvasion2` 27–42<br>&nbsp;&nbsp;T3 Fencer's rl33: `LocalIncreasedArmourAndEvasion3` 43–55<br>**Body Str/Int, Shld Str/Int** `LocalArmourAndEnergyShield`:<br>&nbsp;&nbsp;T1 Infixed rl2: `LocalIncreasedArmourAndEnergyShield1` 15–26<br>&nbsp;&nbsp;T2 Ingrained rl16: `LocalIncreasedArmourAndEnergyShield2` 27–42<br>&nbsp;&nbsp;T3 Instilled rl33: `LocalIncreasedArmourAndEnergyShield3` 43–55<br>**Body Dex/Int** `LocalEvasionAndEnergyShield`:<br>&nbsp;&nbsp;T1 Shadowy rl2: `LocalIncreasedEvasionAndEnergyShield1` 15–26<br>&nbsp;&nbsp;T2 Ethereal rl16: `LocalIncreasedEvasionAndEnergyShield2` 27–42<br>&nbsp;&nbsp;T3 Unworldly rl33: `LocalIncreasedEvasionAndEnergyShield3` 43–55 |
| 48 | 6 variants by defence type<br>group `BaseLocalDefencesAndDefencePercent`<br>`local_physical_damage_reduction_rating_+%`, `local_base_physical_damage_reduction_rating`, `local_evasion_rating_+%`, `local_base_evasion_rating`, `local_energy_shield_+%`, `local_energy_shield`, `local_armour_and_evasion_+%`, `local_armour_and_energy_shield_+%`, `local_evasion_and_energy_shield_+%` | P | local defence % + local flat defence → `local defence % + local flat` | **Body Str** `LocalIncreasedArmourAndBase`:<br>&nbsp;&nbsp;T1 Abalone's rl8: `LocalIncreasedArmourAndBase1` 6–13 / 5–9<br>&nbsp;&nbsp;T2 Snail's rl16: `LocalIncreasedArmourAndBase2` 14–20 / 10–29<br>&nbsp;&nbsp;T3 Tortoise's rl33: `LocalIncreasedArmourAndBase3` 21–26 / 30–41<br>**Body Dex** `LocalIncreasedEvasionAndBase`:<br>&nbsp;&nbsp;T1 Impala's rl8: `LocalIncreasedEvasionAndBase1` 6–13 / 4–6<br>&nbsp;&nbsp;T2 Buck's rl16: `LocalIncreasedEvasionAndBase2` 14–20 / 7–26<br>&nbsp;&nbsp;T3 Moose's rl33: `LocalIncreasedEvasionAndBase3` 21–26 / 27–38<br>**Body Int** `LocalIncreasedEnergyShieldAndBase`:<br>&nbsp;&nbsp;T1 Deacon's rl8: `LocalIncreasedEnergyShieldAndBase1` 6–13 / 4–7<br>&nbsp;&nbsp;T2 Cardinal's rl16: `LocalIncreasedEnergyShieldAndBase2` 14–20 / 8–13<br>&nbsp;&nbsp;T3 Priest's rl33: `LocalIncreasedEnergyShieldAndBase3` 21–26 / 14–16<br>**Body Str/Dex** `LocalIncreasedArmourAndEvasionAndBase`:<br>&nbsp;&nbsp;T1 Swordsman's rl8: `LocalIncreasedArmourAndEvasionAndBase1` 6–13 / 3–5 / 2–3<br>&nbsp;&nbsp;T2 Fighter's rl16: `LocalIncreasedArmourAndEvasionAndBase2` 14–20 / 6–16 / 4–14<br>&nbsp;&nbsp;T3 Veteran's rl33: `LocalIncreasedArmourAndEvasionAndBase3` 21–26 / 17–23 / 15–21<br>**Body Str/Int** `LocalIncreasedArmourAndEnergyShieldAndBase`:<br>&nbsp;&nbsp;T1 Faithful rl8: `LocalIncreasedArmourAndEnergyShieldAndBase1` 6–13 / 3–5 / 2–4<br>&nbsp;&nbsp;T2 Noble's rl16: `LocalIncreasedArmourAndEnergyShieldAndBase2` 14–20 / 6–16 / 5–6<br>&nbsp;&nbsp;T3 Inquisitor's rl33: `LocalIncreasedArmourAndEnergyShieldAndBase3` 21–26 / 17–23 / 7–8<br>**Body Dex/Int** `LocalIncreasedEvasionAndEnergyShieldAndBase`:<br>&nbsp;&nbsp;T1 Pursuer's rl8: `LocalIncreasedEvasionAndEnergyShieldAndBase1` 6–13 / 2–3 / 2–4<br>&nbsp;&nbsp;T2 Tracker's rl16: `LocalIncreasedEvasionAndEnergyShieldAndBase2` 14–20 / 4–14 / 5–6<br>&nbsp;&nbsp;T3 Chaser's rl33: `LocalIncreasedEvasionAndEnergyShieldAndBase3` 21–26 / 15–21 / 7–8 |
| 49 | 6 variants by defence type<br>group `BaseLocalDefencesAndLife`<br>`local_physical_damage_reduction_rating_+%`, `base_maximum_life`, `local_evasion_rating_+%`, `local_energy_shield_+%`, `local_armour_and_evasion_+%`, `local_armour_and_energy_shield_+%`, `local_evasion_and_energy_shield_+%` | P | local defence % + maximum life → `local defence % + base_maximum_life` | **Body Str** `LocalIncreasedArmourAndLife`:<br>&nbsp;&nbsp;T1 Oyster's rl8: `LocalIncreasedArmourAndLife1` 6–13 / 7–10<br>&nbsp;&nbsp;T2 Lobster's rl16: `LocalIncreasedArmourAndLife2` 14–20 / 11–19<br>&nbsp;&nbsp;T3 Urchin's rl33: `LocalIncreasedArmourAndLife3` 21–26 / 20–25<br>**Body Dex** `LocalIncreasedEvasionAndLife`:<br>&nbsp;&nbsp;T1 Flea's rl8: `LocalIncreasedEvasionAndLife1` 6–13 / 7–10<br>&nbsp;&nbsp;T2 Fawn's rl16: `LocalIncreasedEvasionAndLife2` 14–20 / 11–19<br>&nbsp;&nbsp;T3 Mouflon's rl33: `LocalIncreasedEvasionAndLife3` 21–26 / 20–25<br>**Body Int** `LocalIncreasedEnergyShieldAndLife`:<br>&nbsp;&nbsp;T1 Monk's rl8: `LocalIncreasedEnergyShieldAndLife1` 6–13 / 7–10<br>&nbsp;&nbsp;T2 Prior's rl16: `LocalIncreasedEnergyShieldAndLife2` 14–20 / 11–19<br>&nbsp;&nbsp;T3 Abbot's rl33: `LocalIncreasedEnergyShieldAndLife3` 21–26 / 20–25<br>**Body Str/Dex** `LocalIncreasedArmourAndEvasionAndLife`:<br>&nbsp;&nbsp;T1 Bully's rl8: `LocalIncreasedArmourAndEvasionAndLife1` 6–13 / 7–10<br>&nbsp;&nbsp;T2 Thug's rl16: `LocalIncreasedArmourAndEvasionAndLife2` 14–20 / 11–19<br>&nbsp;&nbsp;T3 Brute's rl33: `LocalIncreasedArmourAndEvasionAndLife3` 21–26 / 20–25<br>**Body Str/Int** `LocalIncreasedArmourAndEnergyShieldAndLife`:<br>&nbsp;&nbsp;T1 Augur's rl8: `LocalIncreasedArmourAndEnergyShieldAndLife1` 6–13 / 7–10<br>&nbsp;&nbsp;T2 Auspex's rl16: `LocalIncreasedArmourAndEnergyShieldAndLife2` 14–20 / 11–19<br>&nbsp;&nbsp;T3 Druid's rl33: `LocalIncreasedArmourAndEnergyShieldAndLife3` 21–26 / 20–25<br>**Body Dex/Int** `LocalIncreasedEvasionAndEnergyShieldAndLife`:<br>&nbsp;&nbsp;T1 Poet's rl8: `LocalIncreasedEvasionAndEnergyShieldAndLife1` 6–13 / 7–10<br>&nbsp;&nbsp;T2 Musician's rl16: `LocalIncreasedEvasionAndEnergyShieldAndLife2` 14–20 / 11–19<br>&nbsp;&nbsp;T3 Troubadour's rl33: `LocalIncreasedEvasionAndEnergyShieldAndLife3` 21–26 / 20–25 |
| 50 | 3 variants by defence type<br>group `DefencesPercentAndStunThreshold`<br>`local_physical_damage_reduction_rating_+%`, `stun_threshold_+`, `local_armour_and_evasion_+%`, `local_armour_and_energy_shield_+%` | P | local defence % + stun threshold (shields only) → `local defence % + stun_threshold` | **Shld Str** `LocalArmourAndStunThreshold`:<br>&nbsp;&nbsp;T1 Beetle's rl10: `LocalArmourAndStunThreshold1` 6–13 / 8–13<br>&nbsp;&nbsp;T2 Crab's rl19: `LocalArmourAndStunThreshold2` 14–20 / 14–24<br>&nbsp;&nbsp;T3 Armadillo's rl38: `LocalArmourAndStunThreshold3` 21–26 / 25–40<br>**Shld Str/Dex** `LocalArmourAndEvasionAndStunThreshold`:<br>&nbsp;&nbsp;T1 Captain's rl10: `LocalArmourAndEvasionAndStunThreshold1` 6–13 / 8–13<br>&nbsp;&nbsp;T2 Commander's rl19: `LocalArmourAndEvasionAndStunThreshold2` 14–20 / 14–24<br>&nbsp;&nbsp;T3 Magnate's rl38: `LocalArmourAndEvasionAndStunThreshold3` 21–26 / 25–40<br>**Shld Str/Int** `LocalArmourAndEnergyShieldAndStunThreshold`:<br>&nbsp;&nbsp;T1 Defender's rl10: `LocalArmourAndEnergyShieldAndStunThreshold1` 6–13 / 8–13<br>&nbsp;&nbsp;T2 Protector's rl19: `LocalArmourAndEnergyShieldAndStunThreshold2` 14–20 / 14–24<br>&nbsp;&nbsp;T3 Keeper's rl38: `LocalArmourAndEnergyShieldAndStunThreshold3` 21–26 / 25–40 |
| 51 | `LocalIncreasedBlockPercentage`<br>group `IncreasedShieldBlockPercentage`<br>`local_block_chance_+%` | P | % increased block chance (local) → `block_chance_+%` (local: scales the shield's base block) | T1 Steadfast rl1: `LocalBlockChance1` 15–19<br>T2 Unrelenting rl33: `LocalBlockChance2` 20–24 |
| 52 | `ThornsPhysicalDamage`<br>group `Thorns`<br>`thorns_minimum_base_physical_damage`, `thorns_maximum_base_physical_damage` | P | X–Y physical thorns damage → `thorns_physical_damage` — also Blt | T1 Thorny rl1: `AttackerTakesDamage1` (1–2) to (3–4)<br>T2 Spiny rl10: `AttackerTakesDamage2` (5–7) to (7–10)<br>T3 Barbed rl19: `AttackerTakesDamage3` (11–16) to (17–23)<br>T4 Pointed rl38: `AttackerTakesDamage4` (24–35) to (36–53) |
| 53 | `BaseSpirit`<br>group `BaseSpirit`<br>`base_spirit_from_equipment` | P | + Spirit → `spirit` — also Amu | T1 Lady's rl16: `IncreasedSpirit1` 30–33<br>T2 Baronness' rl25: `IncreasedSpirit2` 34–37<br>T3 Viscountess' rl33: `IncreasedSpirit3` 38–42 |
| 54 | 3 variants by defence type<br>group `ReducedAilmentDuration`<br>`self_bleed_duration_+%`, `self_poison_duration_+%`, `base_self_ignite_duration_-%` | S | % reduced duration of ailments on self (Bleed / Ignite / Poison) → `self_ailment_duration_-%` | **Body** `ReducedBleedDuration`:<br>&nbsp;&nbsp;T1 of Sealing rl21: `ReducedBleedDuration1` -40–-36<br>&nbsp;&nbsp;T2 of Alleviation rl37: `ReducedBleedDuration2` -45–-41<br>**Body** `ReducedPoisonDuration`:<br>&nbsp;&nbsp;T1 of the Antitoxin rl21: `ReducedPoisonDuration1` -40–-36<br>&nbsp;&nbsp;T2 of the Remedy rl37: `ReducedPoisonDuration2` -45–-41<br>**Body** `ReducedBurnDuration`:<br>&nbsp;&nbsp;T1 of Damping rl21: `ReducedBurnDuration1` 36–40<br>&nbsp;&nbsp;T2 of Quashing rl37: `ReducedBurnDuration2` 41–45 |
| 55 | `StunThreshold`<br>group `StunThreshold`<br>`stun_threshold_+` | S | + stun threshold → `stun_threshold` — also Blt | T1 of Thick Skin rl1: `StunThreshold1` 6–11<br>T2 of Reinforced Skin rl8: `StunThreshold2` 12–29<br>T3 of Stone Skin rl15: `StunThreshold3` 30–49<br>T4 of Iron Skin rl22: `StunThreshold4` 50–72<br>T5 of Steel Skin rl29: `StunThreshold5` 73–97<br>T6 of Granite Skin rl36: `StunThreshold6` 98–124 |

### C.3.5 Shared and jewellery affixes (life, resists, attributes; Amulet, Ring, Belt)

| # | Family (PoE2 type) / mod group / PoE2 stat ids | P/S | MvM stat → appendix-a stat id | Tiers (T1 = weakest): name, required level (rl), `mod id`, values |
|---|---|---|---|---|
| 56 | `IncreasedLife`<br>group `IncreasedLife`<br>`base_maximum_life` | P | + maximum life → `base_maximum_life` | T1 Hale rl1: `IncreasedLife1` 10–19<br>T2 Healthy rl6: `IncreasedLife2` 20–29<br>T3 Sanguine rl16: `IncreasedLife3` 30–39<br>T4 Stalwart rl24: `IncreasedLife4` 40–59<br>T5 Stout rl33: `IncreasedLife5` 60–69<br>T6 Robust rl38: `IncreasedLife6` 70–84 |
| 57 | `MaximumLifeIncreasePercent`<br>group `MaximumLifeIncreasePercent`<br>`maximum_life_+%` | P | % increased maximum life → `maximum_life_+%` | T1 Hopeful rl33: `MaximumLifeIncrease1` 3–4 |
| 58 | `EnergyShield`<br>group `IncreasedEnergyShield`<br>`base_maximum_energy_shield` | P | + maximum ES (global) → `energy_shield` | T1 Shining rl1: `IncreasedEnergyShield1` 8–14<br>T2 Glimmering rl11: `IncreasedEnergyShield2` 15–20<br>T3 Glittering rl16: `IncreasedEnergyShield3` 21–24<br>T4 Glowing rl25: `IncreasedEnergyShield4` 25–33<br>T5 Radiating rl33: `IncreasedEnergyShield5` 34–41 |
| 59 | `GlobalEnergyShieldPercent`<br>group `EnergyShieldPercent`<br>`maximum_energy_shield_+%` | P | % increased ES (global) → `energy_shield_+%` | T1 Protective rl2: `IncreasedEnergyShieldPercent1` 10–14<br>T2 Strong-Willed rl16: `IncreasedEnergyShieldPercent2` 15–20<br>T3 Resolute rl33: `IncreasedEnergyShieldPercent3` 21–26 |
| 60 | `GlobalEvasionRatingPercent`<br>group `EvasionRatingPercent`<br>`evasion_rating_+%` | P | % increased evasion (global) → `evasion_+%` | T1 Shade's rl2: `IncreasedEvasionRatingPercent1` 10–14<br>T2 Ghost's rl16: `IncreasedEvasionRatingPercent2` 15–20<br>T3 Spectre's rl33: `IncreasedEvasionRatingPercent3` 21–26 |
| 61 | `GlobalPhysicalDamageReductionRatingPercent`<br>group `IncreasedPhysicalDamageReductionRatingPercent`<br>`physical_damage_reduction_rating_+%` | P | % increased armour (global) → `armour_+%` | T1 Reinforced rl2: `IncreasedPhysicalDamageReductionRatingPercent1` 10–14<br>T2 Layered rl16: `IncreasedPhysicalDamageReductionRatingPercent2` 15–20<br>T3 Lobstered rl33: `IncreasedPhysicalDamageReductionRatingPercent3` 21–26 |
| 62 | `EvasionRating`<br>group `IncreasedEvasionRating`<br>`base_evasion_rating` | P | + evasion (global) → `evasion` | T1 Agile rl1: `IncreasedEvasionRating1` 8–17<br>T2 Dancer's rl11: `IncreasedEvasionRating2` 18–38<br>T3 Acrobat's rl16: `IncreasedEvasionRating3` 39–51<br>T4 Fleet rl25: `IncreasedEvasionRating4` 52–79<br>T5 Blurred rl33: `IncreasedEvasionRating5` 80–107 |
| 63 | `PhysicalDamageReductionRating`<br>group `IncreasedPhysicalDamageReductionRating`<br>`base_physical_damage_reduction_rating` | P | + armour (global) → `armour` | T1 Lacquered rl1: `IncreasedPhysicalDamageReductionRating1` 12–22<br>T2 Studded rl11: `IncreasedPhysicalDamageReductionRating2` 23–51<br>T3 Ribbed rl16: `IncreasedPhysicalDamageReductionRating3` 52–68<br>T4 Fortified rl25: `IncreasedPhysicalDamageReductionRating4` 69–107<br>T5 Plated rl33: `IncreasedPhysicalDamageReductionRating5` 108–140 |
| 64 | `SpellDamage`<br>group `SpellDamage`<br>`spell_damage_+%` | P | % increased Spell damage → `spell_damage_+%` | T1 Apprentice's rl1: `SpellDamage1` 3–7<br>T2 Adept's rl16: `SpellDamage2` 8–12<br>T3 Scholar's rl33: `SpellDamage3` 13–17 |
| 65 | `IncreasedAccuracy`<br>group `IncreasedAccuracy`<br>`accuracy_rating` | P | + accuracy rating → `accuracy_rating` | T1 Precise rl1: `IncreasedAccuracy1` 11–32<br>T2 Reliable rl11: `IncreasedAccuracy2` 33–60<br>T3 Focused rl18: `IncreasedAccuracy3` 61–84<br>T4 Deliberate rl26: `IncreasedAccuracy4` 85–123<br>T5 Consistent rl36: `IncreasedAccuracy5` 124–167 |
| 66 | `ItemFoundRarityIncreasePrefix`<br>group `ItemFoundRarityIncreasePrefix`<br>`base_item_found_rarity_+%` | P | % increased rarity of items found → `item_rarity_+%` | T1 Magpie's rl10: `ItemFoundRarityIncreasePrefix1` 8–11<br>T2 Collector's rl29: `ItemFoundRarityIncreasePrefix2` 12–15 |
| 67 | `PhysicalDamage`<br>group `PhysicalDamage`<br>`attack_minimum_added_physical_damage`, `attack_maximum_added_physical_damage` | P | adds X–Y Physical to Attacks → `attack_added_physical_damage` | T1 Glinting rl1: `AddedPhysicalDamage1` (1–2) to 3<br>T2 Burnished rl8: `AddedPhysicalDamage2` (2–3) to (4–6)<br>T3 Polished rl16: `AddedPhysicalDamage3` (2–4) to (5–8)<br>T4 Honed rl33: `AddedPhysicalDamage4` (4–6) to (8–11) |
| 68 | `FireDamage`<br>group `FireDamage`<br>`attack_minimum_added_fire_damage`, `attack_maximum_added_fire_damage` | P | adds X–Y Fire to Attacks → `attack_added_fire_damage` | T1 Heated rl1: `AddedFireDamage1` (1–2) to 3<br>T2 Smouldering rl8: `AddedFireDamage2` (3–5) to (6–9)<br>T3 Smoking rl16: `AddedFireDamage3` (6–8) to (10–13)<br>T4 Burning rl33: `AddedFireDamage4` (9–11) to (14–17) |
| 69 | `ColdDamage`<br>group `ColdDamage`<br>`attack_minimum_added_cold_damage`, `attack_maximum_added_cold_damage` | P | adds X–Y Cold to Attacks → `attack_added_cold_damage` | T1 Frosted rl1: `AddedColdDamage1` 1 to (2–3)<br>T2 Chilled rl8: `AddedColdDamage2` (3–4) to (5–8)<br>T3 Icy rl16: `AddedColdDamage3` (5–6) to (9–11)<br>T4 Frigid rl33: `AddedColdDamage4` (7–8) to (12–14) |
| 70 | `LightningDamage`<br>group `LightningDamage`<br>`attack_minimum_added_lightning_damage`, `attack_maximum_added_lightning_damage` | P | adds X–Y Lightning to Attacks → `attack_added_lightning_damage` | T1 Humming rl1: `AddedLightningDamage1` 1 to (4–6)<br>T2 Buzzing rl8: `AddedLightningDamage2` 1 to (10–15)<br>T3 Snapping rl16: `AddedLightningDamage3` 1 to (16–22)<br>T4 Crackling rl33: `AddedLightningDamage4` 1 to (23–27) |
| 71 | `FireDamagePercentage`<br>group `FireDamagePercentage`<br>`fire_damage_+%` | P | % increased Fire damage → `fire_damage_+%` | T1 Searing rl8: `FireDamagePercent1` 3–7<br>T2 Sizzling rl16: `FireDamagePercent2` 8–12<br>T3 Blistering rl33: `FireDamagePercent3` 13–17 |
| 72 | `ColdDamagePercentage`<br>group `ColdDamagePercentage`<br>`cold_damage_+%` | P | % increased Cold damage → `cold_damage_+%` | T1 Bitter rl8: `ColdDamagePercent1` 3–7<br>T2 Biting rl16: `ColdDamagePercent2` 8–12<br>T3 Alpine rl33: `ColdDamagePercent3` 13–17 |
| 73 | `LightningDamagePercentage`<br>group `LightningDamagePercentage`<br>`lightning_damage_+%` | P | % increased Lightning damage → `lightning_damage_+%` | T1 Charged rl8: `LightningDamagePercent1` 3–7<br>T2 Hissing rl16: `LightningDamagePercent2` 8–12<br>T3 Bolting rl33: `LightningDamagePercent3` 13–17 |
| 74 | `IncreasedChaosDamage`<br>group `IncreasedChaosDamage`<br>`chaos_damage_+%` | P | % increased Chaos damage → `chaos_damage_+%` | T1 Impure rl8: `ChaosDamagePercent1` 3–7<br>T2 Tainted rl16: `ChaosDamagePercent2` 8–12<br>T3 Clouded rl33: `ChaosDamagePercent3` 13–17 |
| 75 | `Strength`<br>group `Strength`<br>`additional_strength` | S | + Strength → `strength` | T1 of the Brute rl1: `Strength1` 5–8<br>T2 of the Wrestler rl11: `Strength2` 9–12<br>T3 of the Bear rl22: `Strength3` 13–16<br>T4 of the Lion rl33: `Strength4` 17–20 |
| 76 | `Dexterity`<br>group `Dexterity`<br>`additional_dexterity` | S | + Dexterity → `dexterity` | T1 of the Mongoose rl1: `Dexterity1` 5–8<br>T2 of the Lynx rl11: `Dexterity2` 9–12<br>T3 of the Fox rl22: `Dexterity3` 13–16<br>T4 of the Falcon rl33: `Dexterity4` 17–20 |
| 77 | `Intelligence`<br>group `Intelligence`<br>`additional_intelligence` | S | + Intelligence → `intelligence` | T1 of the Pupil rl1: `Intelligence1` 5–8<br>T2 of the Student rl11: `Intelligence2` 9–12<br>T3 of the Prodigy rl22: `Intelligence3` 13–16<br>T4 of the Augur rl33: `Intelligence4` 17–20 |
| 78 | `AllAttributes`<br>group `AllAttributes`<br>`additional_all_attributes` | S | + all attributes → `all_attributes` | T1 of the Clouds rl1: `AllAttributes1` 2–4<br>T2 of the Sky rl11: `AllAttributes2` 5–7<br>T3 of the Meteor rl22: `AllAttributes3` 8–10<br>T4 of the Comet rl33: `AllAttributes4` 11–13 |
| 79 | `FireResistance`<br>group `FireResistance`<br>`base_fire_damage_resistance_%` | S | **replaced** by its team twin (C.3.8); the hero-only roll is cut. PoE2: +% Fire resistance → `fire_resistance_%` | T1 of the Whelpling rl1: `FireResist1` 6–10<br>T2 of the Salamander rl12: `FireResist2` 11–15<br>T3 of the Drake rl24: `FireResist3` 16–20<br>T4 of the Kiln rl36: `FireResist4` 21–25 |
| 80 | `ColdResistance`<br>group `ColdResistance`<br>`base_cold_damage_resistance_%` | S | **replaced** by its team twin (C.3.8); the hero-only roll is cut. PoE2: +% Cold resistance → `cold_resistance_%` | T1 of the Seal rl1: `ColdResist1` 6–10<br>T2 of the Penguin rl14: `ColdResist2` 11–15<br>T3 of the Narwhal rl26: `ColdResist3` 16–20<br>T4 of the Yeti rl38: `ColdResist4` 21–25 |
| 81 | `LightningResistance`<br>group `LightningResistance`<br>`base_lightning_damage_resistance_%` | S | **replaced** by its team twin (C.3.8); the hero-only roll is cut. PoE2: +% Lightning resistance → `lightning_resistance_%` | T1 of the Cloud rl1: `LightningResist1` 6–10<br>T2 of the Squall rl13: `LightningResist2` 11–15<br>T3 of the Storm rl25: `LightningResist3` 16–20<br>T4 of the Thunderhead rl37: `LightningResist4` 21–25 |
| 82 | `ChaosResistance`<br>group `ChaosResistance`<br>`base_chaos_damage_resistance_%` | S | **replaced** by its team twin (C.3.8); the hero-only roll is cut. PoE2: +% Chaos resistance → `chaos_resistance_%` | T1 of the Lost rl16: `ChaosResist1` 4–7<br>T2 of Banishment rl30: `ChaosResist2` 8–11 |
| 83 | `AllResistances`<br>group `AllResistances`<br>`base_resist_all_elements_%` | S | **replaced** by its team twin (C.3.8); the hero-only roll is cut. PoE2: +% all elemental resistances → `all_elemental_resistances_%` | T1 of the Crystal rl12: `AllResistances1` 3–5<br>T2 of the Prism rl26: `AllResistances2` 6–8<br>T3 of the Kaleidoscope rl40: `AllResistances3` 9–11 |
| 84 | `LifeRegeneration`<br>group `LifeRegeneration`<br>`base_life_regeneration_rate_per_minute` | S | + life regeneration per second → `life_regeneration_rate_per_second` — value per minute in data: 60 = 1/s | T1 of the Newt rl1: `LifeRegeneration1` 60–120<br>T2 of the Lizard rl5: `LifeRegeneration2` 126–180<br>T3 of the Flatworm rl11: `LifeRegeneration3` 186–240<br>T4 of the Starfish rl17: `LifeRegeneration4` 246–360<br>T5 of the Hydra rl26: `LifeRegeneration5` 366–540<br>T6 of the Troll rl35: `LifeRegeneration6` 546–780 |
| 85 | `CriticalStrikeChance`<br>group `CriticalStrikeChanceIncrease`<br>`critical_strike_chance_+%` | S | % increased critical hit chance → `critical_strike_chance_+%` | T1 of Menace rl5: `CriticalStrikeChance1` 10–14<br>T2 of Havoc rl20: `CriticalStrikeChance2` 15–19<br>T3 of Disaster rl30: `CriticalStrikeChance3` 20–24 |
| 86 | `CriticalStrikeMultiplier`<br>group `CriticalStrikeMultiplier`<br>`base_critical_strike_multiplier_+` | S | +% critical damage bonus → `critical_strike_multiplier_+` — PoE2 text says "increased"; stat is base_critical_strike_multiplier_+ | T1 of Ire rl8: `CriticalMultiplier1` 10–14<br>T2 of Anger rl21: `CriticalMultiplier2` 15–19<br>T3 of Rage rl31: `CriticalMultiplier3` 20–24 |
| 87 | `LifeLeechPermyriad`<br>group `LifeLeech`<br>`base_life_leech_from_physical_attack_damage_permyriad` | S | % of physical attack damage leeched as life → `life_leech_from_physical_attack_damage_%` | T1 of the Locust rl21: `LifeLeech2` 600–690<br>T2 of the Remora rl38: `LifeLeech3` 700–790 |
| 88 | `ItemFoundRarityIncrease`<br>group `ItemFoundRarityIncrease`<br>`base_item_found_rarity_+%` | S | % increased rarity of items found → `item_rarity_+%` | T1 of Plunder rl3: `ItemFoundRarityIncrease1` 6–10<br>T2 of Raiding rl24: `ItemFoundRarityIncrease2` 11–14<br>T3 of Archaeology rl40: `ItemFoundRarityIncrease3` 15–18 |

**If the Allies-in-Presence deviation is rejected:** rows 34–44 are cut. Sceptres then have only 2 prefix families (Spirit %, Spirit + mana) and 3 suffix families (Presence radius from rl 23, Strength, Intelligence). Rare sceptres would cap at about 2 prefixes and 2–3 suffixes.

### C.3.6 Spawn weight matrix

- Weight is **per tier**.
- "—" = **not allowed** on that slot (PoE2 spawn flag 0).
- ᵗ = only the variant matching the base's defence type.
- Letters in brackets = only those defence types: S = Str, D = Dex, I = Int; SD = Str/Dex, SI = Str/Int, DI = Dex/Int.

Columns:

- Bow, Xbw (Crossbow), Spr (Spear), 1HM, 2HM (One/Two Hand Mace), QS (Quarterstaff);
- Wnd (Wand), Stf (Staff), Scp (Sceptre);
- Body (body armour), Shld (shield);
- Amu (Amulet), Rng (Ring), Blt (Belt).

| # | Family | P/S | Bow | Xbw | Spr | 1HM | 2HM | QS | Wnd | Stf | Scp | Body | Shld | Amu | Rng | Blt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `LocalPhysicalDamagePercent` | P | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | — | — | — | — | — | — | — | — |
| 2 | `LocalIncreasedPhysicalDamagePercentAndAccuracyRating` | P | 500 | 500 | 500 | 500 | 500 | 500 | — | — | — | — | — | — | — | — |
| 3 | `LocalPhysicalDamage` | P | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | — | — | — | — | — | — | — | — |
| 4 | `LocalFireDamage` | P | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | — | — | — | — | — | — | — | — |
| 5 | `LocalColdDamage` | P | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | — | — | — | — | — | — | — | — |
| 6 | `LocalLightningDamage` | P | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | — | — | — | — | — | — | — | — |
| 7 | `IncreasedWeaponElementalDamagePercent` | P | 500 | 500 | 500 | 500 | 500 | 500 | — | — | — | — | — | — | — | — |
| 8 | `LocalAccuracyRating` | P | 500 | 500 | 500 | 500 | 500 | 500 | — | — | — | — | — | — | — | — |
| 9 | `LocalIncreasedAttackSpeed` | S | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | — | — | — | — | — | — | — | — |
| 10 | `LocalBaseCriticalStrikeChance` | S | 500 | 500 | 500 | 500 | 500 | 500 | — | — | — | — | — | — | — | — |
| 11 | `LocalCriticalStrikeMultiplier` | S | 500 | 500 | 500 | 500 | 500 | 500 | — | — | — | — | — | — | — | — |
| 12 | `LifeLeechLocalPermyriad` | S | 250 | 250 | 250 | 250 | 250 | 250 | — | — | — | — | — | — | — | — |
| 13 | `LifeGainedFromEnemyDeath` | S | 500 | 500 | 500 | 500 | 500 | 500 | 500 | 500 | — | — | — | — | 500 | — |
| 14 | `LocalStunDamageIncrease` | S | — | — | 500 | 500 | 500 | 500 | — | — | — | — | — | — | — | — |
| 15 | `LocalLightRadiusAndAccuracy` | S | 250 | 250 | 250 | 250 | 250 | 250 | — | — | — | — | — | — | — | — |
| 16 | `WeaponSpellDamage` | P | — | — | — | — | — | — | 1000 | 1000 | — | — | — | — | — | — |
| 17 | `WeaponSpellDamageAndMana` | P | — | — | — | — | — | — | 500 | 500 | — | — | — | — | — | — |
| 18 | `FireDamageWeaponPrefix` | P | — | — | — | — | — | — | 1000 | 1000 | — | — | — | — | — | — |
| 19 | `ColdDamageWeaponPrefix` | P | — | — | — | — | — | — | 1000 | 1000 | — | — | — | — | — | — |
| 20 | `LightningDamageWeaponPrefix` | P | — | — | — | — | — | — | 1000 | 1000 | — | — | — | — | — | — |
| 21 | `ChaosDamageWeaponPrefix` | P | — | — | — | — | — | — | 1000 | 1000 | — | — | — | — | — | — |
| 22 | `PhysicalSpellDamageWeaponPrefix` | P | — | — | — | — | — | — | 500 | 500 | — | — | — | — | — | — |
| 23 | `DamageGainedAsFire` | P | — | — | — | — | — | — | 250 | 250 | — | — | — | — | — | — |
| 24 | `DamageGainedAsCold` | P | — | — | — | — | — | — | 250 | 250 | — | — | — | — | — | — |
| 25 | `DamageGainedAsLightning` | P | — | — | — | — | — | — | 250 | 250 | — | — | — | — | — | — |
| 26 | `IncreasedCastSpeed` | S | — | — | — | — | — | — | 1000 | 1000 | — | — | — | 1000 | 1000 | — |
| 27 | `SpellCriticalStrikeChance` | S | — | — | — | — | — | — | 500 | 500 | — | — | — | — | — | — |
| 28 | `SpellCriticalStrikeMultiplier` | S | — | — | — | — | — | — | 500 | 500 | — | — | — | — | — | — |
| 29 | `IgniteChanceIncrease` | S | — | — | — | — | — | — | 500 | 500 | — | — | — | — | — | — |
| 30 | `FreezeDamageIncrease` | S | — | — | — | — | — | — | 500 | 500 | — | — | — | — | — | — |
| 31 | `ShockChanceIncrease` | S | — | — | — | — | — | — | 500 | 500 | — | — | — | — | — | — |
| 32 | `LocalIncreasedSpiritPercent` | P | — | — | — | — | — | — | — | — | 1000 | — | — | — | — | — |
| 33 | `LocalIncreasedSpiritAndMana` | P | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 34 | `AlliesInPresenceAllDamage` | P | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 35 | `AlliesInPresenceAddedPhysicalDamage` | P | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 36 | `AlliesInPresenceAddedFireDamage` | P | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 37 | `AlliesInPresenceAddedColdDamage` | P | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 38 | `AlliesInPresenceAddedLightningDamage` | P | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 39 | `AlliesInPresenceIncreasedAttackSpeed` | S | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 40 | `AlliesInPresenceIncreasedCastSpeed` | S | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 41 | `AlliesInPresenceCriticalStrikeChance` | S | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 42 | `AlliesInPresenceCriticalStrikeMultiplier` | S | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 43 | `AlliesInPresenceAllResistances` | S | — | — | — | — | — | — | — | — | 250 | — | — | — | — | — |
| 44 | `AlliesInPresenceLifeRegeneration` | S | — | — | — | — | — | — | — | — | 500 | — | — | — | — | — |
| 45 | `PresenceRadius` | S | — | — | — | — | — | — | — | — | 250 | — | — | — | — | — |
| 46 | `BaseLocalDefences` (by type) | P | — | — | — | — | — | — | — | — | — | 1000ᵗ | 1000ᵗ | — | — | — |
| 47 | `DefencesPercent` (by type) | P | — | — | — | — | — | — | — | — | — | 1000ᵗ | 1000ᵗ | — | — | — |
| 48 | `BaseLocalDefencesAndDefencePercent` (by type) | P | — | — | — | — | — | — | — | — | — | 500ᵗ | — | — | — | — |
| 49 | `BaseLocalDefencesAndLife` (by type) | P | — | — | — | — | — | — | — | — | — | 500ᵗ | — | — | — | — |
| 50 | `DefencesPercentAndStunThreshold` (by type) | P | — | — | — | — | — | — | — | — | — | — | 500ᵗ | — | — | — |
| 51 | `LocalIncreasedBlockPercentage` | P | — | — | — | — | — | — | — | — | — | — | 500 | — | — | — |
| 52 | `ThornsPhysicalDamage` | P | — | — | — | — | — | — | — | — | — | 500 | 500 | — | — | 500 |
| 53 | `BaseSpirit` | P | — | — | — | — | — | — | — | — | — | 250 | — | 250 | — | — |
| 54 | `ReducedAilmentDuration` (by type) | S | — | — | — | — | — | — | — | — | — | 250ᵗ | — | — | — | — |
| 55 | `StunThreshold` | S | — | — | — | — | — | — | — | — | — | 500 | 500 | — | — | 500 |
| 56 | `IncreasedLife` | P | — | — | — | — | — | — | — | — | — | 1000 | 1000 | 1000 | 1000 | 1000 |
| 57 | `MaximumLifeIncreasePercent` | P | — | — | — | — | — | — | — | — | — | — | — | 250 | — | — |
| 58 | `EnergyShield` | P | — | — | — | — | — | — | — | — | — | — | — | 500 | — | — |
| 59 | `GlobalEnergyShieldPercent` | P | — | — | — | — | — | — | — | — | — | — | — | 500 | — | — |
| 60 | `GlobalEvasionRatingPercent` | P | — | — | — | — | — | — | — | — | — | — | — | 500 | — | — |
| 61 | `GlobalPhysicalDamageReductionRatingPercent` | P | — | — | — | — | — | — | — | — | — | — | — | 500 | — | — |
| 62 | `EvasionRating` | P | — | — | — | — | — | — | — | — | — | — | — | — | 500 | — |
| 63 | `PhysicalDamageReductionRating` | P | — | — | — | — | — | — | — | — | — | — | — | — | — | 1000 |
| 64 | `SpellDamage` | P | — | — | — | — | — | — | — | — | — | — | — | 500 | — | — |
| 65 | `IncreasedAccuracy` | P | — | — | — | — | — | — | — | — | — | — | — | 500 | 500 | — |
| 66 | `ItemFoundRarityIncreasePrefix` | P | — | — | — | — | — | — | — | — | — | — | — | 250 | 250 | — |
| 67 | `PhysicalDamage` | P | — | — | — | — | — | — | — | — | — | — | — | — | 1000 | — |
| 68 | `FireDamage` | P | — | — | — | — | — | — | — | — | — | — | — | — | 1000 | — |
| 69 | `ColdDamage` | P | — | — | — | — | — | — | — | — | — | — | — | — | 1000 | — |
| 70 | `LightningDamage` | P | — | — | — | — | — | — | — | — | — | — | — | — | 1000 | — |
| 71 | `FireDamagePercentage` | P | — | — | — | — | — | — | — | — | — | — | — | — | 500 | — |
| 72 | `ColdDamagePercentage` | P | — | — | — | — | — | — | — | — | — | — | — | — | 500 | — |
| 73 | `LightningDamagePercentage` | P | — | — | — | — | — | — | — | — | — | — | — | — | 500 | — |
| 74 | `IncreasedChaosDamage` | P | — | — | — | — | — | — | — | — | — | — | — | — | 500 | — |
| 75 | `Strength` | S | — | 1000 | 1000 | 1000 | 1000 | — | — | — | 1000 | 1000 (S,SD,SI) | 1000 | 1000 | 1000 | 1000 |
| 76 | `Dexterity` | S | 1000 | 1000 | 1000 | — | — | 1000 | — | — | — | 1000 (D,SD,DI) | 1000 (SD) | 1000 | 1000 | — |
| 77 | `Intelligence` | S | — | — | — | — | — | 1000 | 1000 | 1000 | 1000 | 1000 (I,SI,DI) | 1000 (SI) | 1000 | 1000 | — |
| 78 | `AllAttributes` | S | — | — | — | — | — | — | — | — | — | — | — | 250 | 250 | — |
| 79 | `FireResistance` (→ team, C.3.8) | S | — | — | — | — | — | — | — | — | — | 1000 | 1000 | 1000 | 1000 | 1000 |
| 80 | `ColdResistance` (→ team, C.3.8) | S | — | — | — | — | — | — | — | — | — | 1000 | 1000 | 1000 | 1000 | 1000 |
| 81 | `LightningResistance` (→ team, C.3.8) | S | — | — | — | — | — | — | — | — | — | 1000 | 1000 | 1000 | 1000 | 1000 |
| 82 | `ChaosResistance` (→ team, C.3.8) | S | — | — | — | — | — | — | — | — | — | 500 | 500 | 500 | 500 | 500 |
| 83 | `AllResistances` (→ team, C.3.8) | S | — | — | — | — | — | — | — | — | — | — | 250 (SI) | 250 | 250 | — |
| 84 | `LifeRegeneration` | S | — | — | — | — | — | — | — | — | — | 500 | — | 500 | 500 | 500 |
| 85 | `CriticalStrikeChance` | S | — | — | — | — | — | — | — | — | — | — | — | 500 | — | — |
| 86 | `CriticalStrikeMultiplier` | S | — | — | — | — | — | — | — | — | — | — | — | 500 | — | — |
| 87 | `LifeLeechPermyriad` | S | — | — | — | — | — | — | — | — | — | — | — | — | 250 | — |
| 88 | `ItemFoundRarityIncrease` | S | — | — | — | — | — | — | — | — | — | — | — | 250 | 250 | — |

**Reading the matrix: a few things the data decides.**

- Bows cannot roll Strength; crossbows can.
- Spears roll Strength and Dexterity but not Intelligence. Quarterstaves roll Dexterity and Intelligence but not Strength.
- Shields cannot roll life regeneration. Belts can roll thorns.
- All resistances roll only on amulets, rings and Str/Int shields.
- Stun buildup is a melee suffix (Spear, Maces, Quarterstaff). Bows and crossbows cannot roll it.

### C.3.7 PoE2 families deliberately cut

The five hero-only resistance families (rows 79–83) are not listed here: they are replaced by team twins (C.3.8).

| Cut family (PoE2 type: first … last mod id) | Group | Why |
|---|---|---|
| `IncreasedMana` (`IncreasedMana1` … `IncreasedManaTwoHandWeapon6`), `MaximumManaIncreasePercent` (`MaximumManaIncrease1`), `ManaRegeneration` (`ManaRegeneration1` … `ManaRegenerationTwoHand3`), `ManaLeechLocalPermyriad` (`ManaLeechLocal2`, `ManaLeechLocal3`), `ManaLeechPermyriad` (`ManaLeech2`, `ManaLeech3`), `ManaGainedFromEnemyDeath` (`ManaGainedFromEnemyDeath1` … `4`), `PercentDamageGoesToMana` (`DamageTakenGainedAsMana1`), `LightRadiusAndManaRegeneration` (`…1` … `…3`) | IncreasedMana, MaximumManaIncreasePercent, ManaRegeneration, ManaLeech, ManaGainedFromEnemyDeath, PercentDamageGoesToMana, LightRadiusAndManaRegeneration | Brief: heroes have no mana stat. Mana is the player's in-level currency. |
| `BeltFlaskLifeRecoveryRate`, `BeltFlaskManaRecoveryRate`, `BeltIncreasedFlaskChargesGained`, `BeltReducedFlaskChargesUsed` (`…1` … `…3/4`) | BeltFlaskRecoveryRate, BeltFlaskChargesGained, BeltFlaskChargesUsed | Flasks are cut. |
| `BeltIncreasedCharmDuration`, `BeltIncreasedCharmChargesGained`, `BeltReducedCharmChargesUsed` | BeltCharmDuration, BeltCharmChargesGained, BeltCharmChargesUsed | Charms are cut. |
| 13 "+N to Level of all … Skills" types: `GlobalIncrease{Fire,Cold,Lightning,Chaos,Physical}SpellSkillGemLevelWeapon`, `GlobalIncreaseSpellSkillGemLevel(Weapon)`, `GlobalIncreaseProjectileSkillGemLevel(Weapon)`, `GlobalIncreaseMeleeSkillGemLevel(Weapon)`, `GlobalIncreaseMinionSpellSkillGemLevel(Weapon)` (e.g. `GlobalFireSpellGemsLevelWeapon1` … `GlobalFireSpellGemsLevelTwoHandWeapon3`) | IncreaseSocketedGemLevel | Hero level is its own axis (level cap = area level + 2, gem level mapped from character level). +level would bypass the cap and the interpolation. A strong candidate for a later test. |
| `MinionLife` (`MinionLife1` … `3`) | MinionLife | Minions are out of scope. |
| `LocalAttributeRequirements` (`ReducedLocalAttributeRequirements1` … `3`) | LocalAttributeRequirements | MvM has no attribute requirements. |
| `LifeGainPerTargetLocal` (`LifeGainPerTargetLocal1` … `4`) | LifeGainPerTarget | "Life per enemy hit" is not in the vocabulary. Life on kill and leech cover sustain. |
| `LocalStunDuration` (`StunDuration1` … `3`) | StunDurationIncreasePercent | Stun duration is not in the vocabulary (only buildup and heavy stun). |
| `ArmourAppliesToElementalDamage` (`…1` … `3`) | ArmourAppliesToElementalDamage | Not in the vocabulary. Would be a good wall stat later. |
| `EvasionAppliesToDeflection` (`EvasionGrantsDeflection1` … `3`) | EvasionAppliesToDeflection | Deflection is not in the vocabulary. |
| `DamageTakenGainedAsLife` (`DamageTakenGainedAsLife1___`) | DamageTakenGainedAsLife | Recoup is not in the vocabulary. |
| `ReducedPhysicalDamageTaken` (`AdditionalPhysicalDamageReduction1`) | ReducedPhysicalDamageTaken | Flat % DR is not in the vocabulary. |
| `ReducedExtraDamageFromCrits` (`ReducedExtraDamageFromCrits1___`) | ReducedExtraDamageFromCrits | Not in the vocabulary. |
| Light radius halves of `LocalLightRadiusAndAccuracy` | LightRadiusAndAccuracy | No light radius in MvM. The accuracy half is kept (row 15). |
| Movement speed (boots only in PoE2) | MovementVelocity | Heroes don't move. Boots are cut. |
| Sockets, runes, soul cores, Artificer's Orb | (no prefix/suffix families) | Brief cut list. No socket slot exists. |
| Flask, charm, minion, totem and jewel item classes | — | Classes cut by the brief, so their pools never load. |

**Gaps worth knowing.**

- PoE2's projectile item mods (pierce, +arrows, projectile damage) live on **quivers**, which are cut. Projectile scaling therefore comes from supports, passives, uniques, base implicits (Warden Bow, Dualstring Bow) and the bow corruption.
- PoE2 0.5 has no "Adds X to Y damage to Spells" affix on our slots. That vocabulary entry is for passives, supports and uniques.

### C.3.8 Team affixes (MvM custom)

Team affixes buff every hero through the team stat sheet ([appendix A §2.1](appendix-a-combat.md)). The rules in C.1.7 apply.

**Rules.**

- **Twins.** Each team family is the twin of a hero family (the "Twin" column). It spawns on the same slots as its twin and uses the twin's tier names and required levels.
- **Separate groups.** A team family has its own mod group (`Team` + the twin's group), so "+30 to maximum life" and "+15 team maximum life" can roll on the same item.
- **Values.** About half the twin's, rounded to whole numbers.
- **Weights.**
  - Team resistances **replace** their twins, so they keep the twin's weights (rows 79–83 in C.3.6).
  - All other team families get **half the twin's weight**. Early drops are mostly hero gear; team stacking is assembled over the campaign.
- **Tooltip.** "+N% team <stat>" or "+N team <stat>", e.g. "+12% team fire resistance".
- **Mod ids.** `Team` + the twin's mod id, e.g. `TeamFireResist2`.
- **Uniques** keep their lines as written in C.4.3, including hero-only resistances.

**Resistances** (suffixes; replace rows 79–83)

| # | Team family | Twin | MvM stat | Tiers: rl, values |
|---|---|---|---|---|
| T1 | `TeamFireResistance` | 79 | `team_fire_resistance_%` | T1 rl1 3–5 · T2 rl12 6–7 · T3 rl24 8–10 · T4 rl36 11–13 |
| T2 | `TeamColdResistance` | 80 | `team_cold_resistance_%` | T1 rl1 3–5 · T2 rl14 6–7 · T3 rl26 8–10 · T4 rl38 11–13 |
| T3 | `TeamLightningResistance` | 81 | `team_lightning_resistance_%` | T1 rl1 3–5 · T2 rl13 6–7 · T3 rl25 8–10 · T4 rl37 11–13 |
| T4 | `TeamChaosResistance` | 82 | `team_chaos_resistance_%` | T1 rl16 2–4 · T2 rl30 4–6 |
| T5 | `TeamAllResistances` | 83 | `team_all_elemental_resistances_%` | T1 rl12 2–3 · T2 rl26 3–4 · T3 rl40 5–6 |

With 18 item slots on the board, capping one element at 75% takes about six good rolls, plus any Ruby/Sapphire/Topaz ring implicits (+10–15% each), passives and Purity of Fire.

**Life and defences** (prefixes; hero twins stay)

| # | Team family | Twin | MvM stat | Tiers: rl, values |
|---|---|---|---|---|
| T6 | `TeamIncreasedLife` | 56 | `team_base_maximum_life` | T1 rl1 5–9 · T2 rl6 10–14 · T3 rl16 15–19 · T4 rl24 20–29 · T5 rl33 30–34 · T6 rl38 35–42 |
| T7 | `TeamMaximumLifeIncreasePercent` | 57 | `team_maximum_life_+%` | T1 rl33 2 |
| T8 | `TeamEnergyShield` | 58 | `team_energy_shield` | T1 rl1 4–7 · T2 rl11 8–10 · T3 rl16 11–12 · T4 rl25 13–16 · T5 rl33 17–20 |
| T9 | `TeamGlobalEnergyShieldPercent` | 59 | `team_energy_shield_+%` | T1 rl2 5–7 · T2 rl16 8–10 · T3 rl33 11–13 |
| T10 | `TeamGlobalEvasionRatingPercent` | 60 | `team_evasion_+%` | T1 rl2 5–7 · T2 rl16 8–10 · T3 rl33 11–13 |
| T11 | `TeamGlobalArmourPercent` | 61 | `team_armour_+%` | T1 rl2 5–7 · T2 rl16 8–10 · T3 rl33 11–13 |
| T12 | `TeamEvasionRating` | 62 | `team_evasion` | T1 rl1 4–8 · T2 rl11 9–19 · T3 rl16 20–25 · T4 rl25 26–39 · T5 rl33 40–53 |
| T13 | `TeamArmourRating` | 63 | `team_armour` | T1 rl1 6–11 · T2 rl11 12–25 · T3 rl16 26–34 · T4 rl25 35–53 · T5 rl33 54–70 |

- Flat team life goes into `flatLife` before the archetype multiplier ([appendix A §2.1](appendix-a-combat.md)), so a wall still gets the most out of it.
- Local armour defences (rows 46–50) and local life hybrids (row 49) stay hero-only. They are part of the item, not the team.

**Damage** (prefixes; hero twins stay)

| # | Team family | Twin | MvM stat | Tiers: rl, values |
|---|---|---|---|---|
| T14 | `TeamFireDamagePercentage` | 71 | `team_fire_damage_+%` | T1 rl8 2–3 · T2 rl16 4–6 · T3 rl33 7–8 |
| T15 | `TeamColdDamagePercentage` | 72 | `team_cold_damage_+%` | T1 rl8 2–3 · T2 rl16 4–6 · T3 rl33 7–8 |
| T16 | `TeamLightningDamagePercentage` | 73 | `team_lightning_damage_+%` | T1 rl8 2–3 · T2 rl16 4–6 · T3 rl33 7–8 |
| T17 | `TeamChaosDamagePercentage` | 74 | `team_chaos_damage_+%` | T1 rl8 2–3 · T2 rl16 4–6 · T3 rl33 7–8 |
| T18 | `TeamPhysicalDamagePercentage` | — (**MvM custom**, no PoE2 jewellery twin) | `team_physical_damage_+%` | T1 rl8 2–3 · T2 rl16 4–6 · T3 rl33 7–8 |

- % increased only. No flat "adds X to Y" team damage and no generic "all damage" team mod: the point is element identity.
- Team damage also applies to the player spell.
- The caster-weapon element prefixes (rows 18–22) stay hero-only. They lock the weapon's element, so they belong to the hero.

**Team spawn weights** (per tier; slots not listed are "—")

| # | Body | Shld | Amu | Rng | Blt |
|---|---|---|---|---|---|
| T1–T3 | 1000 | 1000 | 1000 | 1000 | 1000 |
| T4 | 500 | 500 | 500 | 500 | 500 |
| T5 | — | 250 (SI) | 250 | 250 | — |
| T6 | 500 | 500 | 500 | 500 | 500 |
| T7 | — | — | 125 | — | — |
| T8–T11 | — | — | 250 | — | — |
| T12 | — | — | — | 250 | — |
| T13 | — | — | — | — | 500 |
| T14–T18 | — | — | — | 250 | — |

**Allies in your Presence vs team.** The sceptre presence families (rows 34–44) stay radius-based and sceptre-only. They keep their PoE2 values, about double the team values: a smaller area for a bigger buff. Presence buffs and team buffs stack additively.

**Saves.** No backwards compatibility for removed mods. On load, an item mod whose id is no longer in the catalog (the old `FireResist1` … `AllResistances3`) is dropped. Ring resistance implicits are re-rolled inside their new range. Every golden fixture in `src/save/fixtures/` keeps loading: the M1 milestone save loses its three hero-only resistance rolls (`ColdResist1` twice, `LightningResist1` once) and nothing else.

---

## C.4 Unique catalog (17)

### C.4.1 Drop rules

- **Bosses (L5, L10, L15, L20) always drop one unique** (brief). It comes from that boss's pool below.
  - On a first kill it is a unique the player does not own, if one exists.
  - Uniques new to that pool weigh 3, older ones 1 (**MvM custom**).
- **Random drops.** When the rarity roll (C.6 step 3) gives Unique, pick uniformly from every unique whose PoE2 level ≤ ilvl. If none qualifies, the item becomes Rare.
- **Pools use the unique's PoE2 level requirement.** Boss ilvl = area + 2. `appendix-d-monsters-levels.md` puts the boss levels at area 6, 14, 21 and 29.

| Boss | Boss ilvl | Uniques it can drop (new ones in **bold**) |
|---|---|---|
| L5 | 8 | **Mist Whisper, Splinter of Lorrata, The Blood Thorn, Sanguine Diviner, Enfolding Dawn, Bramblejack** |
| L10 | 16 | all above + **Frostbreath, Brain Rattler, Font of Power, Doomgate, Levinstone** |
| L15 | 23 | all above + **Doomfletch, Sculpted Suffering, Ming's Heart** |
| L20 | 31 | all above + **Fixation of Yix, Death's Harp, Sire of Shards** |

### C.4.2 How to read the unique table

- **PoE2 id** = the `id` in `uniques.json`, then the visual identity id.
- **Mod lines.** Each line is the PoE2 mod text (poe2db), then its `mods.json` id, then the MvM fate.
  - Where several unique mods share identical text, the stat id is given instead of a guessed mod id.
  - ✓ = kept as-is in vocabulary.
  - **flag** = needs a unique-only mechanic flag (see C.4.4 and Deviations).
  - cut = dropped.
- Implicits come from the base and are listed first.

### C.4.3 Catalog

**L5 pool (PoE2 level 1–2)**

| Unique | Base (id), PoE2 lvl | PoE2 id | Mods → MvM | TD note |
|---|---|---|---|---|
| **Mist Whisper** | Makeshift Crossbow (`FourCrossbow1`), 1 | `Mist Whisper` / `FourUniqueCrossbow1` | Adds (8–10) to (13–15) Cold `UniqueLocalAddedColdDamage4` ✓<br>Gain 5 Mana per enemy killed `UniqueManaGainedFromEnemyDeath7` → cut (mana)<br>(30–50)% increased Freeze Buildup `UniqueFreezeDamageIncrease3` ✓<br>30% increased Chill Duration on Enemies `UniqueChillDuration1` → **adapted**: % increased ailment duration (Chill only)<br>Attacks Chain 2 additional times `UniqueAdditionalAttackChain1` ✓ chain +2 | Each bolt hits the first monster, then jumps twice to the nearest monster within ~2 tiles in any lane. A day-one crowd-control crossbow that teaches chain plus freeze. |
| **Splinter of Lorrata** | Hardwood Spear (`FourSpear1`), 1 | `Splinter of Loratta` (data spelling) / `FourUniqueSpear1` | Grants Spear Throw → cut<br>Adds (2–3) to (6–8) Physical `UniqueLocalAddedPhysicalDamage3` ✓<br>Deal no Elemental Damage `DealNoElementalDamageUnique__1` → **flag**<br>20% increased Melee Strike Range `UniqueLocalWeaponRangeIncrease1` → cut (lane-literal melee)<br>Any number of Poisons from this Weapon can affect a target at the same time `UniqueLocalInfinitePoisonStackCount1` → **flag**<br>Always Poison on Hit with this weapon `UniqueLocalPoisonOnHit1` ✓ (100% poison chance) | A poison stacker. Every hit adds another poison, so it melts Brutes (huge life). Several copies in one lane stack fast. |
| **The Blood Thorn** | Wrapped Quarterstaff (`FourQuarterstaff1`), 1 | `The Blood Thorn` / `FourUniqueQuarterstaff1` | Adds (8–12) to (16–18) Physical `UniqueLocalAddedPhysicalDamage2` ✓<br>+(10–15) to Strength (stat `additional_strength`) ✓<br>Causes Bleeding on Hit `UniqueCausesBleeding1` ✓ (100% bleed chance)<br>(4–5) to (8–10) Physical Thorns damage `UniqueAttackerTakesDamage1` ✓ | A striker that doubles as a mini-wall: it bleeds what it hits and thorns what bites it. |
| **Sanguine Diviner** | Bone Wand (`FourWand2`), 2 | `Sanguine Diviner` / `FourUniqueWand2` | Grants Bone Blast → cut<br>(80–100)% increased Spell Damage (stat `spell_damage_+%`) ✓<br>Gain (10–15) Life per enemy killed `UniqueLifeGainedFromEnemyDeath7` ✓<br>25% chance to inflict Bleeding on Hit `UniqueGlobalChanceToBleed3` ✓<br>25% of Spell Mana Cost Converted to Life Cost `UniqueSpellLifeCostPercent1` → cut (heroes have no mana cost) | Gives a physical-spell wand hero Bleed. It opens the "bleed caster" build. |
| **Enfolding Dawn** | Pilgrim Vestments (`FourBodyStrInt1`), 1 | `Enfolding Dawn` / `FourUniqueBodyStrInt1_` | (50–100)% increased Armour and Energy Shield (stat `local_armour_and_energy_shield_+%`) ✓<br>+100 to Spirit (stat `base_spirit_from_equipment`) ✓<br>+(5–15)% to all Elemental Resistances (stat `base_resist_all_elements_%`) ✓<br>Gain no inherent bonus from Intelligence `UniqueNoManaPerIntelligence1` → **flag**: the hero gets no ES% from Int (the MvM Int bonus) | The acolyte armour. A sceptre's 100 + 100 here = 200 Spirit, so 25 × (1 + 200/200) = **50 mana per cycle**, double a bare acolyte. |
| **Bramblejack** | Rusted Cuirass (`FourBodyStr1`), 1 | `Bramblejack` / `FourUniqueBodyStr1` | +(60–100) to maximum Life (stat `base_maximum_life`) ✓<br>+(60–100) to Stun Threshold (stat `stun_threshold_+`) ✓<br>Cannot Evade Enemy Attacks `UniqueCannotEvade1` → **flag** (evasion chance 0)<br>250% of Melee Physical Damage taken reflected to Attacker `UniquePhysicalDamageTakenPercentToReflect1` → **adapted + flag**: thorns-style retaliation equal to 250% of each melee physical hit taken<br>Regenerate 5% of maximum Life per second while Surrounded `UniqueLifeRegenerationWhileSurrounded1` → **adapted**: % of life regenerated per second, condition "Surrounded" = 3+ monsters within 1 tile (**flag**) | The Wall-nut that bites back. Monsters chewing on it take 2.5× their own bite. |

**L10 pool (PoE2 level 10–16)**

| Unique | Base (id), PoE2 lvl | PoE2 id | Mods → MvM | TD note |
|---|---|---|---|---|
| **Frostbreath** | Slim Mace (`FourOneHandMace3`), 10 | `Frostbreath` / `FourUniqueOneHandMace3` | Adds (8–12) to (16–20) Physical `UniqueLocalAddedPhysicalDamage4` ✓<br>Adds (8–12) to (16–20) Cold `UniqueLocalAddedColdDamage2` ✓<br>+5% to Critical Hit Chance (stat `local_critical_strike_chance`) ✓<br>All Damage from Hits with this Weapon Contributes to Freeze Buildup `UniqueLocalAllDamageCanFreeze1` → **flag**<br>Culling Strike against Frozen Enemies `UniqueLocalCullingStrikeFrozenEnemies1` → Culling Strike ✓ with condition Frozen (**flag**) | A melee wall-breaker. It freezes the monster in front of it and culls it. With a shield it is a frontline anchor. |
| **Brain Rattler** | Studded Greatclub (`FourTwoHandMace4`), 16 | `Brain Rattler` / `FourUniqueTwoHandMace4` | Adds 1 to (110–115) Lightning `UniqueLocalAddedLightningDamage10` ✓<br>(10–15)% increased Attack Speed (stat `local_attack_speed_+%`) ✓<br>All damage with this Weapon causes Electrocution buildup `UniqueLocalAllDamageCanElectrocute1` ✓ (enables Electrocute buildup) | An Electrocuted monster can't act for 5 s (PoE2 glossary). That stalls the head of a lane, so it pairs with heavy-stun bursts. |
| **Font of Power** | Omen Sceptre (`FourSceptre4`), 16 | `Font of Power` / `FourUniqueSceptre4` | Grants Malice → cut<br>(30–50)% increased Spirit (stat `local_spirit_+%`) ✓ → **adapted**: +30–50 Spirit<br>+(40–60) to maximum Mana → cut<br>(20–30)% increased Mana Regeneration Rate → cut<br>"When a Party Member in your Presence Casts a Spell…" → cut (mana) | A pure economy sceptre: 130–150 Spirit, so 41–44 mana per cycle. Simple, and every acolyte player wants it. |
| **Doomgate** | Braced Tower Shield (`FourShieldStr3`), 12 | `Doomgate` / `FourUniqueShieldStr3` | Grants Raise Shield → cut<br>(80–100)% increased Block chance `UniqueLocalBlockChance2` ✓ (26% base → 47–52%, then the 50% block cap in `appendix-a-combat.md` §5)<br>(100–150)% increased Armour (stat `local_physical_damage_reduction_rating_+%`) ✓<br>+(13–17)% to Chaos Resistance (stat `base_chaos_damage_resistance_%`) ✓<br>You take (25–40)% of damage from Blocked Hits `UniqueBaseBlockDamageTaken1` → **flag**<br>Enemies are Culled on Block `UniqueCullingStrikeOnBlock1` → Culling Strike on block (**flag**) | A spear or mace wall that blocks half the bites and executes wounded monsters chewing on it. |
| **Levinstone** | Topaz Ring (`FourRing5`), 16 | `Levinstone` / `FourUniqueRing13` | Implicit +(20–30)% Lightning Res `RingImplicitLightningResistance1` ✓<br>+(40–60) to maximum Mana → cut<br>(10–20)% increased chance to Shock `UniqueShockChanceIncrease2` ✓<br>Lightning Skills Chain +1 times `UniqueLightningSpellsChain1` ✓ chain +1 (Lightning-tagged skills only)<br>(10–20)% increased Magnitude of Shock `UniqueShockEffect1` ✓ | Lets any lightning hero (bow, spear or wand) hop one extra target across lanes. |

**L15 pool (PoE2 level 20–22)**

| Unique | Base (id), PoE2 lvl | PoE2 id | Mods → MvM | TD note |
|---|---|---|---|---|
| **Doomfletch** | Composite Bow (`FourBow5`), 22 | `Doomfletch` / `FourUniqueBow5` | Adds (5–7) to (10–12) Physical `UniqueLocalAddedPhysicalDamage7` ✓<br>+10 to Dexterity (stat `additional_dexterity`) ✓<br>(30–50)% increased Mana Regeneration Rate → cut<br>Attacks with this Weapon gain 100% of Physical damage as Extra damage of each Element (stat `local_non_skill_physical_damage_%_to_gain_as_each_element_with_attacks_while_have_this_two_handed_hand_weapon`) ✓ → gained as extra Fire, Cold and Lightning, 100% each | Every arrow carries Physical + Fire + Cold + Lightning, so it ignites, chills and shocks at once. Physical scaling counts four times. |
| **Sculpted Suffering** | Warpick (`FourOneHandMace5`), 22 | `Sculpted Suffering` / `FourUniqueOneHandMace5__` | Implicit +(5–10)% Critical Damage Bonus `MaceImplicitCriticalMultiplier1` ✓<br>Adds (21–26) to (25–31) Physical `UniqueLocalAddedPhysicalDamage18` ✓<br>(10–15)% increased Attack Speed ✓<br>Breaks Armour equal to 40% of damage from Hits `UniqueLocalArmourBreakOnDamage1` ✓ Armour Break<br>Fully Armour Broken enemies you kill with Hits Shatter `UniqueFullyArmourBrokenShatterOnKill1` → cut (no corpse mechanics) | The answer to the Armoured archetype. A Fully Broken monster takes 20% increased physical damage from every hero (PoE2 glossary). |
| **Ming's Heart** | Amethyst Ring (`FourRing6`), 20 | `Ming's Heart` / `FourUniqueRing16` | Implicit +(7–13)% Chaos Res `RingImplicitChaosResistance1` ✓<br>20% reduced maximum Life (stat `maximum_life_+%`) ✓<br>Gain (30–40)% of Damage as Extra Chaos Damage `UniqueDamageAddedAsChaos1` ✓<br>30% reduced Global Armour, Evasion and Energy Shield → ✓ (−30% to each global defence %) | A glass-cannon ring for back-row ranged heroes. Monsters rarely reach column 1. |

**L20 pool (PoE2 level 24–28)**

| Unique | Base (id), PoE2 lvl | PoE2 id | Mods → MvM | TD note |
|---|---|---|---|---|
| **Fixation of Yix** | Stellar Amulet (`FourAmulet8`), 24 | `Fixation of Yix` / `FourUniqueAmulet16` | Implicit +(5–7) to all Attributes `AmuletImplicitAllAttributes1` ✓<br>+100 to maximum Life (stat `base_maximum_life`) ✓<br>Allies in your Presence have (30–50)% increased Critical Hit Chance `UniqueNearbyAlliesCriticalStrikeChance2` → **deviation**<br>Allies in your Presence have (30–50)% increased Critical Damage Bonus `UniqueNearbyAlliesCriticalMultiplier1` → **deviation**<br>Allies in your Presence have (10–20)% increased Attack Speed `UniqueNearbyAlliesIncreasedAttackSpeed1` → **deviation**<br>Allies in your Presence have (10–20)% increased Cast Speed `UniqueNearbyAlliesIncreasedCastSpeed1` → **deviation**<br>50% reduced Presence Area of Effect (stat `presence_area_+%`) ✓ | Turns an aura hero into a tight-radius force multiplier. Place it in the middle of the firing line. A positional-placement puzzle in one item. |
| **Death's Harp** | Dualstring Bow (`FourBow6`), 28 | `Death's Harp` / `FourUniqueBow6` | Implicit +50% Surpassing chance to fire an additional Arrow `BowImplicitAdditionalArrows1` ✓ (adapted, see C.2)<br>+(20–25)% to Critical Damage Bonus `UniqueLocalCriticalMultiplier1` ✓<br>Gain (20–30) Life per enemy killed (stat `base_life_gained_on_enemy_death`) ✓<br>Gain (12–18) Mana per enemy killed `UniqueManaGainedFromEnemyDeath6` → cut<br>+(250–330)% Surpassing chance to fire an additional Arrow `UniqueAdditionalArrowChance1` ✓ → **adapted**: + number of projectiles. Total 300–380% = 3 extra arrows, plus a 0–80% chance of a 4th | A Threepeater on steroids: 4–5 arrows per shot. Per the fan rule in `appendix-a-combat.md` §3.4, they hit the lane above, the lane below and the hero's own lane twice or more. The late-demo bow chase item. |
| **Sire of Shards** | Chiming Staff (`FourStaff6`), 25 | `Sire of Shards` / `FourUniqueStaff6` | Grants Sigil of Power → cut<br>(80–120)% increased Spell Damage (stat `spell_damage_+%`) ✓<br>(10–20)% increased Cast Speed (stat `base_cast_speed_+%`) ✓<br>+(5–10)% to all Elemental Resistances ✓<br>20% increased Light Radius → cut<br>Spells fire 4 additional Projectiles / Spells fire Projectiles in a circle `UniqueSpellAdditionalProjectilesInCircle1` → **adapted**: `additional_projectiles` +4, fanned per `appendix-a-combat.md` §3.4. "In a circle" is dropped | The caster's Death's Harp. It turns a single-lane bolt spell into a three-lane volley with doubled shots in its own lane. |

### C.4.4 Unique-only mechanic flags these uniques need (deviation)

| Flag | Used by | Engine meaning | Fallback if rejected |
|---|---|---|---|
| `deal_no_elemental_damage` | Splinter of Lorrata | Hero's elemental damage = 0 | Drop the line (the base has no elemental damage anyway) |
| `unlimited_poison_stacks` | Splinter of Lorrata | Poisons from this weapon are not limited by the poison stack rule in `appendix-a-combat.md` | Drop the line; still "always poison" |
| `all_hit_damage_builds_freeze` | Frostbreath | Physical damage from this weapon's hits also adds Freeze buildup | Replace with +40% Freeze buildup |
| `cull_frozen` | Frostbreath | Culling Strike applies only to Frozen targets | Replace with plain Culling Strike |
| `blocked_hit_damage_taken_%` | Doomgate | A blocked hit still deals 25–40% | Drop the line (block becomes full avoidance, a buff) |
| `cull_on_block` | Doomgate | Blocking a hit applies Culling Strike to the attacker | Drop the line |
| `cannot_evade` | Bramblejack | Evasion chance = 0 | Drop the line |
| `reflect_melee_phys_%` | Bramblejack | Retaliation of 250% of the melee physical damage taken, dealt as thorns | Replace with "(25–35) to (40–55) Physical Thorns" |
| `surrounded` condition | Bramblejack | True while 3+ monsters are within 1 tile | Drop the regen line |
| `no_int_bonus` | Enfolding Dawn | Ignore the MvM Int → ES% bonus | Drop the line (a slight buff) |

---

## C.5 Currency and crafting

### C.5.1 The 13 currency families

- "13" counts the brief's list: 9 item orbs, 1 Jeweller's family (3 grades), Gemcutter's Prism, and 2 MvM custom orbs.
- **PoE2 dl** = drop level: research file §1.5 and poe2db. The Jeweller's Orb levels (25/45/65) come from `base_items.json` and poe2db.
- **MvM dl** and **Weight** match `appendix-e-economy.md` §4.2, which owns the economy. Values that differ from PoE2 are in bold.
  - Weights are relative: at a given area level, drop every currency whose MvM dl is above it, then normalise.
  - Absolute rates are in appendix E.
- **Fee** = poe2db Currency Exchange gold fee, a proxy for GGG's value ladder.

| # | Currency | PoE2 base id | PoE2 dl | MvM dl | Fee | Weight | Used on |
|---|---|---|---|---|---|---|---|
| 1 | Orb of Transmutation | `Metadata/Items/Currency/CurrencyUpgradeToMagic` | 1 | 1 | 50 | 30 | items |
| 2 | Orb of Augmentation | `Metadata/Items/Currency/CurrencyAddModToMagic` | 1 | 1 | 20 | 30 | items |
| 3 | Regal Orb | `Metadata/Items/Currency/CurrencyUpgradeMagicToRare` | 5 | **3** | 120 | 8 | items |
| 4 | Exalted Orb | `Metadata/Items/Currency/CurrencyAddModToRare` | 5 | **3** | 120 | 8 | items |
| 5 | Chaos Orb | `Metadata/Items/Currency/CurrencyRerollRare` | 12 | **8** | 160 | 6 | items |
| 6 | Orb of Alchemy | `Metadata/Items/Currency/CurrencyUpgradeToRare` | 5 | **3** | 200 | 4 | items |
| 7 | Orb of Annulment | `Metadata/Items/Currency/CurrencyRemoveMod` | 35 | **15** | 1000 | 2 | items |
| 8 | Divine Orb | `Metadata/Items/Currency/CurrencyModValues` | 35 | **20** | 800 | 1 | items |
| 9 | Vaal Orb | `Metadata/Items/Currency/CurrencyCorrupt` | 35 | **15** | 160 | 2 | items and heroes |
| 10a | Lesser Jeweller's Orb | `Metadata/Items/Currency/CurrencyAddSkillGemSocket3` | 25 | **5** | 200 | 4 | heroes, spells |
| 10b | Greater Jeweller's Orb | `Metadata/Items/Currency/CurrencyAddSkillGemSocket4` | 45 | **15** | 600 | 1 | heroes, spells |
| 10c | Perfect Jeweller's Orb | `Metadata/Items/Currency/CurrencyAddSkillGemSocket5` | 65 | **25** | 1000 | 0.25 | heroes, spells |
| 11 | Gemcutter's Prism | `Metadata/Items/Currency/CurrencyGemQuality` | 12 | **8** | 1000 | 2 | heroes, spells |
| 12 | **Orb of Realignment** (MvM custom) | `MvM/Currency/RerollSupport` (no PoE2 id) | — | 12 | — | 1 | heroes, spells |
| 13 | **Orb of Transference** (MvM custom) | `MvM/Currency/TransferSupports` (no PoE2 id) | — | 15 | — | 0.5 | heroes, spells |
| S1 | Transmutation Shard | `Metadata/Items/Currency/CurrencyUpgradeToMagicShard` | 1 | salvage and filter only | 4 | — | 10 → Orb of Transmutation |
| S2 | Regal Shard | `Metadata/Items/Currency/CurrencyUpgradeMagicToRareShard` | 5 | salvage only | 12 | — | 10 → Regal Orb |
| S3 | **Jeweller's Shard** (MvM custom) | `MvM/Currency/JewellerShard` | — | salvage only | — | — | 10 → Lesser Jeweller's Orb |

**Why these ratios.**

- They keep the research file's Act 1 order: Transmutation ≈ Augmentation ≫ Regal ≈ Exalted > Chaos > Alchemy ≫ Annulment, Vaal, Divine.
- Appendix E runs currency about 3× PoE2's campaign rate so that crafting happens inside 2 hours.
- PoE2 shards also drop as loose items. In MvM they come only from salvage and the loot filter (C.5.6, C.7), so that each drop is a whole orb.

**Cut, per the brief.** Essences, Omens, runes and soul cores, catalysts, Artificer's Orb and Shard, Orb of Chance and Chance Shard, Scroll of Wisdom (auto-identify), Greater and Perfect item orbs (dl 46–79).

### C.5.2 Item currencies: exact PoE2 behaviour

Descriptions are PoE2 base-item text from `base_items.json`, with poe2db usage notes.

| Currency | PoE2 behaviour | Valid targets | MvM notes |
|---|---|---|---|
| Transmutation | Upgrades a Normal item to Magic **with 1 modifier** | Normal | The mod rolls from the combined prefix + suffix pool |
| Augmentation | Augments a Magic item with **one new random modifier** (max 2) | Magic with 1 mod | Adds the missing prefix or suffix |
| Regal | Upgrades Magic → Rare, **keeping** current mods and **adding 1** | Magic | A 1-mod magic becomes a 2-mod rare |
| Exalted | Augments a Rare with **one new random modifier**; rares max 6 | Rare with < 6 mods | Respects 3P / 3S |
| Chaos | **Removes one random modifier and adds one new random modifier** (PoE2; not a full reroll as in PoE1) | Rare | Remove and add are independent; the new mod may be prefix or suffix |
| Alchemy | Upgrades Normal or Magic → Rare **with 4 random modifiers**; current mods **not** kept | Normal, Magic | |
| Annulment | **Removes a random modifier** | Magic, Rare | A magic item may reach 0 mods and stays Magic |
| Divine | **Randomises the numeric values** of modifiers | Magic, Rare, Unique | Explicit mods only; implicits stay (see C.1.3) |
| Vaal | Modifies an item unpredictably and **Corrupts** it | Any non-corrupted item | Outcomes in C.5.3 |

Every item currency fails on corrupted items. All item rolls use ilvl gating and the C.3 rules.

### C.5.3 Vaal Orb on items: outcome table

**PoE2 outcomes** (COMMUNITY sources: maxroll "Corruption Outcomes", updated for 0.4 in May 2026; switchbladegaming, checked against 0.5.4). Four equal 25% outcomes:

| Roll | Rare / Magic / Normal item | Unique item | Rings, amulets, belts |
|---|---|---|---|
| 25% | No change (just Corrupted) | No change | No change |
| 25% | 1–3 explicit affixes re-randomised | Each explicit value × 0.78–1.22 (0.01 steps), can exceed its range | 1–3 affixes re-randomised |
| 25% | Add a Corrupted enchantment (table below) | Add a Corrupted enchantment | Add a Corrupted enchantment |
| 25% | +1 socket beyond the cap (armour, martial weapons); wands and staves get quality up to 23% | same | Nothing happens |

**MvM table (adapted).** Sockets are cut, so the socket outcome becomes quality.

| Roll | Non-unique item | Unique item |
|---|---|---|
| 01–25 | No change; item is Corrupted | No change; Corrupted |
| 26–50 | Remove 1–3 random explicit mods (uniform 1/2/3, capped at the mod count). Add the same number of new mods of the **same type** (prefix for prefix), ilvl-gated. A Normal item with no mods gets "no change" instead | Multiply each explicit value by a uniform 0.78–1.22 (0.01 steps). Values may leave their range |
| 51–75 | Add one Corrupted enchantment from the slot's table below, rolled in range. It is an extra line and does not count toward affix limits | Same |
| 76–00 | Weapons and armour: quality = min(23, quality + 1–5) (**adapted** from PoE2's socket and caster-weapon quality outcomes). Rings, amulets, belts: no change (as PoE2) | Same |

**Corrupted enchantments by slot** (`mods.json` `generation_type = "corrupted"`, all `required_level` 1). Bows use the one-hand rows (bows have weight 0 on the two-hand variants).

| Slot | Kept corrupted enchantments (PoE2 mod id, text, PoE2 spawn tags) | Cut (reason) |
|---|---|---|
| Martial weapon | `CorruptionLocalIncreasedPhysicalDamagePercent1` (15-25)% increased Physical Damage [weapon]<br>`CorruptionLocalAddedFireDamage1` Adds (9-14) to (15-22) Fire Damage [bow,one_hand_weapon]<br>`CorruptionLocalAddedFireDamageTwoHand1` Adds (13-20) to (21-31) Fire Damage [two_hand_weapon]<br>`CorruptionLocalAddedColdDamage1` Adds (8-12) to (13-19) Cold Damage [bow,one_hand_weapon]<br>`CorruptionLocalAddedColdDamageTwoHand1` Adds (11-17) to (18-26) Cold Damage [two_hand_weapon]<br>`CorruptionLocalAddedLightningDamage1` Adds (1-2) to (29-43) Lightning Damage [bow,one_hand_weapon]<br>`CorruptionLocalAddedLightningDamageTwoHand1` Adds (1-3) to (41-61) Lightning Damage [two_hand_weapon]<br>`CorruptionLocalAddedChaosDamage1` Adds (7-11) to (12-18) Chaos damage [bow,one_hand_weapon]<br>`CorruptionLocalAddedChaosDamageTwoHand1` Adds (10-16) to (17-25) Chaos damage [two_hand_weapon]<br>`CorruptionLocalIncreasedAttackSpeed1` (6-8)% increased Attack Speed [weapon]<br>`CorruptionLocalCriticalStrikeMultiplier1` +(5-10)% to Critical Damage Bonus [weapon]<br>`CorruptionLocalStunDamageIncrease1` Causes (20-30)% increased Stun Buildup [axe,dagger,flail,mace,spear,sword,warstaff]<br>`CorruptionLocalChanceToBleed1` (10-15)% chance to cause Bleeding on Hit [axe,flail,mace,sword]<br>`CorruptionLocalChanceToPoison1` (10-15)% chance to Poison on Hit with this weapon [dagger,spear,sword,warstaff]<br>`CorruptionWeaponElementalDamage1` (20-30)% increased Elemental Damage with Attacks [bow,one_hand_weapon] — adapted → % increased Elemental damage<br>`CorruptionWeaponElementalDamageTwoHand1` (40-50)% increased Elemental Damage with Attacks [two_hand_weapon] — adapted → % increased Elemental damage<br>`CorruptionAdditionalArrows1` Bow Attacks fire an additional Arrow [bow] — +1 number of projectiles | `CorruptionReducedLocalAttributeRequirements1` (no attribute requirements)<br>`CorruptionLocalWeaponRangeIncrease1` (melee reach is lane-literal)<br>`CorruptionLocalRageOnHit1` (rage not in vocabulary)<br>`CorruptionLocalChanceToMaim1` (maim not in vocabulary)<br>`CorruptionLocalChanceToBlind1` (blind not in vocabulary)<br>`CorruptionAdditionalAmmo1` (no crossbow reload model in appendix-a) |
| Wand/Staff | `CorruptionSpellDamageOnWeapon1` (20-30)% increased Spell Damage [focus,wand]<br>`CorruptionSpellDamageOnTwoHandWeapon1` (40-60)% increased Spell Damage [staff]<br>`CorruptionIgniteChanceIncrease1` (20-30)% increased Flammability Magnitude [staff,wand]<br>`CorruptionFreezeDamageIncrease1` (20-30)% increased Freeze Buildup [staff,wand]<br>`CorruptionShockChanceIncrease1` (20-30)% increased chance to Shock [staff,wand]<br>`CorruptionSpellCriticalStrikeChance1` (20-30)% increased Critical Hit Chance for Spells [staff,wand]<br>`CorruptionLifeGainedFromEnemyDeath1` Gain (20-25) Life per enemy killed [quiver,staff,wand]<br>`CorruptionIncreasedCastSpeed1` (10-15)% increased Cast Speed [staff,wand] | `CorruptionReducedLocalAttributeRequirements1` (no attribute requirements)<br>`CorruptionGlobalFireSpellGemsLevel1` (+skill level cut)<br>`CorruptionGlobalColdSpellGemsLevel1` (+skill level cut)<br>`CorruptionGlobalLightningSpellGemsLevel1` (+skill level cut)<br>`CorruptionGlobalChaosSpellGemsLevel1` (+skill level cut)<br>`CorruptionGlobalPhysicalSpellGemsLevel1` (+skill level cut)<br>`CorruptionManaGainedFromEnemyDeath1` (mana cut) |
| Sceptre | `CorruptionLocalIncreasedSpiritPercent1` (15-25)% increased Spirit [sceptre] — adapted → +15–25 Spirit (100 base)<br>`CorruptionAlliesInPresenceAllDamage1` Allies in your Presence deal (20-30)% increased Damage [sceptre] — needs Allies-in-Presence deviation<br>`CorruptionAlliesInPresenceIncreasedAttackSpeed1` Allies in your Presence have (5-10)% increased Attack Speed [sceptre] — needs Allies-in-Presence deviation<br>`CorruptionAlliesInPresenceIncreasedCastSpeed1` Allies in your Presence have (5-10)% increased Cast Speed [sceptre] — needs Allies-in-Presence deviation<br>`CorruptionAlliesInPresenceCriticalStrikeMultiplier1` Allies in your Presence have (10-15)% increased Critical Damage Bonus [sceptre] — needs Allies-in-Presence deviation | `CorruptionReducedLocalAttributeRequirements1` (no attribute requirements) |
| Body armour | `CorruptionLocalIncreasedPhysicalDamageReductionRatingPercent1` (15-25)% increased Armour [str_armour]<br>`CorruptionLocalIncreasedEvasionRatingPercent1` (15-25)% increased Evasion Rating [dex_armour]<br>`CorruptionLocalIncreasedEnergyShieldPercent1` (15-25)% increased Energy Shield [int_armour]<br>`CorruptionLocalIncreasedArmourAndEvasion1` (15-25)% increased Armour and Evasion [str_dex_armour]<br>`CorruptionLocalIncreasedArmourAndEnergyShield1` (15-25)% increased Armour and Energy Shield [str_int_armour]<br>`CorruptionLocalIncreasedEvasionAndEnergyShield1` (15-25)% increased Evasion and Energy Shield [dex_int_armour]<br>`CorruptionMaximumElementalResistance1` +1% to all Maximum Elemental Resistances [amulet,body_armour] — +% maximum resistance<br>`CorruptionIncreasedLife1` +(30-40) to maximum Life [belt,body_armour]<br>`CorruptionChaosResistance1` +(13-19)% to Chaos Resistance [body_armour,ring] | `CorruptionReducedLocalAttributeRequirements1` (no attribute requirements)<br>`CorruptionAdditionalPhysicalDamageReduction1` (not in vocabulary)<br>`CorruptionDamageTakenGainedAsLife1` (recoup not in vocabulary)<br>`CorruptionDamageTakenGainedAsMana1` (mana cut)<br>`CorruptionThornsDamageIncrease1` (% increased thorns not in vocabulary) |
| Shield | `CorruptionLocalIncreasedPhysicalDamageReductionRatingPercent1` (15-25)% increased Armour [str_armour]<br>`CorruptionLocalIncreasedArmourAndEvasion1` (15-25)% increased Armour and Evasion [str_dex_armour]<br>`CorruptionLocalIncreasedArmourAndEnergyShield1` (15-25)% increased Armour and Energy Shield [str_int_armour]<br>`CorruptionLocalBlockChance1` (10-15)% increased Block chance [shield] | `CorruptionThornsDamageIncrease1` (% increased thorns not in vocabulary)<br>`CorruptionMaximumBlockChance1` (max block not in vocabulary)<br>`CorruptionGainLifeOnBlock1` (not in vocabulary)<br>`CorruptionGainManaOnBlock1` (mana cut) |
| Amulet | `CorruptionLifeLeech1` Leech 3% of Physical Attack Damage as Life [amulet]<br>`CorruptionMaximumElementalResistance1` +1% to all Maximum Elemental Resistances [amulet,body_armour] — +% maximum resistance<br>`CorruptionAllResistances1` +(5-10)% to all Elemental Resistances [amulet,ring]<br>`CorruptionItemFoundRarityIncrease1` (10-15)% increased Rarity of Items found [amulet,ring]<br>`CorruptionStrength1` +(10-15) to Strength [amulet,belt,ring]<br>`CorruptionDexterity1` +(10-15) to Dexterity [amulet,belt,ring]<br>`CorruptionIntelligence1` +(10-15) to Intelligence [amulet,belt,ring] | `CorruptionManaLeech1` (mana cut)<br>`CorruptionGlobalSkillGemLevel1` (+skill level cut)<br>`CorruptionLifeFlaskChargeGeneration1` (flasks cut)<br>`CorruptionManaFlaskChargeGeneration1` (flasks cut)<br>`CorruptionCharmChargeGeneration1` (charms cut) |
| Ring | `CorruptionChaosResistance1` +(13-19)% to Chaos Resistance [body_armour,ring]<br>`CorruptionAllResistances1` +(5-10)% to all Elemental Resistances [amulet,ring]<br>`CorruptionItemFoundRarityIncrease1` (10-15)% increased Rarity of Items found [amulet,ring]<br>`CorruptionCriticalStrikeMultiplier1` (15-20)% increased Critical Damage Bonus [quiver,ring]<br>`CorruptionStrength1` +(10-15) to Strength [amulet,belt,ring]<br>`CorruptionDexterity1` +(10-15) to Dexterity [amulet,belt,ring]<br>`CorruptionIntelligence1` +(10-15) to Intelligence [amulet,belt,ring] | `CorruptionIncreasedMana1` (mana cut)<br>`CorruptionLifeRegenerationRate1` (% regen rate not in vocabulary)<br>`CorruptionManaRegeneration1` (mana cut)<br>`CorruptionAllDamage1` (generic % damage not in vocabulary)<br>`CorruptionIncreasedSkillSpeed1` (skill speed not in vocabulary) |
| Belt | `CorruptionIncreasedLife1` +(30-40) to maximum Life [belt,body_armour]<br>`CorruptionIncreasedPhysicalDamageReductionRatingPercent1` (15-25)% increased Armour [belt]<br>`CorruptionIncreasedEvasionRatingPercent1` (15-25)% increased Evasion Rating [belt]<br>`CorruptionIncreasedEnergyShieldPercent1` (15-25)% increased maximum Energy Shield [belt]<br>`CorruptionFireResistance1` +(20-25)% to Fire Resistance [belt,boots]<br>`CorruptionColdResistance1` +(20-25)% to Cold Resistance [belt,boots]<br>`CorruptionLightningResistance1` +(20-25)% to Lightning Resistance [belt,boots]<br>`CorruptionMaximumFireResistance1` +(1-3)% to Maximum Fire Resistance [belt] — +% maximum resistance<br>`CorruptionStrength1` +(10-15) to Strength [amulet,belt,ring]<br>`CorruptionDexterity1` +(10-15) to Dexterity [amulet,belt,ring]<br>`CorruptionIntelligence1` +(10-15) to Intelligence [amulet,belt,ring] | `CorruptionMaximumEnduranceCharges1` (charges cut) |

### C.5.4 Hero currencies

**Jeweller's Orbs (PoE2 behaviour, verified on poe2db).**

| Orb | PoE2 text | PoE2 restriction |
|---|---|---|
| Lesser (`CurrencyAddSkillGemSocket3`) | Sets a Skill Gem to have **3** Support Gem Sockets | Only on gems with fewer than 3 |
| Greater (`CurrencyAddSkillGemSocket4`) | Sets a Skill Gem to have **4** Support Gem Sockets | Only on gems with fewer than 4 |
| Perfect (`CurrencyAddSkillGemSocket5`) | Sets a Skill Gem to have **5** Support Gem Sockets | Only on gems with fewer than 5 |

**MvM rule (adapted).** Each orb **adds exactly one support slot**, and only below its ceiling:

| Orb | Usable when hero has | Result |
|---|---|---|
| Lesser | 0, 1 or 2 slots | +1 slot (max 3) |
| Greater | 0–3 slots | +1 slot (max 4) |
| Perfect | 0–4 slots | +1 slot (max 5, the hard cap) |

- The new slot is filled at once with a random compatible support. Brief rules apply: ~3× weight for the gem's `recommended_supports`, no duplicates, no two tiers of one family, and tier gating by hero level (I from 1, II from 12, III from 24).
- Hero rarity is recomputed: 0 supports = Normal, 1–2 = Magic, 3+ = Rare.
- Why +1 and not PoE2's "set to N": PoE2's jump (0 → 3) would skip the whole Magic band, and the brief says "add a support slot".

**Gemcutter's Prism** (`CurrencyGemQuality`).

- +5% hero quality per use, max 20%. PoE2 changed this from +1% to +5% in Dec 2024 (research file §1.5); guides agree on +5% with a 20% cap.
- What quality does per hero = the gem's PoE2 quality bonus (`appendix-b-heroes.md`).
- It does nothing on a hero at 20% or above.

**Orb of Realignment** (**MvM custom**, rare). Rerolls one support.

- Pick one support on a non-corrupted Magic or Rare hero.
- It is replaced by a different random compatible support. Same rules as above, and it can't be the removed support or a family already on the hero.
- Slot count and rarity don't change.

**Orb of Transference** (**MvM custom**, very rare). Moves supports between heroes of the same skill.

- Pick a **donor** and a **recipient** with the same PoE2 skill gem id (e.g. two Lightning Arrow heroes). Both must be non-corrupted.
- The recipient's supports **and** support slot count are replaced by the donor's.
- The recipient keeps its own level, XP and quality. The **donor is destroyed**.
- A transferred support above the recipient's tier gate (II at 12, III at 24) stays inactive until the recipient reaches that level.

**Example.** Your level 9 Lightning Arrow has 4 great supports. A level 15 Lightning Arrow drops with 1 bad support. Transference gives the level 15 hero the 4 great supports.

### C.5.5 Vaal Orb on heroes and spells (proposal, MvM custom)

PoE2 gem corruption (COMMUNITY: maxroll, switchbladegaming) has four outcomes: no change; ±1 gem level; ±1 support socket; quality shifted (cap 23%). MvM mirrors it:

| Roll | Outcome |
|---|---|
| 01–25 | No change; hero is Corrupted |
| 26–50 | Hero level +1 or −1 (50/50), as a permanent offset. +1 may exceed the area level + 2 cap by 1. −1 can't go below 1 |
| 51–75 | Support slots +1 or −1 (50/50). +1 adds a random support (max 5; at 5 it becomes −1). −1 removes a random support (at 0 it becomes +1) |
| 76–00 | Quality ± 1–10% (50/50 sign), clamped to 0–23% |

A corrupted hero:

- still earns XP and levels;
- can't be changed by Jeweller's, Gemcutter's, Realignment or Vaal;
- can't be a Transference donor or recipient.

### C.5.6 Shards and salvage

The stash has a **Salvage** action next to **Sell**. Selling gives gold (values in `appendix-e-economy.md`); salvaging gives:

| Salvaged | Output | Source |
|---|---|---|
| Normal item | Nothing; sell it instead. The filter turns hidden normals into gold | MvM custom |
| Magic item | 1 Transmutation Shard | PoE2 disenchant (COMMUNITY: Mobalytics; research file) |
| Rare item | 1 Regal Shard; 2 if it has 6 mods | PoE2 disenchant (WIKI via research file §1.5) |
| Unique item | 4 Regal Shards | **MvM custom**: PoE2's unique disenchant output was not verified |
| Normal hero or spell | Nothing; sell it | MvM custom |
| Magic hero or spell | 1 Jeweller's Shard | **MvM custom** |
| Rare hero or spell | 3 Jeweller's Shards (4 if 4+ supports) | **MvM custom** |

**Stack rules.**

- 10 Transmutation Shards → 1 Orb of Transmutation; 10 Regal Shards → 1 Regal Orb. This is PoE2's stack size and `full_stack_turns_into`.
- 10 Jeweller's Shards → 1 Lesser Jeweller's Orb (MvM custom). A Lesser Orb is PoE2's 200-gold rung, 4× a Transmutation, and hero drops are rarer than item drops.
- Shards merge into orbs automatically in the stash.
- Quality and corruption don't change salvage output.

---

## C.6 Item generation algorithm

**Inputs:** area level `A`; the monster's rarity and modifier count; the killing hero's "% increased rarity of items found"; global passives; the current roster.

**Step 1: Item level.**

```
ilvl = A + (1 if rare monster) + (2 if boss)
```

**Step 2: Category, slot, class, base.** The splits are `appendix-e-economy.md` §3.2–3.3; the base tilt is MvM custom.

1. **Category:** Gear 85% / Hero 11% / Spell 4%. The rest of this algorithm is for gear. Heroes and spells: `appendix-b-heroes.md`.
2. **Gear slot:**
   - Weapon 40%.
   - Armor 35%: body armour 80%, shield 20%.
   - Accessory 25%: ring 45%, amulet 30%, belt 25%.
3. **Weapon class:**
   - 50%: uniform among the weapon classes the current roster's heroes use.
   - 50%: uniform over all 9 demo classes.
4. **Base (MvM custom):** among that class's catalog bases with `drop_level ≤ ilvl`, weight the newest 3, the second-newest 2, the rest 1.
   - PoE2 drops all eligible bases evenly. The tilt keeps upgrades coming in a 2-hour demo.

**Step 3: Rarity.** This is appendix E's model, repeated here so the algorithm is complete. Rarity bonus `R` is a fraction (+100% = 1.0).

```
R = R_monster + R_killer_hero + R_passives
R_monster = 1.0 per affix (magic)        # PoE2: each monster modifier ≥ +100% rarity [HARD]
          = 2.0 per affix (rare)         # PoE2 Dec 2024: rare-monster rarity per modifier doubled [HARD]
          = 32.0 (boss item rolls)       # appendix-d §7 / appendix-e §3.1
weights   = { normal: 75, magic: 20 × (1+R), rare: 3.5 × (1+R), unique: 0.12 × (1+R) }
pick one rarity by weight (normalised)
```

| Source | R | Unique | Rare | Magic | Normal |
|---|---|---|---|---|---|
| Normal monster | 0 | 0.12% | 3.6% | 20.3% | 76.1% |
| Normal monster, killer hero +30% rarity | 0.3 | 0.15% | 4.3% | 24.6% | 71.0% |
| Magic monster (1 affix) | 1.0 | 0.20% | 5.7% | 32.7% | 61.4% |
| Rare monster (3 affixes) | 6.0 | 0.35% | 10.2% | 58.3% | 31.2% |
| Rare monster (4 affixes) | 8.0 | 0.38% | 11.0% | 62.6% | 26.1% |
| Boss item roll | 32.0 | 0.46% | 13.5% | 77.2% | 8.8% |

- Appendix E puts the campaign average at about 59% normal / 35% magic / 6% rare / 0.2% unique. That is inside the research file's PoE2 estimate (55–70 / 25–35 / 4–10).
- If the roll is **Unique**: discard the Step 2 base and draw from the C.4.1 random-drop rule. With no eligible unique, it becomes Rare.
  - The gamble tab instead requires a demo unique on the chosen base (appendix E §5).
- **Heroes and spells** use the same rarity roll: Normal = 0 supports, Magic = 1–2, Rare = 3–4, and Unique becomes Rare (no unique heroes).

**Step 4: Number of mods.**

| Rarity | Distribution | Source |
|---|---|---|
| Magic | 1 mod 50%, 2 mods (1P + 1S) 50% | MvM proposal (no PoE2 figure found) |
| Rare | 4 mods 8/12, 5 mods 3/12, 6 mods 1/12 | PoE1 community figure; PoE1 wiki: found rares "always have at least 4 affixes". PoE2's Alchemy also makes exactly 4 |

**Step 5: Roll the mods.** Repeat N times:

1. **Pool** = every tier that meets all of these:
   - its family is allowed on this base (C.3.6, `—` = no);
   - its defence variant matches the base;
   - `rl ≤ ilvl`;
   - no mod of the same PoE2 **group** is already on the item;
   - prefix count < cap (rare 3, magic 1), or the same for suffixes;
   - not excluded by `no_*_spell_mods` tags (the base's own tags plus tags added by mods already rolled).
2. **Draw** one tier with probability `weight / Σ weights`.
3. **Roll** each stat uniformly in its range. Apply the tier's `adds_tags` (caster element lock).

**Step 6: Finish.**

- Roll implicit values.
- Weapons and armour (non-unique) have a 10% chance of 1–20% quality (C.1.4).
- Magic name = "<prefix name> <base> <suffix name>" (PoE2 affix names, e.g. "Serrated Ironhead Spear of Ease").
- Rare name = two random words from a PoE-style list (MvM flavour).
- Mark as identified.

### C.6.1 Worked example: a rare spear at area level 14

**Setup.**

- A **rare monster with 3 mods** dies at area level 14.
- It is killed by a Lightning Spear hero with a "(6–10)% increased Rarity of Items found" ring rolled at 10%.
- Roster weapon classes in use: Spear, Bow, Sceptre, Two Hand Mace.

1. **ilvl** = 14 + 1 (rare monster) = **15**.
2. **Slot.**
   - The roll gives Gear (85%), then Weapon (40%).
   - The roster-shaped branch (50%) picks Spear, 1 of the 4 roster classes.
   - The eligible spear bases at ilvl 15 are Hardwood Spear (dl 1, weight 2) and Ironhead Spear (dl 5, newest, weight 3). The roll gives **Ironhead Spear** (`FourSpear2`, 60%).
3. **Rarity.**
   - R = 3 affixes × 2.0 + 0.10 = 6.1.
   - Weights: normal 75, magic 20 × 7.1 = 142, rare 3.5 × 7.1 = 24.85, unique 0.12 × 7.1 = 0.85.
   - The roll gives **Rare**, at 24.85 / 242.7 = 10.2%.
4. **Mod count.** The roll gives **4** (8/12).
5. **Pool at ilvl 15** for a spear: 28 tiers.
   - Prefix weight 12,500: phys %, phys/acc hybrid, added phys/fire/cold/lightning, elemental-with-attacks, accuracy.
   - Suffix weight 9,000: attack speed, crit, crit multiplier, life on kill, stun buildup, accuracy (light-radius hybrid), Str, Dex.
   - Life leech is not in the pool (rl 21).
   - So P(first mod is a prefix) = 12,500 / 21,500 = 58%.

| Draw | Pool weight left | Rolled tier | Chance of this tier | Value rolled |
|---|---|---|---|---|
| 1 | 21,500 | Serrated (`LocalIncreasedPhysicalDamagePercent2`, rl 8, P) | 1000/21,500 = 4.7% | 61% increased Physical Damage |
| 2 | 19,500 (phys % family removed) | Heated (`LocalAddedFireDamage1`, rl 1, P) | 1000/19,500 = 5.1% | Adds 1 to 4 Fire Damage |
| 3 | 17,500 | of Ease (`LocalIncreasedAttackSpeed2`, rl 11, S) | 1000/17,500 = 5.7% | 8% increased Attack Speed |
| 4 | 15,500 | Squire's (`LocalIncreasedPhysicalDamagePercentAndAccuracyRating1`, rl 8, P) | 500/15,500 = 3.2% | 16% increased Physical Damage, +16 Accuracy |

- Draws come from a seeded script (`random.Random(5)`) over the real tables.
- After draw 4 the item has 3 prefixes, so a 5th mod could only be a suffix.

**Resulting item: "Gale Spike", Rare Ironhead Spear, ilvl 15.**

| Line | Value | How |
|---|---|---|
| Implicit | ~~Grants Skill: Spear Throw~~ | cut in MvM |
| Physical damage | **16–21** | (9–12) × (1 + 0.61 + 0.16) = 15.9–21.2, rounded |
| Fire damage | **1–4** | local added, not scaled by phys % |
| Attack time | **579 ms (1.73 APS)** | 625 / 1.08 |
| Crit | 5% | base |
| Accuracy | +16 | local |
| Weapon DPS | **≈ 36.3** | (18.5 + 2.5) × 1.728 |

A white Ironhead Spear has 10.5 × 1.6 = **16.8 DPS**, so this rare more than doubles the hero's weapon damage. A Divine Orb could push Serrated toward 64% and of Ease toward 10%. An Exalted Orb can only add a suffix (prefixes are full).

---

## C.7 Loot filter presets

The filter applies to **equipment items only**. Heroes, spells, currency, uniques and rares are never hidden.

Hidden items still drop, but quietly: no label, beam, sound or ticker line. They **convert at level end** (as `appendix-e-economy.md` §3 describes) into the outputs below.

| Preset | Hidden | Each hidden item becomes |
|---|---|---|
| 1. Show all | Nothing | — |
| 2. Hide normal | Every Normal item | Its gold sell value (`appendix-e-economy.md`) |
| 3. Hide normal + low-tier magic | Every Normal item, plus every **low-tier Magic** item | Normal → gold sell value. Low-tier magic → 1 Transmutation Shard (its salvage output, C.5.6) |

**Low-tier magic, exactly.**

1. For each affix on the item, find its **rank**: 1 = the best tier of that family the item's ilvl allows, 2 = the next lower, and so on.
2. The item is low-tier if **every** affix has rank ≥ 3. In other words, none of its affixes is in the top two tiers available at its ilvl.
3. A magic item with 0 mods (after Annulment) can't drop, so it never matters here.

| Example | Ranks | Hidden by preset 3? |
|---|---|---|
| ilvl 20 magic spear "Heavy" (`LocalIncreasedPhysicalDamagePercent1`, rl 1). Unlocked tiers rl 1/8/16, so Heavy is rank 3 | 3 | **Yes** → 1 Transmutation Shard |
| ilvl 20 magic spear "Serrated … of the Brute": Serrated (rl 8) is rank 2; `Strength1` is rank 2 (Strength tiers rl 1 and 11 unlocked) | 2, 2 | No |
| ilvl 4 magic ring "Hale" (`IncreasedLife1`; only one tier unlocked) | 1 | No |

Early on, few magic items are hidden, because few tiers are unlocked. Later, preset 3 removes most of the clutter. That is the ramp an ARPG player expects.

---

## C.8 Notes for other appendices

**`appendix-a-combat.md`**

- C.3 maps every kept family to an appendix-a §9 stat id.
- The §3.4 fan rule covers +1 to +3 projectiles. Death's Harp (+3–4) and Sire of Shards (+4) need a rule for +4 and beyond. C assumes the pattern repeats: above, below, same lane.
- Splash (Cultist Greathammer) needs a radius. C proposes 1.25 tiles (PoE2 1.5 m).
- There is no crossbow reload model, so the Dyad Crossbow implicit and `CorruptionAdditionalAmmo1` are cut. Add a model to bring them back.
- §9.1 lists `local_critical_strike_chance_+%`. The PoE2 weapon affix is flat `local_critical_strike_chance` (Deviations 7).
- Doomgate (47–52% block) runs into the 50% block cap in §5.

**`appendix-b-heroes.md`** owns:

- each hero's quality bonus (Gemcutter's Prism);
- support pools and tier gates, which Jeweller's, Realignment and Transference use.

**`appendix-e-economy.md`**

- Its Spirit table already counts 100 Spirit per sceptre. That 100 is a fixed base property of every sceptre, not a rolled implicit.
- E sets gold sell values, used by the filter.
- E sets absolute currency rates. C.5.1 copies E's drop levels and weights.
- E's "hidden items auto-sell" applies to Normal items. Low-tier magic items become Transmutation Shards instead (C.7), per the brief's "gold and shards".

**`appendix-d-monsters-levels.md`**

- The boss unique pools use D's boss area levels (6, 14, 21, 29). If those change, re-check C.4.1.

---

## Deviations from brief

Each item says what the data forced, and what happens if the team says no.

1. **"Allies in your Presence" wrapper stat (new vocabulary entry).**
   - PoE2 sceptres get most of their affixes as "Allies in your Presence have/deal X" (10 families, rows 34–44). So do Fixation of Yix and 4 sceptre corrupted enchantments.
   - Proposal: one wrapper. Any vocabulary stat can be granted to *other* heroes inside a copy's Presence radius. One instance per ally per mod, strongest wins, never stacking from copies (same rule as auras). Stat ids `allies_in_presence_*`.
   - All the inner stats are already in the vocabulary except generic "% increased Damage" (row 34), which would be new too.
   - If rejected: cut those rows, and sceptres keep only 2 prefix and 3 suffix families (C.3.5 note).
2. **Unique-only mechanic flags (C.4.4).**
   - 10 small flags that sit outside the ~100-stat vocabulary: no elemental damage, unlimited poison stacks, all hit damage builds freeze, cull frozen, blocked-hit damage %, cull on block, cannot evade, melee physical reflect, a "Surrounded" condition, and no Int bonus.
   - They are what makes the chosen uniques build-enabling. Each has a fallback if rejected.
3. **Currency drop levels lowered** (values shared with `appendix-e-economy.md` §4.2). PoE2's drop levels put six of the brief's currencies at or past the end of the demo (area ~29):

   | Currency | PoE2 dl | MvM dl |
   |---|---|---|
   | Vaal Orb | 35 | 15 |
   | Orb of Annulment | 35 | 15 |
   | Divine Orb | 35 | 20 |
   | Lesser Jeweller's Orb | 25 | 5 |
   | Greater Jeweller's Orb | 45 | 15 |
   | Perfect Jeweller's Orb | 65 | 25 |

   Appendix E also moves Regal, Exalted and Alchemy (5 → 3), and Chaos and Gemcutter's Prism (12 → 8), earlier.

4. **Item-level bonus read as monster rarity.** The brief's "rares +1, uniques +2" is implemented as PoE2 does it: +1 for a rare **monster**, +2 for a boss. The item's own rarity doesn't matter.
5. **"13 currencies"** counts the Jeweller's Orb as one family in 3 grades. In total there are 15 orbs plus 3 shards (2 PoE2, 1 MvM custom).
6. **No item-quality currency.**
   - The brief keeps PoE2 quality up to 20% but lists no quality orb. MvM gets quality from drops (10% chance of 1–20%, MvM custom) and the Vaal outcome.
   - Option: add Armourer's Scrap (`CurrencyArmourQuality`), Blacksmith's Whetstone (`CurrencyWeaponQuality`) and Arcanist's Etcher (`CurrencyMagicQuality`), all PoE2 dl 5.
7. **Vocabulary wording corrections from PoE2 data.**
   - Local crit on weapons is a **flat** "+X% to Critical Hit Chance" (`local_critical_strike_chance`), not "% increased". `appendix-a-combat.md` §9.1 lists `local_critical_strike_chance_+%`.
   - Local accuracy is a **flat** "+X to Accuracy Rating" (`local_accuracy_rating`), not "+%".
   - Adapted mappings, all marked in the tables:
     - "Elemental Damage with Attacks" and "Spell Physical Damage" → % increased Elemental / Physical;
     - "Chill Duration" → ailment duration;
     - "Surpassing chance for an additional arrow" and "chance to Chain" → + projectiles / + chain with a chance;
     - local "% increased Spirit" → flat Spirit on the 100 base.
8. **Quality on wands, staves and sceptres adapted.** PoE2 quality boosts the skill the item grants, and granted skills are cut. MvM: 1% increased Spell damage (wand, staff) or 1% increased Spirit (sceptre) per 1% quality.
9. **Scope counts slightly over the targets:** 13 jewellery bases (target ~10) and 17 uniques (target ~15). That way every weapon class and slot has at least one unique, and every unique's base is in the catalog.
10. **Team affixes and the `team_` wrapper stat (C.3.8, new vocabulary entry).**
   - PoE2 has no team scope: every PoE2 mod buffs the one character. MvM spreads the board across 6 heroes with 3 slots each, and monsters hit only the hero in front, so hero-only resistance rolls were dead weight.
   - 18 MvM custom families, twins of PoE2 families at about half value. The 5 hero-only resistance families are cut in favour of their twins; ring resistance implicits become team implicits at half value.
   - If rejected: restore rows 79–83 and the ring implicits as written in PoE2, and cut C.3.8.

---

## Sources

- repoe-fork/poe2 export 4.5.5.2 (local copy): `base_items.json`, `mods.json`, `mods_by_base.json`, `uniques.json`, `item_classes.json`. https://github.com/repoe-fork/poe2
- poe2db.tw pages: Quality, Sceptres ("Spirit: 100" on every sceptre), Bows, Crossbows, Spears, One/Two Hand Maces, Quarterstaves, Wands, Staves, Body Armours, Shields, Amulets, Rings, Belts (unique bases and mods), Lesser/Greater/Perfect Jeweller's Orb, Vaal Orb, Divine Orb, Chaos Orb, Exalted Orb, Regal Orb, Orb of Alchemy, Orb of Augmentation, Orb of Transmutation, Orb of Annulment, Gemcutter's Prism, Transmutation Shard, Regal Shard. https://poe2db.tw/us/
- Shared research file `research_loot_economy.md` (drop levels, Dec 2024 and 0.2.0g loot changes, disenchant outputs, monster rarity).
- PoE2 in-game glossary dump `keywords_dump.md`: Quality, Presence, Chain, Fork, Split, Splash Damage, Surpassing chance, Armour Break, Culling Strike, Electrocution, Crushed.
- Corruption outcomes (COMMUNITY): https://maxroll.gg/poe2/resources/corruption-outcomes and https://www.switchbladegaming.com/path-of-exile-2/vaal-orb-outcomes/
- Disenchant outputs (COMMUNITY): https://mobalytics.gg/poe-2/guides/currency-guide
- PoE1 rarity mechanics baseline (WIKI): https://pathofexile.fandom.com/wiki/Drop_rate
