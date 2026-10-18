# Appendix G: Art Direction & LPC Asset Map

Part of the [Mercs vs. Monsters GDD](gdd.md).

This appendix covers:

- how the board, sprites, loot, and HUD should look;
- the LPC sheet format, verified against the files;
- exact sprite recipes for heroes, monsters, and bosses;
- tiles, props, FX, icons, and licensing.

**Related appendices**

- Hero list and weapon locks: [appendix-b-heroes.md](appendix-b-heroes.md).
- Items and currency: [appendix-c-items.md](appendix-c-items.md).
- Monsters, bosses, terrain, Strongboxes: [appendix-d-monsters-levels.md](appendix-d-monsters-levels.md).
- Loot presentation (beams, ticker): [appendix-e-economy.md](appendix-e-economy.md).
- Game feel, VFX timing, audio, and what to draw in code: [appendix-h-juice.md](appendix-h-juice.md).

---

## TL;DR

- **Grid.** One board cell = **64×64 px = 2×2 LPC tiles**. Logical canvas **960×540**, drawn at **2×** (1920×1080), nearest-neighbour.
- **Facing.** Heroes use **row 3 (right)**. Monsters use **row 1 (left)**. Every ULPC sheet's rows are up, left, down, right.
- **Death.** ULPC has no death animation. The 6-frame, front-facing **`hurt`** row *is* the death fall. Hits are a white flash.
- **Weapons.** Every demo weapon class has usable art, including a **CC0 crossbow**.
  - The gaps are a real sceptre (a crook staff stands in) and a wand spellcast (the wand only has a `slash` flick).
- **Monsters.**
  - ULPC composites cover 9 of the 12 archetypes.
  - source-of-tales covers bat, beetle, and slime. Those three are 32–48 px chibi sprites with no walk or hurt art, so they need procedural motion.
- **Bosses.** These are integer upscales: Bloated Miller 2×, Rust King 3×, Lachlann 2×, Count Geonor 5×.
- **Rarity** uses outlines, not tints: magic `#8888FF`, rare `#FFFF77` at 1.1× scale, unique `#AF6025`.
- **Terrain.**
  - `lpc-tile-atlas` gives the classic LPC grass, swamp, mud, lava, and water.
  - `lpc-revised` gives sand, snow, ice, rocks, the Wolf Stone shrine, and the chest.
  - Medieval and Victorian decorations give graves, banners, and the fountain used as the Life Pool.
- **Licensing.**
  - Build a credits screen.
  - Generate a CREDITS file from a manifest of every source PNG. ULPC rows come from `CREDITS.csv`; the other packs have their own credit files.
  - Don't use `lpc-winter-tiles`, `lpc-adobe-town-set`, or the two sci-fi packs: they have no licence file.

**Path convention.** Every path is relative to `~/Documents/lpc/` unless a table header names a deeper base. Every path in this appendix was checked to exist.

**Atlas cells** are written `col,row` on a 32 px grid, so pixel x = col × 32. Ranges are inclusive.

---

## 1. Art direction

### 1.1 Board, camera, and scale

LPC is drawn at 3/4 top-down. MvM reads it as a PvZ lawn: a flat field of cells, with characters standing upright on them.

| Decision | Value | Why |
|---|---|---|
| LPC tile | 32×32 px | Native LPC grid |
| Board cell | **64×64 px** (2×2 LPC tiles) | A 64×64 ULPC character frame fits one cell exactly. The figure is about 24×46 px, so it reads like a PvZ plant in its square. |
| Board | 9 columns × 5 lanes = 576×320 px | Brief |
| Logical canvas | **960×540** (16:9) | Leaves room for the HUD and the loot ticker |
| Render scale | **2×** → 1920×1080 | Use the largest integer scale that fits, letterboxed. Below 2× fit, allow a fractional scale. |
| Filtering | Nearest-neighbour | `imageSmoothingEnabled = false`; CSS `image-rendering: pixelated` |
| Lawn pattern | Alternate cells ±6% brightness | PvZ's checkerboard. It makes the cell grid legible without lines. |

**Anchoring**

- A 64 px frame is drawn with its top-left at (cell x, cell y − 6). That puts the feet at about y + 56.
- An oversize frame of size F (128 or 192) is drawn at (cell x − (F−64)/2, cell y − 6 − (F−64)/2). ULPC centres the 64 px body inside oversize frames.
- Depth: sort by lane, then by x. Fliers draw last.
- Everything stands on the ULPC **shadow** layer, `ulpc-generator/spritesheets/shadow/adult/`, which is defined in `ulpc-generator/sheet_definitions/body/shadow.json`.

### 1.2 Facing and rows

| Who | Row in each ULPC animation sheet | Notes |
|---|---|---|
| Heroes | **3 (right / east)** | They never turn. |
| Monsters | **1 (left / west)** | The Burrowing Beetle uses its right row after it surfaces behind the heroes. That is appendix D behaviour, not an art exception. |
| Death (everyone) | `hurt` has only one row, facing the camera | The body falls toward the camera regardless of facing. This is fine. |

### 1.3 Animation states

| State | Heroes | Monsters |
|---|---|---|
| Idle | Hold frame 0 of the attack row, plus a 1 px bob every 600 ms. **Weapon layers have no idle sheet.** | Not needed. |
| Walk | — | Walk row 1, frames 1–8 looped. Frame 0 is the stand pose. Frame time = `3000 / speed_px_per_s` ms, clamped to 80–250 ms. That is 220 ms for a 4.7 s/tile Shambler. |
| Run | — | Ghoul Runner only: `run` row 1, 8 frames. |
| Attack | §3.1 gives the row and the release frame. Play the row once per attack, compressed to at most 0.6 s, then hold frame 0. | `slash` or `thrust` row 1. |
| Hit | 80 ms white flash (additive) | Same, plus 2 px knockback to the right |
| Death | `hurt` (6 frames), then a 400 ms fade | Same. source-of-tales creatures use their `*_death.png` fade. |
| Leap | — | Goblin Leaper: `jump` row 1 (5 frames), tweened along a 1.5-tile arc |
| Place | 150 ms drop-in, plus dust particles | — |

### 1.4 Readability rules

**Team cues**

- Heroes are warm and saturated, face right, and have a soft round shadow.
- Monsters are desaturated, undead, or bestial, face left, and have a darker shadow.
- A monster health bar appears only after it has been damaged. The boss bar and heavy-stun bar sit at the top centre (appendix D §7).

**Monster rarity**

These match appendix D §3.

| Rarity | Outline | Scale | Name plate | Extra |
|---|---|---|---|---|
| Normal | none | 1.0 | none | — |
| Magic | 1 logical px, `#8888FF` | 1.0 | on hover | Optional 10% blue multiply tint if the outline reads weakly. **Adapted** from the brief's "tinted by rarity". |
| Rare | 1 logical px, `#FFFF77` | **1.1** | Always shown: the PoE rare name in `#FFFF77` above the head | A yellow ground ring |
| Unique (boss) | 2 px, `#AF6025` | 2×–5× (§4.4) | Boss bar | Telegraphs from appendix D |

**How outlines are made**

- Compute them once per frame, per colour, at load time:
  1. Draw the frame at (±1, 0) and (0, ±1) onto an offscreen canvas.
  2. Fill with `source-in` in the outline colour.
  3. Draw the frame on top.
- Tints are reserved for ailments, so rarity never fights with elemental feedback.

**Hero rarity** shows only on the roster card frame (normal, magic, rare colours). It is never shown on the board sprite, so it can't be confused with monster rarity.

**Loot labels and beams (PoE convention)**

| Drop | Label text | Beam colour | Beam height | Notes |
|---|---|---|---|---|
| Normal item | `#C8C8C8` | `#C8C8C8` at 30% | 32 px | Only under "Show all" |
| Magic item | `#8888FF` | `#8888FF` | 48 px | — |
| Rare item | `#FFFF77` | `#FFFF77` | 96 px | — |
| Unique item | `#AF6025` | `#E0782F` (brighter, so the beam reads) | 160 px, pulsing | Unique sound |
| Currency | `#AA9E82` | `#D9B95B` (gold, as appendix E specifies) | 64 px | Divine and Exalted Orbs get 160 px |
| Hero (skill gem) | `#1BA29B` | `#1BA29B` | 96 px | PoE gem teal |
| Player spell | `#1BA29B` | `#5FD3C8` | 96 px | Label prefix "Spell:" |
| Gold | — | none | — | Spinning coin pickup, no beam |
| Mana orb | — | none | — | Cyan glow, auto-collected |

The **loot ticker** uses the same label colours.

**Damage types**

- The "UI text" colours are PoE's tooltip colours; use them in tooltips and the ticker.
- The "FX" colours are brighter versions for particles and projectiles on the grass.

| Type | UI text | FX main | FX core | Treatment |
|---|---|---|---|---|
| Physical | `#C8C8C8` | `#E8E2D0` | `#FFFFFF` | White sparks, dust |
| Fire | `#960000` | `#FF6A1A` | `#FFD27A` | Flames, embers |
| Cold | `#366492` | `#7FD4FF` | `#E6FAFF` | Shards, frost |
| Lightning | `#FFD700` | `#FFE14D` | `#FFFFFF` | Jagged bolts |
| Chaos | `#D02090` | `#B44DFF` | `#F0A0FF` | Smoke and wisps. Use a `#7CFF4D` accent for poison. |

**Ailment overlays**

| Ailment | Overlay |
|---|---|
| Ignite | Flame particles plus an orange flicker |
| Chill | 35% cyan multiply; animation slows 30% |
| Freeze | 60% ice tint; animation stops; ice burst on apply |
| Shock | Yellow flicker plus sparks |
| Electrocute | Lightning crawl; animation stops |
| Poison | Green bubbles |
| Bleed | Red drips |
| Armour Break | Grey shard burst plus a "Broken" pip |
| Heavy stun | Desaturate plus "STUNNED" |

### 1.5 HUD layout

This matches the GDD's HUD list. Coordinates are logical pixels (960×540).

| Region | x | y | Contents |
|---|---|---|---|
| **Mana counter** | 8–88 | 8–80 | A mana crystal icon and a large number, top left (PvZ sun counter). |
| **Roster bar** | 96–584 | 4–84 | 6 hero cards plus 1 spell card, each 64×80 with a 4 px gap. |
| ↳ Hero card | — | — | Hero portrait (idle frame 0, cropped to the head and torso), mana cost, recharge sweep (dark wedge), and a rarity-coloured frame. |
| ↳ Spell card | — | — | Set 12 px apart from the hero cards, with a teal frame and a cooldown sweep. |
| Shovel; 1×/2× toggle | 600–704 | 8–56 | Two 48 px buttons. |
| **Life pool** | 720–952 | 8–40 | 10 hearts at 2 points each, with half hearts, plus "17/20". Hearts are `neverwell-moor/resources/img/heart_full.png`, `heart_half.png`, and `heart_empty.png` (16×16). |
| Back hedge | 64–640 | 88–112 | Biome edge strip (3/4 depth cue). |
| **Gate column** | 0–64 | 112–432 | Castle wall, plus the **Life Pool** fountain in lane 3 (§5.5). Leaks splash here. |
| **Lawn** | 64–640 | 112–432 | 9×5 cells. |
| Spawn strip | 640–736 | 112–432 | Fog or road. Monsters appear here, just right of column 9. |
| **Loot ticker** | 744–952 | 96–456 | Right edge. Newest line on top, about 12 lines of 28 px each. Lines are rarity-coloured and fade after 8 s. |
| Front hedge | 64–640 | 432–448 | Biome edge strip. |
| Bottom bar | 0–960 | 456–540 | Level and biome name, and gold (left). Selected-hero strip (centre). **Wave progress** (600–940), PvZ-style, with flag markers and a boss skull. |
| Boss bar | 280–680 | 92–108 | Shown only during boss levels: life bar with the heavy-stun bar under it. |

---

## 2. LPC sheet format (verified)

### 2.1 Frames, rows, and counts

