# Appendix H: Game Feel, VFX & Audio ("the Juice")

Part of the [Mercs vs. Monsters GDD](gdd.md).

This appendix covers:

- the feedback rules that make the core loop *feel* good: hits, kills, loot, mana, placement;
- loot drop choreography, the most important 3 seconds in the game;
- how items, heroes, supports, and skills look and sound;
- monsters, bosses, ailments, HUD, and hideout crafting feedback;
- audio direction, mixing, and music;
- what to author in code, and which open assets to use for the rest.

**Related appendices**

- Sprites, tiles, FX sheets, icons, licensing: [appendix G](appendix-g-art.md). This appendix **does not repeat** G's sprite recipes; it says what to *do* with them.
- Hero and spell behaviour: [appendix B](appendix-b-heroes.md).
- Items and currency: [appendix C](appendix-c-items.md).
- Monsters, bosses, terrain: [appendix D](appendix-d-monsters-levels.md).
- Drop rates and loot presentation: [appendix E §3.5](appendix-e-economy.md#35-presentation).

---

## TL;DR

- **The loot is the star.** Every system here exists to make a drop land like a PoE drop: pop, beam, sound, label, ticker. Spend juice budget there first (§3).
- **Juice scales with power.** Impact size, sound weight, and damage-number size come from **hit significance** (damage ÷ target max life), not from per-skill art. A better weapon makes every hit *look and sound* chunkier with no new assets (§2.6).
- **VFX follow the stat block.** Projectile colour, trail, fork, chain, and AoE ring are derived from the hero's final stats. Convert Lightning Arrow to fire and the arrows turn orange (§5.3). That is pillar 1, "loot you can see working".
- **Six intensity tiers** (T0–T5) set shake, hitstop, slow-mo, ducking, and particle counts for every event. Only T4–T5 touch the whole screen (§1.3).
- **Hitstop is per actor, not global.** A board with 40 monsters can't freeze on every hit. Global freezes are reserved for T4–T5 and rate-limited.
- **All loot stingers share one key** (D major pentatonic). Rapid drops climb a pitch ladder, so a loot burst plays a rising arpeggio instead of noise (§3.4).
- **Audio rules.** Four buses (music, sfx, loot, ui). The loot bus is never ducked or culled. Per-sound voice limits, ±6% pitch variation, round-robin variants (§10).
- **Author in code:** beams, rings, telegraphs, lightning, trails, particles, outlines, damage numbers, **currency orb icons**, card frames, and UI blips (ZzFX). **Use files for:** character sprites (G), terrain (G), sampled impacts, voices, and music (§11–12).
- **Build order:** the first 5 items of §13 give ~80% of the feel.

---

## 1. Principles

### 1.1 What "juice" means here

The [Design pillars](gdd.md#2-design-pillars) set two constraints that pull in opposite directions:

- **Loot you can see working** wants big, loud, satisfying feedback.
- **PvZ clarity** wants a board that a new player reads in 5 seconds.

The rule that reconciles them:

> **Juice rewards; it never hides.** Feedback may be loud for a moment, but it never covers a monster, a telegraph, or a lane for longer than 250 ms.

Practical consequences:

- Lingering effects (burning ground, chilled ground, curse zones, auras) draw **under** actors at ≤ 45% alpha.
- Impact bursts draw over actors but finish in ≤ 250 ms.
- Loot beams are thin (6 px core) and sit over the lawn, never over the HUD.
- Screen shake is translation only, integer pixels, and ≤ 6 logical px.

### 1.2 The moment loop, as feedback

The GDD's 5-second moment loop ("sees mana arrive → places a hero → watches loot beams pop") maps to four feedback beats. Each beat needs **sight, sound, and a number**.

| Beat | Sight | Sound | Number |
|---|---|---|---|
| Mana arrives | Orb falls, glows, flies to the counter | Soft "bloop" + glass ping, pitch ladder | Counter rolls up and bumps |
| Hero placed | Drop-in, squash, dust | Thunk + mana-spend whoosh | Counter rolls down; card recharge sweep |
| Hits land | Flash, impact burst sized by significance | Material-aware hit sound | Damage number coloured by type |
| Kill → loot | Fall, soul puff, item pops, beam rises | Kill sound, then rarity stinger | Label text, ticker line |

### 1.3 Intensity tiers

Every event in the game is assigned one tier. The tier picks all of its global effects from this table, so tuning is one table, not 200 call sites.

| Tier | Examples | Screen shake (trauma add) | Global hitstop | Slow-mo | Music duck | Particles (burst) |
|---|---|---|---|---|---|---|
| **T0** ambient | Walking, idle, sky mana falling | — | — | — | — | 0–3 |
| **T1** routine | Normal hit, DoT tick, normal-item drop, gold | — | — | — | — | 3–6 |
| **T2** notable | Crit, kill, magic drop, hero placed, freeze applied | — | — | — | — | 6–12 |
| **T3** strong | Rare monster kill, slam, spell impact, rare drop, currency drop, leak | 0.20 | — | — | — | 12–24 |
| **T4** big | Hero or spell drop, Exalted/Divine/Vaal drop, boss heavy stun, boss phase change, Strongbox open, flag wave | 0.40 | 60 ms | — | −4 dB, 1 s | 24–48 |
| **T5** huge | Unique drop, boss kill, level won, Divine on a T1 roll in the hideout | 0.60 | 120 ms | 0.35× for 600 ms | −8 dB, 2 s | 48–96 |

**Rate limits**

- Global hitstop: at most one per 1.0 s. A second T4 inside the window adds shake only.
- Slow-mo: at most one per 4 s, and never during a boss telegraph (the player must be able to react).
- Shake: trauma is clamped to 1.0. See §2.2.

### 1.4 Draw order

Back to front. Anything not listed goes in the nearest sensible layer.

1. Lawn, terrain tiles.
2. **Ground decals**: scorch marks, frost, blood, slime puddles (fade over 4–8 s).
3. **Ground effects**: AoE rings, auras, curse zones, Burning/Chilled Ground, telegraphs.
4. Shadows.
5. Actors, sorted by lane then x (G §1.1). Fliers last.
6. Projectiles and trails.
7. Impact bursts and particles.
8. **Loot**: items, beams, coins.
9. Damage numbers.
10. **Loot labels** (above damage numbers, so a rare's name is never covered).
11. Screen flashes, vignette.
12. HUD, ticker, banners.

---

## 2. Core feel systems

These are small, generic systems. Each is under ~100 lines of code. Build them once and every hero, monster, and drop uses them.

### 2.1 Easing

Use a handful of named easings (Robert Penner's set) and nothing else, so motion feels consistent.

| Name | Use |
|---|---|
| `outQuad` | Rises, fades, most UI |
| `inQuad` | Falling items, things flying *to* the HUD |
| `outBack` (overshoot 1.7) | Pops: item landing, card ready, number pop, beam rise |
| `inBack` | Things being sucked into a counter |
| `outElastic` (light) | Counter bump only |
| `linear` | Projectiles (speed is a stat; never ease it) |

### 2.2 Screen shake (trauma model)

From Squirrel Eiserloh's GDC 2016 talk, simplified for pixel art.

```js
// trauma in [0, 1]; events add to it (§1.3), it decays linearly.
trauma = Math.max(0, trauma - dt * 1.6);
const s = trauma * trauma;                    // quadratic feels better than linear
const dx = Math.round(MAX_SHAKE * s * noise(t * 30, 0));   // MAX_SHAKE = 6 logical px
const dy = Math.round(MAX_SHAKE * s * noise(0, t * 30));
// No rotation and no zoom: both resample pixel art and look muddy.
```

- Apply to the **board and its effects only**. The HUD never shakes, except the mana counter's own bump.
- `noise` is any smooth noise in [−1, 1]; two out-of-phase sines are fine.
- **Directional kicks** (boss footsteps, slams): add a one-frame offset of 2–3 px in the impact direction on top of trauma.
- Option: "Screen shake" Off / Low (×0.5) / Full.

### 2.3 Hitstop

Two kinds:

| Kind | What freezes | Duration | Used for |
|---|---|---|---|
| **Actor hitstop** | Only the attacker's and the target's animation clocks. The sim keeps running. | T2: 30 ms. T3: 50 ms. Big-significance hits (§2.6): +30 ms | Every melee hit, crits, slams, heavy projectile hits |
| **Global hitstop** | The whole simulation and all animation, except the HUD | T4: 60 ms, T5: 120 ms | §1.3 events |

- Actor hitstop is cosmetic: it only holds the *animation frame*, so it never changes sim outcomes.
- Global hitstop pauses the fixed 60 Hz step in wall-clock time. It is deterministic, because no sim time passes.
- At **2× speed**, halve all hitstop and slow-mo durations.

### 2.4 Flash, squash, and knockback

- **Hit flash** (G §1.3): draw the frame in pure white with `source-atop` for 80 ms. Crits flash for 2 frames white, then 2 frames in the damage-type FX colour.
- **Squash** on hit: scale x 1.06, y 0.94 for 60 ms, anchored at the feet.
- **Knockback** (monsters only): 2 px right, recover over 120 ms with `outQuad`. Big-significance hits push 4 px.
- **Heroes never move.** They get the flash and a 1 px horizontal jitter instead.

### 2.5 Damage numbers

Numbers are the cheapest way to make a stat upgrade visible, and the easiest way to clutter the board. The rules:

| Rule | Value |
|---|---|
| Font | A pixel font with a 1 px dark outline (§12.4). Base glyph 7 px tall. |
| Colour | The damage type's **FX main** colour (G §1.4), not the darker UI colour, which disappears on grass. Mixed hits use the largest component. |
| Motion | Pop scale 0.5 → 1.3 → 1.0 over 120 ms (`outBack`), then rise 14 px over 600 ms (`outQuad`), random x ±4 px, fade in the last 200 ms. |
| Crit | 1.5× size, a trailing `!`, a 2-frame white flash, and a 4-ray star spark behind it. |
| Big hit | Damage ≥ 25% of target max life: 1.3× size; stacks with crit. |
| Aggregation | Hits from the same hero on the same target within 150 ms merge into one number that counts up. |
| DoT | Ignite, bleed, poison, and Essence Drain tick numbers show **every 0.5 s, summed**, at 0.8× size, in the ailment colour. |
| Cap | 48 live numbers. Over the cap, the oldest non-crit numbers fade early. |
| Options | All / Crits and big hits / Off. |
| Immune, evade, block | Words instead of numbers: `IMMUNE` grey, `EVADE` white (hero evading), `BLOCK` steel. |

### 2.6 Hit significance (the scaling rule)

This is the most important trick in the appendix. Every hit computes:

```js
const sig = dealt / target.maxLife;   // after mitigation, ES + life
const band = sig < 0.05 ? 'small' : sig < 0.25 ? 'medium' : 'big';
```

The band picks the impact preset:

| | Small | Medium | Big |
|---|---|---|---|
| Impact burst | 3–4 px, 3 particles | 6–8 px, 6 particles | 12–16 px, 12 particles + ring |
| Sound | Light variant, −6 dB | Medium variant | Heavy variant + low "thump" layer |
| Actor hitstop | 0 | 30 ms | 60 ms |
| Knockback | 1 px | 2 px | 4 px |
| Number | 1.0× | 1.0× | 1.3× |

**Why it matters.** Monsters scale with area level, so the same hero feels weaker as the campaign climbs. When the player equips a big upgrade, hits jump from *small* to *medium* or *big* immediately: louder, chunkier, with hitstop. The player **feels** the item before reading a tooltip. This makes the GDD's first proof point ("finding an item produces an immediate, visible change") happen with zero per-item art.

Bosses use `sig × 10`, so good hits on a boss still feel big.

### 2.7 Particles

Keep it tiny: one pooled array, no engine.

- **Pool** of 2,000 particles: `x, y, vx, vy, life, maxLife, size, color, gravity, drag, blend`.
- **Shapes**: 1–3 px squares (`fillRect`), or G's tinted dyable orbs (`orb_5x5` … `orb_10x10`) for glows.
- **Blend**: `lighter` (additive) for fire, lightning, magic, beams. Normal blend for dust, smoke, debris, blood.
- **Pixel snapping**: round positions when drawing. Never draw sub-pixel.
- **Presets** are plain objects:

```js
const PRESETS = {
  dust:     { count: 6,  speed: [20, 50],  angle: [150, 390], life: [250, 450], size: [1, 2], color: '#C8B89A', gravity: 60,  drag: 3 },
  embers:   { count: 8,  speed: [10, 40],  angle: [240, 300], life: [400, 800], size: [1, 1], color: ['#FF6A1A', '#FFD27A'], gravity: -30, blend: 'lighter' },
  frost:    { count: 8,  speed: [30, 70],  angle: [0, 360],   life: [200, 400], size: [1, 2], color: ['#7FD4FF', '#E6FAFF'], drag: 4, blend: 'lighter' },
  sparks:   { count: 6,  speed: [60, 120], angle: [0, 360],   life: [80, 180],  size: [1, 1], color: ['#FFE14D', '#FFFFFF'], drag: 6, blend: 'lighter' },
  bubbles:  { count: 4,  speed: [5, 15],   angle: [250, 290], life: [500, 900], size: [1, 2], color: '#7CFF4D', gravity: -10 },
  blood:    { count: 5,  speed: [30, 60],  angle: [200, 340], life: [300, 500], size: [1, 2], color: '#9A1B1B', gravity: 200 },
  soul:     { count: 6,  speed: [8, 20],   angle: [250, 290], life: [500, 900], size: [1, 2], color: '#3A3550', gravity: -20 },
};
```

- **Budget**: if the pool is over 80% full, presets emit half their count. Loot particles are exempt.

### 2.8 Telegraphs, rings, and ground shapes

All drawn in code (G §6 "procedural fallbacks").

- **AoE rings**: ellipse at 0.5 aspect, radius in tiles × 64 px. Expand from 30% to 100% over 120 ms (`outQuad`), 2 px stroke, fade over 200 ms.
- **Lane lines** (Lightning Conduit, Moonlit Lunge, Rust Wave): a 1-lane-tall rectangle that wipes from the source to the board edge.
- **Telegraphs** (appendix D): pulsing tile fill, `#FF8A00` for normal and `#FF2020` for unblockable, at 25% → 45% alpha, pulsing at 4 Hz and **speeding up to 8 Hz** in the last 300 ms. A thin white edge appears in the last 150 ms. That last-moment change is what players learn to react to.
- **Delayed zones** (Despair, Vulnerability, Frost Bomb): an inner ring that shrinks to the edge over the delay, PoE-style.

---

## 3. Loot drop choreography

Appendix E sets *what* drops. This section sets how a drop **feels**. It is the single highest-priority part of the prototype's presentation.

### 3.1 The drop timeline

For one item from one kill:

| t (ms) | Event |
|---|---|
| 0 | Monster's `hurt` fall reaches frame 3 (mid-fall). Loot spawns at the corpse's centre. |
| 0–350 | **Pop arc.** The item flies to a landing spot within 0.5 tiles (never into another lane's centre; clamp to the corpse's lane band). Arc height by rarity (§3.2). Currency spins (2 frames: face, edge). |
| 350 | **Land.** Two bounces (6 px, then 2 px, 80 ms each). A 4-particle dust puff. |
| 350 | **Rarity stinger** plays (§3.3). |
| 350–500 | **Beam rises** to its height (G §1.4 table) with `outBack`. The label fades in 8 px above the item. |
| hold | Beam, label, and item stay. Hold time by rarity (§3.2). |
| end of hold | **Collect flight.** The item shrinks to 50% and flies along a bezier curve to the loot ticker's top line in 400 ms (`inQuad`), leaving a rarity-coloured trail. The beam collapses downward in 120 ms. |
| arrival | The ticker line slides in with a 1-frame white flash and a soft "slot" tick. |

**Multiple drops from one kill** stagger by 70 ms each, in ascending rarity, so the best item lands **last**. That is the reveal.

**Collection is automatic** (GDD §6.2). The hold exists only so the player *sees* the drop. Nothing is clickable on the board, although hovering a label shows its tooltip.

### 3.2 Per-rarity table

Beam colours and heights come from G §1.4 and are not repeated here.

| Drop | Arc height | Hold | Particles on land | Beam extra | Tier | Stinger (§3.3) |
|---|---|---|---|---|---|---|
| Normal item | 10 px | 1.2 s | dust only | — | T1 | `drop_normal` (soft cloth/wood thud), only under "Show all" |
| Magic item | 14 px | 1.6 s | 4 blue motes | — | T2 | `drop_magic` |
| Rare item | 22 px | 2.5 s | 10 yellow motes, rising | 1 px white core | T3 | `drop_rare` |
| **Unique item** | 36 px | 4.0 s | 24 orange motes, rising for the whole hold | Pulses at 1.2 s; a ground flare ellipse 24×8 | **T5** | `drop_unique` |
| Currency, common (Transmutation, Augmentation) | 12 px | 1.4 s | 4 gold glints | — | T2 | `drop_currency_low` |
| Currency, mid (Regal, Exalted, Chaos, Alchemy, Jeweller's, Gemcutter's) | 18 px | 2.0 s | 8 gold glints | — | T3 | `drop_currency_mid` |
| Currency, top (Annulment, Divine, Vaal, the two MvM hero orbs) | 28 px | 3.0 s | 16 gold glints + 4-ray star | 160 px beam (G) | **T4** | `drop_currency_top` (Divine has its own: `drop_divine`) |
| Hero (skill gem) | 24 px | 3.0 s | 12 teal motes; the item is the hero's portrait inside a gem frame | — | **T4** | `drop_hero` |
| Player spell | 24 px | 3.0 s | 12 pale-teal motes | — | T4 | `drop_hero` + sparkle layer |
| Gold | 6–10 px per coin | 0.6 s | — | none | T1 | `coin` pitch ladder (§3.5) |

**Upgrade flair.** When a dropped item is an **Upgrade** for a roster card (the same quick DPS/EHP test as the level-end summary), add:

- a green `▲` beside the label, bobbing 1 px;
- a 2-note "rising" layer on top of the stinger;
- a +0.5 s hold.

This is cheap and enormously effective: the player learns mid-fight that *this one matters*.

**Unique drop extras** (T5):

- dim the board to 85% brightness for the whole hold (the beam and HUD stay full brightness);
- duck music −8 dB;
- a slow orange vignette pulse at the screen edge;
- the ticker line for a unique has an animated orange shimmer for 8 s.

### 3.3 Stingers

PoE players are trained by drop sounds (GDD §16). MvM copies the *idea*: each rarity has an instantly recognisable sound, and better loot sounds **deeper, longer, and richer**, rather than just louder.

Each stinger is built from 2–3 layers, so every layer can come from the open packs in §12 or ZzFX.

| Stinger | Layer 1: body | Layer 2: tone | Layer 3: tail | Length |
|---|---|---|---|---|
| `drop_normal` | Soft cloth or wood drop | — | — | 0.2 s |
| `drop_magic` | Light item drop | One bell or glass note, high (D6) | — | 0.4 s |
| `drop_rare` | Medium item drop | Two notes rising a fifth (A5 → E6), metallic | Short shimmer | 0.8 s |
| `drop_unique` | Deep boom / taiko hit | Choir or pad swell on D3 + bell on D5 | 1.5 s reverb tail | 2.0 s |
| `drop_currency_low` | Small glass clink | — | — | 0.25 s |
| `drop_currency_mid` | Glass clink | Crystal ping (pentatonic note) | — | 0.5 s |
| `drop_currency_top` | Heavy glass/crystal hit | Two-note crystal chord | Shimmer | 1.0 s |
| `drop_divine` | Heavy crystal hit | Major triad bell (D–F♯–A), bright | Long shimmer | 1.6 s |
| `drop_hero` | Gem "clack" | Three-note teal arpeggio (D–A–D, harp or kalimba) | Short whoosh | 0.9 s |

**One key.** Every tonal layer is pitched to **D major pentatonic** (D, E, F♯, A, B). Overlapping drops then form chords, not clusters. Pitch-shift samples with `playbackRate = 2 ** (semitones / 12)`.

### 3.4 Pitch ladders

Rapid repeats climb the scale instead of repeating:

- **Loot ladder**: each drop within 1.5 s of the previous one shifts the stinger's tonal layer up one pentatonic step, to at most +5 steps. It resets after 1.5 s of silence. A boss's loot fountain therefore plays a rising arpeggio that ends on the unique.
- **Coin ladder**: each coin pickup within 0.4 s of the previous one is +1 semitone, to at most +12, then wraps.
- **Mana ladder**: same as coins, on the pentatonic scale.
- **Kill ladder** (optional): kills within 0.5 s of each other step the kill "pop" layer up. Multi-kills from one AoE feel like a combo.

### 3.5 Gold

- Each kill's gold splits into 3–8 coins (more for magic and rare monsters), using G's spinning coin.
- Coins spray in a fan (`dust` physics with gravity 300), bounce once, then after 0.6 s **magnetise** to the gold counter in the bottom bar (`inBack`, 350 ms, staggered 30 ms).
- Each arrival plays `coin` on the coin ladder, and the counter ticks up by that coin's share.
- **Rare kills** add a coin *shower*: 15 coins and a `coin_pile` layer.

### 3.6 Mana orbs (PvZ sun)

| Phase | Behaviour |
|---|---|
| **Sky orb** spawn | Fades in at a random x above the board, then falls at 40 px/s with a ±6 px sine sway (period 1.6 s). Lands on a random tile (PvZ). |
| **Acolyte orb** spawn | 0.8 s before it drops, the acolyte's crook tip glows (a growing cyan dyable orb, `outQuad`) and plays a soft rising "charge". The orb then pops out with a 20 px arc. This anticipation tells the player the economy is working. |
| Idle | 10 × 10 cyan orb, additive glow, pulsing 0.9–1.1 scale at 1.5 Hz. 4 sparkle particles per second. |
| **Collect** | Auto-collect after **0.5 s** on the ground. It flies to the mana counter along a bezier curve in 450 ms (`inBack`). |
| Arrival | The counter's number rolls up over 200 ms, and the counter bumps (scale 1.2 → 1.0, `outElastic`). Plays `mana_collect` on the mana ladder. |
| **Big orbs** | Spirit-boosted orbs (value > 25) are drawn larger: +1 px per +10 mana, up to 16 px. Better Spirit gear is visible on the board. |

### 3.7 Loot filter: hidden drops

Hidden items still drop quietly (E §3.5):

- no beam, no label, no stinger;
- a 3-particle grey puff and a muted `coin` tick, because they become gold or shards at level end.

### 3.8 Strongbox

1. **Idle**: the chest (G §5.4) with a gold glow column at 30% alpha and dust motes.
2. **Trigger**: when a hero is placed next to it, the lid rattles (±1 px, 3 times, 300 ms) with a lock-rattle sound. Then a "Strongbox ambush!" banner and a low brass hit (T4).
3. **Ambush**: monsters spawn from the chest with dust bursts.
4. **Open**: when the ambush wave is cleared, play the chest's opening → open frames, a light burst from the lid (radial rays drawn in code, 400 ms), and a **loot fountain** (§3.9).

### 3.9 Loot fountains (boss and Strongbox)

Big loot bursts are staged like a reveal, not dumped:

- Items launch one at a time, 120 ms apart, in **ascending rarity**: gold, normal, magic, currency, rare, hero.
- Arcs are higher (30–50 px) and spread across ±1.5 tiles.
- The **guaranteed unique** waits for 600 ms after the last item, with a rising drum roll (or a rising ZzFX sweep). It then launches highest of all (60 px) with the T5 package.
- The loot ladder (§3.4) makes the whole fountain a rising arpeggio.

### 3.10 Level-end summary

- The panel slides up (`outBack`). Drops reveal as **cards flipping** left to right in ascending rarity, 80 ms apart, each with a quiet version of its stinger (−9 dB).
- Upgrades get a green **UPGRADE** stamp that slams on (scale 1.6 → 1.0 in 100 ms) with a stamp "thunk".
- XP bars fill with a ticking sound. A hero level-up plays `level_up` and a 12-particle teal burst on that hero's card.
- First-clear rewards reveal last, with the T4 package.

---

## 4. Item design

### 4.1 Item card anatomy

Every item (stash, vendor, level-end, ticker tooltip) uses one card:

| Part | Rule |
|---|---|
| **Icon** | The base-class icon from G §7.1 at 2×, centred. |
| **Frame** | By rarity. Normal: 1 px `#C8C8C8`. Magic: 1 px `#8888FF`. Rare: 2 px `#FFFF77` double line. Unique: 2 px `#AF6025` with corner ornaments and a slow glow (alpha 0.6–1.0, 2 s period). |
| **Element badge** | A 6×6 corner gem, drawn in code, in the FX colour of the item's **dominant added damage type** (weapons) or **highest resistance** (armour, jewellery). Absent on items with neither. |
| **Upgrade arrow** | A green `▲` in the top-right corner when it's an upgrade for a roster card. |
| **Corrupted** | A red frame inner line and the word "Corrupted" in the tooltip (PoE convention). |
| **Item level** | Small grey number, bottom-left. |

### 4.2 Uniques

G gives uniques no per-unique art. To make each one feel special anyway:

- **Palette shift** the base icon in code. Give each unique a hue rotation or a two-colour ramp swap chosen from its theme, for example Mist Whisper toward cold blue, The Blood Thorn toward deep red, and Brain Rattler toward lightning yellow.
- **Signature particle** on the card: 1–2 particles per second of its theme (frost, embers, sparks, blood).
- **Signature on the board**: a hero wielding a unique gets a faint unique-orange glint on the weapon hand every 2 s (a 2-frame 3-px star). This is the only time gear is visible on a hero sprite (G §1.4 keeps gear off sprites).

### 4.3 Currency orbs (programmatic, supersedes G §7.2)

G maps currency to DCSS-style vials, chalices, and glyphs. PoE players read currency as **orbs with distinct colours and glyphs**, so MvM draws its own orb icons in code. The G mapping stays as a fallback.

**Recipe** (32×32, generated once at load or by an offline script):

1. A 24 px disc with 4-step cel shading (dark rim, base, light, 3 px specular highlight at top-left).
2. An **inner glyph**, 8–12 px, in a contrasting colour.
3. An optional **halo** or rim feature for the top tier.
4. 1 px dark outline.

| Currency | Base colour | Glyph / feature | Silhouette note |
|---|---|---|---|
| Orb of Transmutation | Blue `#4A7BD8` | White swirl | Plain disc |
| Orb of Augmentation | Blue `#4A7BD8` | White `+` | Plain disc |
| Regal Orb | Royal blue `#2A3FA0` | Gold crown | Gold rim |
| Exalted Orb | Silver `#D8D8E8` | Gold wings / rays | Gold rim, 3 rays outside the disc |
| Chaos Orb | Gold `#D9A53A` | Red spiral | Slightly irregular edge |
| Orb of Alchemy | Gold `#E8C15A` | Bubbling liquid line | Plain disc |
| Orb of Annulment | Dark grey `#3A3A48` | Hollow ring (a hole) | Plain disc |
| Divine Orb | Gold-white `#FFF2C0` | Radiant star | Soft gold halo, 4 rays |
| Vaal Orb | Crimson `#A01818` | Black eye | Dark red smoke wisp |
| Lesser / Greater / Perfect Jeweller's Orb | Teal `#1BA29B` | 1 / 2 / 3 socket dots | Size steps: 20 / 24 / 28 px |
| Gemcutter's Prism | Clear `#C8F0FF` | Faceted triangle | A **prism**, not a disc |
| Orb of Realignment (MvM) | Teal | Circular arrows | Plain disc |
| Orb of Transference (MvM) | Teal | Two dots linked by an arc | Plain disc |
| Shards | Parent colour | Parent glyph | A jagged **shard**, not a disc |

**On the board**, currency drops use the same icon at 1× with a spin (scale x sine), so a Divine *looks* like a Divine in flight.

### 4.4 Tooltips

PoE2 conventions (GDD §15), plus juice:

- Opening: 80 ms fade + 4 px rise.
- Header colour by rarity; separators are 1 px lines with a centre diamond.
- **Alt** shows tiers. A **T1 roll** line gets a subtle gold shimmer sweep, because PoE players hunt for these.
- **Comparison** (hover while a roster card is selected): green `+` and red `−` deltas for "DPS on this card" and EHP, counting up over 200 ms.

### 4.5 Equip feedback (hideout)

- Dragging an item lifts it (scale 1.1, shadow 4 px) and highlights valid roster slots with a pulsing outline.
- Dropping it: the slot "clicks" (scale 0.9 → 1.0, `outBack`), and an item-class sound plays: metal clank (weapons, armour), leather creak (Dex armour), cloth (Int armour), ring chime (jewellery).
- **The card reacts**: the hero portrait flashes white for 2 frames, and the DPS and EHP numbers roll to their new values with green or red floating deltas. If the hero's dominant damage type changed, the portrait gets a 400 ms burst in the new element's colour.

---

## 5. Heroes

### 5.1 Card anatomy (roster bar and hideout)

| Part | Rule |
|---|---|
| Portrait | The baked hero frame, cropped to head and torso (G §1.5). |
| Frame | Rarity colour (normal, magic, rare), as G §1.4 requires. |
| **Support sockets** | A row of 0–5 small gem dots under the portrait, coloured by the support's attribute as PoE gems are: Str red `#C83030`, Dex green `#30B040`, Int blue `#3060D0`. Empty Jeweller's slots are hollow. The card shows build depth at a glance. |
| Level | Badge, bottom-left. |
| Cost | Mana cost, top-right, in white. Turns red when unaffordable. |
| Element strip | A 2 px bar along the card's bottom edge, split by the hero's damage mix after conversion. |

### 5.2 On-board life cycle

| Moment | Feedback |
|---|---|
| **Card ready** | The recharge wedge finishes, and a white shine sweeps diagonally across the card (150 ms). Soft `card_ready` tick. |
| **Card picked** | The card lifts 4 px. A 50%-alpha ghost of the hero snaps to the hovered cell. Valid cells get a soft highlight. Invalid cells tint the ghost red. |
| **Range preview** | While hovering, draw the hero's reach in code: a lane line for projectiles, its AoE ellipse, its aura radius, or its melee tiles. This is free readability and teaches every skill's shape. |
| **Placed** | The sprite drops in from −24 px in 150 ms (`inQuad`). On landing: squash (x 1.15, y 0.85 → 1.0 over 120 ms), a `dust` burst, `place_thunk`, and `mana_spend` (a quick downward whoosh). T2. |
| **Unaffordable** | The card shakes ±3 px three times over 200 ms; the mana counter flashes red; `ui_deny` buzz. |
| **Idle** | G's 1 px bob every 600 ms. Desynchronise each hero with a random phase so a full board doesn't bob in unison. |
| **Attack anticipation** | Play the attack row up to the release frame (G §3.1), and pause 1–2 frames on the frame **before** release. That held "wind-up" makes the release feel strong. |
| **Release** | The projectile or impact spawns exactly on G's release frame, with a 2-particle muzzle puff in the element colour. |
| **Hit taken** | Flash, 1 px jitter, and a hero-hurt grunt (rate-limited to one per hero per 0.5 s). The health bar appears and lingers for 2 s. |
| **Low life** (< 30%) | The health bar pulses red. |
| **Death** | G's `hurt` fall, then a 400 ms fade, a puff of 8 white motes rising, and a two-note *falling* sting (A → E). The tile flashes dark for 300 ms. T3. |
| **Shovelled** | The sprite sinks 8 px into the ground and fades over 200 ms, with a dirt puff and a shovel "chunk". |

### 5.3 VFX follow the stat block

Pillar 1 says every upgrade must show on the board. Heroes are fixed sprites, so the **effects** carry the change. Compute a small `vfx` profile from the hero's final stat block whenever its loadout changes:

```js
function vfxProfile(hero) {
  const mix = hero.damageMix();           // after conversion and gained-as-extra, e.g. { lightning: 0.7, fire: 0.3 }
  const [main, second] = topTwo(mix);
  return {
    color: FX[main].main, core: FX[main].core,   // G §1.4 FX colours
    trail: second ? FX[second].main : null,      // secondary element shows as trail particles
    trailLength: 6 + hero.projectileSpeedInc * 8,
    ringScale: hero.areaMultiplier,              // AoE rings drawn at their real size
    critSpark: hero.critChance > 0.2,
  };
}
```

**Support families and their visible signature**

The sim already changes behaviour (pierce, fork, chain). The table makes sure the player **sees** each one.

| Support family (B §5.2) | Visible signature |
|---|---|
| Added / converted element | Projectile, impact, and muzzle puff recolour to the dominant element. The second element becomes trail particles. |
| Gained as extra | A thin secondary-colour outline on the projectile. |
| Pierce | A longer, brighter streak; a "pass-through" spark and a light `whip` sound on each pierced monster. |
| Fork | A Y-shaped flash at the split point. |
| Chain | A jagged polyline between targets in the element colour (G §6), even for non-lightning chains. |
| Additional projectiles | Visible fan into adjacent lanes (the sim does this); each extra projectile 1 frame later than the last for a "volley" read. |
| Faster / slower projectiles | Trail length scales with speed. |
| Increased area | Rings drawn at real size, so bigger areas look bigger. |
| Concentrated effect | Smaller ring, brighter core, a heavier impact sound layer. |
| Ailment chance / effect | Impact particles in the ailment colour; more frequent ailment overlays (§8). |
| Crit chance / damage | Star sparks on crits; a `crit` sound layer (a high "ting"). |
| Stun buildup | Heavier dust on impact, and a low "thump" sound layer. |
| Cost multiplier | Shown only on the card's mana cost. |

### 5.4 Role feel

| Role | Feel target | Key tricks |
|---|---|---|
| **Acolyte** | Gentle, reliable, rewarding | Pre-glow before each orb (§3.6). A soft chime, never a combat sound. |
| **Wall** | Heavy, immovable | Every block plays a shield `clank` (rate-limited) and a 1 px shield-side spark. Taking hits never moves the sprite. |
| **Striker** | Punchy | Longest actor hitstop (big band +30 ms). Slams get a ground ring, dust, and T3 shake on big-significance hits only. |
| **Ranged** | Rhythmic | Consistent fire cadence; muzzle puff; the shot sound is short and tight so it can repeat. |
| **Caster** | Bright, magical | Hand glow during the cast frames; elemental particles at the staff or wand tip; airy whoosh on release. |
| **Curse / Mark** | Sinister, readable | The delayed zone (§2.8) with a low rising tone; on erupt, a dark purple sigil flash over each cursed monster and a whisper layer. |
| **Aura** | Ever-present but quiet | Global: a slow halo ring under the hero (G §3.5) plus a 0.5 Hz shimmer on every buffed hero's feet. Positional: the ground ellipse. On place, a "power up" swell. |

---

## 6. Skill VFX and SFX catalogue

Asset short names refer to G §6 (FX sheets) and §12 (sounds). "Code" means drawn procedurally (§11). Colours follow §5.3: the tables show the **default** element, and the profile recolours them.

### 6.1 Heroes

| # | Hero | Wind-up / release | Projectile or shape | Impact | Sound layers |
|---|---|---|---|---|---|
| H01 | Ezomyte Acolyte | Crook glow 0.8 s | Mana orb pop (§3.6) | — | `mana_charge`, `mana_pop` |
| H02 | Twin Votaries | Crook glow | Two orbs, 100 ms apart, mirrored arcs | — | Same, second one +2 steps |
| H03 | Shrinewarden | Crook glow, slower | One larger orb | — | Same, lower octave |
| H04 | Shield Wall | Shield raise | Earth segment rises from the ground: dust + `rock_spikes` frames, 200 ms | On break: lane-line explosion over 4 tiles, rock debris, T3 | `earth_rise`, `rock_break`, `explosion_low` |
| H05 | Armour Breaker | Mace wind-up hold | Melee | Grey shard burst; on **Fully Broken**, armour plates "fall off" (6 grey 2×3 debris with gravity) and a "BROKEN" pip | `hit_metal_heavy`, `armour_break` |
| H06 | Boneshatter | Hammer raise hold | Melee | On shockwave: a 1.67-tile ring, bone-white sparks, T3 | `hit_blunt_heavy`, `bone_crunch`, `shockwave` |
| H07 | Rolling Slam | Overhead hold | Two slams 1 and 2 tiles ahead | `quake` frames (tinted) at each slam; second slam bigger | `slam`, `slam` (−2 semitones) |
| H08 | Sunder | Overhead hold | Five sequential ground ruptures, 0.1 s apart, growing | Rock spikes per step; shockwave rings on hit monsters | `slam` + five `rock_crack`s on a rising ladder |
| H09 | Ice Strike | Staff thrust | Melee combo | Strikes 1–2: small frost burst. **Final Strike**: frost burst 2 tiles ahead + `icetacle` frames, T3 | `swing_light` ×2, `ice_crack_heavy` |
| H10 | Falling Thunder | Staff overhead | Cone slam | `lightning1` bolt from the sky onto the cone; on every 3rd slam, 3 bright piercing sparks fan out | `thunder_crack`, `zap` ×3 |
| H11 | Fangs of Frost | Spear jab | Melee | Frost burst; on Off Balance, a blue "!" over the monster | `stab`, `ice_crack` |
| H12 | Lightning Arrow | Bow draw hold | Arrow (G) with yellow head + trail | On hit: code chain beams to extra targets, 120 ms | `bow_release`, `zap` per beam |
| H13 | Ice Shot | Bow draw hold | Pale-blue arrow | Shard cone: 6–10 small code shards, split across 3 lanes | `bow_release`, `ice_shatter_small` |
| H14 | Rain of Arrows | Bow raised high | Arrows fall from above the zone, one per 0.08 s; a faint zone ellipse | Tiny dust per impact | `bow_release`, then a looping `arrow_rain` patter while the zone lasts |
| H15 | Poisonburst Arrow | Bow draw | Arrow with green tint | Poison cloud: 12 `bubbles` + green ring | `bow_release`, `poison_burst` |
| H16 | Lightning Spear | Spear throw | Spear (G) with a yellow trail | 5 bolts fork from the target to others (code polylines) | `throw_heavy`, `thunder_small`, `zap` ×5 (ladder) |
| H17 | Explosive Spear | Spear throw | Spear pierces, then **lodges**: it sticks in the ground, wobbling, with a flashing red fuse glow speeding up over 2.5 s | `bomb_explosion` frames, 2.33-tile ring, scorch decal, T3 | `throw_heavy`, `fuse_tick` (speeding up), `explosion` |
| H18 | Armour Piercing Rounds | Crossbow brace | Code bolts, rapid; a clip counter of tiny pips over the head | Small grey sparks; armour-break flicker | `crossbow_fire` (short, many variants), `reload` at clip end |
| H19 | Permafrost Bolts | Crossbow brace | 10 code fragments in a tight spread | Fragment shatter cone of frost shards | `crossbow_heavy`, `ice_shatter` |
| H20 | Fireball | Wand flick | `firelion` or red orb with ember trail | `bomb_explosion` at 1.42-tile radius, scorch decal | `fire_whoosh`, `fire_explode` |
| H21 | Flame Wall | Staff point | A column of `Fire, Camp` flames rising tile by tile (60 ms per tile) | Projectiles passing through glow orange for the rest of their flight (Torchwood) | `fire_ignite`, quiet `fire_loop` per wall (max 2 voices), `fire_pass` when a projectile is buffed |
| H22 | Frostbolt | Wand flick | Slow, large cold orb with a frosty trail; pierces everything | Explosion at terrain or edge: `icetacle`, 2-tile ring | `ice_cast`, `ice_hum` (while flying), `ice_explode` |
| H23 | Ice Nova | Staff spellcast | Expanding frost ring, 2.67 tiles, in 200 ms; from a Frostbolt when combined | Frost burst on each hit | `ice_nova` (a breathy whoosh with crystal tail) |
| H24 | Spark | Wand flick | Small erratic sparks that jitter ±2 px vertically as they travel | Tiny zap burst | `spark_cast` (crackle), `zap_small` |
| H25 | Essence Drain | Wand flick | Purple wisp projectile | Purple smoke on the target for 4 s; a faint purple line back to the hero (a "drain" thread) | `chaos_cast` (whisper), `drain_loop` (quiet) |
| H26 | Despair | Staff raise | Delayed curse zone with a shrinking ring (§2.8) | Purple sigil above each cursed monster | `curse_charge`, `curse_erupt` |
| H27 | Vulnerability | Staff raise | Same, in dark red | Red cracked-shield sigil above each cursed monster | Same, lower pitch |
| H28 | Freezing Mark | Bow aim | Ice crosshair mark that spins slowly above the target | On consume: frost burst + blue flash on all heroes in the 3×3 | `mark_apply`, `mark_consume`, `buff_up` |
| H29 | Herald of Ice | Halo ring | Global halo | **Shatter**: a frozen corpse bursts into 12 ice shards + 1.33-tile ring, T3 | `ice_shatter_big` |
| H30 | Purity of Fire | Halo ring | Global halo; every hero gets a faint warm rim on hit | — | `aura_on` |
| H31 | War Banner | Spellcast | Banner prop planted (G §3.5): drops from above and wobbles; charge shown by a filling ring | Gold motes on all buffed heroes | `banner_plant` (a thunk + cloth flap), `war_horn` (short) |
| H32 | Malice | Spellcast | Dark presence ellipse | Tiny purple crack marks stacking on monsters (1 per 4 stacks) | `aura_on` (dark) |

### 6.2 Spells (the "Cherry Bomb" slot)

Spells are rare, expensive, and player-triggered. **Each one gets the T3–T4 package** and a bespoke moment.

| # | Spell | Targeting preview | Cast | Impact | Sound |
|---|---|---|---|---|---|
| S1 | Frost Bomb | 3×3 tile highlight | An orb drops onto the tile and pulses every 0.5 s with a growing ring | At 4 s: `icetacle` across the 3×3, frost decals, T4 | `ice_cast`, `pulse` ×8 (rising ladder), `ice_explode_big` |
| S2 | Earthquake | Full-column highlight | Ground cracks across the column | `quake` frames per tile, Jagged Ground decal; aftershock at expiry repeats at 70% size | `earthquake_rumble`, `slam_big`, `aftershock` |
| S3 | Explosive Grenade | 3×3 highlight | Grenade arcs in, bounces, rolls 1 tile, fuse sparks | `bomb_explosion` ×3 staggered, scorch, T4 | `throw`, `bounce`, `fuse`, `explosion_big` |
| S4 | Volcanic Fissure | Lane line + branches | A glowing crack races to the edge (25 ms per tile) | Lava glow along the fissure for 12 s; **Aftershock** from a hero slam lights the whole fissure white then orange | `rock_crack_long`, `lava_loop` (quiet), `aftershock_fire` |
| S5 | Comet | 3×3 highlight + a shadow that grows on the tile | A cold comet streaks in from the top right over 0.55 s | `icetacle` + white flash + big frost ring, T4 | `comet_incoming` (a rising whistle timed to 0.55 s), `ice_explode_big` |
| S6 | Firestorm | 3×4 rectangle | Fire bolts rain at random points, one per 0.2 s | Small explosions and scorch decals | `fire_storm_loop` + `fire_impact_small` (ladder off; too many) |
| S7 | Hexblast | 3×3 highlight | Purple sigil spins on the tile | Main blast, then each cursed monster detonates in a chain, 60 ms apart | `chaos_blast`, `curse_detonate` ×N (rising ladder) |
| S8 | Lightning Conduit | Full lane | A lightning bolt runs the full lane in 80 ms (code polyline, 3 strands) | White flash on every monster hit; extra bolts on Shocked targets | `thunder_big`, `zap` per extra bolt |

**Spell-card feedback**: the card's teal frame glows when the spell is off cooldown and affordable. Dragging it shows the grid shape in teal at 35% alpha.

---

## 7. Monsters and bosses

### 7.1 Monster feedback per archetype

Archetypes and sprites follow D §2 and G §4. Sound is the main addition: **hit sounds are material-aware**, so the player hears whether their damage type works.

| Archetype | Hit material | Spawn / vocal (rate-limited) | Death | Notes |
|---|---|---|---|---|
| Shambler | Flesh | Groan | Groan + body fall | Blood decal on death |
| Helmed Skeleton | Bone | Rattle | Bone clatter | On helm break: helm flies off (code debris) + metal ping |
| Plated Skeleton | **Metal** (physical hits); bone (elemental hits) | Armour clank | Clatter + metal fall | **Clank on a physical hit tells the player armour is eating it.** Plating break: plates fly off, sprite swaps (G). |
| Shield Skeleton | Metal on the shield, bone otherwise | Rattle | Clatter | Hits on the shield spark and play `shield_block`. Shield break: wood/metal splinter burst. |
| Ghoul Runner | Flesh | Snarl | Yelp | Dust kicked up behind it while running |
| Goblin Leaper | Flesh | Cackle | Squeal | Leap: a whoosh on take-off and dust on landing |
| Goblin Archer | Flesh | Cackle | Squeal | Its arrow uses the same arrow art, tinted dark |
| Bat | Flesh (soft) | Screech | Squeak | Flaps quietly; shadow on the lane |
| Burrowing Beetle | **Chitin** | Clicks | Crunch | Tunnelling rumble while underground (a ground ripple, G) |
| Orc Shaman | Flesh | Chant | Groan | Heal pulse: a green ring + `heal` sound |
| Rot Slime | **Slime** | Gurgle | Splat | **Split**: a 3-particle goo burst and a `squelch` as the children pop out |
| Minotaur Brute | Flesh (heavy) | Bellow | Heavy fall + T3 thud | **Footsteps** cause a 1 px directional kick; the only walker with audible steps |
| Rat Swarm | Flesh (soft) | Squeaks | Squeak | One vocal per swarm, not per rat |

**Monster rarity extras** (on top of G's outlines):

- **Magic** spawn: a soft blue shimmer.
- **Rare** spawn: a `rare_spawn` low brass hit (T3) and the name plate typing in.
- **Elemental affixes** ("of the Inferno", cold, lightning, and so on): the monster emits 1 particle every 300 ms in that element's colour. Players learn to read threats.
- **Ground-effect affixes**: their trail decals use the same art as player ground effects, at a hostile tint.
- **Hexproof / immune** affixes: a small grey shield icon on the name plate.

### 7.2 Kills

- The `hurt` fall (G) plays on death. On its last frame, a `soul` puff rises (6 particles), and the corpse fades over 400 ms.
- **Overkill** (damage dealt > 50% of max life over what was needed): a white flash on the fall's first frame and twice the death particles.
- **Frozen kill**: the body shatters into ice shards instead of falling (Herald of Ice or not).
- The kill sound is the family's death vocal + a generic short "pop" layer (T2). The pop is on the kill ladder (§3.4).

### 7.3 Leaks and the life pool

- When a monster reaches the gate: a fountain splash (G §5.5), a red edge vignette pulse (200 ms), and a heart icon that **cracks and pops** with 4 red shard particles. T3.
- A magic leak costs 3 and pops 1.5 hearts in sequence; a rare costs 10 and plays a lower, longer sting.
- **Low life** (≤ 6): a faint heartbeat loop on the ui bus and a slow red vignette breathing at 20% alpha. The fountain water is already tinted red (G).

### 7.4 Waves

| Event | Feedback |
|---|---|
| First wave | "The Monsters are coming…" text and a low drum. |
| **Flag wave warning** (7.5 s ahead, D §5.1) | "A huge wave of Monsters approaches!" banner slides in from the right in red-orange, a war horn, and the music's intensity layer fades in (§10.4). T4. |
| Final wave | "FINAL WAVE" in red, a double drum hit. |
| Level won | The last monster's death gets T5: hitstop, slow-mo, a white flash, and the victory fanfare. Then the summary. |
| Level lost | The board desaturates over 1 s, music stops with a tape-stop effect (pitch slides down 400 ms), and a defeat sting plays. Reassure the player: "Loot kept" appears in gold. |

### 7.5 Bosses

| Moment | Feedback |
|---|---|
| **Intro** | Music cuts. A low rumble rises for 1.5 s. A PoE-style **name card** (unique orange name, a subtitle line) slides in from the right. The boss enters with footstep kicks (trauma 0.15 per step at 2×, 0.3 at 5×). Then the boss music starts. |
| Telegraphs | Tile telegraphs (§2.8) with a rising whoosh timed to end exactly at impact. Unblockable telegraphs add a high "ting" when they start. |
| Ability impact | T3–T4 by ability, with dust or element particles. |
| **Primed for stun** | The heavy-stun bar flashes white and plays a tense high string note. |
| **Heavy stun** | A big crack (glass + metal), "HEAVY STUN" text, T4, the boss desaturates and its animation stops for 3 s, and the music's high layer drops out. This is the burst window, so it must feel like an opening. |
| Phase change | White flash, a smoke burst (code), the sprite swap, and a roar. T4. |
| **Death** | T5 (with the longest slow-mo: 0.25× for 1.2 s), a white flash fade, the scaled `hurt` fall, a big dust ring, then the **loot fountain** (§3.9). |

Per boss:

- **Bloated Miller**: Grain Slam throws a burst of tan "grain" particles. Rotting Brood: the ground bulges (squash on a dirt decal) before the Shamblers pop out.
- **Rust King**: a rust tint (G). Rust Wave is a rolling orange-brown lane wave with metal debris; hero armour breaking plays `armour_break` on every hero hit.
- **Lachlann**: Lament spreads frost decals with a mournful vocal pad. Mournful Shift fades to 30% alpha with a blue afterimage trail and a reverse-cymbal swell.
- **Count Geonor**: phase 1 frost breath is a cone of `frost` particles; Moonlit Lunge has a silver lane flash. Phase 2's werewolf transformation is a T5 moment without slow-mo (it's mid-fight), plus a howl that also triggers the Howl debuff's red tint on all monsters.

---

## 8. Ailments

Visual overlays are in G §1.4. This adds timing and sound, and the rules that keep 40 burning monsters from becoming noise.

| Ailment | Apply | While active | End / payoff | Sound |
|---|---|---|---|---|
| Ignite | Orange flash | Flame particles (2/s) + flicker | — | `ignite` on apply; one shared quiet `burn_loop` whose volume scales with the number of ignited monsters (max −12 dB) |
| Chill | Blue tint fades in over 100 ms | 35% cyan multiply; animation 30% slower | Tint fades out | `chill` (soft crystal) |
| **Freeze** | Ice burst + the sprite snaps to a pale-blue frame | Animation stops; 1 frost particle per 300 ms | **Thaw**: 4 drip particles. **Shatter** on kill (§7.2). | `freeze` (ice lock), `shatter` |
| Shock | Yellow flash | Yellow flicker + sparks (1 per 400 ms) | — | `shock` (zap) |
| Electrocute | Lightning crawl (code polyline over the sprite) | Animation stops | — | `electrocute` (buzzing loop, max 2 voices) |
| Poison | Green puff | Bubbles (1 per 300 ms). Stacks: +1 bubble per extra stack, to 4 | — | `poison` (bubble) |
| Bleed | Red spurt | Drips (1 per 400 ms); **faster drips while walking** (bleed is doubled while monsters move, A §6.1) | — | `bleed` (squelch) |
| Armour Break | Grey shard burst | "Broken" pip | — | `armour_break` (metal crack) |
| Heavy stun (monsters) | Big dust ring | Desaturate + "STUNNED" | — | `stun_heavy` |

**Rules**

- Apply sounds use **one voice per ailment type per 80 ms**, board-wide.
- Looping sounds (burn, electrocute) are **one shared voice**, with volume driven by count, never one per monster.
- Overlays draw in a fixed priority when several apply: Freeze > Electrocute > Shock > Chill > Ignite > Poison > Bleed. Only the top tint shows; particles from all active ailments still emit (at half rate when three or more are active).

---

## 9. HUD, UI, and hideout juice

### 9.1 In level

| Element | Feedback |
|---|---|
| **Mana counter** | Rolls to its new value over 200 ms. Bumps on gain (§3.6). Flashes red and plays `ui_deny` when a placement fails. |
| Roster card | Ready shine (§5.2). Hover: lift 2 px and a soft `ui_hover`. |
| Shovel | Cursor becomes the shovel; hovered heroes tint red. |
| 1×/2× toggle | A click and a short tape-speed "whoop" up or down. Music does **not** speed up. |
| **Loot ticker** | New lines push in from the right; older lines slide down with `outQuad`. Unique lines shimmer. Hover shows the tooltip. |
| Wave progress | The marker crawls smoothly. Flags pulse as they approach. The boss skull shakes slightly when the boss is next. |
| Gold counter | Rolls up per coin (§3.5). |
| Hearts | Crack and pop (§7.3). |

### 9.2 Crafting

Crafting is half the game's hypothesis (GDD §10). Every orb gets a **reveal**, and crafting reuses the **drop stingers**, so crafting a rare *sounds like* finding one.

**Shared flow**

1. Pick up an orb: the cursor holds its icon; valid targets pulse; invalid targets dim.
2. Drop it: the orb "slams" into the item (scale 1.3 → 0, 100 ms), the item flashes white, and there is a 120 ms pause before the result. The pause is the suspense.
3. Result, by orb:

| Orb | Reveal | Sound |
|---|---|---|
| Transmutation, Alchemy, Regal (rarity up) | The frame colour **sweeps** to the new rarity from the drop point, with a rarity-coloured particle burst. New mod lines **type in** top to bottom, 60 ms per line, each with a text-scramble effect (random glyphs settling into the real text). | The **drop stinger** of the new rarity (`drop_magic` or `drop_rare`) |
| Augmentation, Exalted (add a mod) | The new line slides in and stays highlighted for 1 s. | Crystal ping (`drop_currency_mid` tonal layer) |
| Chaos | Every mod line scrambles like a slot machine for 400 ms, then they lock in top to bottom with ticks. | Rattle loop, then ticks, then `drop_rare` |
| Annulment | One line shatters into glyph fragments that fall with gravity. | Glass shatter |
| Divine | The numeric values roll like an odometer for 500 ms, then lock. Values that went up flash green; down flash red; show the delta. | Odometer ticks, then `drop_divine` if the average roll improved, a dull thud if it got worse |
| **Vaal** | The screen dims to 70%, red smoke curls around the item, a heartbeat plays for 600 ms, then the outcome reveals. | Good outcome: a dark choir hit. Brick: a dissonant boom and the item cracks. Either way, the "Corrupted" line burns in, red. |
| Jeweller's (hero) | A new socket **opens** on the hero card: the hollow dot appears with a gem-click and a teal burst. | `drop_hero` |
| Gemcutter's Prism | The hero card's quality number rolls up; a prism-light sweep. | Crystal ping |
| Orb of Realignment | The chosen support socket spins (cycling colours) then settles. | Rattle, then a gem-click |
| Orb of Transference | A teal beam arcs from the source hero card to the target, carrying socket dots one by one. | Rising whoosh per support, then `drop_hero` |

**Jackpot moments.** Any craft that lands a **T1 mod** adds a gold "T1!" stamp and a short fanfare layer (T4). A Divine that rolls a mod to its maximum adds "PERFECT" (T5). These are rare and should feel like a unique drop.

### 9.3 Other hideout screens

| Screen | Feedback |
|---|---|
| Passive tree | Allocating a node pops it (scale 1.4 → 1.0), and light travels along the connecting line from its allocated neighbour in 200 ms. Pitch by node size: small (high), notable (mid, with a chord), keystone (low, T4 with a screen flash). Refunds play the sound reversed. |
| Armorer, Recruiter | Buy: a coin pour and the item card flies into the stash tab. Sell: a coin clink per 100 gold, on the coin ladder. |
| **Gamble** | The hidden card shakes, then **flips** to reveal, with the rarity stinger. Rares and better get the full drop package (beam on the card, particles). |
| Campaign map | Selecting a node: a parchment rustle; the path to it draws with a dotted line. First-clear rewards on the card sparkle. |
| Level-up (player) | Teal burst at the level badge; `level_up` jingle; the passive-point counter bumps. |

---

## 10. Audio direction

### 10.1 Palette

- **Grounded fantasy, slightly heavy.** Sampled impacts and foley for combat; clean bells, crystal, and pads for loot; small clicks for UI.
- **Loot owns the high end.** Combat sounds are filtered to keep 3–8 kHz relatively clear, so a chime always cuts through a fight.
- **No voiced dialogue.** The only vocals are monster grunts and the boss name card's roar.

### 10.2 Buses and mix

Use one `AudioContext` with four gain buses into a master compressor.

| Bus | Default | Ducked by | Notes |
|---|---|---|---|
| `music` | −14 dB | T4 (−4 dB, 1 s), T5 (−8 dB, 2 s), boss intro (cut) | Crossfades between layers (§10.4) |
| `sfx` | −6 dB | T5 (−6 dB, 1 s) | Combat, monsters, ailments |
| `loot` | −3 dB | **never** | Stingers, coins, mana. Never culled by voice limits beyond its own cap. |
| `ui` | −8 dB | — | Clicks, cards, crafting, banners |

- Master: a `DynamicsCompressorNode` (threshold −12 dB, ratio 4) to stop 40 simultaneous hits from clipping.
- Options: master and per-bus volume sliders, saved in `localStorage`.

### 10.3 Voice management

| Rule | Value |
|---|---|
| Pitch variation | ±6% random on every combat sound; ±2% on loot (keeps the key) |
| Volume variation | ±2 dB |
| Round-robin | 3–5 variants per common sound (hits, shots, deaths); never the same variant twice in a row |
| Per-sound voice cap | Hits 6, shots 6, monster vocals 3, deaths 4, ailment applies 2, loops 1–2, stingers 6 |
| Retrigger guard | The same sound id can't start twice within 30 ms (a second request raises the playing one's volume by 1 dB instead) |
| Global cap | 32 voices. Over the cap, drop the lowest priority: ambience < monster vocals < hits < shots < spells < ui < loot |
| Stereo | Pan by board x: `pan = (x / boardWidth) × 0.6 − 0.3`. Subtle, but it helps the player locate leaks (left) and spawns (right). |
| 2× speed | Don't pitch-shift sounds. Shorten retrigger guards by half. |
| Unlock | Browsers block audio until a user gesture. Resume the context on the title screen's first click. |

A thin wrapper around Web Audio (~150 lines) is enough. Howler.js (MIT) is an acceptable shortcut if it saves time.

### 10.4 Music

| Context | Style | Behaviour |
|---|---|---|
| Title / focus select | Warm, heroic, slow | Loop |
| Hideout | Calm, homely; this is where players theory-craft for 2 minutes at a time | Loop. It must not be fatiguing: prefer a long (2–4 min) track. |
| Grassland (1–5) | Light, pastoral, adventurous | Two layers: **base** and **intensity** |
| Bog (6–10) | Murky, plodding | Two layers |
| Desert ruins (11–15) | Exotic, percussive | Two layers |
| Winter keep (16–20) | Cold, choral | Two layers |
| Boss | Driving, brass and drums | Intro sting into a loop |
| Victory / defeat / unique | Short stingers (2–5 s) | One-shots on the `music` bus |

**Layers.** Each biome track has a base loop and an intensity layer. If a track has no separate stems, use **two tracks of similar tempo** and crossfade (1.5 s). The intensity layer fades in on flag-wave warnings and while more than 12 monsters are on the board, and fades out 6 s after.

Source picks are in §12.2.

---

## 11. Programmatic authoring

The project allows code-authored assets "when it makes sense". It makes sense when the asset **must change with game state**, needs **pixel-exact geometry**, or doesn't exist in the open packs.

### 11.1 Drawn in code at runtime

| Asset | Technique |
|---|---|
| **Loot beams** | A vertical quad: 6 px core + 14 px glow, a linear gradient from 90% alpha at the base to 0 at the top, additive. Shimmer: `alpha × (0.85 + 0.15 × sin(t × 6 + seed))`. Base flare: an ellipse 16×6. Rise with `outBack`. |
| Rarity outlines | G §1.4's offscreen-canvas method, cached per frame and colour. |
| AoE rings, lane lines, telegraphs, curse zones | §2.8 |
| **Lightning and chains** | Midpoint-displacement polylines (G §6): 4 subdivisions, ±6 px offset, regenerate every 2 frames, 1 px white core + 2 px element colour + 4 px 30% glow. |
| Projectile trails | A ring buffer of the last N positions, drawn as 1 px squares that fade and shrink. |
| Crossbow bolts, ice shards, frost fragments | Small hand-specified pixel arrays (for example a 14×3 bolt) drawn with `fillRect` |
| Particles, flashes, vignette, screen dim | §2.7, full-screen rects and radial gradients |
| Damage numbers and labels | A bitmap pixel font (§12.4), tinted per draw, with a cached outlined version |
| **Currency orbs** | §4.3 recipe, drawn once into an atlas at load |
| Card frames, element strips, socket dots, element badges | `fillRect` and 1 px lines, 9-slice where needed |
| Heart crack, coin trails, upgrade arrows | Tiny pixel arrays |
| Light rays (Strongbox, unique) | Rotating triangles from a centre, additive, alpha 20% |

### 11.2 Sounds authored in code (ZzFX)

[ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT, < 1 KB) generates sounds from a parameter array. Use it for:

- **UI blips**: hover, click, deny, card ready, ticker tick.
- **Pitched tones** for stingers when a sample doesn't fit the key: ZzFX tones are exactly tunable.
- **Sweeps**: the drum-roll riser before a unique, telegraph whooshes, comet whistle.
- **Placeholders** for anything not yet sourced. Shipping a sound now beats hunting for a perfect sample.

Starting points (tweak in the [ZzFX designer](https://killedbyapixel.github.io/ZzFX/)). Each was rendered with `zzfx@1.4.0` and gives non-silent output of the expected length (0.04–0.8 s). `pitchJump` **adds** Hz to the frequency.

```js
// zzfx(volume, randomness, frequency, attack, sustain, release, shape, shapeCurve,
//      slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation,
//      bitCrush, delay, sustainVolume, decay, tremolo)
const SFX = {
  ui_hover:   [0.3, 0, 1200, 0, 0.01, 0.03, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  ui_click:   [0.5, 0, 700,  0, 0.01, 0.05, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  ui_deny:    [0.5, 0, 120,  0, 0.05, 0.12, 3, 1, 0, 0, 0, 0, 0.04, 0, 0, 0, 0, 1, 0, 0],
  card_ready: [0.4, 0, 587,  0, 0.02, 0.15, 0, 1, 0, 0, 588, 0.04, 0, 0, 0, 0, 0, 1, 0, 0], // D5, jumps +588 Hz to D6
  riser:      [0.6, 0, 200,  0.6, 0.1, 0.1, 2, 1, 1.5, 0, 0, 0, 0, 0.3, 0, 0, 0, 1, 0, 0.2], // unique drum-roll riser
};
```

Treat these as sketches to tune by ear, not finished sounds. For a fixed pitch, set `frequency` from the pentatonic table: D5 587, E5 659, F♯5 740, A5 880, B5 988, D6 1175 Hz.

**Optional offline step.** A 30-line Node script can render ZzFX arrays to `.wav` so they behave like every other sample in the mixer.

### 11.3 What not to author in code

- Character sprites, terrain, props: G's LPC assets are better than anything procedural.
- **Impact and foley sounds** (metal, bone, flesh, wood): synthesized versions sound thin. Use samples.
- Monster vocals and music.

---

## 12. Sources

**Where things are**

- **`~/Documents/game-audio/`**: 23 open audio packs, downloaded and checked on 2026-10-18.
  - One folder per pack. Each has a `SOURCE.txt` with its URL, author, and licence.
  - **All of them are CC0**, re-checked on each source page.
  - All 828 files decode (checked with `ffprobe`).
  - Paths in §12.1–12.2 are relative to this folder unless they start with `lpc/`.
- **`~/Documents/lpc/`** (G's packs) also holds a little audio, written `lpc/…` below. It is mostly **CC-BY-SA**, so credit it.
- Everything marked *cited* was checked on its web page but **not downloaded**.

### 12.1 Sound effects

**Packs downloaded**

| Folder | Source | Files | Best for |
|---|---|---|---|
| `kenney-impact-sounds/` | [Kenney, Impact Sounds](https://kenney.nl/assets/impact-sounds) | 130 | **Material-aware hits**: plate, metal, glass, wood, punch, soft, bell, at light/medium/heavy weight. Footsteps on grass, snow, concrete. |
| `kenney-rpg-audio/` | [Kenney, RPG Audio](https://kenney.nl/assets/rpg-audio) | 51 | Coins, cloth, leather, metal latches, knife draw: equip and stash foley |
| `kenney-interface-sounds/` | [Kenney, Interface Sounds](https://kenney.nl/assets/interface-sounds) | 100 | UI: click, select, error, tick, toggle, plus tonal `glass_*` and `pluck_*` |
| `kenney-casino-audio/` | [Kenney, Casino Audio](https://kenney.nl/assets/casino-audio) | 54 | Chips (orb clinks, odometer ticks), dice (Chaos rattle), cards (gamble flips, summary) |
| `kenney-digital-audio/` | [Kenney, Digital Audio](https://kenney.nl/assets/digital-audio) | 62 | Zaps for lightning, `powerUp*`, tonal `twoTone`/`threeTone`. Synthetic, so use as layers. |
| `kenney-music-jingles/` | [Kenney, Music Jingles](https://kenney.nl/assets/music-jingles) | 85 | Stingers in 5 families: `NES`, `HIT`, `PIZZI`, `SAX`, `STEEL` (0.3–1.8 s each) |
| `rubberduck-80-rpg-sfx/` | [rubberduck, 80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx) | 80 | `spell_fire_01–07`, `spell_01–02`, `item_coins_*`, `item_gem_*`, `lock_*`, `chain_*`, `blade_*`, `creature_*` |
| `rubberduck-80-creature-sfx/` | [rubberduck, 80 CC0 creature SFX](https://opengameart.org/content/80-cc0-creature-sfx) | 80 | `grunt`, `hurt`, `monster`, `roar`, `troll`, `bug`, `howl`, `scream`, `cute`, `spit`, `weird` |
| `rubberduck-75-breaking-hit-sfx/` | [rubberduck, 75 CC0 breaking/falling/hit](https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx) | 75 | Rock, wood, metal, glass: breaks, falls, hits. Armour break, bone clatter, wall break. |
| `rubberduck-40-water-slime-sfx/` | [rubberduck, 40 CC0 water/splash/slime](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) | 40 | `slime_01–16`, `splash_01–15`, `bubble_*`, bubble and water loops |
| `artisticdude-zombies/` | [artisticdude, Zombies Sound Pack](https://opengameart.org/content/zombies-sound-pack) | 24 | `zombies/zombie-1…24.wav`: groans and deaths |
| `starninjas-swords/` | [StarNinjas, 20 Sword SFX](https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes) | 20 | 10 swings (`sword - StarNinjas/sword.N.ogg`), 10 clashes (`sword_clash.N.ogg`) |
| `bart-ice-spells/` | [bart, Ice spells](https://opengameart.org/content/ice-spells) | 2 | `coldsnap.wav`, `ice.wav` |
| `bobjt-gem-collect/` | [Bobjt, Gem collect SFX](https://opengameart.org/content/gem-collect-sfx) | 2 | A bright 0.19 s gem ping, and a 1.5 s reverb version |
| `oiboo-open-chest/` | [Oiboo, open chest SFX](https://opengameart.org/content/open-chest-sfx) | 1 | `open_chest.wav` (2.5 s) |
| `rustltd-8bit-coins/` | [Luke.RUSTLTD, 10 8bit coin sounds](https://opengameart.org/content/10-8bit-coin-sounds) | 10 | 8-bit coins. A **style fallback** only; the sampled coins fit better. |

**Event map.** `#` means "any of the numbered variants" (round-robin them).

| Event (§3–9 name) | Files | Notes |
|---|---|---|
| `drop_normal` | `kenney-rpg-audio/Audio/dropLeather.ogg`, `cloth#.ogg` | Quiet |
| `drop_magic` | body `kenney-interface-sounds/Audio/drop_00#.ogg` + tone `glass_002.ogg` | |
| `drop_rare` | body `drop_00#.ogg` + `rubberduck-80-rpg-sfx/item_stone_0#.ogg`; tones `pluck_001.ogg` (E6) then `glass_003.ogg` (B6); shimmer `bobjt-gem-collect/gem-gather-stereo.wav` | E6 → B6 is the rising fifth |
| `drop_unique` | boom `kenney-impact-sounds/Audio/impactPunch_heavy_00#.ogg` at −7 semitones + `lpc/source-of-tales/sfx/bomb.ogg`; bell `impactBell_heavy_000.ogg`; swell: ZzFX `riser` (§11.2) or `lpc/source-of-tales/music/choir_loop.ogg` (first 2 s, BY-SA); tail `gem-gather-stereo-reverb.wav` | The headline sound. Spend an hour on it. |
| `drop_currency_low` | `rubberduck-80-rpg-sfx/item_gem_0#.ogg` | |
| `drop_currency_mid` | `kenney-casino-audio/Audio/chips-collide-#.ogg` + `glass_002.ogg` | |
| `drop_currency_top`, `drop_divine` | `kenney-impact-sounds/Audio/impactGlass_heavy_00#.ogg` + `glass_002/003` as a chord + `gem-gather-stereo-reverb.wav` | `drop_divine` adds `impactBell_heavy_000` |
| `drop_hero` | `pluck_001.ogg` pitched to D6 → A6 → D7 (−2, +5, +10 semitones), 70 ms apart + `kenney-casino-audio/Audio/chip-lay-#.ogg` as the gem "clack" | |
| `coin` (ladder) | `rubberduck-80-rpg-sfx/item_coins_0#.ogg` | |
| `coin_pile`, vendor | `kenney-rpg-audio/Audio/handleCoins.ogg`, `handleCoins2.ogg` | |
| `mana_collect` (ladder) | `bobjt-gem-collect/gem-gather-stereo.wav` | Short and bright; it sits above combat |
| `mana_charge` | ZzFX soft riser | |
| `place_thunk` | `kenney-impact-sounds/Audio/impactSoft_heavy_00#.ogg` + `footstep_grass_00#.ogg` | Swap the footstep surface per biome |
| `mana_spend`, `card_ready`, `ui_*` | ZzFX (§11.2), or `kenney-interface-sounds/Audio/select_00#`, `click_00#`, `error_00#`, `tick_00#` | |
| Hit: flesh | `impactPunch_medium_00#`, `impactSoft_medium_00#` (small/medium); `impactPunch_heavy_00#` (big) | §2.6 bands pick the weight |
| Hit: **metal** (Plated, shields) | `impactPlate_light/medium/heavy_00#`, `impactMetal_*` | The "armour is eating it" cue |
| Hit: bone | `impactWood_light_00#` + `rubberduck-75-breaking-hit-sfx/bfh1_wood_hit_0#` | Dry wood reads as bone |
| Hit: chitin | `impactTin_medium_00#`, `impactPlank_medium_00#` | |
| Hit: slime | `rubberduck-40-water-slime-sfx/slime_0#`–`slime_16` | |
| Melee swing | `starninjas-swords/sword - StarNinjas/sword.#.ogg`, `rubberduck-80-rpg-sfx/blade_0#` | |
| Block, `shield_block` | `starninjas-swords/sword_clash.#.ogg` | |
| `armour_break` | `rubberduck-75-breaking-hit-sfx/bfh1_metal_falling_0#` + `bfh1_metal_hit_0#` | |
| `slam`, `earth_rise`, `rock_break`, `rock_crack` | `bfh1_rock_breaking_0#`, `bfh1_rock_falling_0#`, `kenney-impact-sounds/Audio/impactMining_00#` | Layer under a low ZzFX thump |
| `fire_*` | `rubberduck-80-rpg-sfx/spell_fire_01–07`, `lpc/source-of-tales/sfx/fire.ogg` (BY-SA) | |
| `explosion*` | `lpc/source-of-tales/sfx/bomb.ogg` (CC0) + `bfh1_breaking_0#` | |
| `ice_*`, `freeze`, `chill` | `bart-ice-spells/coldsnap.wav`, `ice.wav`; `impactGlass_light/medium_00#` | |
| `shatter`, `ice_shatter_big` | `rubberduck-75-breaking-hit-sfx/bfh1_glass_breaking_0#` | |
| `zap`, `shock`, `spark_cast` | `kenney-digital-audio/Audio/zap1.ogg`, `zap2.ogg`, `zapTwoTone*.ogg`, `zapThreeToneUp/Down.ogg` | Filter the top end a little |
| `chaos_*`, `curse_*` | `rubberduck-80-rpg-sfx/spell_01/02` + `rubberduck-80-creature-sfx/weird_0#` (reversed) | |
| `poison*`, `bubbles` | `rubberduck-40-water-slime-sfx/bubble_0#`, `loop_bubbles_0#` | |
| `bleed` | `slime_0#` (short ones), pitched up | |
| Shambler | `artisticdude-zombies/zombies/zombie-#.wav` | Groans and deaths |
| Skeletons | rattle `bfh1_wood_falling_0#`; death `bfh1_wood_breaking_0#` + `bfh1_falling_0#` | |
| Goblins | `rubberduck-80-creature-sfx/spit_0#`, `cute_#` (pitched down), `scream_0#` | Cackles are a gap; see the cited list |
| Ghoul Runner, Geonor's howl | `rubberduck-80-creature-sfx/howl.ogg`, `grunt_0#` | |
| Minotaur Brute, Troll | `roar_0#`, `troll_0#`; steps `kenney-impact-sounds/Audio/footstep_concrete_00#` at −5 semitones | |
| Beetle | `bug_0#` | |
| Bat, Rat Swarm | `scream_0#` pitched up; `cute_#` | |
| Orc Shaman | `weird_0#`, `monster_0#` | |
| Slime split | `splash_0#` + `slime_0#` | |
| Leak (fountain) | `rubberduck-40-water-slime-sfx/splash_0#`; heart crack `impactGlass_light_00#` | |
| Strongbox | rattle `kenney-rpg-audio/Audio/metalLatch.ogg`, `metalClick.ogg`, `rubberduck-80-rpg-sfx/lock_0#`, `chain_0#`; open `oiboo-open-chest/open_chest.wav` | |
| Equip | `kenney-rpg-audio/Audio/metalPot#` (metal), `handleSmallLeather*` (leather), `cloth#` (cloth), `beltHandle#` (belt), `drawKnife#` (weapon) | |
| Crafting | Chaos rattle `kenney-casino-audio/Audio/dice-shake-#`; ticks `chips-stack-#`; Annulment `bfh1_glass_breaking_0#`; gamble flip `card-slide-#`, `cards-pack-open-#` | |
| Summary flips | `kenney-casino-audio/Audio/card-place-#.ogg` | |
| Passive tree, campaign map | `kenney-rpg-audio/Audio/bookFlip#.ogg` (map); tones from `pluck_001` / `glass_002` (nodes) | |
| Victory, defeat, level-up jingles | `kenney-music-jingles/Audio/Pizzicato jingles/jingles_PIZZI#.ogg` or `Steel jingles/jingles_STEEL#.ogg` (audition by ear); `music-heartfelt-battle/heartfelt-battle_outro.ogg` (3.2 s) as the victory sting | |

**Tonal layers and the key.** The measured centre pitch of the tonal candidates, so they can be tuned to D major pentatonic (§3.3). These are FFT peak estimates; confirm by ear.

| File | Measured | In key? | Shift to use |
|---|---|---|---|
| `kenney-interface-sounds/Audio/glass_002.ogg`, `glass_003.ogg` | B6 | yes | 0 |
| `kenney-interface-sounds/Audio/pluck_001.ogg` | E6 | yes | 0 (−2 st for D6) |
| `kenney-impact-sounds/Audio/impactBell_heavy_000.ogg` | F♯4, +44 cents | yes, after tuning | −44 cents |
| `kenney-digital-audio/Audio/threeTone1.ogg` | D4, −14 cents | yes | +14 cents |
| `bobjt-gem-collect/gem-gather-stereo.wav` | D8, −12 cents | yes | 0 |
| `rubberduck-80-rpg-sfx/item_gem_01.ogg` | A5, −44 cents | yes, after tuning | +44 cents |
| `rustltd-8bit-coins/coin2.wav` | A6 | yes | 0 |
| `kenney-interface-sounds/Audio/glass_001.ogg`, `bong_001.ogg` | A♯ | no | Avoid, or −1 st |

In Web Audio: `source.playbackRate.value = 2 ** ((semitones + cents / 100) / 12)`.

**Cited, not downloaded** (pages checked)

| Source | Licence | Why you might want it |
|---|---|---|
| [lentikula, Basic Spell Impacts](https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx) (13 MB) | CC0 | 20 clean fire, ice, lightning, and water impacts. Better than anything above for spells. itch.io's download flow can't be scripted; download it by hand. |
| [Medieval SFX: Weapon Textures](https://opengameart.org/content/medieval-sound-effects-weapon-textures) (~176 MB) | CC0 | **Bow draw/shoot, arrow pass-by, crossbow shoot and reload.** The biggest gap above is bows. |
| [JC Sounds, Fantasy SFX Pack Vol 1](https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1) (4.7 MB) | CC-BY 4.0 | Bow shots, projectile hits, swings, elemental spells in one consistent set |
| [Michel Baradari, 15 monster grunt/pain/death](https://opengameart.org/content/15-monster-gruntpaindeath-sounds) | CC-BY 3.0 | Higher-quality monster voices for rares and bosses |
| [Ramblez, Undead sound effects](https://opengameart.org/content/undead-sound-effects) | CC-BY 4.0 | Skeleton rattles, ghouls |
| [spookymodem, Goblin Death](https://opengameart.org/content/goblin-death) | CC-BY 3.0 | Goblin voice |
| [Little Robot Sound Factory, Coins](https://opengameart.org/content/coins-sound-effects-library) (17.6 MB) | CC-BY 3.0 | 151 coin and gem sounds, if the coin ladder needs more variety |
| [Little Robot Sound Factory, Fantasy SFX Library](https://opengameart.org/content/fantasy-sound-effects-library) (31 MB) | CC-BY 3.0 | Jingles, gold pickups, goblin voices, spells |
| [Jerimee, Thunder](https://opengameart.org/content/thunder) | CC-BY 3.0 | `thunder_big` for Lightning Conduit |
| [SubspaceAudio, 512 Sound Effects (8-bit)](https://opengameart.org/content/512-sound-effects-8-bit-style) | CC0 | Retro chimes, if the stingers go chiptune |

**Gaps** with no good open sample yet: a war horn (flag wave), goblin cackles, and a heartbeat. Use ZzFX placeholders until someone finds better.

**Local LPC-pack audio** (`~/Documents/lpc/`)

| File | Licence | Use |
|---|---|---|
| `source-of-tales/sfx/bomb.ogg` | CC0 (Luke.RUSTLTD) | Explosions, the unique boom layer |
| `source-of-tales/sfx/fire.ogg` | CC-BY-SA 3.0 (Bart K.) | Ignite, Flame Wall |
| `source-of-tales/sfx/trap.ogg`, `metal-bowl.ogg` | CC-BY-SA 3.0 | Strongbox, armour |
| `neverwell-moor/resources/sfx/fanfare.ogg` | CC-BY-SA 3.0 (jivatma07) | Victory fanfare candidate |
| `neverwell-moor/resources/sfx/mallet_swing.ogg`, `mallet_whomp.ogg` | Etherian (licence not stated in the file) | **Don't use** without checking |
| `neverwell-moor/resources/sfx/collect_coin.ogg`, `chests.ogg` | CC0 (cfxr) | 8-bit fallbacks |
| `big-island/resources/sounds/shoot.ogg`, `shoot1.ogg` | CC-BY-SA 3.0 + GPL 3.0 (Severin Ibarluzea) | **Bow release** stand-in until the weapon-texture pack is pulled |

### 12.2 Music

| Use | File | Length | Licence | Notes |
|---|---|---|---|---|
| Title / focus select | `lpc/source-of-tales/music/bells_menu_theme_two.ogg` | 240 s | CC-BY-SA 3.0 (Nelson James Gatlin, LPC entry) | Warm and slow |
| **Hideout** | `music-old-tower-inn/The_Old_Tower_Inn.mp3` | 105 s | CC0 (RandomMind) | Tavern feel. 105 s will repeat often; alternate with `lpc/neverwell-moor/resources/bgm/del_erad.ogg` (300 s, CC-BY-SA 3.0, Janne Hanhisuanto). |
| Grassland, base | `music-heartfelt-battle/heartfelt-battle_loop.ogg` | 154 s | CC0 (request) | Strings, piano, horn. Has an intro and outro file too. |
| Grassland, intensity | `music-battle-theme-a/battleThemeA.mp3` | 96 s | CC0 (cynicmusic; credit "cynicmusic.com pixelsphere.org" requested) | |
| Bog, base | `music-swamp-ambience/swamp.ogg` + `lpc/source-of-tales/music/strings_theme.ogg` | 205 s / 88 s | CC0 (LokiF) / CC-BY-SA 3.0 | Ambience bed under a quiet track |
| Bog, intensity | `lpc/source-of-tales/music/brass_loop.ogg` | 16 s loop | CC-BY-SA 3.0 | Weak; the bog is the thinnest biome for music |
| Desert ruins | `music-desert-loop/desert_loop_0.mp3` | 64 s | CC0 (iamoneabe) | Intensity layer: *cited* [yd, Desert Theme "caravan"](https://opengameart.org/content/desert-theme) (CC0) |
| Winter keep | `music-snow-theme/Snow Theme/BGM_Snow_Theme_Slowed_Loop.ogg` (base) and `BGM_Snow_Theme_Loop.ogg` | 34 s / 25 s | CC0 (Cleyton Kauffman) | Short loops. Intensity layer: *cited* [jobromedia, Battle in the winter](https://opengameart.org/content/battle-in-the-winter) (CC-BY 3.0) |
| **Boss** | `music-epic-boss-battle/Juhani Junkala - Epic Boss Battle [Seamlessly Looping].wav` | 123 s | CC0 (Juhani Junkala) | Seamless loop. Convert to `.ogg` for the build (it's a 22 MB WAV). |
| Low-life tension (optional) | `lpc/source-of-tales/music/trouble_loop.ogg` | 4.4 s loop | CC-BY-SA 3.0 | Under the heartbeat |
| Victory / defeat stings | §12.1 jingles; `heartfelt-battle_outro.ogg` | 1–3 s | CC0 | |

### 12.3 VFX and icons (beyond appendix G)

G already maps most FX. The Extended LPC Magic pack by daneeklu is the `source-of-tales/particles/` set G uses. These pages were checked but **not downloaded**:

| Source | Licence | Fit |
|---|---|---|
| [tbbk, Pixel art sword slash effect](https://opengameart.org/content/pixel-art-sword-slash-effect) | CC0 | 64×47 swing arcs: native scale for melee heroes. Better than the procedural arc. |
| [StarsteelGaming, Spell Effects](https://opengameart.org/content/spell-effects-by-starsteelgaming) | CC0 | Fireball (9 frames), ice spear (6), thundersphere (8) on a 64×32 canvas: direct projectile matches |
| [ansimuz, Gothicvania Magic Pack 9](https://opengameart.org/content/gothicvania-magic-pack-9) | CC0 | ~64 px dark bolt, fire bomb, lightning, spark |
| [DevWizard, Pixel Art Spells](https://opengameart.org/content/pixel-art-spells) | CC0 | 23 small spells including **black-and-white versions for tinting** with the §5.3 profile |
| [Foozle, Pixel Magic Effects](https://foozlecc.itch.io/pixel-magic-sprite-effects) | CC0 | 32×32 earth spikes (Shield Wall, Sunder), molten spear, tornado, portal |
| [Aidan_Walker, Smoke Puff](https://opengameart.org/content/smoke-puff) | CC0 | Spawn and death puffs |
| [JROB774, Pixel Explosion (12 frames)](https://opengameart.org/content/pixel-explosion-12-frames) | CC-BY 3.0 | 96×96 fire explosion |
| [AntumDeluge, Electricity overlay](https://opengameart.org/content/electricity-overlay-effect), [Ice sparkles overlay](https://opengameart.org/node/165558) | OGA-BY / CC-BY 3.0 | 48×64 overlays for Shock and Freeze |
| [thekingphoenix, Animations!](https://opengameart.org/node/77809) | CC0 | The only pixel **level-up** burst found (GIF; slice it) |
| [Kenney, Particle Pack](https://kenney.nl/assets/particle-pack) | CC0 | Soft 512 px flares. **Not pixel art**: use only, downscaled, as the additive glow at a beam's base. |
| [Idylwild's Arsenal](https://idylwild.itch.io/idylwilds-arsenal), [Armory](https://opengameart.org/node/171011), [Arcanum](https://opengameart.org/content/idylwilds-arcanum) | CC0 | **Recommended item icons.** 32×32, one consistent chunky style, closer to LPC than G's DCSS icons. Arsenal covers bows, crossbows, spears, maces, hammers, staves and wands; Armory covers body armour, shields, rings, amulets (no belts, so keep G's `Belt1.png`). |
| [Flowly, Pixel Orbs](https://opengameart.org/content/pixel-orbs), [MSavioti, Crystal Orbs](https://opengameart.org/content/crystal-orbs-32x32) | CC0 | Optional bases for the §4.3 orb icons, if hand-shaded orbs beat the code ones |
| [Kenney, Pixel UI Pack](https://kenney.nl/assets/pixel-ui-pack), [tiopalada, Tiny RPG Dragon Regalia GUI](https://opengameart.org/content/tiny-rpg-dragon-regalia-gui) | CC0 | 9-slice frames for cards, tooltips, panels |

**Don't use**: pimen's and BDragon1727's itch.io effect packs. Their terms forbid redistribution, and the repo is public.

**No open source exists** for a pixel loot beam or a rarity-coloured light pillar. Draw them in code (§11.1).

### 12.4 Fonts

| Font | Licence | Use |
|---|---|---|
| [m5x7](https://managore.itch.io/m5x7) (Daniel Linssen) | CC0 | **Damage numbers** (7 px glyphs, §2.5), tooltip body, ticker |
| [m6x11](https://managore.itch.io/m6x11) (Daniel Linssen) | Free with attribution | Crit numbers, headers, labels, banners |
| [Alagard](https://www.dafont.com/alagard.font) (Hewett Tsoi) | "Give credit" (informal) | Boss name cards, unique item names, title. Fine for an internal prototype. |
| [Pixel Operator](https://www.dafont.com/pixel-operator.font) (Jayvee Enaguas) | CC0 | Fallback body text with an 8 px variant |

Render fonts at integer multiples of their design size only.

### 12.5 Licensing notes

- **All downloaded audio is CC0.** No attribution is required, but list it on the credits screen anyway (G §8.2). The credits generator should read each pack's `SOURCE.txt`.
- **Local LPC-pack audio** is mostly **CC-BY-SA 3.0**. Credit it per G §8.2; share-alike applies to those files, not to the game code.
- **CC-BY** cited sources (JC Sounds, Baradari, Little Robot, m6x11, JROB774): credit the author on the credits screen.
- **Eric Matyas (soundimage.org)** uses a custom licence that requires an in-game credit line. It's usable, but none of it is picked above.
- **Avoid**: anything NC or no-redistribution; p0ss's "Spell Sounds Starter Pack" and dorkster's bow sound (CC-BY-SA; fine legally, but not needed); Matthew Pablo's "The Last Encounter" (CC-BY-SA 3.0).

---

## 13. Build order

Do these in order. Each is small, and the first five carry most of the feel.

1. **Hit flash, damage numbers, and hit sounds with variation** (§2.4, §2.5, §10.3).
2. **Loot drop choreography**: pop arc, beams, labels, stingers, collect flight, ticker (§3.1–3.3).
3. **Mana orbs and the counter** (§3.6), plus placement drop-in and card ready (§5.2).
4. **Death fall, soul puff, gold coins** (§7.2, §3.5).
5. **Hit significance bands** (§2.6) and the **stat-driven VFX profile** (§5.3).
6. Intensity tiers: shake, hitstop, slow-mo, ducking (§1.3, §2.2, §2.3).
7. Pitch ladders (§3.4).
8. Ailment overlays and sounds (§8).
9. Crafting reveals (§9.2).
10. Boss presentation (§7.5) and loot fountains (§3.9).
11. Music with intensity layers (§10.4).
12. Currency orb icons (§4.3), unique palette shifts (§4.2), the rest of §9.

---

## 14. Tuning knobs and dev tools

Add these to the dev menu (GDD §15):

| Knob | Default | Range | Purpose |
|---|---|---|---|
| `juice` | 1.0 | 0–2 | Global multiplier on shake, hitstop, slow-mo, and particle counts. 0 is the "no juice" A/B. |
| `shakeMax` | 6 px | 0–12 | Max shake offset |
| `lootHoldScale` | 1.0 | 0.5–2 | Multiplies every loot hold time |
| `sigBands` | 0.05 / 0.25 | — | Hit-significance band edges |
| `numbers` | All | All / Crits / Off | Damage number mode |
| `debugSlowmo` | off | 0.1×–1× | Slow the whole game to inspect timing |
| `audioLog` | off | — | An overlay listing the last 20 sounds and dropped voices |
| `tierLog` | off | — | Shows each T3+ event's name and tier as it fires |

**The A/B test.** Play one level at `juice = 0` and the same level at `juice = 1`. If the team can't feel the difference in the first 30 seconds, the tiers are too timid.

**Accessibility.** Shake Off/Low/Full; "Reduce flashing" (caps white flashes at 40% alpha and disables full-screen flashes); colour-blind safety comes from rarity being shown by beam height and label text as well as colour.

---

## 15. Playtest signals

| Watch for | Means | First lever |
|---|---|---|
| Players react out loud to drops ("oh!") | Loot feel works | — |
| Players never glance at the ticker | Ticker too quiet, or holds too long on the board | Ticker flash, shorter holds |
| Players can't say why they lost a lane | Juice is hiding the board | Lower ground-effect alpha; cap impact bursts; check §1.1 |
| Players stop noticing rares by level 10 | Stinger fatigue | Make `drop_rare` shorter; use the loot ladder more |
| Equipping an upgrade gets no reaction | Significance bands too wide | Narrow `sigBands`; strengthen §4.5 |
| Ears tired after 20 minutes | Too many high-frequency layers | Lower `sfx` bus; tighter voice caps; filter combat highs |
| Players cheer at Vaal outcomes | Crafting reveal works | — |

---

## Deviations and changes to other appendices

1. **Currency icons.** §4.3 replaces G §7.2's DCSS-style icon mapping with code-drawn orbs. G's mapping stays as a fallback.
2. **Gear on sprites.** G §1.4 says gear is never drawn on hero sprites. §4.2 adds a tiny weapon-hand glint for uniques. It is an effect, not a sprite layer, so G's recipes don't change.
3. **Damage-number colours** use G's FX colours, not its UI-text colours, because the UI colours (for example fire `#960000`) are unreadable on grass.
4. **Audio** was out of the original design interview (GDD §16). This appendix is a recommendation, and the GDD's "drop sounds are the priority" is kept as §3.
