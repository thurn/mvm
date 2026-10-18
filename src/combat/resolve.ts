import type { Actor } from "./actor";
import { damageMap, totalDamage, type DamageMap } from "./damage";
import { chanceToHit, rollHit, type Rng, type SkillHit } from "./hit";
import { applyToPools, cappedBlockChance, mitigate } from "./mitigation";

type AvoidedBy = "evade" | "block";

export interface HitResult {
  /** Why the hit dealt nothing, or null when it landed. */
  avoidedBy: AvoidedBy | null;
  crit: boolean;
  /** Rolled damage before mitigation; ailment magnitudes read this (§4.6). */
  preMitigation: DamageMap;
  /** Damage dealt per type after mitigation, overkill included. */
  dealt: DamageMap;
  total: number;
  esLost: number;
  lifeLost: number;
  killed: boolean;
}

/**
 * Resolves one hit through Appendix A's pipeline: the hit roll (§4), then
 * evasion and block (§5.1), damage reduction (§5.2–§5.3) and energy shield
 * before life (§5.4). Pure: the caller applies `esLost` and `lifeLost`.
 *
 * Draw order: one per base damage type, the crit, the accuracy roll (attacks
 * only) and the block roll (blockable hits against a blocking target only).
 */
export function resolveHit(attacker: Actor, target: Actor, hit: SkillHit, rng: Rng): HitResult {
  const { damage, crit } = rollHit(attacker.stats, hit, rng);
  const miss = (avoidedBy: AvoidedBy): HitResult => ({
    avoidedBy,
    crit,
    preMitigation: damage,
    dealt: damageMap(),
    total: 0,
    esLost: 0,
    lifeLost: 0,
    killed: false,
  });

  if (hit.kind === "attack" && rng() >= chanceToHit(attacker.accuracy, target.evasion)) {
    return miss("evade");
  }
  const block = hit.unblockable ? 0 : cappedBlockChance(target.blockChance);
  if (block > 0 && rng() < block) return miss("block");

  const dealt = mitigate(damage, attacker.stats, target);
  const { esLost, lifeLost } = applyToPools(target, dealt);
  return {
    avoidedBy: null,
    crit,
    preMitigation: damage,
    dealt,
    total: totalDamage(dealt),
    esLost,
    lifeLost,
    killed: target.life > 0 && lifeLost >= target.life,
  };
}
