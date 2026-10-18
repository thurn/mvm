/** Appendix H §10.2–§10.3 mix and voice rules, read by src/audio/. */

export type Bus = "music" | "sfx" | "loot" | "ui";

/** Voice categories, lowest priority first: over the global cap the lowest is dropped. */
export const CATEGORIES = [
  "ambience",
  "monsterVocal",
  "hit",
  "shot",
  "spell",
  "ui",
  "loot",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const AUDIO_TUNING = {
  busDb: { music: -14, sfx: -6, loot: -3, ui: -8 } satisfies Record<Bus, number>,
  /** A hard knee: the default 30 dB knee starts compressing near -42 dB and halves short UI blips. */
  compressor: { thresholdDb: -12, ratio: 4, kneeDb: 0 },
  globalVoices: 32,
  /** Per-sound voice caps by category (H §10.3). */
  voiceCap: {
    ambience: 2,
    monsterVocal: 3,
    hit: 6,
    shot: 6,
    spell: 4,
    ui: 4,
    loot: 6,
  } satisfies Record<Category, number>,
  retriggerMs: 30,
  retriggerBoostDb: 1,
  /** ± fraction of playback rate; loot keeps the key. */
  pitchVariation: { combat: 0.06, loot: 0.02 },
  volumeVariationDb: 2,
  /** pan = x / boardColumns × span − span / 2. */
  pan: { boardColumns: 9, span: 0.6 },
  logSize: 20,
};

/** Each sound id's category and bus; ids not listed are hits on the sfx bus. */
export function soundClass(id: string): { category: Category; bus: Bus } {
  if (id.startsWith("drop_") || id === "mana_collect" || id === "mana_spawn")
    return { category: "loot", bus: "loot" };
  if (id.startsWith("ui_") || id === "card_ready" || id === "ui_hover")
    return { category: "ui", bus: "ui" };
  if (id.startsWith("level_")) return { category: "loot", bus: "music" };
  if (id.startsWith("spell_") || id === "cast" || id === "riser")
    return { category: "spell", bus: "sfx" };
  if (id === "kill" || id === "hero_death") return { category: "monsterVocal", bus: "sfx" };
  if (id.startsWith("ailment_")) return { category: "spell", bus: "sfx" };
  if (id.startsWith("wave_") || id === "flag_horn" || id === "leak")
    return { category: "ui", bus: "sfx" };
  return { category: "hit", bus: "sfx" };
}

/** Music behaviour (H §10.4). */
export const MUSIC_TUNING = {
  /** The intensity layer comes in above this many monsters on the board. */
  intensityMonsters: 12,
  /** …and leaves this long after its last trigger. */
  intensityHoldSeconds: 6,
  crossfadeSeconds: 1.5,
};
