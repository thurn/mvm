import { monsterLevelStats } from "../data";
import type { Rarity } from "../sim/state";
import { PROGRESSION_TUNING as T } from "../tuning/progression";

/** PoE2's level penalty on kill XP (Appendix E §6.1). */
function levelPenalty(playerLevel: number, areaLevel: number): number {
  const band = T.penaltyBandBase + Math.floor(playerLevel / T.penaltyBandPerLevels);
  const outside = Math.max(0, Math.abs(playerLevel - areaLevel) - band);
  if (outside === 0) return 1;
  return ((playerLevel + 5) / (playerLevel + 5 + outside ** 2.5)) ** 1.5;
}

/** XP for one kill: default_monster_stats experience × rarity × K_xp × level penalty (E §6.1). */
export function killXp(areaLevel: number, rarity: Rarity, playerLevel: number): number {
  return Math.round(
    monsterLevelStats(areaLevel).experience *
      T.rarityXp[rarity] *
      T.kXp *
      levelPenalty(playerLevel, areaLevel),
  );
}

/** The level a cumulative XP total reaches, capped at the table's end. */
export function levelForXp(xp: number, cap: number = T.xpTable.length): number {
  let level = 1;
  while (level < cap && level < T.xpTable.length && xp >= T.xpTable[level]!) level++;
  return level;
}

/** The XP at which a level starts. */
export function xpForLevel(level: number): number {
  return T.xpTable[Math.max(0, Math.min(level, T.xpTable.length) - 1)]!;
}