The source of truth is `ulpc-generator/sources/state/constants.ts`. I also measured the PNG sizes of `ulpc-generator/spritesheets/body/bodies/male/*.png`.

- **Frame size** is **64×64**.
- **Row order** in every per-animation sheet is **0 up, 1 left, 2 down, 3 right**.
- Each animation is a separate PNG.
- The generator's full-sheet export stacks them 13 frames wide (832 px), in the row offsets below.

| Animation | File | Sheet px | Frames/row | Rows | Preview cycle | Full-sheet first row | Right row | Left row |
|---|---|---|---|---|---|---|---|---|
| spellcast | `spellcast.png` | 448×256 | 7 | 4 | 0–6 | 0 | 3 | 1 |
| thrust | `thrust.png` | 512×256 | 8 | 4 | 0–7 | 4 | 7 | 5 |
| walk | `walk.png` | 576×256 | 9 | 4 | 1–8 (0 = stand) | 8 | 11 | 9 |
| slash | `slash.png` | 384×256 | 6 | 4 | 0–5 | 12 | 15 | 13 |
| shoot | `shoot.png` | 832×256 | 13 | 4 | 0–12 | 16 | 19 | 17 |
| hurt | `hurt.png` | 384×64 | 6 | **1** (front) | 0–5 | 20 | — | — |
| climb | `climb.png` | 384×64 | 6 | 1 | 0–5 | 21 | — | — |
| idle | `idle.png` | 128×256 | 2 | 4 | 0,0,1 | 22 | 25 | 23 |
| jump | `jump.png` | 320×256 | 5 | 4 | 0,1,2,3,4,1 | 26 | 29 | 27 |
| sit | `sit.png` | 192×256 | 3 | 4 | — | 30 | 33 | 31 |
| emote | `emote.png` | 192×256 | 3 | 4 | — | 34 | 37 | 35 |
| run | `run.png` | 512×256 | 8 | 4 | 0–7 | 38 | 41 | 39 |
| combat (idle) | `combat_idle.png` | 128×256 | 2 | 4 | 0,0,1 | 42 | 45 | 43 |
| 1h_slash / 1h_backslash | `backslash.png` | 832×256 | 13 | 4 | 0–6 / 0–5, 7–12 | 46 | 49 | 47 |
| 1h_halfslash | `halfslash.png` | 384×256 | 6 | 4 | 0–5 | 50 | 53 | 51 |

**Gotchas**

- ULPC bodies are **headless**. The head is always its own layer.
- There is **no death animation**; `hurt` is the fall.
- The wand sheet is 832 px wide (13 columns), but only the first 6 frames match `slash`.

### 2.2 Which animations exist per body type

I checked this by listing `ulpc-generator/spritesheets/body/bodies/<type>/`.

| Body | spell | thrust | walk | slash | shoot | hurt | idle | run | jump | climb | sit | emote | combat | backslash | halfslash |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| male | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| female | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| teen | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| pregnant | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – |
| muscular | ✓ | ✓ | ✓ | ✓ | **–** | ✓ | ✓ | ✓ | ✓ | – | ✓ | – | – | – | – |
| child | – | – | ✓ | ✓ | – | ✓ | ✓ | – | ✓ | – | ✓ | – | – | – | – |
| skeleton | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | – |
| zombie | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | – | – |

**Consequences**

- **Muscular has no `shoot`**, and plate, leather, and chainmail torsos don't support it. Keep bow heroes and armoured knights on `male`, `female`, or `teen`. Use `muscular` for brutes and bosses.
- The skeleton and zombie bodies load through the `male` key in item definitions, so every male-compatible layer fits them. The definitions are `ulpc-generator/sheet_definitions/body/special/body_skeleton.json` and `body_zombie.json`.
- The zombie body has no idle and no run. Its file layout is `body/bodies/zombie/<anim>/zombie.png`.
- The `child` body has only walk, slash, hurt, idle, jump, and sit. That is enough for the Rat Swarm.

### 2.3 Oversize and custom animations

These come from `ulpc-generator/sources/custom-animations.ts`.

- Each has 4 rows (N, W, S, E), so right is row 3 and left is row 1.
- The 64 px body is centred, offset by (F − 64) / 2.

| Custom animation | Frame | Frames/row | Body frames it reuses | MvM users |
|---|---|---|---|---|
| `thrust_oversize` | 192 | 8 | thrust | Jewelled staffs; long spear, trident, halberd, longsword |
| `slash_oversize` | 192 | 6 | slash | **One Hand Mace**; waraxe, halberd, longsword |
| `slash_reverse_oversize` | 192 | 6 | slash (reversed) | **Club** (alternative Two Hand Mace) |
| `walk_128` | 128 | 9 | walk | **Bows** walking (the bow `walk` is only here), long spears |
| `slash_128` / `backslash_128` / `halfslash_128` | 128 | 6 / 13 / 6 | slash family | Arming sword (monsters only) |
| `tool_hammer` | 128 | 9 | slash frames 5,5,4,4,1,0,0,0,0 (remapped) | **Two Hand Mace** (overhead smash) |
| `tool_axe` | 128 | 10 | slash, remapped | — |
| `whip_oversize` / `tool_whip` | 192 | 8 | — | — |
| `tool_rod` | 128 | 13 | — | — |

`tool_hammer` and `tool_axe` remap body frames.
- **Let the generator export do these**, or copy its frame table exactly.
- A naive same-index composite looks wrong; I checked.

### 2.4 Weapon layers for the demo classes

Definitions are in `ulpc-generator/sheet_definitions/`; art is in `ulpc-generator/spritesheets/`.

| MvM class | Definition | Animations it provides | Frame | Bodies | Variants | Licence options |
|---|---|---|---|---|---|---|
| Bow | `weapons/ranged/bow/weapon_ranged_bow_recurve.json` (also `_normal`, `_great`) | shoot, hurt (64); walk only via `walk_128` | 64 / 128 | male, female, teen, pregnant (muscular is listed but has no `shoot`) | 12 woods and metals | recurve and great: CC-BY-SA 3.0; normal: CC-BY 4.0 / GPL 3.0 / OGA-BY 3.0+ |
| Arrow (ammo) | `weapons/ranged/bow/weapon_ranged_bow_arrow.json` | shoot | 64 | same | `arrow` | CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 |
| Quiver | `torso/backpack/quiver.json` | spellcast, thrust, walk, slash, shoot, hurt | 64 | all adult | `quiver` | CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 |
| **Crossbow** | `weapons/ranged/weapon_ranged_crossbow.json` | **thrust**, walk, hurt | 64 | male, muscular, female, pregnant (not teen) | `crossbow` | **CC0** (drjamgo, bluecarrot16) |
| Spear | `weapons/polearm/weapon_polearm_spear.json` | walk, thrust, hurt | 64 | adult + teen | 12 | CC-BY-SA 3.0 |
| One Hand Mace | `weapons/blunt/weapon_blunt_mace.json` | walk, hurt; `slash_oversize` | 64 / 192 | male, muscular, female, pregnant | `mace` | CC-BY-SA 3.0 / OGA-BY 3.0 |
| Two Hand Mace | `tools/tool_hammer.json` | walk; `tool_hammer` | 64 / 128 | all adult + teen | — | CC-BY 4.0 / CC-BY-SA 3.0+ / GPL 2.0+ / OGA-BY 3.0 |
| Two Hand Mace (alt) | `weapons/blunt/weapon_blunt_club.json` | `slash_reverse_oversize` only | 192 | male, muscular, female, pregnant | `club` | CC-BY 4.0 / GPL 3.0 / OGA-BY 3.0+ |
| Quarterstaff, Sceptre stand-in | `weapons/magic/weapon_magic_simple.json` | spellcast, thrust, walk, hurt | 64 | all adult + teen | `simple` (crook with a blue gem) | **CC0** |
| Wand | `weapons/magic/weapon_magic_wand.json` | **slash only** | 64 | male, muscular, female, pregnant | `wand` | CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 |
| Staff | `weapons/magic/weapon_magic_loop.json`, `_diamond`, `_gnarled` (CC-BY 4.0 / GPL 3.0 / OGA-BY 3.0+); `_s` (CC0) | walk, hurt; `thrust_oversize` | 64 / 192 | all adult + teen | 12 woods and metals | (per file) |
| Staff gem | `weapons/magic/weapon_magic_crystal.json` | same as the staffs; layer it on top | 64 / 192 | same | blue, orange, green, purple, red, yellow, crystal | CC-BY 4.0 / GPL 3.0 / OGA-BY 3.0+ |
| Shield | `weapons/shields/engrailed/shield_crusader.json` (OGA-BY 3.0), `shield_spartan.json` (OGA-BY 3.0), `shield_kite.json`, `shield_round.json`, `heater/shield_heater_revised_*.json` | spellcast, thrust, walk, slash, shoot, hurt (kite has **no hurt**). Revised heater adds idle, run, and others. | 64 | male, muscular, female, pregnant (+ teen for spartan and heater) | various | per file |

**Not used for heroes**, because swords, axes, daggers, and flails are cut: the sword layers (arming, longsword, and so on), waraxe, flail, and halberd. Monsters may still use them.

### 2.5 File-path rule and palette recolouring

Resolve exactly as the generator does (`ulpc-generator/sources/state/path.ts`):

```
standard anim, variant item:  spritesheets/<layer path><anim folder>/<variant>.png
standard anim, recolour item: spritesheets/<layer path><anim folder>.png
custom anim:                  spritesheets/<layer path><variant>.png
anim folder: combat → combat_idle; 1h_slash and 1h_backslash → backslash; 1h_halfslash → halfslash
```

Variant names replace spaces with `_`; for example, `kite gray gray` becomes `kite_gray_gray.png`.

**Palette recolouring.** The guide is `ulpc-generator/PALETTE_RECOLOR_GUIDE.md`.

- An item with a `recolors` block ships one PNG drawn in a **base ramp**. Other colours are exact colour swaps from a ramp file, matched within ±1 per channel.
- Ramp files live in `ulpc-generator/palette_definitions/<material>/<material>_<ulpc|lpcr>.json`. Each ramp has 6 colours, dark to light.
- Shared ramps are in `ulpc-generator/palette_definitions/all/all_lpcr.json`, with 75 named ramps such as `ice`, `red_orange`, `garnet`, `lemon`, `amethyst`, and `plum`.

| Material | Base ramp | Useful ramps |
|---|---|---|
| cloth | `white` | red, maroon, orange, yellow, tan, blue, navy, sky, teal, purple, lavender, black, charcoal, gray, brown, leather, forest, green (24) |
| metal | `steel` | ceramic, brass, copper, bronze, iron, steel, silver, gold |
| body | `light` | light, amber, olive, taupe, bronze, brown, black, plus monster skins: green, bright_green, dark_green, pale_green, blue, lavender, zombie, zombie_green, fur_black, fur_brown, fur_copper, fur_gold, fur_grey, fur_tan, fur_white |
| hair | `orange` | 26, including platinum, white, blonde, red, carrot, violet, purple, navy, black |
| eye | `blue` | blue, green, purple, red, orange, yellow, brown, gray |

- **Heads have their own base ramp.** Examples: goblin, orc, and troll use `ulpc.green`; wolf uses `ulpc.fur_brown`; minotaur uses `ulpc.fur_tan`; rat uses `lpcr.ivory`; zombie uses `ulpc.zombie`.
- Their definitions set `match_body_color: true`. So recolour the head with the **same target ramp as the body**; for example, `fur_grey` on both the wolf body and the wolf head.

### 2.6 Baking pipeline

This is a recommendation, and deliberately small.

**Option A: no code**

1. Build each hero or monster in the ULPC generator (`npm run dev` in `ulpc-generator`, or the hosted site).
2. Use the "split animations" ZIP export. It writes `standard/<anim>.png`, `custom/<anim>.png`, and `credits/credits.csv`, `credits.txt`, and `metadata.json` (`ulpc-generator/sources/state/zip.ts`).
3. Save the URL hash next to the PNGs.

**Option B: scripted, recommended for about 50 sprites**

