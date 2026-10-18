import type { Actor } from "../combat/actor";
import type { SkillHit } from "../combat/hit";
import { resolveHit } from "../combat/resolve";
import { streamRng } from "./rng";
import type { EntityId, HeroState, MonsterState } from "./state";
import type { StepContext } from "./system";

export interface HitSource {
  id: EntityId;
  actor: Actor;
}

export type HitTarget =
  { kind: "monster"; entity: MonsterState } | { kind: "hero"; entity: HeroState };

/**
 * The combat seam: resolves one hit through Appendix A's pipeline with the
 * `combat` stream, applies the ES and life loss, and emits `hit`. A killing
 * hit emits `kill` and removes the target (§5.6).
 */
export function dealHit(ctx: StepContext, source: HitSource, target: HitTarget, hit: SkillHit) {
  const { state } = ctx;
  const entity = target.entity;
  const x = target.kind === "monster" ? target.entity.x : target.entity.column;
  const result = resolveHit(source.actor, entity.actor, hit, streamRng(state.rng, "combat"));
  entity.actor.es -= result.esLost;
  entity.actor.life -= result.lifeLost;
  ctx.emit({
    type: "hit",
    sourceId: source.id,
    targetId: entity.id,
    lane: entity.lane,
    x,
    dealt: result.total,
    targetMaxLife: entity.actor.maxLife,
    breakdown: result.dealt,
    crit: result.crit,
    avoidedBy: result.avoidedBy,
  });
  if (!result.killed) return result;
  if (target.kind === "monster") {
    state.monsters = state.monsters.filter((m) => m.id !== entity.id);
  } else {
    state.heroes = state.heroes.filter((h) => h.id !== entity.id);
  }
  ctx.emit({
    type: "kill",
    sourceId: source.id,
    targetId: entity.id,
    lane: entity.lane,
    x,
    rarity: target.kind === "monster" ? target.entity.rarity : null,
  });
  return result;
}
