# Appendix E: Economy, Loot Rates & Progression Pacing

Part of the [Mercs vs. Monsters GDD](gdd.md).

MvM runs four economies:

| Economy | Lives | Earned from | Spent on |
|---|---|---|---|
| **Mana** | inside a level only | sky drops + acolytes | placing heroes, casting the spell |
| **Gold** | account | monster kills, selling | vendors, gambling, respecs |
| **Crafting currency** | account | kills, Strongboxes, bosses, first clears, salvage | modifying items and heroes ([appendix C](appendix-c-items.md)) |
| **XP** | account (player) + per hero | kills | passive points ([appendix F](appendix-f-passives.md)), hero levels |

Everything is auto-collected.

**Principles**

1. **Tempo comes from PvZ.** Mana income and placement costs are PvZ's numbers.
2. **Gear and hero drops per minute come from PoE2's early campaign.**
3. **Crafting currency is deliberately richer than PoE2's Act 1** (see §4.4). Crafting has to be testable inside 2 hours.

---

## 1. Reference numbers

### 1.1 PvZ (2009)

- **Source:** the reverse-engineered PvZ GOTY source ([Patoke/re-plants-vs-zombies](https://github.com/Patoke/re-plants-vs-zombies)), cross-checked with the PvZ wiki.
- **Confidence:** hard data.

| Item | PvZ value |
|---|---|
| Starting sun | 50; 150 on the very first level |
| Sky sun | 25 each. First at 4.25–7.0 s, then `min(9.5, 4.25 + 0.1n) + rand(0, 2.74)` s apart. That is ~225/min early, ~138/min long-run. |
| Sunflower | Costs 50. 25 sun every 23.5–25 s; first sun 3–12.5 s after planting. Pays for itself in ~32 s. |
| Seed recharge | Fast 7.5 s, slow 30 s, very slow 50 s. At level start, slow packets begin with 20 s left and very slow with 35 s. |
| Peashooter | 100 sun; 20 dmg / 1.5 s. A basic zombie takes ~10 peas, ~15 s. |
| Wall-nut | 50 sun; 4,000 HP; holds one zombie for ~40 s |
| Cherry Bomb | 150 sun; 50 s recharge; 1,800 dmg in 3x3 |
| Zombie walk | ~4.7 s/tile; ~45–50 s to cross the lawn |
| Waves | First at 18 s. Then 25–31 s apart, or 2 s after the wave drops to 50–65% of its HP. Every 10th wave is a flag wave with 2.5x budget. |

### 1.2 PoE2 (early access 0.5.x, Act 1)

**Hard data:**

- Area levels 1–15 across Act 1.
- XP table (§6.1).
- Currency drop levels:

  | Currency | Earliest area level |
  |---|---|
  | Transmutation, Augmentation | 1 |
  | Regal, Exalted, Alchemy | 5 |
  | Chaos, Gemcutter's Prism | 12 |
  | Divine, Vaal, Annulment | 35 |

- Each monster modifier grants ≥ 100% increased item rarity. Since Dec 2024, rare monsters get +200% rarity and +10% quantity per modifier.
- Strongboxes and act bosses guarantee a rare.

**Estimates (community):** PoE2 publishes no drop-count data, and the PoE2 wiki and reddit were unreachable during research. These are inferred from the mechanics:

- Kills per minute: ~6–15.
- Gear drops: ~1–3 per minute, split ~55–70% normal / 25–35% magic / 4–10% rare.
- Uniques: 0–2 per *entire* Act 1.
- Exalted Orbs: ~0.5–2 per hour.

---

## 2. Mana (in-level)

### 2.1 Income

| Source | Rule | Notes |
|---|---|---|
| Starting mana | **50**. Level 1 starts with **150**. | PvZ |
| Sky mana ("mana wisps") | **25** each, on PvZ's sky-sun schedule | Falls automatically; no clicking |
| Acolytes | `25 × (1 + Spirit / 200)` mana every **23.5–25 s**. First orb arrives 3–12.5 s after placement. | Spirit comes from the acolyte's sceptre (100 base Spirit on every sceptre, per [appendix C](appendix-c-items.md)), amulet, body armour, and passives, plus **+2 Spirit per acolyte hero level** ([appendix B](appendix-b-heroes.md)). **MvM custom.** |
| Acolyte stats | `acolyte_mana_generated_+%`, `acolyte_mana_interval_-%`, `acolyte_mana_per_orb` | From acolyte supports and passives ([appendix B](appendix-b-heroes.md)) |
| Mana cap | **9,990** | PvZ |

**What Spirit buys** (ballpark; appendix C has the exact values):

| Acolyte's total Spirit | Mana per orb | Per minute | PvZ equivalent |
|---|---|---|---|
| 0 | 25 | ~62 | Sunflower |
| 100 (a sceptre implicit) | 37.5 | ~93 | 1.5 Sunflowers |
| 200 | 50 | ~124 | Twin Sunflower |

### 2.2 Spending

Base costs and recharge tiers are set per hero in [appendix B](appendix-b-heroes.md).

```
heroManaCost = roundTo25(roleBaseCost × Π supportCostMultiplier)
```

| Role | Base mana | Recharge |
|---|---|---|
| Acolyte | 50 | fast 7.5 s |
| Wall | 50–75 | slow 30 s |
| Basic ranged | 100 | fast |
| Advanced ranged / striker / caster | 125–200 | fast |
| Curse / mark | 75–125 | fast |
| Aura | 150–250 | slow |
| Player spell | ~150 | 30–50 s cooldown |

**Worked example** ([appendix B §3](appendix-b-heroes.md#3-worked-example-level-17-rare-lightning-spear)). The level 17 Rare Lightning Spear has base cost 150. Its supports are Elemental Armament II (x1.20), Lightning Attunement (x1.00), and Rapid Attacks I (x1.00). It costs 150 × 1.2 = 180, which rounds to **175 mana**.

Many PoE2 supports are x1.00, so cost pressure comes mostly from the strongest supports. If Rares feel too cheap for their power, raise the floor multiplier for any support to x1.05 (a tuning knob).

### 2.3 The first minute (target shape)

| Time | Event | Mana after |
|---|---|---|
| 0 s | Level 1 starts with 150. Place Acolyte. | 100 |
| ~5 s | Sky +25 | 125 |
| 7.5 s | Place a second Acolyte | 75 |
| ~8–12 s | Sky +25; first acolyte orb +25 | 125 |
| ~15 s | Place a third Acolyte | 75 |
| 25 s | First wave arrives: 1–2 Shamblers. Place a ranged hero. | ~0–25 |
| 60 s | Income is now ~225 sky + ~150 acolyte per minute | — |

A PvZ veteran's instinct (3 producers, then shooters) is correct here. Loot changes *how much* each shooter does, not the opening.

---

## 3. Loot drops

### 3.1 Per-kill item rolls

Each kill makes **item rolls**. Each roll becomes one drop: gear, a hero, or a spell.

| Monster | Item rolls per kill | Rarity bonus applied to the drop |
|---|---|---|
| Normal | 0.08 | 0% |
| Magic | 0.45 | +100% (1 affix, PoE2) |
| Rare | 1.5 × (1 + 0.1 × affixes) | +200% per affix, ~+600% on average (PoE2 Dec 2024 values) |
| Boss | 8 + guaranteed drops ([appendix D §7](appendix-d-monsters-levels.md#7-bosses)) | +3,200% (approximates PoE2's datamined boss mods) |
| Strongbox | 3 + a guaranteed rare | rare-monster rarity |

**Modifiers on the killing hero**

- The killing hero's `item_rarity_+%` adds to the rarity bonus.
- Its `gold_found_+%` scales gold (§5.1).
- "Killing hero" means whoever lands the killing hit. For DoT kills, it's the hero who applied the ailment.

### 3.2 Category, slot, and rarity

**Category split per roll.** Gear 85%, Hero 11%, Spell 4%.

**Gear slot split**

| Slot | Share | Breakdown |
|---|---|---|
| Weapon | 40% | — |
| Armor | 35% | body armour 80%, shield 20% |
| Accessory | 25% | ring 45%, amulet 30%, belt 25% |

**Rarity**

- Base weights: Normal 75 / Magic 20 / Rare 3.5 / Unique 0.12.
- The rarity bonus multiplies every non-normal weight by `(1 + bonus)`, then the weights are normalised.

| Source | Normal | Magic | Rare | Unique |
|---|---|---|---|---|
| Normal monster | 76% | 20% | 3.5% | 0.1% |
| Magic monster | 61% | 33% | 5.7% | 0.2% |
| Rare monster (avg) | 31% | 58% | 10% | 0.3% |
| Boss | 9% | 77% | 13.5% | 0.5% (+1 guaranteed unique) |
| **Campaign average** | **~59%** | **~35%** | **~6%** | ~0.2% |

The campaign average sits inside PoE2's estimated 55–70 / 25–35 / 4–10 split.

**Item level** = area level. Rare monsters add +1 and bosses add +2 (PoE2). Mod tiers gate on item level per [appendix C](appendix-c-items.md).

### 3.3 Build-aware loot shaping

The shaping is mild, so surprise finds stay common.

| Drop | Shaping rule |
|---|---|
| Weapon base class | **50%**: uniform among the weapon classes used by the current roster's heroes. **50%**: uniform over all 9 demo weapon classes. |
| Hero skill | **35%**: uniform among heroes that share ≥ 1 damage-type tag or weapon class with a roster hero. **65%**: uniform over all demo heroes. |
| Spells, armour, accessories | Unshaped |

### 3.4 Expected yields

From the drop model above, simulated over the campaign table in [appendix D](appendix-d-monsters-levels.md).

**Assumptions**

- ~4.3 min per normal level and ~4.5 min per boss level.
- Kill counts come from the wave budget.
- Swarm packs count 3 kills each.

| Level | Area | Kills | Gear / min | Heroes / level | Currency / level | Gold / level |
|---|---|---|---|---|---|---|
| 1 | 1 | ~19 | ~1.1 | 0.3 | 0.9 | ~20 |
| 3 | 3 | ~38 | ~1.5 | 0.7 | 1.8 | ~55 |
| 5 (boss) | 6 | ~48 | ~3.1 | 1.8 | 5.4 | ~100 |
| 8 | 11 | ~62 | ~2.2 | 1.2 | 3.1 | ~190 |
| 10 (boss) | 14 | ~53 | ~3.4 | 2.0 | 5.9 | ~205 |
| 13 | 18 | ~68 | ~2.6 | 1.5 | 3.7 | ~325 |
| 15 (boss) | 21 | ~58 | ~3.6 | 2.1 | 6.1 | ~310 |
| 18 | 26 | ~75 | ~3.3 | 1.8 | 4.6 | ~535 |
| 20 (boss) | 29 | ~62 | ~4.1 | 2.4 | 6.8 | ~485 |
| **Campaign** | | **~1,250** | **~2.7 avg** | **~29 drops** | **~76 drops** | **~5,300** |

Also:

- About 10 spell drops over the campaign.
- About 0.6 random uniques, plus the 4 guaranteed boss uniques and gambling.
- First-clear rewards (§4.5) and vendors (§5) come on top of all of this.

**How this compares to PoE2:**

- Gear per minute is **on target** (~1–3/min). It runs a little hot after level 15, which is deliberate: late levels are where builds come together.
- Kill density is **higher**: ~8–20 kills/min versus PoE2's 6–15. Per-kill rates are scaled down to compensate.

### 3.5 Presentation

| Element | Behaviour |
|---|---|
| Drop moment | Each drop pops out of the corpse with a PoE-style label and beam, coloured by rarity: white, blue, yellow, brown, or currency gold. Heroes get a distinct beam colour ([appendix G](appendix-g-art.md)). |
| Loot ticker | A running feed on the right edge, e.g. "Rare Spear (ilvl 14)" or "Exalted Orb". |
| Collection | Automatic. Labels fade after ~3 s; nothing needs clicking. |
| Level-end summary | Every drop, sorted by rarity. Items that are upgrades for a roster slot get an **Upgrade** tag, based on a quick DPS/EHP comparison. |
| Loot filter | Hidden items still drop, but quietly. They convert at level end per the filter rules in [appendix C](appendix-c-items.md). |

---

## 4. Crafting currency

### 4.1 Per-kill currency rolls

Currency rolls are separate from item rolls.

| Source | Chance of 1 currency drop |
|---|---|
| Normal kill | 2.5% |
| Magic kill | 12% |
| Rare kill | 50% |
| Boss | 3 guaranteed rolls |
| Strongbox | 2 guaranteed rolls |

### 4.2 Type weights and drop levels

A currency can't drop below its drop level, measured in area level.

**Deviation from PoE2:** MvM drop levels are **compressed**. The demo tops out at area 29, and PoE2 gates Divine, Vaal, and Annulment at 35, which would mean the demo never sees them.

**Item currency**

| Currency | MvM drop level | PoE2 drop level | Weight |
|---|---|---|---|
| Orb of Transmutation | 1 | 1 | 30 |
| Orb of Augmentation | 1 | 1 | 30 |
| Regal Orb | 3 | 5 | 8 |
| Exalted Orb | 3 | 5 | 8 |
| Orb of Alchemy | 3 | 5 | 4 |
| Chaos Orb | 8 | 12 | 6 |
| Orb of Annulment | 15 | 35 | 2 |
| Vaal Orb | 15 | 35 | 2 |
| Divine Orb | 20 | 35 | 1 |

**Hero currency**

| Currency | MvM drop level | PoE2 drop level | Weight |
|---|---|---|---|
| Gemcutter's Prism | 8 | 12 | 2 |
| Lesser Jeweller's Orb | 5 | 25 | 4 |
| Greater Jeweller's Orb | 15 | 45 | 1 |
| Perfect Jeweller's Orb | 25 | 65 | 0.25 |
| Orb of Realignment (MvM custom: reroll one support) | 12 | — | 1 |
| Orb of Transference (MvM custom: move supports between heroes of the same skill) | 15 | — | 0.5 |

Exact names and behaviours are in [appendix C](appendix-c-items.md). If C and this table disagree on a name, C wins. Weights are relative among currencies past their drop level.

### 4.3 Expected per hour of play

| Currency | ~Drops/hour, late demo | PoE2 Act 1 estimate |
|---|---|---|
| Transmutation + Augmentation | ~30 combined | ~4–12 combined |
| Regal | ~3 | ~0.5–1.5 |
| Exalted | ~3 | ~0.5–2 |
| Alchemy | ~1.5 | ~0–0.5 |
| Chaos | ~2 | ~0–0.5, and only from area 12 |
| Annulment / Vaal / Divine | ~0.7 / 0.7 / 0.35 | 0 |
| Jeweller's Orbs (all) | ~2 | — |

Salvage shards (appendix C) add more on top.

### 4.4 Why currency is richer than PoE2

- PoE2's Act 1 hands out about 2 Exalts and zero Divines in several hours. A 2-hour MvM demo at those rates would never let players craft, and crafting is half the hypothesis.
- Gear and hero **drop** rates match PoE2. Currency is roughly **3x** PoE2 campaign rates, and its drop levels are compressed.
- If playtests show crafting trivialising drops, reduce the currency rolls in §4.1 first.

### 4.5 First-clear rewards (PoE2 quest-reward equivalent)

PoE2's early progression feels good partly because quests hand out guaranteed rewards. Act 1 gives ~8 uncut skill gems, ~9 support gems, and +4 passive points. MvM mirrors this: **each level's first clear grants a fixed reward**, shown on the level card before the player starts.

"Choose 1 of 3" draws three heroes or spells at the listed rarity and level, with at least 1 matching the roster (35% shaping).

| Level | First-clear reward | PoE2 analogue |
|---|---|---|
| 1 | Unlock roster slot 4; **choose 1 of 3 Normal heroes** (level 3) | Clearfell's uncut skill gem |
| 2 | Unlock slot 5; 2 Orbs of Augmentation; 2 Orbs of Transmutation | Starts the crafting tutorial |
| 3 | Unlock slot 6; 1 Lesser Jeweller's Orb | Support-gem rewards |
| 4 | **Choose 1 of 3 Magic heroes** (level 6) | |
| 5 (boss) | +2 passive points; Regal Orb; boss uniques and loot | Crowbell's +2 passives |
| 6 | **Choose 1 of 3 spells** (Magic, level 8) | |
| 7 | Exalted Orb | |
| 8 | **Choose 1 of 3 Magic heroes** (level 11) | |
| 9 | Lesser Jeweller's Orb; Chaos Orb | |
| 10 (boss) | +2 passive points; Gemcutter's Prism; **choose 1 of 3 Rare heroes** (level 14) | Una's Lute +2 |
| 11 | 2 Orbs of Alchemy | |
| 12 | **Choose 1 of 3 Rare heroes** (level 17) | |
| 13 | Greater Jeweller's Orb | |
| 14 | Vaal Orb; Orb of Annulment | |
| 15 (boss) | +2 passive points; Divine Orb | |
| 16 | **Choose 1 of 3 Rare heroes** (level 23) | |
| 17 | 2 Exalted Orbs | |
| 18 | Orb of Realignment (MvM custom) | |
| 19 | Greater Jeweller's Orb | |
| 20 (act boss) | +2 passive points; 2 Divine Orbs; demo-complete screen | |

---

## 5. Gold and vendors

### 5.1 Gold income

| Source | Rule |
|---|---|
| Gold piles | Normal kill: 25% chance of 1 pile. Magic: 60% chance of 2 piles. Rare: 100% chance of 4 piles. Boss: 10 piles. |
| Pile size | `round((2 + 0.4 × areaLevel) × rand(0.75, 1.25) × (1 + gold_found%))` |
| Selling | 20% of the vendor buy price (§5.2). Hidden loot-filter items auto-sell. |

**Expected gold from kills alone**

| Level | Gold per level |
|---|---|
| 1 | ~20 |
| 5 | ~100 |
| 10 | ~200 |
| 15 | ~300 |
| 20 | ~500 |

That's ~5,300 over the whole campaign. Selling roughly doubles it.

### 5.2 Prices

`ilvl` is the item's item level; `lvl` is the hero or spell level.

| Thing | Buy price | Sell price |
|---|---|---|
| Item | `(10 + 2 × ilvl) × rarityMult` (Normal 1, Magic 2.5, Rare 7) | 20% of buy |
| Hero | `(15 + 3 × lvl) × rarityMult` | 20% of buy |
| Spell | 1.2x the hero price | 20% of buy |
| Unique item | never sold by vendors | `(10 + 2 × ilvl) × 4` |
| Currency | not sold | not buyable (MvM: no currency exchange in the demo) |

**Worked prices at level 10 (ilvl 14)**

| Item | Price | Gold income needed |
|---|---|---|
| Magic spear | 95 | ~half a level |
| Rare spear | 266 | ~1.3 levels |
| Rare level 14 hero | 399 | ~2 levels |

Vendors are **bad-luck protection**, not the main source of power.

### 5.3 Vendor stock

| Vendor | Stock (refreshes after every level, win or lose) |
|---|---|
| **Armorer** (items) | 10 offers: 4 weapons, biased to roster classes like drops are; 3 body armours or shields; 3 accessories. Rarity Normal 30% / Magic 55% / Rare 15%. Item level = highest area level unlocked. |
| **Recruiter** (heroes and spells) | 6 heroes, at least 3 sharing roster tags. Rarity Normal 40% / Magic 50% / Rare 10%. Level = highest area level unlocked, −2 to +0. Plus 2 spells. |
| **Buyback** | The last 10 items or heroes sold, at their sell price |

Gambling and gold sinks:

| Thing | Rule |
|---|---|
| **Gamble: items** | Pick a base type. It costs `1.5 × the magic buy price` of that base at the current ilvl. The item comes out unidentified-looking, then reveals: Magic 75% / Rare 22% / Unique 3% (unique only if that base has a demo unique). |
| **Gamble: heroes** | Pick a **role** (melee, ranged, caster, curse, aura, acolyte) or a **damage tag**. It costs `1.5 × the magic hero price`. Reveals Magic 70% / Rare 30%. |
| **Respec** | **Free in the demo**, so players experiment. PoE2's gold-per-point table (15 gold at level 1, 98 at level 10, 470 at level 30) is ready behind a toggle; see [appendix F](appendix-f-passives.md). |

PoE2's own gambler (Finn in Act 1) sells known bases of unknown rarity, magic being most common. MvM's gamble tab is that, plus heroes.

---

## 6. XP and levelling

### 6.1 Player XP

```
killXP = default_monster_stats[areaLevel].experience × rarityXP × K_xp × levelPenalty
rarityXP     = { normal: 1, magic: 2, rare: 5, boss: 20 }   // MvM custom; the PoE2 export has none
K_xp         = 6                                            // MvM density bridge, explained below
levelPenalty = PoE2's: safe band = 3 + floor(playerLevel / 16)
               beyond the band: ((L + 5) / (L + 5 + ED^2.5))^1.5, where ED = levels outside the band
```

**Why `K_xp` = 6.** PoE2 zones have hundreds of kills, and the 20-level MvM campaign has ~1,250. With `K_xp` = 6, the player reaches **level 30** at the end of level 20 and stays about area level +1 to +2 throughout. That's what the PoE2 campaign feels like.

**XP needed per level** (PoE2, cumulative; [poe2db](https://poe2db.tw/us/Experience))

| Player level | Total XP | Player level | Total XP |
|---|---|---|---|
| 2 | 525 | 16 | 346,462 |
| 5 | 7,184 | 20 | 843,709 |
| 10 | 61,693 | 25 | 2,142,652 |
| 15 | 269,997 | 30 | 4,742,836 |

**Simulated player level at the end of each campaign level** (`K_xp` = 6)

| Campaign level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Area level | 1 | 2 | 3 | 5 | 6 | 8 | 9 | 11 | 12 | 14 | 15 | 17 | 18 | 20 | 21 | 23 | 24 | 26 | 27 | 29 |
| Player level | 3 | 4 | 5 | 7 | 9 | 10 | 12 | 13 | 15 | 16 | 18 | 19 | 20 | 22 | 23 | 25 | 26 | 27 | 29 | 30 |

**Passive points** = (player level − 1) + 2 per boss = **29 + 8 = 37** by demo end. Allocation rules are in [appendix F](appendix-f-passives.md).

### 6.2 Hero XP

- Every hero **in the active roster** (all 6 slots plus the spell slot) gains **100% of the XP the player gains**, on the same curve. This is the PoE1 gem rule.
- Stashed heroes gain nothing.
- **Cap:** hero level ≤ highest area level unlocked + 2. XP past the cap is discarded.
- Effect: a hero found two levels ago catches up within a level or two. A great Rare stays worth keeping, which is why the "Earns XP" option was chosen in the interview.
- Hero level maps to PoE2 gem level via [appendix B](appendix-b-heroes.md).

---

## 7. Time to fun

**Target:** the first 15 minutes contain every core loop at least once.

| Clock (approx.) | Beat | Loop exercised |
|---|---|---|
| 0:00 | Pick focus; see 3 starter heroes and a starter spell | Identity |
| 0:30 | Level 1 (3 lanes). First kills; gold piles pop; loot ticker starts. | TD core |
| ~1:30 | First gear drop with a beam. Statistically about 1 in 3 early drops is magic. | Loot |
| ~2:30 | Level 1 cleared. Loot summary. **Choose 1 of 3 heroes.** Slot 4 unlocks. Player level 3: 2 passive points. | Roster + tree |
| ~4:00 | Equip the first magic item. Peek at the Armorer and Recruiter. | Gear + vendors |
| ~7:00 | Level 2 clear: Augmentation and Transmutation orbs. The **first craft** turns a normal weapon magic, then augments it. | Crafting |
| ~12:00 | Level 3 clear: slot 6 and a **Lesser Jeweller's Orb**, adding a support slot to a hero. | Hero crafting |
| ~15–20 | Level 4: first terrain (Rock) and the first possible Strongbox | Risk for loot |
| ~25–30 | **Level 5 boss: first unique**, +2 passives, a rare hero | Chase loot |
| ~55 | Level 10 boss: Rare hero choice; Chaos and Exalts are flowing | Rare crafting |
| ~85 | Level 15: Divine, Vaal, and Annulment now drop | Endgame-style crafting |
| ~115 | Level 20: Count Geonor. Demo complete. | Payoff |

---

## 8. Economy tuning knobs

Change these first, in this order. Only then touch per-item numbers.

| Knob | Where | Initial value | Turn it if… |
|---|---|---|---|
| Wave density `B` | appendix D §5 | 2.0 → 3.0 | levels feel empty or overwhelming |
| Item rolls per kill | §3.1 | 0.08 / 0.45 / 1.5 | drops feel stingy or spammy |
| Hero share of rolls | §3.2 | 11% | the roster stagnates, or there are too many heroes to evaluate |
| Currency chance per kill | §4.1 | 2.5% / 12% / 50% | crafting is starved, or trivialises drops |
| `K_xp` | §6.1 | 6 | players out-level or lag the area level |
| Gold pile size | §5.1 | `2 + 0.4 × area` | vendors are ignored, or are the only thing used |
| Sky mana amount | §2.1 | 25 | early levels are mana-starved, or flooded |
