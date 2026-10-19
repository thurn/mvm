import { AILMENT_TUNING as T } from "../../tuning/combat";
import type { Actor } from "../actor";
import type { DamageMap } from "../damage";
import type { SkillHit } from "../hit";
import { effectiveResistance, maxResistance } from "../mitigation";
import type { HitResult } from "../resolve";
import { stat, type StatSheet } from "../stats";

type Rarity = keyof typeof T.primedThreshold;

/** One actor's ailments, stun and debuff state (Appendix A §6). JSON-safe. */
export interface AilmentState {
  shock: { magnitude: number; secondsLeft: number } | null;
  chill: { magnitude: number; secondsLeft: number } | null;
  freezeBuildup: number;
  freezeIdleSeconds: number;
  frozenSeconds: number;
  /** Accumulated ignite chance in percent; resets when an ignite applies. */
  flammability: number;
  ignite: { dps: number; secondsLeft: number; sourceId: string } | null;
  heavyStunBuildup: number;
  heavyStunSeconds: number;
  heavyStunRecoverySeconds: number;
  /** Armour before any break, recorded on the first break. */
  baseArmour: number | null;
  fullyBrokenSeconds: number;
}

export function emptyAilments(): AilmentState {
  return {
    shock: null,
    chill: null,
    freezeBuildup: 0,
    freezeIdleSeconds: 0,
    frozenSeconds: 0,
    flammability: 0,
    ignite: null,
    heavyStunBuildup: 0,
    heavyStunSeconds: 0,
    heavyStunRecoverySeconds: 0,
    baseArmour: null,
    fullyBrokenSeconds: 0,
  };
}

type AilmentName =
  "shock" | "chill" | "freeze" | "ignite" | "lightStun" | "heavyStun" | "fullyBroken";

export interface AppliedAilment {
  ailment: AilmentName;
  magnitude: number;
  seconds: number;
}

export interface HitAilmentContext {
  targetKind: "monster" | "hero";
  rarity: Rarity;
  /** A hero's melee hit counts 1.5× more toward stun. */
  heroMelee: boolean;
  /** Hero hits break more armour on normal and magic monsters. */
  sourceIsHero: boolean;
  rng: () => number;
  sourceId?: string;
}

/** Chance to shock (§6.2): 1% per 4% of the ailment threshold dealt as lightning. */
export function shockChance(lightning: number, threshold: number, stats: StatSheet): number {
  if (lightning <= 0 || threshold <= 0) return 0;
  const chance =
    (lightning / threshold) *
    T.shockChancePerThreshold *
    (1 + stat(stats, "shock_chance_+%") / 100);
  return Math.min(1, chance);
}

/** Chill magnitude in percent (§6.2), 0 when under the minimum. */
export function chillMagnitude(cold: number, threshold: number, stats: StatSheet): number {
  if (cold <= 0 || threshold <= 0) return 0;
  const raw =
    (cold / threshold) *
    100 *
    T.chillMagnitudePerThresholdPercent *
    (1 + stat(stats, "chill_magnitude_+%") / 100);
  if (raw < T.chillMinimum - 1e-9) return 0;
  return Math.min(T.chillMaximum, raw);
}

function stunDamage(damage: DamageMap, heroMelee: boolean): number {
  const nonPhysical = damage.fire + damage.cold + damage.lightning + damage.chaos;
  return (
    (nonPhysical + damage.physical * T.stunPhysicalMultiplier) *
    (heroMelee ? T.stunHeroMeleeMultiplier : 1)
  );
}

/** Light stun chance (§6.3): stun damage over max life, 0 under 15%. */
export function lightStunChance(result: HitResult, maxLife: number, heroMelee: boolean): number {
  const chance = Math.min(1, stunDamage(result.dealt, heroMelee) / maxLife);
  return chance < T.lightStunMinimum ? 0 : chance;
}

export function isPrimed(actor: Actor, rarity: Rarity): boolean {
  return actor.ailments.heavyStunBuildup >= T.primedThreshold[rarity] - 1e-9;
}

export function isImmobilised(actor: Actor): boolean {
  return actor.ailments.frozenSeconds > 0 || actor.ailments.heavyStunSeconds > 0;
}

/** Walk and action speed multiplier: 0 when immobilised, else slowed by chill with its rarity reduction and floor. */
export function effectiveSpeed(actor: Actor, rarity: Rarity): number {
  if (isImmobilised(actor)) return 0;
  const chill = actor.ailments.chill;
  if (!chill) return 1;
  const slow = (chill.magnitude / 100) * (1 - T.slowReductionByRarity[rarity]);
  return Math.max(T.slowFloor, 1 - slow);
}

