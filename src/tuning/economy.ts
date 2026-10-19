/** In-level mana tunables (GDD §6.2–§6.3, Appendix E §2). */
export const ECONOMY_TUNING = {
  startingMana: 50,
  firstLevelStartingMana: 150,
  manaCap: 9990,
  skyManaAmount: 25,
  /** First sky orb 4.25–7.0 s in; then min(9.5, 4.25 + 0.1 n) + rand(0, 2.74) s apart (PvZ). */
  skyFirstMinSeconds: 4.25,
  skyFirstMaxSeconds: 7,
  skyIntervalBaseSeconds: 4.25,
  skyIntervalPerOrbSeconds: 0.1,
  skyIntervalCapSeconds: 9.5,
  skyIntervalJitterSeconds: 2.74,
  /** Orbs auto-collect: 0.5 s on the ground plus the flight to the counter (Appendix H §3.6). */
  autoCollectSeconds: 0.95,
  /** Recharge left at level start, by recharge tier (GDD §6.3). */
  startRecharge: { fast: 0, slow: 20, verySlow: 35 },
} as const;

/** Vendors, prices and gambling between levels (Appendix E §5.2–§5.3). Item prices are in LOOT_TUNING. */
export const VENDOR_TUNING = {
  /** Hero price = (heroPriceBase + heroPricePerLevel × level) × the item rarity multiplier; spells cost more. */
  heroPriceBase: 15,
  heroPricePerLevel: 3,
  spellPriceMultiplier: 1.2,
  /** The Armorer's 10 offers by slot, at the highest area level unlocked. */
  armorer: {
    weapons: 4,
    armours: 3,
    accessories: 3,
    rarity: { normal: 0.3, magic: 0.55, rare: 0.15 },
  },
  /** The Recruiter's heroes (at least `matching` share roster tags) and spells, at area level −2 to +0. */
  recruiter: {
    heroes: 6,
    matching: 3,
    spells: 2,
    rarity: { normal: 0.4, magic: 0.5, rare: 0.1 },
    levelOffsets: [-2, -1, 0],
  },
  buybackSize: 10,
  /** A gamble costs this times the magic buy price. */
  gambleCost: 1.5,
  /** An item gamble's reveal; without a demo unique on the base, Magic and Rare share its odds. */
  itemGamble: { magic: 0.75, rare: 0.22, unique: 0.03 },
  heroGamble: { magic: 0.7, rare: 0.3 },
  /** E §5.3's gamble roles, as catalog roles. */
  gambleRoles: {
    melee: ["striker", "wall"],
    ranged: ["basicRanged", "advancedRanged"],
    caster: ["spellcaster"],
    curse: ["curse"],
    aura: ["aura"],
    acolyte: ["acolyte"],
  },
} as const;