- Write a ~200-line Node or Python bake script. It should:
  - read `sheet_definitions/`, `palette_definitions/`, and `sources/custom-animations.ts`;
  - composite layers in `zPos` order;
  - palette-swap them;
  - write only the rows MvM uses: right for heroes, left for monsters, front `hurt`.
- Output one strip per animation, plus a JSON with frame size, frame count, and release frame, plus a **credits manifest** listing every source PNG.
- I built a throwaway version while writing this appendix. It reproduced every recipe in §3 and §4 with no missing files. The only gaps are the expected ones: bows have no 64 px walk, and the kite shield and waraxe-behind layers have no `hurt`.
- **Drop layers with no `hurt` sheet from the death row.**

---

## 3. Hero sprite recipes

### 3.1 Weapon class → attack animation

| Class | Attack row (right = row 3) | Frames | Frame px | Release / impact frame (0-based; tune by eye) | Notes |
|---|---|---|---|---|---|
| Bow | `shoot` | 13 | 64 | 9 (the arrow layer is empty in frames 9–11) | Add the `arrow` ammo layer and a quiver. |
| **Crossbow** | `thrust` | 8 | 64 | 6 | **Art exists**: a CC0 crossbow, aimed forward. No fallback needed. |
| Spear (+ shield) | `thrust` | 8 | 64 | 5 (full reach) | Spear throw: use the same row and spawn a spear projectile on frame 5. |
| One Hand Mace (+ shield) | `slash` body + mace `slash_oversize` | 6 | 192 | 4 | Shield layer on the `slash` row. |
| Two Hand Mace | `tool_hammer` | 9 | 128 | 4 | Overhead smash, which suits slams. Alternative: club `slash_reverse_oversize` (6 frames, 192 px, sweep arc baked in). |
| Quarterstaff | `thrust` with the `simple` staff | 8 | 64 | 4 | Swap the crook's blue gem ramp to wood brown so it reads as a plain staff. Alternative: `weapon_magic_s.json` `thrust_oversize`. |
| Wand | `slash` with the wand | 6 | 64 | 4 (flick) | **Deviation:** the wand has no spellcast art. Alternative: `spellcast` with no weapon drawn and a glow at the hand. |
| Staff (jewelled) | `thrust_oversize` (staff + crystal) | 8 | 192 | 3 | Reads as "point staff and cast". **Deviation** from spellcast, because these staffs have no spellcast sheet. |
| Staff (plain) | `spellcast` with the `simple` staff | 7 | 64 | 5 | Use for area-spell heroes if you prefer the raised-arms pose. |
| Sceptre (acolytes, auras) | `spellcast` with the `simple` crook | 7 | 64 | 5 | **No sceptre art exists in any pack.** The crook staff stands in. |

Swap `shoot.png` / `thrust.png` / `slash.png` for `walk.png` or `hurt.png` in the same folder to get the other rows.

### 3.2 Recipes (verified layer files)

Each table lists the exact ULPC definition and the attack-row file.

- **Colour** is a palette ramp (§2.5) or a file variant.
- `default` means the item's base ramp.
- Bodies and heads in the same recipe take the same skin ramp.

#### Bow: ranger (recurve, hood, quiver)

`bow_ranger`: body `male`; shown: `shoot`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `shoot` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/shoot.png` | default |
| Head | `head/heads/human/heads_human_male.json` | `head/heads/human/male/shoot.png` | default |
| Hair | `hair/long/hair_long.json` | `hair/long/adult/shoot.png` | chestnut |
| Torso | `torso/armour/torso_armour_leather.json` | `torso/armour/leather/male/shoot.png` | default |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/shoot.png` | forest |
| Feet | `feet/boots/feet_boots_basic.json` | `feet/boots/basic/male/shoot.png` | brown |
| Headwear | `headwear/coverings/hoods/hat_hood_cloth.json` | `hat/cloth/hood/adult/shoot.png` | forest |
| Quiver | `torso/backpack/quiver.json` | `quiver/shoot/quiver.png` | quiver |
| Weapon | `weapons/ranged/bow/weapon_ranged_bow_recurve.json` | `weapon/ranged/bow/recurve/universal/background/shoot/medium.png`<br>`weapon/ranged/bow/recurve/universal/foreground/shoot/medium.png` | medium |
| Ammo | `weapons/ranged/bow/weapon_ranged_bow_arrow.json` | `weapon/ranged/bow/arrow/shoot/arrow.png` | arrow |

#### Crossbow: arbalist

`crossbow`: body `male`; shown: `thrust`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `thrust` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/thrust.png` | bronze |
| Head | `head/heads/human/heads_human_male_gaunt.json` | `head/heads/human/male_gaunt/thrust.png` | bronze |
| Torso | `torso/torso_chainmail.json` | `torso/chainmail/male/thrust.png` | default |
| Over-torso | `torso/jacket/torso_jacket_tabard.json` | `torso/jacket/tabard/male/thrust/maroon.png` | maroon |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/thrust.png` | charcoal |
| Feet | `feet/boots/feet_boots_rim.json` | `feet/boots/rimmed/male/thrust.png` | black |
| Headwear | `headwear/helmets/helmets/hat_helmet_kettle.json` | `hat/helmet/kettle/adult/thrust.png` | default |
| Weapon | `weapons/ranged/weapon_ranged_crossbow.json` | `weapon/ranged/crossbow/background/thrust/crossbow.png`<br>`weapon/ranged/crossbow/foreground/thrust/crossbow.png` | crossbow |

#### Spear + shield: legionary

`spear_shield`: body `female`; shown: `thrust`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `thrust` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/female/thrust.png` | olive |
| Head | `head/heads/human/heads_human_female.json` | `head/heads/human/female/thrust.png` | olive |
| Hair | `hair/braids/hair_ponytail.json` | `hair/ponytail/adult/fg/thrust.png`<br>`hair/ponytail/adult/bg/thrust.png` | black |
| Torso | `torso/armour/torso_armour_legion.json` | `torso/armour/legion/female/thrust.png` | bronze |
| Legs | `legs/skirts/legs_skirts_legion.json` | `legs/skirts/legion/thin/thrust.png` | red |
| Feet | `feet/feet_sandals.json` | `feet/sandals/thin/thrust.png` | brown |
| Headwear | `headwear/helmets/helmets/hat_helmet_legion.json` | `hat/helmet/legion/adult/thrust.png` | default |
| Weapon | `weapons/polearm/weapon_polearm_spear.json` | `weapon/polearm/spear/foreground/thrust/medium.png`<br>`weapon/polearm/spear/background/thrust/medium.png` | medium |
| Shield | `weapons/shields/shield_spartan.json` | `shield/spartan/bg/thrust/spartan.png`<br>`shield/spartan/fg/thrust/spartan.png` | spartan |

#### One Hand Mace + shield: wall knight

`mace_shield_wall`: body `male`; shown: `slash_oversize`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/slash.png` | default |
| Head | `head/heads/human/heads_human_male.json` | `head/heads/human/male/slash.png` | default |
| Torso | `torso/armour/torso_armour_plate.json` | `torso/armour/plate/male/slash.png` | default |
| Arms | `arms/arms_armour.json` | `arms/armour/plate/male/slash.png` | default |
| Legs | `legs/legs_armour.json` | `legs/armour/plate/male/slash.png` | default |
| Feet | `feet/feet_armour.json` | `feet/armour/plate/male/slash.png` | default |
| Headwear | `headwear/helmets/helmets/hat_helmet_greathelm.json` | `hat/helmet/greathelm/male/slash.png` | default |
| Weapon | `weapons/blunt/weapon_blunt_mace.json` | `weapon/blunt/mace/attack_slash/behind/mace.png`<br>`weapon/blunt/mace/attack_slash/mace.png` | mace |
| Shield | `weapons/shields/engrailed/shield_crusader.json` | `shield/crusader/bg/slash/crusader.png`<br>`shield/crusader/fg/male/slash/crusader.png` | crusader |

#### Two Hand Mace: hammer (primary)

`twohand_hammer`: body `male`; shown: `tool_hammer`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `tool_hammer` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/slash.png` | taupe |
| Head | `head/heads/human/heads_human_male.json` | `head/heads/human/male/slash.png` | taupe |
| Beard | `hair/beards/beards_beard.json` | `beards/beard/basic/slash.png` | ginger |
| Hair | `hair/bald/hair_balding.json` | `hair/balding/adult/slash.png` | ginger |
| Torso | `torso/torso_chainmail.json` | `torso/chainmail/male/slash.png` | default |
| Arms | `arms/shoulders/shoulders_pauldrons.json` | `shoulders/pauldrons/male/slash.png` | default |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | brown |
| Feet | `feet/boots/feet_boots_fold.json` | `feet/boots/fold/male/slash.png` | black |
| Weapon | `tools/tool_hammer.json` | `tools/hammer/bg.png`<br>`tools/hammer/fg.png` | default |

#### Two Hand Mace: club (alternative)

`twohand_club`: body `male`; shown: `slash_reverse_oversize`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash_reverse_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/slash.png` | brown |
| Head | `head/heads/human/heads_human_male.json` | `head/heads/human/male/slash.png` | brown |
| Hair | `hair/bald/hair_shorthawk.json` | `hair/shorthawk/adult/slash.png` | black |
| Torso | `torso/armour/torso_armour_leather.json` | `torso/armour/leather/male/slash.png` | default |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | brown |
| Feet | `feet/boots/feet_boots_basic.json` | `feet/boots/basic/male/slash.png` | brown |
| Weapon | `weapons/blunt/weapon_blunt_club.json` | `weapon/blunt/club/club.png`<br>`weapon/blunt/club/background/club.png` | club |

#### Quarterstaff: monk

`quarterstaff_monk`: body `male`; shown: `thrust`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `thrust` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/thrust.png` | amber |
| Head | `head/heads/human/heads_human_male.json` | `head/heads/human/male/thrust.png` | amber |
| Hair | `hair/extensions/ponytails/hairext_topknot_short.json` | `hair/extensions/ponytails/topknot_short/adult/thrust.png` | black |
| Torso | `torso/shirts/sleeveless/torso_clothes_sleeveless2.json` | `torso/clothes/sleeveless/sleeveless2/male/thrust.png` | orange |
| Belt | `torso/waist/belt_sash.json` | `torso/waist/sash/male/thrust/maroon.png` | maroon |
| Legs | `legs/pants/legs_pantaloons.json` | `legs/pantaloons/male/thrust.png` | tan |
| Feet | `feet/feet_sandals.json` | `feet/sandals/male/thrust.png` | brown |
| Weapon | `weapons/magic/weapon_magic_simple.json` | `weapon/magic/simple/foreground/thrust/simple.png`<br>`weapon/magic/simple/background/thrust/simple.png` | simple |

#### Wand: caster

`wand_caster`: body `female`; shown: `slash`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/female/slash.png` | default |
| Head | `head/heads/human/heads_human_female.json` | `head/heads/human/female/slash.png` | default |
| Hair | `hair/long/hair_long_straight.json` | `hair/long_straight/adult/slash.png` | platinum |
| Torso | `torso/shirts/torso_clothes_robe.json` | `torso/clothes/robe/female/slash/blue.png` | blue |
| Headwear | `headwear/hats/magic/hat_magic_celestial.json` | `hat/magic/celestial/adult/slash/blue.png` | blue |
| Weapon | `weapons/magic/weapon_magic_wand.json` | `weapon/magic/wand/female/slash/wand.png` | wand |

#### Staff: jewelled (fire example)

