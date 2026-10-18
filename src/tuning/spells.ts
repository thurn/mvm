/** Player spell tunables (Appendix B §6.1). */
export const SPELL_TUNING = {
  /** MvM spell power E(L) = base + perLevel × spell level, multiplying every spell hit. */
  spellPowerBase: 5,
  spellPowerPerLevel: 0.5,
  /** Attack spells use a virtual weapon with this crit, and always hit. */
  attackSpellCrit: 5,
  /** The grenade rolls this many tiles toward the gate before it rests (B S3, adapted bounce). */
  grenadeRollTiles: 1,
} as const;
