/** Boss tunables (Appendix D §7). Life and damage are relative to a white Shambler at the area level. */
export const BOSS_TUNING = {
  BloatedMiller: {
    /** Lanes covered, and the top lanes it may take (rows 1–2, 2–3 or 3–4). */
    span: 2,
    topLanes: [1, 2, 3],
    lifeMult: 40,
    damageMult: 3,
    secondsPerTile: 7,
    attackSeconds: 1,
    /** Heavy-stun threshold as a share of max life (MvM custom; D §7). */
    stunThresholdOfLife: 0.3,
    /** Every ability telegraphs this long before it lands (D §7: 1.2–1.5 s). */
    telegraphSeconds: 1.3,
    abilities: {
      /** The 2×2 tiles in front of it, at this damage multiple. */
      grainSlam: { everySeconds: 7, damageMultiplier: 3 },
      /** One Shambler per covered lane, plus one in a random lane. */
      rottingBrood: { everySeconds: 18 },
    },
    enrageAtLifeShare: 0.5,
    enrageSpeedPercent: 30,
    /** The L5 pool (C §C.4.1); its guaranteed unique comes from here. */
    uniquePool: [
      "Mist Whisper",
      "Splinter of Lorrata",
      "The Blood Thorn",
      "Sanguine Diviner",
      "Enfolding Dawn",
      "Bramblejack",
    ],
  },
} as const;

export type BossId = keyof typeof BOSS_TUNING;
export type BossAbility = keyof (typeof BOSS_TUNING)[BossId]["abilities"];