`staff_caster`: body `male`; shown: `thrust_oversize`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `thrust_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/thrust.png` | default |
| Head | `head/heads/human/heads_human_male_elderly.json` | `head/heads/human/male_elderly/thrust.png` | default |
| Beard | `hair/beards/beards_winter.json` | `beards/beard/winter/male/thrust.png` | white |
| Torso | `torso/shirts/longsleeve/torso_clothes_longsleeve.json` | `torso/clothes/longsleeve/longsleeve/male/thrust.png` | red |
| Legs | `legs/skirts/legs_skirts_plain.json` | `legs/skirts/plain/male/thrust.png` | red |
| Feet | `feet/feet_slippers.json` | `feet/slippers/male/thrust.png` | maroon |
| Cape | `torso/cape/cape_solid.json` | `cape/solid/fg/thrust.png`<br>`cape/solid/bg/thrust.png` | maroon |
| Headwear | `headwear/hats/magic/hat_magic_wizard.json` | `hat/magic/wizard/base/adult/thrust/base_red.png` | base_red |
| Weapon | `weapons/magic/weapon_magic_diamond.json` | `weapon/magic/diamond/thrust/foreground/dark.png`<br>`weapon/magic/diamond/thrust/background/dark.png` | dark |
| Staff gem | `weapons/magic/weapon_magic_crystal.json` | `weapon/magic/crystal/thrust/foreground/orange.png`<br>`weapon/magic/crystal/thrust/background/orange.png` | orange |

#### Acolyte 1: robed

`acolyte_robed`: body `female`; shown: `spellcast`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `spellcast` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/female/spellcast.png` | brown |
| Head | `head/heads/human/heads_human_female.json` | `head/heads/human/female/spellcast.png` | brown |
| Torso | `torso/shirts/torso_clothes_robe.json` | `torso/clothes/robe/female/spellcast/white.png` | white |
| Headwear | `headwear/coverings/hoods/hat_hood_cloth.json` | `hat/cloth/hood/adult/spellcast.png` | white |
| Belt | `torso/waist/belt_robe.json` | `torso/waist/belt_robe/female/spellcast/teal.png` | teal |
| Weapon | `weapons/magic/weapon_magic_simple.json` | `weapon/magic/simple/foreground/spellcast/simple.png`<br>`weapon/magic/simple/background/spellcast/simple.png` | simple |

#### Acolyte 2: twin / burst

`acolyte_twin`: body `male`; shown: `spellcast`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `spellcast` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/spellcast.png` | olive |
| Head | `head/heads/human/heads_human_male_small.json` | `head/heads/human/male_small/spellcast.png` | olive |
| Hair | `hair/short/hair_bangsshort.json` | `hair/bangsshort/adult/spellcast.png` | black |
| Torso | `torso/shirts/longsleeve/torso_clothes_longsleeve.json` | `torso/clothes/longsleeve/longsleeve/male/spellcast.png` | sky |
| Legs | `legs/skirts/legs_skirts_plain.json` | `legs/skirts/plain/male/spellcast.png` | sky |
| Belt | `torso/waist/belt_sash.json` | `torso/waist/sash/male/spellcast/navy.png` | navy |
| Feet | `feet/feet_sandals.json` | `feet/sandals/male/spellcast.png` | brown |
| Headwear | `headwear/hats/magic/hat_magic_celestial_moon.json` | `hat/magic/celestial_moon/adult/spellcast/bluegray.png` | bluegray |
| Weapon | `weapons/magic/weapon_magic_simple.json` | `weapon/magic/simple/foreground/spellcast/simple.png`<br>`weapon/magic/simple/background/spellcast/simple.png` | simple |

#### Acolyte 3: sturdy

`acolyte_sturdy`: body `muscular`; shown: `spellcast`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `spellcast` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/muscular/spellcast.png` | taupe |
| Head | `head/heads/human/heads_human_male.json` | `head/heads/human/male/spellcast.png` | taupe |
| Beard | `hair/beards/beards_medium.json` | `beards/beard/medium/spellcast.png` | gray |
| Legs | `legs/skirts/legs_skirts_legion.json` | `legs/skirts/legion/male/spellcast.png` | white |
| Arms | `arms/shoulders/shoulders_legion.json` | `shoulders/legion/male/spellcast.png` | silver |
| Arms | `arms/arms_armour.json` | `arms/armour/plate/male/spellcast.png` | silver |
| Feet | `feet/feet_armour.json` | `feet/armour/plate/male/spellcast.png` | silver |
| Cape | `torso/cape/cape_solid.json` | `cape/solid/fg/spellcast.png`<br>`cape/solid/bg/spellcast.png` | white |
| Headwear | `headwear/helmets/helmets/hat_helmet_nasal.json` | `hat/helmet/nasal/adult/spellcast.png` | default |
| Weapon | `weapons/magic/weapon_magic_simple.json` | `weapon/magic/simple/foreground/spellcast/simple.png`<br>`weapon/magic/simple/background/spellcast/simple.png` | simple |

#### Sceptre: aura knight

`aura_banner_knight`: body `male`; shown: `spellcast`, row 3 (right).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `spellcast` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/spellcast.png` | default |
| Head | `head/heads/human/heads_human_male.json` | `head/heads/human/male/spellcast.png` | default |
| Hair | `hair/short/hair_parted.json` | `hair/parted/adult/spellcast.png` | blonde |
| Torso | `torso/armour/torso_armour_plate.json` | `torso/armour/plate/male/spellcast.png` | gold |
| Legs | `legs/legs_armour.json` | `legs/armour/plate/male/spellcast.png` | gold |
| Feet | `feet/feet_armour.json` | `feet/armour/plate/male/spellcast.png` | gold |
| Cape | `torso/cape/cape_solid.json` | `cape/solid/fg/spellcast.png`<br>`cape/solid/bg/spellcast.png` | blue |
| Headwear | `headwear/hats/formal/hat_formal_crown.json` | `hat/formal/crown/adult/spellcast/crown_gold.png` | crown_gold |
| Weapon | `weapons/magic/weapon_magic_simple.json` | `weapon/magic/simple/foreground/spellcast/simple.png`<br>`weapon/magic/simple/background/spellcast/simple.png` | simple |

**Swap-outs I checked**

- `head/heads/human/male_plump` has an unknown co-author ("??") in `CREDITS.csv`. **Don't use it.**
- `heads_human_male_elderly.json`, `_gaunt`, `_small`, and the female heads are all fine.

### 3.3 Element palette variants

Apply these with the recolour system. The cloth ramp goes on the torso, legs, cape, and hood or hat; the metal ramp goes on armour.

| Element | Cloth ramp | Metal ramp | Hair | Eyes | Staff crystal | Wizard / celestial hat | Banner colour |
|---|---|---|---|---|---|---|---|
| Fire | `red`, `maroon`, `orange` | `copper` | `red`, `carrot` | red | `orange` or `red` | `base_red` / `red` | red |
| Cold | `blue`, `navy`, `sky` | `silver` | `platinum`, `white` | blue | `blue` | `base_teal` / `blue` | blue |
| Lightning | `yellow`, `tan` | `gold`, `brass` | `blonde`, `gold` | yellow | `yellow` | `base_yellow` / `yellow` | tan |
| Chaos | `purple`, `lavender`, `black` | `iron` | `violet`, `purple` | purple | `purple` (`green` for poison) | `base_black` / `purple` | black shield banner |
| Physical | `brown`, `leather`, `gray` | `steel` | `dark_brown`, `chestnut` | brown | none (bare staff) | `base_brown` / `brown` | white |

- For finer steps, `all.lpcr` has `garnet`, `red_orange`, `ice`, `powder`, `cyan`, `lemon`, `amethyst`, `plum`, and `cerise`.
- I rendered the jewelled staff in all five element palettes. Each one is distinct at 1×.

### 3.4 Keeping ~30 heroes distinct

The hero list is in appendix B. Art distinguishes heroes on four axes:

1. **Weapon silhouette**: 9 classes, fixed by the skill.
2. **Element palette** (§3.3), from the skill's damage type.
3. **Headwear silhouette**, the strongest read at 64 px:

   | Class | Headwear pool (`ulpc-generator/sheet_definitions/headwear/…`) |
   |---|---|
   | Bow | `coverings/hoods/hat_hood_cloth.json`, `hats/caps/hat_cap_leather_feather.json` |
   | Crossbow | `helmets/helmets/hat_helmet_kettle.json`, `hat_helmet_morion.json` |
   | Spear | `helmets/helmets/hat_helmet_legion.json`, `hat_helmet_spangenhelm.json`, `hat_helmet_norman.json` |
   | One Hand Mace (walls) | `helmets/helmets/hat_helmet_greathelm.json`, `hat_helmet_sugarloaf.json`, `hat_helmet_bascinet.json` |
   | Two Hand Mace | `helmets/helmets/hat_helmet_barbarian.json`, `hat_helmet_horned.json`, or bare head with a beard |
   | Quarterstaff | Bare head, with a topknot (`hair/extensions/ponytails/hairext_topknot_short.json`) |
   | Wand | `hats/magic/hat_magic_celestial.json` |
   | Staff | `hats/magic/hat_magic_wizard.json` |
   | Acolyte | Hood, or bare |
   | Aura | `hats/formal/hat_formal_crown.json` |
   | Curse / mark | `coverings/hoods/hat_hood_sack_cloth.json`, in dark cloth |

4. **Body and skin**: male, female, or teen; 7 ULPC skins plus 9 LPCR skins.

**Rules**

- No two heroes share both weapon class and element.
- Within a class, no two share headwear.
- Two heroes of the same skill (allowed in the roster) are the same sprite. The card's rarity frame tells them apart.

### 3.5 Acolytes and aura heroes

**Three acolyte looks**

All three are in the §3.2 tables. They all hold the `simple` crook as a sceptre and use `spellcast`.

| Acolyte | Look | Role hint |
|---|---|---|
| `acolyte_robed` | Female, white robe and hood, teal robe belt | Cheap basic acolyte |
| `acolyte_twin` | Male, sky long robe (`longsleeve` + plain skirt), navy sash, moon hat | Twin / burst variant |
| `acolyte_sturdy` | **Muscular**, legion skirt, silver arm and shoulder plates, nasal helm, white cape | Sturdy one |

**Aura heroes**

- Recipe `aura_banner_knight`: gold plate, crown, and blue cape, holding the crook.
  - **Global auras** (Heralds, Purities, Discipline) get a slow, element-coloured halo ring under the feet.
  - **Positional auras** draw their tile radius as a faint ground ellipse with 0.5 aspect.
- **Banners.** ULPC has no banner or flag layer. A Banner hero gets a **banner prop planted on its tile**, drawn behind the sprite and offset 16 px left:
  - Flags on poles: `lpc-victorian-town-decorations/files/lpc-victorian-decoration/victorian-streets.png`, cells 0–5,2–6, in white, blue, green, red, and tan. Pick the colour from §3.3.
  - Hanging banners: `lpc-medieval-village-decorations/files/decoration_medieval/decorations-medieval.png`, cells 0–5,38–40, in white, blue, green, red, tan, and a black shield. These also dress the gate wall.

---

## 4. Monster family map

### 4.1 Archetypes

Names and archetypes follow appendix D §2. Walk and attack rows face left (row 1).

