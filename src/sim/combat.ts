import { isAttackKit } from "./state";
import type { Actor } from "../combat/actor";
import { applyHitAilments } from "../combat/ailments";
import type { SkillHit } from "../combat/hit";
import { resolveHit } from "../combat/resolve";
import { AILMENT_TUNING } from "../tuning/combat";
import { streamRng } from "./rng";
import type { EntityId, HeroState, MonsterState } from "./state";
import type { StepContext } from "./system";

export interface HitSource {
  id: EntityId;
  actor: Actor;
}

export type HitTarget =
  { kind: "monster"; entity: MonsterState } | { kind: "hero"; entity: HeroState };

function targetX(target: HitTarget): number {
  return target.kind === "monster" ? target.entity.x : target.entity.column;
}

/** Removes a dead target and emits `kill` (Appendix A §5.6). */
export function killTarget(ctx: StepContext, sourceId: EntityId, target: HitTarget): void {
  const { state } = ctx;
  const entity = target.entity;
  if (target.kind === "monster") {
    state.monsters = state.monsters.filter((m) => m.id !== entity.id);
    state.kills.push({
      monsterId: target.entity.id,
      rarity: target.entity.rarity,
      affixCount: target.entity.affixes?.length ?? 0,
      killerId: sourceId,
      lane: entity.lane,
      x: target.entity.x,
      ...(target.entity.boss ? { bossId: target.entity.boss.bossId } : {}),
    });
  } else {
    state.heroes = state.heroes.filter((h) => h.id !== entity.id);
  }
  ctx.emit({
    type: "kill",
    sourceId,
    targetId: entity.id,
    lane: entity.lane,
    x: targetX(target),
    rarity: target.kind === "monster" ? target.entity.rarity : null,
  });
}

/**
 * The combat seam: resolves one hit through Appendix A's pipeline with the
 * `combat` stream, applies the ES and life loss, and emits `hit`. A
 * surviving target takes the hit's ailments and stun (§6); a killing hit
 * emits `kill` and removes the target (§5.6).
 */
export function dealHit(ctx: StepContext, source: HitSource, target: HitTarget, hit: SkillHit) {
  const { state } = ctx;
  const entity = target.entity;
  const rng = streamRng(state.rng, "combat");
  const result = resolveHit(source.actor, entity.actor, hit, rng);
  entity.actor.es -= result.esLost;
  entity.actor.life -= result.lifeLost;
  ctx.emit({
    type: "hit",
    sourceId: source.id,
    targetId: entity.id,
    lane: entity.lane,
    x: targetX(target),
    dealt: result.total,
    targetMaxLife: entity.actor.maxLife,
    breakdown: result.dealt,
    crit: result.crit,
    avoidedBy: result.avoidedBy,
  });
  if (result.killed) {
    killTarget(ctx, source.id, target);
    return result;
  }
  const sourceIsHero = state.heroes.some((h) => h.id === source.id);
  const applied = applyHitAilments(entity.actor, hit, source.actor.stats, result, {
    targetKind: target.kind,
    rarity: target.kind === "monster" ? target.entity.rarity : "normal",
    heroMelee: sourceIsHero && hit.tags.includes("melee"),
    sourceIsHero,
    rng,
    sourceId: source.id,
  });
  for (const ailment of applied) {
    if (ailment.ailment === "lightStun" || ailment.ailment === "heavyStun") {
      const kind = ailment.ailment === "lightStun" ? "light" : "heavy";
      ctx.emit({ type: "stun", targetId: entity.id, kind, seconds: ailment.seconds });
      if (kind === "light" && target.kind === "monster" && target.entity.attack) {
        target.entity.attack.timer += AILMENT_TUNING.lightStunAttackDelaySeconds;
      }
      const kit = target.kind === "hero" ? target.entity.kit : undefined;
      if (kind === "light" && kit && isAttackKit(kit)) kit.counters.actionTimer = kit.actionSeconds;
    } else {
      ctx.emit({
        type: "ailmentApplied",
        targetId: entity.id,
        ailment: ailment.ailment,
        magnitude: ailment.magnitude,
        seconds: ailment.seconds,
      });
    }
  }
  return result;
}
