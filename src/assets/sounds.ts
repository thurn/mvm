/**
 * A sound's sources (Appendix H §12.1). Paths are relative to `~/Documents/game-audio/`, or to
 * `~/Documents/lpc/` when they start with `lpc/`. `#` stands for any variant number.
 */
export interface SoundSource {
  /** Round-robin alternatives; empty means a ZzFX sketch plays instead (H §11.2). */
  variants: readonly string[];
  /** Files played together with each variant. */
  layers?: readonly string[];
}

const IMPACT = "kenney-impact-sounds/Audio";
const UI = "kenney-interface-sounds/Audio";
const RPG = "rubberduck-80-rpg-sfx";
const BREAK = "rubberduck-75-breaking-hit-sfx";
const CREATURE = "rubberduck-80-creature-sfx";
const GEM = "bobjt-gem-collect/gem-gather-stereo.wav";
const BOMB = "lpc/source-of-tales/sfx/bomb.ogg";

/** Every sound id the M1 cue table (src/juice/cues.ts) can ask for, with its H §12.1 pick. */
export const SOUNDS = {
  hit_light: {
    variants: [`${IMPACT}/impactPunch_medium_00#.ogg`, `${IMPACT}/impactSoft_medium_00#.ogg`],
  },
  hit_medium: { variants: [`${IMPACT}/impactPunch_medium_00#.ogg`] },
  hit_heavy: { variants: [`${IMPACT}/impactPunch_heavy_00#.ogg`] },
  hit_evade: { variants: ["starninjas-swords/sword - StarNinjas/sword.#.ogg"] },
  hit_block: { variants: ["starninjas-swords/sword_clash.#.ogg"] },
  kill: { variants: ["artisticdude-zombies/zombies/zombie-#.wav"] },
  // Phase 2 archetypes (H §7.1): bone hits, and a death vocal per archetype.
  hit_bone: { variants: [`${BREAK}/bfh1_wood_hit_0#.ogg`] },
  bone_clatter: { variants: [`${BREAK}/bfh1_wood_falling_0#.ogg`] },
  rat_squeak: { variants: [`${CREATURE}/cute_0#.ogg`] },
  goblin_squeal: { variants: [`${CREATURE}/hurt_0#.ogg`] },
  leap_whoosh: { variants: ["starninjas-swords/sword - StarNinjas/sword.#.ogg"] },
  leap_land: { variants: [`${IMPACT}/impactSoft_heavy_00#.ogg`] },
  // Boss moments (H §7.5).
  boss_rumble: { variants: [`${RPG}/stones_0#.ogg`] },
  boss_whoosh: { variants: ["kenney-digital-audio/Audio/phaserUp#.ogg"] },
  boss_roar: { variants: [`${RPG}/creature_roar_0#.ogg`] },
  boss_primed: { variants: ["kenney-digital-audio/Audio/highUp.ogg"] },
  boss_brood: { variants: [`${RPG}/creature_slime_0#.ogg`] },
  boss_crack: {
    variants: [`${BREAK}/bfh1_glass_breaking_0#.ogg`],
    layers: [`${BREAK}/bfh1_metal_hit_01.ogg`],
  },
  helm_ping: { variants: [`${IMPACT}/impactMetal_light_00#.ogg`] },
  hero_death: {
    variants: [`${RPG}/creature_die_01.ogg`],
    layers: [`${BREAK}/bfh1_falling_01.ogg`],
  },
  drop_normal: {
    variants: ["kenney-rpg-audio/Audio/dropLeather.ogg", "kenney-rpg-audio/Audio/cloth#.ogg"],
  },
  drop_magic: { variants: [`${UI}/drop_00#.ogg`], layers: [`${UI}/glass_002.ogg`] },
  drop_rare: {
    variants: [`${UI}/drop_00#.ogg`],
    layers: [`${RPG}/item_stone_01.ogg`, `${UI}/pluck_001.ogg`, `${UI}/glass_003.ogg`, GEM],
  },
  drop_unique: {
    variants: [`${IMPACT}/impactPunch_heavy_00#.ogg`],
    layers: [
      BOMB,
      `${IMPACT}/impactBell_heavy_000.ogg`,
      "bobjt-gem-collect/gem-gather-stereo-reverb.wav",
    ],
  },
  drop_currency: { variants: [`${RPG}/item_gem_0#.ogg`] },
  drop_gold: { variants: [`${RPG}/item_coins_0#.ogg`] },
  // Skill launch and impact layers for the M1 heroes (H §6.1).
  bow_release: { variants: ["lpc/big-island/resources/sounds/shoot.ogg"] },
  crossbow_fire: { variants: ["lpc/big-island/resources/sounds/shoot1.ogg"] },
  spark_cast: {
    variants: [
      "kenney-digital-audio/Audio/zapTwoTone.ogg",
      "kenney-digital-audio/Audio/zapTwoTone2.ogg",
    ],
  },
  zap: { variants: ["kenney-digital-audio/Audio/zap#.ogg"] },
  slam: { variants: [`${BREAK}/bfh1_rock_breaking_0#.ogg`] },
  swing_light: { variants: ["starninjas-swords/sword - StarNinjas/sword.#.ogg"] },
  thunder_crack: { variants: [`${IMPACT}/impactMining_00#.ogg`], layers: [BOMB] },
  ice_crack_heavy: { variants: ["bart-ice-spells/ice.wav"] },
  // Each coin's arrival at the gold readout, on the coin ladder (H §3.4, §3.5).
  coin: { variants: [`${RPG}/item_coins_0#.ogg`] },
  coin_pile: {
    variants: ["kenney-rpg-audio/Audio/handleCoins.ogg", "kenney-rpg-audio/Audio/handleCoins2.ogg"],
  },
  drop_hero: {
    variants: ["kenney-casino-audio/Audio/chip-lay-#.ogg"],
    layers: [`${UI}/pluck_001.ogg`],
  },
  drop_spell: {
    variants: ["kenney-casino-audio/Audio/chip-lay-#.ogg"],
    layers: [`${UI}/pluck_001.ogg`],
  },
  mana_spawn: { variants: [] },
  mana_collect: { variants: [GEM] },
  place_thunk: {
    variants: [`${IMPACT}/impactSoft_heavy_00#.ogg`],
    layers: [`${IMPACT}/footstep_grass_000.ogg`],
  },
  ui_deny: { variants: [`${UI}/error_00#.ogg`] },
  shovel: { variants: [`${IMPACT}/footstep_grass_00#.ogg`] },
  leak: {
    variants: ["rubberduck-40-water-slime-sfx/splash_#.ogg"],
    layers: [`${IMPACT}/impactGlass_light_000.ogg`],
  },
  cast: { variants: [`${RPG}/spell_0#.ogg`] },
  spell_impact: {
    variants: [`${BREAK}/bfh1_rock_breaking_0#.ogg`],
    layers: [`${IMPACT}/impactMining_000.ogg`],
  },
  spell_aftershock: { variants: [`${BREAK}/bfh1_rock_falling_0#.ogg`] },
  spell_explosion: { variants: [BOMB], layers: [`${BREAK}/bfh1_breaking_01.ogg`] },
  spell_comet: { variants: [`${RPG}/spell_fire_0#.ogg`], layers: [BOMB] },
  wave_start: { variants: [`${UI}/confirmation_001.ogg`] },
  // A war horn is a known gap (H §12.1): ZzFX until one is found.
  wave_flag: { variants: [] },
  flag_horn: { variants: [] },
  level_won: { variants: ["music-heartfelt-battle/heartfelt-battle_outro.ogg"] },
  level_lost: { variants: ["kenney-music-jingles/Audio/Pizzicato jingles/jingles_PIZZI01.ogg"] },
  ailment_shock: {
    variants: ["kenney-digital-audio/Audio/zap#.ogg", "kenney-digital-audio/Audio/zapTwoTone.ogg"],
  },
  ailment_chill: { variants: ["bart-ice-spells/coldsnap.wav"] },
  shatter: { variants: [`${BREAK}/bfh1_glass_breaking_0#.ogg`] },
  ailment_freeze: {
    variants: ["bart-ice-spells/ice.wav"],
    layers: [`${IMPACT}/impactGlass_medium_000.ogg`],
  },
  ailment_ignite: { variants: [`${RPG}/spell_fire_0#.ogg`] },
  ailment_fullyBroken: {
    variants: [`${BREAK}/bfh1_metal_falling_0#.ogg`],
    layers: [`${BREAK}/bfh1_metal_hit_01.ogg`],
  },
  stun_light: { variants: [`${IMPACT}/impactMetal_light_00#.ogg`] },
  stun_heavy: { variants: [`${IMPACT}/impactMetal_heavy_00#.ogg`] },
} satisfies Record<string, SoundSource>;

export type SoundId = keyof typeof SOUNDS;
