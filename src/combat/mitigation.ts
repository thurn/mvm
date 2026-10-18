import { COMBAT_RULES } from "../tuning/combat";
import type { Actor, ResistType } from "./actor";
import { mapDamage, type DamageMap } from "./damage";
import { isElement, stat, type StatSheet } from "./stats";

/** Physical damage reduction from armour against one hit, capped at 90% (§5.2). */
export function armourReduction(armour: number, physicalHit: number): number {
  if (armour <= 0 || physicalHit <= 0) return 0;
  const { armourHitFactor, armourReductionCap } = COMBAT_RULES;
  return Math.min(armourReductionCap, armour / (armour + armourHitFactor * physicalHit));
}

/** Maximum resistance: 75% plus "+% to maximum", hard-capped at 90% (§5.2). */
export function maxResistance(type: ResistType, stats: StatSheet): number {
  const bonus = isElement(type) ? stat(stats, `maximum_${type}_resistance_%`) : 0;
  return Math.min(COMBAT_RULES.hardMaxResistPercent, COMBAT_RULES.defaultMaxResistPercent + bonus);
}

/**
 * Resistance after the cap and penetration, in percent (§5.2). Penetration
 * can't push resistance below 0, but a negative resistance stays negative.
 */
export function effectiveResistance(resist: number, max: number, penetration: number): number {
  const capped = Math.min(resist, max);
  if (capped <= 0) return capped;
  return Math.max(0, capped - penetration);
}

/** Block chance in [0, 0.5] (§5.1). */
export function cappedBlockChance(blockChancePercent: number): number {
  return Math.max(0, Math.min(COMBAT_RULES.blockCapPercent, blockChancePercent)) / 100;
}

/** Damage reduction and damage-taken multipliers, in §5.2–§5.3 order. */
export function mitigate(damage: DamageMap, attackerStats: StatSheet, target: Actor): DamageMap {
  return mapDamage(damage, (amount, type) => {
    if (amount === 0) return 0;
    let taken: number;
    if (type === "physical") {
      taken = amount * (1 - armourReduction(target.armour, amount));
    } else {
      const penetration = isElement(type)
        ? stat(attackerStats, `${type}_penetration_%`) +
          stat(attackerStats, "elemental_penetration_%")
        : 0;
      const resist = effectiveResistance(
        target.resist[type],
        maxResistance(type, target.stats),
        penetration,
      );
      taken = amount * (1 - resist / 100);
    }
    return taken * (1 + (target.damageTakenIncreased[type] ?? 0) / 100);
  });
}

export interface PoolLoss {
  esLost: number;
  lifeLost: number;
}

/**
 * Energy shield absorbs before life; chaos removes twice as much ES (§5.4).
 * Life loss stops at the target's remaining life.
 */
export function applyToPools(target: Actor, damage: DamageMap): PoolLoss {
  let es = target.es;
  let toLife = 0;
  const nonChaos = damage.physical + damage.fire + damage.cold + damage.lightning;
  const absorbed = Math.min(es, nonChaos);
  es -= absorbed;
  toLife += nonChaos - absorbed;
  const chaosEs = Math.min(es, damage.chaos * COMBAT_RULES.chaosEsMultiplier);
  es -= chaosEs;
  toLife += damage.chaos - chaosEs / COMBAT_RULES.chaosEsMultiplier;
  return { esLost: target.es - es, lifeLost: Math.min(target.life, toLife) };
}
