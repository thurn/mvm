import { makeActor } from "../combat/actor";
import type { StatSheet } from "../combat/stats";
import { monsterLevelStats } from "../data";
import type { MonsterSpec } from "../sim/state";
import { COMBAT_KNOBS } from "../tuning/combat";
import { WAVE_TUNING } from "../tuning/waves";
import { MONSTER_AFFIXES } from "./affixes";
import { archetype } from "./archetypes";
import { monsterConversion } from "./elements";
import type { SpawnRarity } from "./rarity";

export interface MonsterRoll {
  archetypeId: string;
  rarity: SpawnRarity;
  affixes: string[];
  areaLevel: number;
  /** The campaign level, whose biome sets the hit's element (D §2.3). */
  levelIndex: number;
  lane: number;
  x: number;
}

/**
 * A monster's full stat block at spawn (Appendix A §2.2, D §1):
 * default_monster_stats[area] × archetype × rarity × knob, then its affixes.
 */
export function buildMonster(roll: MonsterRoll): MonsterSpec {
  const dms = monsterLevelStats(roll.areaLevel);
  const type = archetype(roll.archetypeId);
  const rarity = WAVE_TUNING.rarityMultipliers[roll.rarity];
  let armour = dms.armour * type.armourMult;
  let evasion = dms.evasion * type.evasionMult;
  let accuracy = dms.accuracy;
  let speed = 1;
  let esFromLife = 0;
  const resist = { fire: 0, cold: 0, lightning: 0, chaos: 0, ...type.resist };
  const stats: Record<string, number> = {};
  for (const id of roll.affixes) {
    const affix = MONSTER_AFFIXES[id];
    if (!affix) throw new Error(`unknown monster affix ${id}`);
    armour *= affix.armourMult ?? 1;
    evasion *= affix.evasionMult ?? 1;
    accuracy *= affix.accuracyMult ?? 1;
    speed *= affix.speedMult ?? 1;
    esFromLife += affix.esFromLife ?? 0;
    for (const [element, value] of Object.entries(affix.resist ?? {})) {
      resist[element as keyof typeof resist] += value ?? 0;
    }
    for (const [key, value] of Object.entries(affix.stats ?? {})) {
      stats[key] = (stats[key] ?? 0) + (value ?? 0);
    }
  }
  const maxLife = dms.life * type.lifeMult * rarity.life * COMBAT_KNOBS.K_monsterLife;
  const damage =
    dms.physicalDamage * type.damageMult * rarity.damage * COMBAT_KNOBS.K_monsterDamage;
  const baseSecondsPerTile = COMBAT_KNOBS.walkSecondsPerTile;
  const conversion = monsterConversion(roll.archetypeId, roll.levelIndex);
  return {
    archetypeId: roll.archetypeId,
    rarity: roll.rarity,
    lane: roll.lane,
    x: roll.x,
    moveSpeed: (baseSecondsPerTile / type.secondsPerTile) * speed,
    affixes: [...roll.affixes],
    actor: makeActor({
      maxLife,
      maxEs: maxLife * esFromLife,
      armour,
      evasion,
      accuracy,
      resist,
      stats: stats as StatSheet,
    }),
    attack: {
      seconds: type.attackSeconds / speed,
      timer: type.attackSeconds / speed,
      hit: {
        kind: "attack",
        tags: ["melee"],
        base: { physical: { min: damage, max: damage } },
        baseCrit: WAVE_TUNING.monsterBaseCrit,
        ...(conversion ? { conversion } : {}),
      },
    },
  };
}