| # | Archetype (MvM name) | Source | Walk | Attack | Hurt (hit) | Death | Gaps → fallback | Scale |
|---|---|---|---|---|---|---|---|---|
| 1 | Shambler (Shambling Corpse) | ULPC zombie body + zombie head, recipe `m01` | `walk` 9 | `slash` 6 or `thrust` 8 | none → flash | `hurt` 6 | No idle or run | 1.0 |
| 2a | Armoured, light (Helmed Skeleton) | ULPC skeleton + pointed "cone" helm, `m02a` | `walk` 9 | `slash` 6 (claw) | flash | `hurt` 6 | **Plating break:** re-bake without the helmet layer and swap sheets | 1.0 |
| 2b | Armoured, heavy (Plated Skeleton) | ULPC skeleton + steel plate + greathelm ("bucket") + longsword, `m02b` | `walk` 9 | `slash_oversize` 6 | flash | `hurt` 6 | Plating break → swap to the `m02a` sheet without the helm | 1.0 |
| 3 | Shieldbearer (Shield Skeleton) | ULPC skeleton + nasal helm + spear + kite shield, `m03` | `walk` 9 | `thrust` 8 | flash | `hurt` 6 | Kite shield has no `hurt` (drop it). Shield break → re-bake without the shield. | 1.0 |
| 4 | Runner (Ghoul Runner) | ULPC male body `fur_grey` + wolf head + wolf tail, `m04` | **`run` 8** | `slash` 6 | flash | `hurt` 6 | — | 1.0 |
| 5 | Leaper (Goblin Leaper) | ULPC teen body `green` + goblin head + spear, `m05` | `walk` 9 | `slash` 6; leap = **`jump` 5** | flash | `hurt` 6 | — | 1.0 |
| 6 | Ranged (Goblin Archer) | ULPC teen + goblin head + bow + arrow, `m06`; alternative skeleton archer `m06alt` | `walk` 9 (no bow layer; bow `walk` is only `walk_128`) | **`shoot` 13** | flash | `hurt` 6 | Composite `walk_128` for the bow on the walk row, or hide the bow while walking | 1.0 |
| 7 | Flier (Bat) | **source-of-tales** `source-of-tales/sprites/monsters/bat.png` | 3-frame flap loop on row 1 (L), 32×32 | none (never attacks) | flash | `bat_death.png` fade (4 frames + blank) | No walk sheet, but the flap is enough. Fly 24 px above the lane with a ground shadow. ULPC alternative: vampire + bat wings, `m07alt`. | **2×** |
| 8 | Burrower (Burrowing Beetle) | **source-of-tales** `source-of-tales/sprites/monsters/beetle.png` | **48×48**, rows **down, up, right, left**: left walk frames 15–17, right walk 10–12 | left 17–19, right 12–14 | flash | `beetle_death.png`: 1 static frame per direction (49×196) | Greyscale, so tint it brown. The PNG is 1 px off-grid; ignore the extra row and column. **Tunnelling** is procedural: a dirt-mound ripple plus the mud decal at (0,96) in `lpc-revised/Objects/Small Items/Dungeon Elements.png`. **Emerging** is a dust burst plus a squash pop. | 1.5× |
| 9 | Shaman (Orc Shaman) | ULPC male `dark_green` + orc head + robe pieces + wizard hat + crook, `m09` | `walk` 9 | `spellcast` 7 (heal pulse) | flash | `hurt` 6 | — | 1.0 |
| 10 | Splitter (Rot Slime) | **source-of-tales** `source-of-tales/sprites/monsters/slime.png` | 3-frame wobble on row 1, 32×32 | none → code lunge (2, 4, 8, 4, 2 px, as `slime.xml` does) | flash | `slime_death.png` fade | **Procedural movement:** hop with squash and stretch (y-scale 0.85↔1.1, sine) | **2×** adult, **1×** children |
| 11 | Brute (Minotaur Brute) | ULPC **muscular** `brown` + minotaur head + waraxe, `m11`; alternative troll with club `m11alt` | `walk` 9 | `slash_oversize` 6 | flash | `hurt` 6 | Waraxe-behind layer has no `hurt` (drop it) | 1.5× |
| 12 | Swarm (Rat Swarm) | ULPC **child** body `fur_brown` + rat child head, `m12` | `walk` 9 | `slash` 6 | flash | `hurt` 6 | Pack of 3 at 0.3-tile spacing, with ±3 px y jitter | 1.0 (the child body is already small) |

**Universal gap: no hit-reaction frames anywhere.** Use a white flash, a 2 px knockback, and a 0.95 squash for 60 ms.

**Flipping.** Every source here already has a left-facing row. For source-of-tales critters the left row is a pixel mirror of the right one anyway. Never flip ULPC composites, because the weapon hands would swap.

**source-of-tales details** (`source-of-tales/sprites/monsters/`)

| Sheet | Size | Frame | Rows | XML | Notes |
|---|---|---|---|---|---|
| `bat.png`, `bat_death.png` | 96×128, 160×128 | 32 | U, L, D, R × 3 | `bat.xml` (75 ms) | Purple, about 20×26 px |
| `slime.png`, `slime_death.png` | 96×128, 160×128 | 32 | U, L, D, R × 3 | `slime.xml` (150 ms) | Green. No colour variants, so tint per biome. |
| `beetle.png`, `beetle_death.png` | 240×193, 49×196 | 48 | D, U, R, L × 5 | `beetle.xml` | Greyscale (LA mode). **Licence:** CC-BY-SA 3.0 + GPLv2. |
| `small_worm.png` | 96×128 | 32 | 4 × 3 | none | Stationary. An optional "emerging" prop for the Burrower. |
| `skeleton_walkcycle.png`, `_slash`, `_spellcast`, `_hurt` | standard LPC | 64 | U, L, D, R | `skeleton.xml` | Same layout as the ULPC skeleton |
| `skeleton_boss_walkcycle.png`, `_slash`, `_spellcast`, `_hurt` | 1152×512 … | 128 | U, L, D, R | `skeleton_boss.xml` | **A pixel-exact 2× of the skeleton** |

### 4.2 ULPC monster recipes (verified layer files)

#### 1. Shambling Corpse (Shambler)

`m01_shambling_corpse`: body `male`; shown: `slash`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/special/body_zombie.json` | `body/bodies/zombie/slash/zombie.png` | zombie |
| Head | `head/heads/undead/heads_zombie.json` | `head/heads/zombie/adult/slash.png` | default |
| Torso | `torso/shirts/longsleeve/torso_clothes_longsleeve.json` | `torso/clothes/longsleeve/longsleeve/male/slash.png` | brown |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | charcoal |

#### 2a. Helmed Skeleton (Armoured, light)

`m02a_helmed_skeleton`: body `male`; shown: `slash`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/special/body_skeleton.json` | `body/bodies/skeleton/slash.png` | default |
| Head | `head/heads/undead/heads_skeleton.json` | `head/heads/skeleton/adult/slash.png` | default |
| Headwear | `headwear/helmets/helmets/hat_helmet_pointed.json` | `hat/helmet/pointed/adult/slash.png` | default |

#### 2b. Plated Skeleton (Armoured, heavy)

`m02b_plated_skeleton`: body `male`; shown: `slash_oversize`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/special/body_skeleton.json` | `body/bodies/skeleton/slash.png` | default |
| Head | `head/heads/undead/heads_skeleton.json` | `head/heads/skeleton/adult/slash.png` | default |
| Torso | `torso/armour/torso_armour_plate.json` | `torso/armour/plate/male/slash.png` | steel |
| Legs | `legs/legs_armour.json` | `legs/armour/plate/male/slash.png` | steel |
| Headwear | `headwear/helmets/helmets/hat_helmet_greathelm.json` | `hat/helmet/greathelm/male/slash.png` | default |
| Weapon | `weapons/sword/weapon_sword_longsword.json` | `weapon/sword/longsword/attack_slash/behind/longsword.png`<br>`weapon/sword/longsword/attack_slash/longsword.png` | longsword |

#### 3. Shield Skeleton (Shieldbearer)

`m03_shield_skeleton`: body `male`; shown: `thrust`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `thrust` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/special/body_skeleton.json` | `body/bodies/skeleton/thrust.png` | default |
| Head | `head/heads/undead/heads_skeleton.json` | `head/heads/skeleton/adult/thrust.png` | default |
| Headwear | `headwear/helmets/helmets/hat_helmet_nasal.json` | `hat/helmet/nasal/adult/thrust.png` | default |
| Weapon | `weapons/polearm/weapon_polearm_spear.json` | `weapon/polearm/spear/foreground/thrust/iron.png`<br>`weapon/polearm/spear/background/thrust/iron.png` | iron |
| Shield | `weapons/shields/shield_kite.json` | `shield/kite/male/thrust/kite_gray_gray.png` | kite gray gray |

#### 4. Ghoul Runner (Runner). Locomotion uses `run`, same folders.

`m04_ghoul_runner`: body `male`; shown: `slash`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/slash.png` | fur_grey |
| Head | `head/heads/beast/heads_wolf_male.json` | `head/heads/wolf/male/slash.png` | fur_grey |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | charcoal |
| Tail | `body/tails/tail_wolf.json` | `body/tail/wolf/adult/fg/slash/gray.png`<br>`body/tail/wolf/adult/bg/slash/gray.png` | gray |

#### 5. Goblin Leaper (Leaper)

`m05_goblin_leaper`: body `teen`; shown: `jump`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `jump` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/teen/jump.png` | green |
| Head | `head/heads/fantasy/heads_goblin.json` | `head/heads/goblin/adult/jump.png` | green |
| Legs | `legs/shorts/legs_shorts.json` | `legs/shorts/shorts/thin/jump.png` | brown |
| Weapon | `weapons/polearm/weapon_polearm_spear.json` |  | dark |

#### 6. Goblin Archer (Ranged)

`m06_goblin_archer`: body `teen`; shown: `shoot`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `shoot` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/teen/shoot.png` | green |
| Head | `head/heads/fantasy/heads_goblin.json` | `head/heads/goblin/adult/shoot.png` | green |
| Legs | `legs/shorts/legs_shorts.json` | `legs/shorts/shorts/thin/shoot.png` | brown |
| Weapon | `weapons/ranged/bow/weapon_ranged_bow_normal.json` | `weapon/ranged/bow/normal/universal/background/shoot/light.png`<br>`weapon/ranged/bow/normal/universal/foreground/shoot/light.png` | light |
| Ammo | `weapons/ranged/bow/weapon_ranged_bow_arrow.json` | `weapon/ranged/bow/arrow/shoot/arrow.png` | arrow |

#### 6 (alternative). Skeleton Archer

`m06alt_skeleton_archer`: body `male`; shown: `shoot`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `shoot` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/special/body_skeleton.json` | `body/bodies/skeleton/shoot.png` | default |
| Head | `head/heads/undead/heads_skeleton.json` | `head/heads/skeleton/adult/shoot.png` | default |
| Headwear | `headwear/coverings/hoods/hat_hood_cloth.json` | `hat/cloth/hood/adult/shoot.png` | charcoal |
| Weapon | `weapons/ranged/bow/weapon_ranged_bow_normal.json` | `weapon/ranged/bow/normal/universal/background/shoot/dark.png`<br>`weapon/ranged/bow/normal/universal/foreground/shoot/dark.png` | dark |
| Ammo | `weapons/ranged/bow/weapon_ranged_bow_arrow.json` | `weapon/ranged/bow/arrow/shoot/arrow.png` | arrow |

#### 7 (alternative). Vampire bat-wing flier (ULPC fallback for the Bat)

`m07alt_vampire_bat`: body `male`; shown: `slash`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/slash.png` | lavender |
| Head | `head/heads/undead/heads_vampire.json` | `head/heads/vampire/adult/slash.png` | lavender |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | black |
| Wings | `body/wings/wings_bat.json` | `body/wings/bat/adult/fg/slash/black.png`<br>`body/wings/bat/adult/bg/slash/black.png` | black |

#### 9. Orc Shaman (Shaman)

`m09_orc_shaman`: body `male`; shown: `spellcast`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `spellcast` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/spellcast.png` | dark_green |
| Head | `head/heads/fantasy/heads_orc_male.json` | `head/heads/orc/male/spellcast.png` | dark_green |
| Torso | `torso/shirts/longsleeve/torso_clothes_longsleeve.json` | `torso/clothes/longsleeve/longsleeve/male/spellcast.png` | maroon |
| Legs | `legs/skirts/legs_skirts_plain.json` | `legs/skirts/plain/male/spellcast.png` | maroon |
| Headwear | `headwear/hats/magic/hat_magic_wizard.json` | `hat/magic/wizard/base/adult/spellcast/base_black.png` | base_black |
| Weapon | `weapons/magic/weapon_magic_simple.json` | `weapon/magic/simple/foreground/spellcast/simple.png`<br>`weapon/magic/simple/background/spellcast/simple.png` | simple |

#### 11. Minotaur Brute (Brute)