/** Recomputes the debuff-driven damage-taken and armour from the ailment state. */
function refreshDerived(actor: Actor): void {
  const a = actor.ailments;
  const shock = a.shock?.magnitude ?? 0;
  const broken = a.fullyBrokenSeconds > 0 ? T.fullyBrokenPhysicalTaken : 0;
  actor.damageTakenIncreased = {
    physical: shock + broken,
    fire: shock,
    cold: shock,
    lightning: shock,
    chaos: shock,
  };
}

function seconds(
  kind: HitAilmentContext["targetKind"],
  table: { monster: number; hero: number },
  stats: StatSheet,
) {
  return table[kind] * (1 + stat(stats, "ailment_duration_+%") / 100);
}

function breakArmour(
  target: Actor,
  amount: number,
  context: HitAilmentContext,
  applied: AppliedAilment[],
) {
  // Only armour can break: a target with none is never Fully Broken.
  if (
    amount <= 0 ||
    target.ailments.fullyBrokenSeconds > 0 ||
    (target.ailments.baseArmour ?? target.armour) <= 0
  )
    return;
  const multiplier =
    context.sourceIsHero && context.targetKind === "monster"
      ? context.rarity === "normal"
        ? T.heroArmourBreakVsNormal
        : context.rarity === "magic"
          ? T.heroArmourBreakVsMagic
          : 1
      : 1;
  target.ailments.baseArmour ??= target.armour;
  target.armour = Math.max(0, target.armour - amount * multiplier);
  if (target.armour === 0) {
    target.ailments.fullyBrokenSeconds = T.fullyBrokenSeconds;
    applied.push({
      ailment: "fullyBroken",
      magnitude: T.fullyBrokenPhysicalTaken,
      seconds: T.fullyBrokenSeconds,
    });
  }
}

/**
 * Applies a hit's ailments, stun and Armour Break to its target (Appendix
 * A §6), mutating the target. Blocked hits still build stun and freeze;
 * evaded hits do nothing. Returns what newly applied.
 */
export function applyHitAilments(
  target: Actor,
  hit: SkillHit,
  attackerStats: StatSheet,
  result: HitResult,
  context: HitAilmentContext,
): AppliedAilment[] {
  if (result.avoidedBy === "evade") return [];
  const a = target.ailments;
  const applied: AppliedAilment[] = [];
  const blocked = result.avoidedBy === "block";
  const damage = blocked ? result.preMitigation : result.dealt;
  const threshold = target.ailmentThreshold;

  if (!blocked) {
    breakArmour(
      target,
      (hit.armourBreak ?? 0) * (1 + stat(attackerStats, "armour_break_+%") / 100),
      context,
      applied,
    );

    if (context.rng() < shockChance(damage.lightning, threshold, attackerStats)) {
      const magnitude = T.shockMagnitude * (1 + stat(attackerStats, "shock_magnitude_+%") / 100);
      const duration = seconds(context.targetKind, T.shockSeconds, attackerStats);
      if (!a.shock || a.shock.magnitude <= magnitude) {
        a.shock = { magnitude, secondsLeft: duration };
        applied.push({ ailment: "shock", magnitude, seconds: duration });
      }
    }

    const chill = chillMagnitude(damage.cold, threshold, attackerStats);
    if (chill > 0 && (!a.chill || a.chill.magnitude <= chill)) {
      const duration = seconds(context.targetKind, T.chillSeconds, attackerStats);
      a.chill = { magnitude: chill, secondsLeft: duration };
      applied.push({ ailment: "chill", magnitude: chill, seconds: duration });
    }

    if (damage.fire > 0 && threshold > 0) {
      a.flammability +=
        (damage.fire / threshold) *
        T.flammabilityPerThreshold *
        100 *
        (1 + stat(attackerStats, "flammability_magnitude_+%") / 100);
      if (context.rng() < a.flammability / 100) {
        const dps =
          result.preMitigation.fire *
          T.igniteDpsFraction *
          (1 + stat(attackerStats, "ailment_magnitude_+%") / 100);
        if (!a.ignite || a.ignite.dps <= dps) {
          const duration = T.igniteSeconds * (1 + stat(attackerStats, "ailment_duration_+%") / 100);
          a.ignite = { dps, secondsLeft: duration, sourceId: context.sourceId ?? "" };
          a.flammability = 0;
          applied.push({ ailment: "ignite", magnitude: dps, seconds: duration });
        }
      }
    }
  }

  if (damage.cold > 0 && threshold > 0 && a.frozenSeconds <= 0) {
    const unique =
      context.rarity === "unique" || context.rarity === "boss"
        ? T.uniqueFreezeBuildupMultiplier
        : 1;
    a.freezeBuildup +=
      (damage.cold / threshold) * (1 + stat(attackerStats, "freeze_buildup_+%") / 100) * unique;
    a.freezeIdleSeconds = 0;
    if (a.freezeBuildup >= 1 - 1e-9) {
      a.freezeBuildup = 0;
      a.frozenSeconds = T.freezeSeconds;
      applied.push({ ailment: "freeze", magnitude: 1, seconds: T.freezeSeconds });
    }
  }

  if (stat(target.stats, "cannot_be_stun") <= 0) {
    const heavy = context.targetKind === "monster";
    if (heavy && a.heavyStunSeconds <= 0) {
      const crushing =
        stat(attackerStats, "crushing_blows") > 0 && isPrimed(target, context.rarity);
      const recovery = a.heavyStunRecoverySeconds > 0 ? T.heavyStunRecoveryBuildupMultiplier : 1;
      a.heavyStunBuildup +=
        (stunDamage(damage, context.heroMelee) / target.stunThreshold) *
        recovery *
        (1 + stat(attackerStats, "stun_buildup_+%") / 100);
      if (crushing || a.heavyStunBuildup >= 1 - 1e-9) {
        a.heavyStunBuildup = 0;
        a.heavyStunSeconds = T.heavyStunSeconds;
        a.heavyStunRecoverySeconds = T.heavyStunSeconds + T.heavyStunRecoverySeconds;
        applied.push({ ailment: "heavyStun", magnitude: 1, seconds: T.heavyStunSeconds });
      }
    }
    // Bosses (unique rarity) are immune to light stun (D §7).
    if (
      context.rarity !== "unique" &&
      context.rarity !== "boss" &&
      !applied.some((x) => x.ailment === "heavyStun") &&
      context.rng() < lightStunChance(result, target.maxLife, context.heroMelee)
    ) {
      applied.push({ ailment: "lightStun", magnitude: 1, seconds: 0 });
    }
  }

  refreshDerived(target);
  return applied;
}

