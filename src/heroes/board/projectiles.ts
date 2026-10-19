import type { SkillHit } from "../../combat/hit";
import { dealHit } from "../../sim/combat";
import {
  newInstanceId,
  type HeroState,
  type MonsterState,
  type ProjectileState,
  type RoundState,
} from "../../sim/state";
import type { StepContext, System } from "../../sim/system";
import { laneGap, nearestLane, occupies } from "../../sim/targeting";
import { STEP_SECONDS } from "../../sim/time";
import { HERO_BOARD_TUNING } from "../../tuning/heroes";

export interface FireOptions {
  hit: SkillHit;
  range?: number;
  pierce?: number;
  fork?: boolean;
  chains?: number;
  group?: string;
  onHit?: string | null;
  delaySeconds?: number;
}

function laneOrOwn(state: RoundState, lane: number, own: number): number {
  return state.lanes.includes(lane) ? lane : own;
}

/** Fires one lane projectile from a hero's tile. */
export function fire(
  state: RoundState,
  hero: HeroState,
  lane: number,
  options: FireOptions,
): ProjectileState {
  const projectile: ProjectileState = {
    id: newInstanceId<"Projectile">(state),
    sourceId: hero.id,
    lane: laneOrOwn(state, lane, hero.lane),
    x: hero.column,
    speed: HERO_BOARD_TUNING.projectileSpeed,
    hit: options.hit,
    rangeLeft: options.range ?? HERO_BOARD_TUNING.laneProjectileRange,
    delaySeconds: options.delaySeconds ?? 0,
    pierceLeft: options.pierce ?? 0,
    forks: options.fork ?? false,
    chainsLeft: options.chains ?? 0,
    hitIds: [],
    group: options.group ?? newInstanceId<"ProjectileGroup">(state),
    onHit: options.onHit ?? null,
  };
  state.projectiles.push(projectile);
  return projectile;
}

/**
 * Fires a volley with extra projectiles fanned per Appendix A §3.4: +1 to
 * the lane above, +2 below, +3 the same lane 0.1 s later, and so on. Copies
 * that would leave the board go to the hero's own lane.
 */
export function fireVolley(
  state: RoundState,
  hero: HeroState,
  extra: number,
  options: FireOptions,
): void {
  const group = options.group ?? newInstanceId<"ProjectileGroup">(state);
  fire(state, hero, hero.lane, { ...options, group });
  const pattern = [-1, 1, 0];
  for (let k = 0; k < extra; k++) {
    const offset = pattern[k % 3]!;
    const round = Math.floor(k / 3) + (offset === 0 ? 1 : 0);
    fire(state, hero, hero.lane + offset, {
      ...options,
      group,
      delaySeconds: round * HERO_BOARD_TUNING.extraProjectileStaggerSeconds,
    });
  }
}

/** The nearest monster within `range` of a point that is not in `exclude`. */
function nearestUnhit(
  state: RoundState,
  from: { lane: number; x: number },
  range: number,
  exclude: readonly string[],
) {
  let best: MonsterState | undefined;
  let bestDistance = Infinity;
  for (const monster of state.monsters) {
    if (exclude.includes(monster.id)) continue;
    const d = Math.hypot(monster.x - from.x, laneGap(monster, from.lane));
    if (d <= range && d < bestDistance) {
      best = monster;
      bestDistance = d;
    }
  }
  return best;
}

/** Chains a hit from a point to the nearest unhit monsters, one jump at a time (A §3.4). */
export function chainFrom(
  ctx: StepContext,
  source: HeroState,
  from: { lane: number; x: number },
  hit: SkillHit,
  chains: number,
  alreadyHit: string[],
): void {
  let at = from;
  for (let i = 0; i < chains; i++) {
    const next = nearestUnhit(ctx.state, at, HERO_BOARD_TUNING.chainRange, alreadyHit);
    if (!next) return;
    alreadyHit.push(next.id);
    at = { lane: nearestLane(next, at.lane), x: next.x };
    dealHit(ctx, source, { kind: "monster", entity: next }, hit);
  }
}

/** On-hit effects keyed by `ProjectileState.onHit`; registered by the hero behaviors. */
export const ON_HIT: Record<
  string,
  (ctx: StepContext, hero: HeroState, target: { id: string; lane: number; x: number }) => void
> = {};

function resolveHit(
  ctx: StepContext,
  p: ProjectileState,
  target: MonsterState,
): "continue" | "remove" {
  const { state } = ctx;
  const hero = state.heroes.find((h) => h.id === p.sourceId);
  // Where it struck: a boss covers several lanes, and its beams and chains start from this one.
  const at = { id: target.id, lane: nearestLane(target, p.lane), x: target.x };
  for (const other of state.projectiles) if (other.group === p.group) other.hitIds.push(target.id);
  if (hero) {
    dealHit(ctx, hero, { kind: "monster", entity: target }, p.hit);
    if (p.onHit) ON_HIT[p.onHit]?.(ctx, hero, at);
  }
  if (p.pierceLeft > 0) {
    p.pierceLeft--;
    return "continue";
  }
  if (p.forks) {
    for (const offset of [-1, 1]) {
      const lane = p.lane + offset;
      if (!state.lanes.includes(lane)) continue;
      state.projectiles.push({
        ...p,
        id: newInstanceId<"Projectile">(state),
        lane,
        forks: false,
        hitIds: [...p.hitIds],
      });
    }
    return "remove";
  }
  if (p.chainsLeft > 0 && hero) chainFrom(ctx, hero, at, p.hit, p.chainsLeft, [...p.hitIds]);
  return "remove";
}

/** Moves projectiles down their lanes and resolves pierce, fork and chain on hit (A §3.4). */
export const projectileSystem: System = {
  id: "projectiles",
  phase: "projectiles",
  run(ctx) {
    const { state } = ctx;
    const removed = new Set<string>();
    for (const p of [...state.projectiles]) {
      if (p.delaySeconds > 0) {
        p.delaySeconds -= STEP_SECONDS;
        continue;
      }
      const dx = p.speed * STEP_SECONDS;
      p.x += dx;
      p.rangeLeft -= dx;
      const target = state.monsters
        .filter(
          (m) =>
            occupies(m, p.lane) &&
            !p.hitIds.includes(m.id) &&
            Math.abs(m.x - p.x) <= HERO_BOARD_TUNING.projectileHitReach,
        )
        .sort((a, b) => a.x - b.x)[0];
      if (target && resolveHit(ctx, p, target) === "remove") removed.add(p.id);
      if (p.rangeLeft <= 0) removed.add(p.id);
    }
    if (removed.size > 0) state.projectiles = state.projectiles.filter((p) => !removed.has(p.id));
  },
};