`m11_minotaur_brute`: body `muscular`; shown: `slash_oversize`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/muscular/slash.png` | brown |
| Head | `head/heads/beast/heads_minotaur.json` | `head/heads/minotaur/male/slash.png` | brown |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | leather |
| Weapon | `weapons/blunt/weapon_blunt_waraxe.json` | `weapon/blunt/waraxe/attack_slash/behind/waraxe.png`<br>`weapon/blunt/waraxe/attack_slash/waraxe.png` | waraxe |

#### 11 (alternative). Troll Brute

`m11alt_troll_brute`: body `muscular`; shown: `slash_reverse_oversize`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash_reverse_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/muscular/slash.png` | pale_green |
| Head | `head/heads/fantasy/heads_troll.json` | `head/heads/troll/adult/slash.png` | pale_green |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | brown |
| Weapon | `weapons/blunt/weapon_blunt_club.json` | `weapon/blunt/club/club.png`<br>`weapon/blunt/club/background/club.png` | club |

#### 12. Rat Swarm (Swarm)

`m12_rat_swarm`: body `child`; shown: `slash`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/child/slash.png` | fur_brown |
| Head | `head/heads/farm/heads_rat_child.json` | `head/heads/rat/child/slash.png` | fur_brown |

#### Boss L5: The Bloated Miller (draw at 2×)

`b05_bloated_miller`: body `muscular`; shown: `slash_reverse_oversize`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash_reverse_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/muscular/slash.png` | zombie |
| Head | `head/heads/undead/heads_zombie.json` | `head/heads/zombie/adult/slash.png` | default |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | tan |
| Torso | `torso/aprons/torso_aprons_suspenders.json` | `torso/aprons/suspenders/male/slash/brown.png` | brown |
| Weapon | `weapons/blunt/weapon_blunt_club.json` | `weapon/blunt/club/club.png`<br>`weapon/blunt/club/background/club.png` | club |

#### Boss L10 (optional ULPC upgrade): The Rust King (draw at 3×)

`b10alt_rust_king_ulpc`: body `male`; shown: `thrust_oversize`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `thrust_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/special/body_skeleton.json` | `body/bodies/skeleton/thrust.png` | default |
| Head | `head/heads/undead/heads_skeleton.json` | `head/heads/skeleton/adult/thrust.png` | default |
| Torso | `torso/armour/torso_armour_plate.json` | `torso/armour/plate/male/thrust.png` | copper |
| Legs | `legs/legs_armour.json` | `legs/armour/plate/male/thrust.png` | copper |
| Arms | `arms/shoulders/shoulders_pauldrons.json` | `shoulders/pauldrons/male/thrust.png` | copper |
| Cape | `torso/cape/cape_tattered.json` | `cape/tattered/fg/thrust.png`<br>`cape/tattered/bg/thrust.png` | maroon |
| Headwear | `headwear/hats/formal/hat_formal_crown.json` | `hat/formal/crown/adult/thrust/crown_gold.png` | crown_gold |
| Weapon | `weapons/polearm/weapon_polearm_halberd.json` | `weapon/polearm/halberd/attack_thrust/behind/halberd.png`<br>`weapon/polearm/halberd/attack_thrust/halberd.png` | halberd |

#### Boss L15: Lachlann of Endless Lament (draw at 2×)

`b15_lachlann`: body `male`; shown: `slash_oversize`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash_oversize` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/slash.png` | lavender |
| Head | `head/heads/undead/heads_vampire.json` | `head/heads/vampire/adult/slash.png` | lavender |
| Hair | `hair/long/hair_long_messy.json` | `hair/long_messy/adult/slash.png` | white |
| Torso | `torso/armour/torso_armour_plate.json` | `torso/armour/plate/male/slash.png` | silver |
| Legs | `legs/legs_armour.json` | `legs/armour/plate/male/slash.png` | silver |
| Feet | `feet/feet_armour.json` | `feet/armour/plate/male/slash.png` | silver |
| Cape | `torso/cape/cape_tattered.json` | `cape/tattered/fg/slash.png`<br>`cape/tattered/bg/slash.png` | navy |
| Weapon | `weapons/sword/weapon_sword_longsword.json` | `weapon/sword/longsword/attack_slash/behind/longsword.png`<br>`weapon/sword/longsword/attack_slash/longsword.png` | longsword |

#### Boss L20: Count Geonor, phase 1 (draw at 5×)

`b20_geonor_p1`: body `male`; shown: `spellcast`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `spellcast` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/male/spellcast.png` | light |
| Head | `head/heads/human/heads_human_male_gaunt.json` | `head/heads/human/male_gaunt/spellcast.png` | default |
| Hair | `hair/short/hair_parted.json` | `hair/parted/adult/spellcast.png` | black |
| Torso | `torso/shirts/longsleeve/torso_clothes_longsleeve.json` | `torso/clothes/longsleeve/longsleeve/male/spellcast.png` | black |
| Legs | `legs/pants/legs_formal.json` | `legs/formal/male/spellcast.png` | black |
| Feet | `feet/boots/feet_boots_rim.json` | `feet/boots/rimmed/male/spellcast.png` | black |
| Cape | `torso/cape/cape_solid.json` | `cape/solid/fg/spellcast.png`<br>`cape/solid/bg/spellcast.png` | maroon |
| Headwear | `headwear/hats/formal/hat_formal_crown.json` | `hat/formal/crown/adult/spellcast/crown_red.png` | crown_red |

#### Boss L20: Count Geonor, phase 2 werewolf (draw at 5×)

`b20_geonor_p2`: body `muscular`; shown: `slash`, row 1 (left).

| Slot | Sheet definition (`ulpc-generator/sheet_definitions/`) | `slash` file (`ulpc-generator/spritesheets/`) | Colour |
|---|---|---|---|
| Body | `body/body.json` | `body/bodies/muscular/slash.png` | fur_black |
| Head | `head/heads/beast/heads_wolf_male.json` | `head/heads/wolf/male/slash.png` | fur_black |
| Legs | `legs/pants/legs_pants.json` | `legs/pants/male/slash.png` | black |
| Cape | `torso/cape/cape_solid.json` | `cape/solid/fg/slash.png`<br>`cape/solid/bg/slash.png` | maroon |
| Headwear | `headwear/hats/formal/hat_formal_crown.json` | `hat/formal/crown/adult/slash/crown_red.png` | crown_red |

### 4.3 Rarity treatment (summary)

- Magic: blue outline `#8888FF`.
- Rare: yellow outline `#FFFF77` plus **scale 1.1** plus a name plate.
- Unique: the boss scales below, with a 2 px `#AF6025` outline.
- 1.1× is a non-integer pixel scale and will shimmer slightly. That is acceptable at 2× render; or pre-bake rares at 1.1× with nearest-neighbour.

### 4.4 Bosses

| Level | Boss (PoE2 Act 1) | Lanes | Source | Scale | Rows used | Notes |
|---|---|---|---|---|---|---|
| 5 | **The Bloated Miller** | 2 | ULPC: **muscular** body (`zombie` ramp) + zombie head + suspenders + tan pants + club. Recipe `b05`. | **2×** (128 px figure frame; the club frame is 384) | `walk` row 1; Grain Slam = `slash_reverse_oversize` row 1; death = `hurt` | Appendix D: "scaled-up zombie" |
| 10 | **The Rust King** | 3 | source-of-tales `source-of-tales/sprites/monsters/skeleton_boss_walkcycle.png`, `skeleton_boss_slash.png`, `skeleton_boss_spellcast.png`, `skeleton_boss_hurt.png` | **1.5× of the boss sheet** (= 3× of the base skeleton; same pixels) | walk, slash, spellcast (summons) row 1; `hurt` | Appendix D names this sheet. Add a rust multiply tint (`#C0703A` at 40%). **Optional upgrade:** the ULPC composite `b10alt` (skeleton + copper plate + crown + halberd, `thrust_oversize` for Rust Wave) at 3×; it reads more like a king. |
| 15 | **Lachlann of Endless Lament** | 2 | ULPC: male body (`lavender`) + vampire head + white long hair + silver plate + navy tattered cape + longsword. Recipe `b15`. | **2×** | `walk`; `slash_oversize` row 1 | Lament spreads Chilled Ground FX. Mournful Shift fades to 30% alpha, leaves a blue afterimage, then reappears. |
| 20 | **Count Geonor** | 5 (stationary, columns 8–9) | Phase 1: ULPC gaunt human, black clothes, maroon cape, red crown (`b20_geonor_p1`). Phase 2: **muscular** `fur_black` + wolf head + cape + crown (`b20_geonor_p2`). | **5×** (320 px tall; the figure is about 120 px wide, filling columns 8–9) | idle; `spellcast` row 1 (Frost Breath, Call the Pack); `slash` row 1 (Moonlit Lunge); `hurt` | Phase change: white flash, smoke burst, sprite swap. A 5× pixel scale is chunky, so add a moonlit rim light (1 px cyan edge on the right side) and a big soft shadow. |

PoE2 boss names are verbatim. I checked them against the PoE2 Act 1 data (`world_areas.json` boss ids: `SwollenMiller`, `RustKing`, `BitterGuy`, `Baron`).

---

## 5. Biome tilesets

### 5.1 How LPC terrain blocks work

In `lpc-tile-atlas/files/terrain_atlas.png` and `lpc-revised/Terrain/terrain_*.png`, each ground type is a **3-column × 6-row block**:

| Block rows | Contents |
|---|---|
| 0–1 | Small decals (column 0) and inner-corner or "hole" pieces (columns 1–2) |
| 2–4 | The 3×3 outer edge block (its centre is fill) |
| 5 | **Three fill variants** |

A 64 px board cell is 2×2 tiles. Fill each cell with 4 random picks from row 5. The lawn should be one flat ground type; transitions are only needed around special tiles and lane paths.

### 5.2 Ground and lane decoration per biome

| Biome (levels) | Base ground (fill) | Path / alternative ground | Lane edges and decoration |
|---|---|---|---|
| **Grassland** (1–5) | `lpc-tile-atlas/files/terrain_atlas.png` grass 21–23,0–5 (fill row 5); flowered variant 21–23,6–11 | Light dirt 15–17,0–5. Alternative grass: `lpc-revised/Terrain/terrain_summer.png` px (96–191, 32–95). | Tufts: terrain_atlas 0–5,20–25. Flowers: `lpc-revised/Terrain/wildflowers_summer.png`. **Hedges:** `lpc-victorian-town-decorations/files/lpc-victorian-decoration/victorian-garden.png` 0–5,21–31. **Fences:** `lpc-medieval-village-decorations/files/decoration_medieval/fence_medieval.png` rows 0–4 (beam, round, plank, picket, rope). |
| **Bog** (6–10) | terrain_atlas dark swamp grass 6–8,24–29 (fill row 29) | Mud: terrain_atlas 3–5,26–31. Murky water: 12–14,0–5. | Reeds and cattails: `lpc-revised/Terrain/plants_autumn.png` columns 8–15. Lily pads: terrain_atlas 6–8,30–31. Dead trees standing in water: `lpc-beach-desert/files/lpc-beach-desert/beach-desert.png` 11–17,16–20. Mushrooms: `lpc-revised/Terrain/mushrooms.png`. Dead tree: `lpc-revised/Terrain/trees_autumn.png` columns 0–2, rows 8–12. Slime puddle: `lpc-revised/Objects/Small Items/Dungeon Elements.png` (0,64). Add a 10% green-grey fog grade. |
| **Desert ruins** (11–15) | `lpc-revised/Terrain/terrain_summer.png` light sand px (96–191, 160–223) and orange sand 3×3 at (288,160) | Tan cobbled path: terrain_atlas 8–12,20–23. Sandstone floor: 21–25,29–31. | Ruin walls: `lpc-revised/Structure/Walls/Jagged Stone Walls.png` (sandstone block at (96,192)) and `lpc-revised/Structure/Walls/Adobe Stucco Wall.png` (broken pieces in rows 3–4). Columns: `lpc-revised/Structure/Pillars/Stone Pillar A.png`. Broken brick and pillars: terrain_atlas 19–25,23–25. Bones: beach-desert 0–19,20–23. Cacti: beach-desert 0–8,4–7 and 11–18,4–7. Dune decals: beach-desert 0–12,24–27. |
| **Winter keep** (16–20) | `lpc-revised/Terrain/terrain_winter.png` snow (same cells as summer grass: px 96–191, 32–95) | Snowy cobble: px (96–191, 96–159) in the same sheet. Frozen ponds: `lpc-revised/Terrain/terrain_winter_ice.png`. | Castle stone: fence_medieval crenellated walls 8–14,16–20 and ruined crenellations 8–15,21–22; `lpc-tile-atlas/files/base_out_atlas.png` dark castle walls 0–6,12–15. Torches: `lpc-revised/Objects/Wall Items/Lighting, Wall.png`. Snowy pines: `lpc-revised/Terrain/trees_winter.png`. Use the slate band of the rocks. |

