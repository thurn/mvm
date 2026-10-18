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