export interface AilmentTick {
  expired: AilmentName[];
  /** Damage-over-time to apply to life this tick (bypasses ES, §6.1). */
  dotDamage: number;
  dotSourceId: string | null;
}

/** Advances an actor's ailments by `dt` seconds. */
export function tickAilments(actor: Actor, dt: number): AilmentTick {
  const a = actor.ailments;
  const expired: AilmentName[] = [];
  let dotDamage = 0;
  let dotSourceId: string | null = null;
  if (a.shock && (a.shock.secondsLeft -= dt) <= 1e-9) {
    a.shock = null;
    expired.push("shock");
  }
  if (a.chill && (a.chill.secondsLeft -= dt) <= 1e-9) {
    a.chill = null;
    expired.push("chill");
  }
  if (a.frozenSeconds > 0 && (a.frozenSeconds -= dt) <= 1e-9) {
    a.frozenSeconds = 0;
    expired.push("freeze");
  }
  if (a.freezeBuildup > 0) {
    a.freezeIdleSeconds += dt;
    if (a.freezeIdleSeconds > T.freezeDecayDelaySeconds) {
      a.freezeBuildup = Math.max(0, a.freezeBuildup - T.freezeDecayPerSecond * dt);
    }
  }
  if (a.ignite) {
    const res = effectiveResistance(actor.resist.fire, maxResistance("fire", actor.stats), 0);
    dotDamage =
      a.ignite.dps *
      Math.min(dt, a.ignite.secondsLeft) *
      (1 - res / 100) *
      (1 + (actor.damageTakenIncreased.fire ?? 0) / 100);
    dotSourceId = a.ignite.sourceId;
    if ((a.ignite.secondsLeft -= dt) <= 1e-9) {
      a.ignite = null;
      expired.push("ignite");
    }
  }
  if (a.heavyStunSeconds > 0 && (a.heavyStunSeconds -= dt) <= 1e-9) {
    a.heavyStunSeconds = 0;
    expired.push("heavyStun");
  }
  if (a.heavyStunRecoverySeconds > 0)
    a.heavyStunRecoverySeconds = Math.max(0, a.heavyStunRecoverySeconds - dt);
  if (a.fullyBrokenSeconds > 0 && (a.fullyBrokenSeconds -= dt) <= 1e-9) {
    a.fullyBrokenSeconds = 0;
    actor.armour = a.baseArmour ?? actor.armour;
    a.baseArmour = null;
    expired.push("fullyBroken");
  }
  if (expired.length > 0) refreshDerived(actor);
  return { expired, dotDamage, dotSourceId };
}