### 5.3 Terrain feature tiles

| Feature | Grassland | Bog | Desert ruins | Winter keep | Overlay or FX |
|---|---|---|---|---|---|
| **Rock** (unplaceable) | `lpc-revised/Terrain/Rocks, Grasslands.png`: taupe boulder 64×64 at (128,0), **exactly one cell** | Slate boulder (128,256) | Tan boulder (128,128) | Slate boulder (128,256), plus a white top tint | Alternative: terrain_atlas boulders 27–29,23–27 |
| **Shallow Water** | terrain_atlas grass-edged water 6–8,9–14 | Murky water 12–14,0–5 | Sand-edged water 3–5,9–14 | `lpc-revised/Terrain/ice-shallows.png` ice-to-water hole blocks | Wading monsters get `lpc-revised/FX/WaterRipple.png` + `WaterRipple_Back.png` (2 × 64×32); entry plays `lpc-revised/FX/Splash.png` + `Splash_Back.png` (6 × 64×32) |
| **Shrine** | `lpc-revised/Objects/Furniture/Wolf Stone.png`: bronze medallion 64×64 at (0,0), one cell, flat | Silver (64,0) | Ivory (0,64) | Slate (64,64) | Pulsing gold ring plus up-drifting motes. Alternatives: medieval stepped dais 5–7,10–12 with a statue from 0–4,9–10; `lpc-tile-atlas2/files/build_atlas.png` lion statue 27–28,8–10. |
| **Burning Ground** | terrain_atlas lava 15–17,6–11 (fill row 11) or charred rock 18–20,6–11 | same | same | same | Loop flames from `lpc-revised/Objects/Small Items/Fire, Camp.png` (4 × 32×32 at y 32), plus ember particles `#FF6A1A`. Alternative flames: medieval campfire 8–12,47–48. |
| **Chilled Ground** | `lpc-revised/Terrain/ice-shallows.png` cracked-ice row 0 (6 tiles) | same | same | `lpc-revised/Terrain/terrain_winter_ice.png` ice | 25% cyan overlay plus drifting snowflake particles |
| **Grave** (spawns) | medieval open grave 3–4,0–2 (64×96, headstone + soil) | `lpc-tile-atlas2/files/obj_misk_atlas.png` open grave 20–21,25–27 | terrain_atlas headstone 14,21–22 or cross 15,21–22, plus bones | Medieval headstones 0–4,0–4 with a snow tint | Spawn: dirt burst plus bone bits from `lpc-revised/Objects/Small Items/Skeletons A.png` |

### 5.4 Strongbox

- Use `lpc-revised/Objects/Furniture/Chest.png` (128×96).
  - Columns: large flat, **large domed**, small flat, small domed.
  - Rows: closed (y 0), opening (y 32), open (y 64).
- Use the **large domed** chest: closed (32,0), opening (32,32), open (32,64).
- Draw it at 1× in the cell centre, which is LPC-correct next to the characters.
- Add a gold glow column and a "Strongbox" label in `#AA9E82`.
- Alternatives: `source-of-tales/tiles/chests.png` and `neverwell-moor/resources/img/chests.png` (64×96, 2 styles × 3 states).

### 5.5 Life Pool, wardstone, and gate

- **Life Pool:** `lpc-medieval-village-decorations/files/decoration_medieval/decorations-medieval.png` fountain, 0–5,16–19 (six 2×2 frames, animated).
  - Place it in the gate column, centred on lane 3.
  - As life drops, tint the water from cyan toward red.
  - Each leak plays a splash and a 2 px screen shake.
- Alternatives:
  - `lpc-revised/Structure/Misc/Fountain A.png` (64×96, static);
  - `lpc-victorian-town-decorations/files/lpc-victorian-decoration/victorian-garden.png` hex pools 0–5,37–38 (3 frames);
  - wells in the medieval sheet at 0–1,13–15 and 14–15,13–15.
- **Wardstone:** there is no clean LPC wardstone. The sci-fi obelisk and crystal have **no licence**, so don't use them.
- **Gate wall:** fence_medieval stone brick wall 0–4,20–24, dressed with hanging banners (medieval 0–5,38–40).

---

## 6. FX and projectiles

| Need | Asset | Format | Use / fallback |
|---|---|---|---|
| **Arrow** | `ulpc-generator/spritesheets/weapon/ranged/bow/arrow/shoot/arrow.png`, row 3, frame 7: rect x 477–508, y 219–224 | 31×5 static | Tint the head per element, plus a 1 px procedural trail |
| **Crossbow bolt** | **None** | — | Procedural: a 14×3 dark shaft with a 3 px steel head; or the arrow crop trimmed to 20 px |
| **Thrown spear** | ULPC spear `weapon/polearm/spear/foreground/thrust/medium.png` plus `background/thrust/medium.png`, row 3, frame 5 composited | about 60×5 | Or a 40 px canvas line with a head |
| Spell bolt (fire, cold, lightning) | `source-of-tales/particles/effects01.png`: red, yellow, and blue 16×16 orbs, 4 frames each (top-left 144×48) | 16 px | Chaos: tint the blue orb `#B44DFF` |
| Fireball | `source-of-tales/particles/firelion_right_small.png` | 4×4 of 64 px | Right-facing exists |
| Ice shard | `source-of-tales/particles/flash.png` (ice-shard bolt in 4 directions, impact sparks, beam streaks) | about 32 px cells | — |
| Lightning strike | `source-of-tales/particles/lightningclaw.png` (4×4 of 128); `source-of-tales/particles/lightning1.png` (60×198 single bolt) | — | **Chain / Arc:** procedural jagged polyline (midpoint displacement), `#FFE14D` with a white 1 px core, 120 ms |
| Explosion | `source-of-tales/particles/bomb_explosion.png` | 64 px, 21 frames | Fire AoE, Comet |
| Slam shockwave | `source-of-tales/particles/quake.png` | 6 × 256×128, greyscale | Tint per element; Earthquake, Two Hand Mace slams |
| Ice burst / freeze | `source-of-tales/particles/icetacle.png`; `source-of-tales/particles/iceshield.png` | 4×4 of 128 | Frost Bomb, freeze apply |
| Earth or ice spikes | `source-of-tales/particles/rock_spikes.png` | 64 px (has an ice-blue row) | — |
| Poison / chaos strike | `source-of-tales/particles/snakebite_right.png` | 4×4 of 128 | Tint purple for chaos |
| Water splash | `lpc-revised/FX/Splash.png` + `Splash_Back.png`; `source-of-tales/particles/torrentacle.png` | 6 × 64×32; 4×4 of 128 | — |
| Heal / buff sparkle | `source-of-tales/particles/orb_5x5_dyable.png` (also `orb_3x3`, `orb_7x7`, `orb_10x10`) | greyscale dots | Tint per use (`heal.spell.xml` does this). Also the mana orb glow. |
| Ward / shield bubble | `source-of-tales/particles/turtleshell_front.png` | 4×4 of 128 | — |
| Tornado | `source-of-tales/particles/tornado.png` | 4×4 of 128 | — |
| Ground fire | `lpc-revised/Objects/Small Items/Fire, Camp.png` | 4 × 32 | Burning Ground, ignite |
| Melee swing arcs | Baked into the club `slash_reverse_oversize` and longsword sheets | — | For others, a procedural 90° arc stroke, 100 ms |

