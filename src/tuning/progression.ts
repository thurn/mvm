/** Player and hero XP (Appendix E §6, Appendix B §1.6). */
export const PROGRESSION_TUNING = {
  /** Cumulative XP to reach each level, from level 1 (PoE2's table, which Appendix E §6.1 samples). */
  xpTable: [
    0, 525, 1760, 3781, 7184, 12186, 19324, 29377, 43181, 61693, 85990, 117506, 157384, 207736,
    269997, 346462, 439268, 551295, 685171, 843709, 1030734, 1249629, 1504995, 1800847, 2142652,
    2535122, 2984677, 3496798, 4080655, 4742836, 5490247, 6334393,
  ],
  /** MvM density bridge: ~1,250 campaign kills reach level 30 (E §6.1). */
  kXp: 6,
  rarityXp: { normal: 1, magic: 2, rare: 5, unique: 20, boss: 20 },
  /** PoE2's level penalty: safe band = 3 + floor(level / 16); beyond it ((L + 5) / (L + 5 + ED^2.5))^1.5. */
  penaltyBandBase: 3,
  penaltyBandPerLevels: 16,
  /** Heroes cap at the highest area level unlocked + 2, and at 32 (B §1.6). */
  heroCapOverArea: 2,
  heroLevelCap: 32,
} as const;

/** One level's first-clear reward (Appendix E §4.5); every part is optional. */
export interface FirstClearReward {
  unlockSlot?: number;
  /** A choose-1-of-3 hero offer at this rarity and level. */
  heroOffer?: { rarity: "normal" | "magic" | "rare"; level: number };
  /** Currency by RePoE ID. */
  currency?: Readonly<Record<string, number>>;
  /** Passive points, counted while the level stays cleared (spent from Phase 3). */
  passivePoints?: number;
}

/** Roster shape and first-clear rewards (GDD §5, Appendix E §4.5) for Levels 1–5. */
export const ACCOUNT_TUNING = {
  rosterSlots: 6,
  startingUnlockedSlots: 3,
  /** Choose-1-of-3 hero offers draw at least one from heroes sharing a weapon class or damage tag with the roster. */
  offerSize: 3,
  firstClearRewards: {
    "level-1": { unlockSlot: 4, heroOffer: { rarity: "normal", level: 3 } },
    "level-2": {
      unlockSlot: 5,
      currency: {
        "Metadata/Items/Currency/CurrencyAddModToMagic": 2,
        "Metadata/Items/Currency/CurrencyUpgradeToMagic": 2,
      },
    },
    "level-3": {
      unlockSlot: 6,
      currency: { "Metadata/Items/Currency/CurrencyAddSkillGemSocket3": 1 },
    },
    "level-4": { heroOffer: { rarity: "magic", level: 6 } },
    "level-5": {
      passivePoints: 2,
      currency: { "Metadata/Items/Currency/CurrencyUpgradeMagicToRare": 1 },
    },
  } satisfies Readonly<Record<string, FirstClearReward>>,
} as const;

/** A level's first-clear reward, if it has one. */
export function firstClearReward(levelId: string): FirstClearReward | undefined {
  return (ACCOUNT_TUNING.firstClearRewards as Readonly<Record<string, FirstClearReward>>)[levelId];
}