**Procedural fallbacks** (cheap, and match LPC's flat style)

- **Particles**: tinted dyable orbs (3–10 px), additive blend, 200–600 ms lifetimes.
- **Bolts and lines** drawn on canvas with 1 px pixel snapping: crossbow bolts, chain lightning, beams, and the lane-line attacks from appendix A.
- **AoE rings**: ellipses at 0.5 aspect (3/4 perspective), radius in tiles × 64 px.
- **Telegraphs** (appendix D): pulsing tile overlays, `#FF8A00` for normal and `#FF2020` for unblockable, 1.2–1.5 s.
- **Damage numbers**: 8 px pixel font, coloured by damage type; crits 1.5× size.

---

## 7. Item and currency icons

**Source.** `source-of-tales/items/` holds **746 individual 32×32 PNGs** (no atlases).

- About 671 are by David E. Gervais, in **DCSS style, not LPC**, licensed CC-BY-SA 3.0 only.
- About 75 lowercase files (for example `spear-iron.png`) are chunkier and LPC-like.
- UI icons are allowed to differ in style, so use the best match.
- Draw them at 2× on stash cards, inside a rarity-coloured frame.

### 7.1 Item classes

| Item class | Icon (`source-of-tales/items/`) | Alternatives |
|---|---|---|
| Bow | `BowLong.png` | `BowShort.png`, `Bow01.png`–`Bow10.png` |
| Crossbow | `xbow06.png` | `CrossbowHeavy.png`, `CrossbowLight.png`, `Xbow01.png` |
| Spear | `spear-iron.png` | `Spear.png`, `Pike.png`, `spear-gold.png` |
| One Hand Mace | `Mace01.png` | `club-iron.png`, `Mace02.png` |
| Two Hand Mace | `HammerGiant.png` | `HammerWar.png` |
| Quarterstaff (Warstaff) | `Quarterstaff.png` | `QuarterstaffLight.png` |
| Wand | `Wand01.png` (red tip) | `Wand02.png` (green tip) |
| Staff | `stick-mage.png` | `Staff01.png` |
| Sceptre | `Scepter01.png` | `Scepter02.png`, `RodTeal.png` |
| Body armour, Str | `armor_iron.png` | `ArmorPlatemailFull.png` |
| Body armour, Dex | `armor_leather.png` | `ArmorLeatherHard.png` |
| Body armour, Int | `RobeBlue.png` | `RobePurple.png` |
| Body armour, hybrid | `ArmorChainMail.png` | `ArmorLeatherScaleMail.png` |
| Shield | `shield-iron.png` | `ShieldKiteRed.png`, `shield-wood.png` |
| Amulet | `necklace-1.png` | `NecklaceJewelBlue.png` |
| Ring | `RingJewelBlue.png` | `RingGoldJeweledRed.png` |
| Belt | `Belt1.png` | `Belt2.png` |
| Hero (gem card) | The baked hero idle frame | — |
| Player spell | `source-of-tales/icons/spell_firelion.png`, `spell_icetacle.png`, `spell_lightning.png`, `spell_snakebite.png`, `spell_shield.png` | Tint per element |

**Uniques** reuse the base icon with an `#AF6025` frame and a slow glow. There is no per-unique art.

### 7.2 Currency

> **Superseded:** [appendix H §4.3](appendix-h-juice.md#43-currency-orbs-programmatic-supersedes-g-72) draws currency as code-generated orbs. The mapping below is the fallback.

There are **no PoE-style orb icons**. Use distinct shapes where possible, so currencies read by silhouette and not only by tint.

| Currency (appendix C) | Icon (`source-of-tales/items/`) |
|---|---|
| Orb of Transmutation | `JewelsBlue.png` |
| Orb of Augmentation | `VialBlue.png` |
| Regal Orb | `LightChalice.png` |
| Exalted Orb | `LightStar.png` |
| Chaos Orb | `GlyphRed.png` |
| Orb of Alchemy | `VialYellow.png` |
| Orb of Annulment | `DiscoloredSpot.png` |
| Divine Orb | `LightOrb.png` |
| Vaal Orb | `JewelsRed.png` |
| Shards (all kinds) | `Jewels.png`, plus a small corner badge of the parent's icon |
| Lesser / Greater / Perfect Jeweller's Orb | `CrystalsGreen.png` / `CrystalsBlue.png` / `CrystalsPurple.png` |
| Gemcutter's Prism | `GlyphYellow.png` |
| Support-reroll orb (**MvM custom**) | `GlyphGreen.png` |
| Support-transfer orb (**MvM custom**) | `KeyAnkh.png` |
| Gold (stash or vendor) | `CoinsGold.png`, `CoinsGoldSmall.png`, `CoinsGoldLarge.png`, chosen by amount |
| Gold (world pickup) | `neverwell-moor/resources/img/coin_gold.png` (8-frame spinning coin, 18×21) |
| Mana orb (world pickup) | Procedural: `source-of-tales/particles/orb_10x10_dyable.png`, tinted cyan, with a glow |

**Fallback** if anyone finds a currency hard to read: a procedural orb (a tinted `LightOrb.png`) with a 1-letter glyph.

---

## 8. Licensing and attribution

### 8.1 Licences found

| Pack | Licence | Where it is stated | Notes |
|---|---|---|---|
| `ulpc-generator` | **Per file**, in `ulpc-generator/CREDITS.csv` (13,915 rows). Most files are multi-licensed OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0. | `ulpc-generator/README.md`, `ulpc-generator/CREDITS.csv` | Licence mentions across rows: OGA-BY 3.0 (8,122), GPL 3.0 (7,636), CC-BY-SA 3.0 (5,340), OGA-BY 3.0+ (2,381), CC-BY 3.0+ (2,332), GPL 2.0 (1,031), CC0 (1,011), CC-BY 3.0 (752), CC-BY 4.0 (483), CC-BY-SA 4.0 (231), OGA-SA 3.0 (17). In the 387 files used by §3–4, every file offers CC-BY-SA 3.0, OGA-BY, CC-BY, or CC0, so **none is GPL-only**. |
| `lpc-revised` | **OGA-BY 3.0** | `lpc-revised/Credits.txt`; `lpc-revised/README.md` says "CC-BY-3.0 or OGA-BY 3.0" | 35 per-asset `Credits.txt` files. The top-level artist list is incomplete. |
| `source-of-tales` | Art is **CC-BY-SA 3.0 + GPL 3.0+** dual | `source-of-tales/COPYING.txt`, `source-of-tales/AUTHORS.txt` (per file) | Exceptions: `beetle.png` is CC-BY-SA 3.0 + GPLv2; the chicken sheets are CC-BY 3.0; `tiles/magecity.png` is CC0; Gervais icons are CC-BY-SA 3.0 only. |
| `big-island` | CC-BY-SA 3.0 + GPL 3.0 | `big-island/COPYING.txt`, `big-island/resources/assets/lpc_full_assets/README.txt` | — |
| `neverwell-moor` | CC-BY-SA 3.0 + GPL 3.0+ | `neverwell-moor/COPYING.txt`; per-file in `neverwell-moor/js/resources.js` | Hearts are CC-BY-SA 3.0 only. Some files are CC0. |
| `lpc-tile-atlas`, `lpc-tile-atlas2` | CC-BY-SA 3.0 / GPL 3.0 | `lpc-tile-atlas/files/Attribution.txt`, `lpc-tile-atlas2/files/Attribution2.txt` | The licence texts they refer to are missing. |
| `lpc-medieval-village-decorations` | Mixed per source: CC-BY-SA 3.0 / GPL 3.0, CC-BY 3.0, OGA-BY, CC0 | `lpc-medieval-village-decorations/files/decoration_medieval/CREDITS-decorations-medieval.txt` | No overall licence line. Treat it as CC-BY-SA 3.0. |
| `lpc-victorian-town-decorations` | **CC-BY-SA 4.0** | `lpc-victorian-town-decorations/files/lpc-victorian-decoration/CREDITS-decorations-victorian.txt` | Note the version: 4.0. |
| `lpc-beach-desert` | CC-BY-SA 3.0 | `lpc-beach-desert/files/lpc-beach-desert/CREDITS-beach-desert.txt` | One source entry ("ZRPG Beach") lists no licence. |
| `lpc-winter-tiles`, `lpc-adobe-town-set`, `lpc-frama-sci-fi-extensions`, `lpc-goes-to-space` | **None found** | — | **Don't use these** (§8.3). |

### 8.2 What the prototype must do

1. **Credits screen**, reachable from the title menu and the pause menu.
   - Group by pack: the authors, the licence name with its URL, and "Changes: composited, recoloured, cropped, scaled".
   - Add the LPC line: "Sprites contributed as part of the Liberated Pixel Cup project from OpenGameArt.org".
2. **Generated `CREDITS.md`** (and `credits.json` for the screen), **never hand-edited**.
   - The bake step (§2.6) writes a manifest of every source PNG it reads.
   - A small script resolves each path to its credit:

   | Pack | Lookup rule |
   |---|---|
   | ULPC | Exact `filename` match in `ulpc-generator/CREDITS.csv`. Otherwise use `dirname(path) + ".png"`, because variant files are credited at animation level. For example, the CSV row named "weapon/ranged/crossbow/foreground/thrust.png" covers the file `ulpc-generator/spritesheets/weapon/ranged/crossbow/foreground/thrust/crossbow.png`. This resolved all 387 recipe files. |
   | lpc-revised | The nearest `Credits.txt`, walking up from the PNG |
   | source-of-tales | The matching line in `source-of-tales/AUTHORS.txt`. Watch for the misspelt `particles/lithning*.png` entries. Files with no entry fall back to `COPYING.txt` and are listed as flagged. |
   | Tile atlases | The whole `Attribution*.txt` author list |
   | Medieval, Victorian, Beach | The whole `CREDITS-*.txt` |
   | neverwell-moor | The comments in `neverwell-moor/js/resources.js`, plus `COPYING.txt` |
   | big-island | `big-island/resources/assets/lpc_full_assets/README.txt` + `big-island/AUTHORS.txt` |

3. **Licence of record.**
   - For dual-licensed art, take **CC-BY-SA 3.0** (or OGA-BY or CC0 where offered); the GPL option isn't needed.
   - Baked sheets are derivatives, so they are **CC-BY-SA**. Keep them in their own folder with a LICENSE note.
4. Ship the licence texts in `assets/licenses/`: CC-BY-SA 3.0 and 4.0, OGA-BY 3.0, CC-BY 3.0 and 4.0, and GPL 3.0 for completeness.
5. **No DRM or obfuscation of asset files**, as CC-BY-SA requires.

### 8.3 Licence flags

| Flag | Impact | Action |
|---|---|---|
| `lpc-winter-tiles`: no licence file. A hint in `lpc-revised/Terrain/Credits.txt` says "Demetrius, OGA-BY 3.0", but this is unverified. | Winter A2 frost and ice sheets | Use `lpc-revised` winter and ice instead. |
| `lpc-adobe-town-set`: no licence. Probably Sharm and William Thompson. | Adobe ruins | Use the `lpc-revised` adobe walls instead. |
| `lpc-frama-sci-fi-extensions`, `lpc-goes-to-space`: no licence | Obelisk and crystal (possible wardstone) | Don't use them. |
| ULPC `head/heads/human/male_plump/*`: co-author "??" | Hero heads | Don't use it. |
| ULPC `neck/scarf/*`: OGA-SA 3.0 | — | Avoid it; MvM doesn't need it. |
| source-of-tales files with no AUTHORS entry: `particles/orb_3x3_dyable.png`, `tiles/terrain.png`, `tiles/mountains_new.png`, `tiles/wooden_stairs.png`, `tiles/cellar_shadow.png` | Particles | Prefer `orb_5x5_dyable.png` and larger, which are credited. |
| neverwell-moor: `snow.png` has no author or licence; `tree_stump.png` is uncredited; `animwater.png` is credited under the wrong name | — | Don't use `snow.png`. |
| big-island: the base monsters, castle, and lava are credited only in the LPC archive README; the JS expansion README states no licence | — | Use the source-of-tales or lpc-tile-atlas copies instead. |
| `lpc-medieval-village-decorations`: no overall licence line | Graves, banners, fountain | Credit it per source from its CREDITS file. |

**Not art, but note:** PoE2 names and data are used for an internal test only; nothing ships (see the brief).

---

## 9. Asset gaps and risks

| # | Gap or risk | Mitigation |
|---|---|---|
| 1 | No death or hit-reaction animations anywhere | Use `hurt` (the fall) for death; white flash, knockback, and squash for hits. |
| 2 | **No sceptre art** | The CC0 `simple` crook staff stands in for acolytes and auras. The item icon is `Scepter01.png`. |
| 3 | Wand has only `slash`; jewelled staffs have only `thrust_oversize` | Use the wand flick and the staff point as the cast (§3.1). The alternative is `spellcast` with no weapon. |
| 4 | Bat, beetle, and slime are 32–48 px chibi art with no walk or attack frames | Use 1.5–2× integer-ish scale, procedural hop, bob, and lunge, plus rarity outlines. Accept the style mismatch. |
| 5 | No boss-sized art | Integer upscales (2×, 3×, 5×) plus rim light, a big shadow, and particle auras. The ULPC composites (`b10alt`) add armour detail. |
| 6 | No crossbow bolt, chain lightning, or chaos FX | Procedural bolts and polylines; tint the existing FX (§6). |
| 7 | The muscular body can't `shoot` and can't wear torso armour | Keep bows and armoured knights on `male`, `female`, or `teen`; muscular is for brutes, bosses, and the sturdy acolyte. |
| 8 | Custom-animation remaps (`tool_hammer`) are easy to get wrong | Export those heroes from the generator, or copy its frame table exactly. |
| 9 | Three art styles mix: ULPC, LPC Revised terrain (Liberated Palette), and CharlesGabriel critters | A light per-biome colour grade (a multiply layer), consistent shadows, and outlines on monsters. |
| 10 | No PoE-style orb icons; most icons are DCSS style | Use the mapped shapes in §7.2, with rarity frames. Fall back to a tinted orb with a glyph. |
| 11 | No classic-LPC desert sand, and no snowy castle stone | Use the `lpc-revised` sand and snow; put snow-cap decals and a white tint on stone walls. |
| 12 | At 64 px, about 30 humanoid heroes may blur together | Use the headwear and element rules (§3.4), and show portraits on the roster cards. |
| 13 | Rare 1.1× and Brute 1.5× are non-integer scales and will shimmer | Accept at 2× render, or pre-bake with nearest-neighbour. |
| 14 | Three packs have unclear licences | Exclude them (§8.3). Everything needed has a licensed alternative. |

---

## Deviations from brief

1. **Wand attack uses `slash`, not `spellcast`.** The only wand art (`weapon/magic/wand/*/slash/wand.png`) is drawn for `slash`. The commission asked for spellcast for wands; the brief itself doesn't specify an animation. Fallback: `spellcast` with the wand hidden.
2. **Jewelled staves use `thrust_oversize`, not `spellcast`.** Only the plain `simple` staff has a spellcast sheet. Area-spell heroes may use the simple staff with `spellcast` if the pose matters more than the jewelled look.
3. **Sceptres are a stand-in.** No pack has sceptre art, so acolytes and aura heroes hold the CC0 `simple` crook staff.
4. **Rarity is shown with outlines, not tints.** The brief says monsters are "tinted by rarity". Appendix D already uses outlines, and tints are kept for ailments and elements. An optional 10% blue tint for magic monsters remains as a fallback.
5. **The bog doesn't come from `neverwell-moor`.** Despite its name, that game has no moor or bog tiles. Bog ground comes from `lpc-tile-atlas` swamp, mud, and murky water, plus `lpc-revised` autumn plants.
6. **`lpc-revised` is used for terrain and objects only.** Its FX are water-only. Its characters use different proportions and have no spellcast, thrust, bow, or hurt, so they can't mix with ULPC layers.
7. **The Burrower is the beetle, not a worm.** The source-of-tales small worm has no walk or attack frames and no XML.
8. **Death uses the ULPC `hurt` row.** ULPC has no separate death animation.
