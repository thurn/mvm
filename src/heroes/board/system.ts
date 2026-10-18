import type { SkillHit } from "../../combat/hit";
import { dealHit } from "../../sim/combat";
import {
  newInstanceId,
  type HeroKit,
  type HeroState,
  type MonsterState,
  type RoundState,
} from "../../sim/state";
import type { StepContext, System } from "../../sim/system";
import { laneFirst, monstersWithin } from "../../sim/targeting";
import { STEP_SECONDS } from "../../sim/time";
import { spawnOrb } from "../../sim/economy/orbs";
import { HERO_BOARD_TUNING } from "../../tuning/heroes";
import { SIM_TUNING } from "../../tuning/sim";
import { chainFrom, fire, fireVolley, ON_HIT } from "./projectiles";

type Act = (ctx: StepContext, hero: HeroState, kit: HeroKit) => number | null;

const t = HERO_BOARD_TUNING;

/** Lane range from the hero's column, capped at the lawn's right edge: no shots at monsters still off the board. */
const laneRange = (hero: HeroState) =>
  Math.min(t.laneProjectileRange, SIM_TUNING.columns + 0.5 - hero.column);

const mostAdvanced = (monsters: MonsterState[]) => [...monsters].sort((a, b) => a.x - b.x)[0];

/** Monsters in the hero's lane between `from` and `to` tiles ahead of its column. */
function inLaneAhead(
  state: RoundState,
  hero: HeroState,
  from: number,
  to: number,
  lane = hero.lane,
) {
  return state.monsters.filter(
    (m) => m.lane === lane && m.x - hero.column >= from && m.x - hero.column <= to,
  );
}

function hitAll(
  ctx: StepContext,
  hero: HeroState,
  targets: MonsterState[],
  hit: SkillHit | undefined,
) {
  if (!hit) return;
  for (const target of targets) dealHit(ctx, hero, { kind: "monster", entity: target }, hit);
}

// Lightning Arrow's beams: up to N extra monsters near the target, each chaining (B H12).
ON_HIT["lightningArrowBeams"] = (ctx, hero, target) => {
  const kit = hero.kit!;
  const near = monstersWithin(ctx.state, target.lane, target.x, t.lightningArrow.beamRadius)
    .filter((m) => m.id !== target.id)
    .sort(
      (a, b) =>
        Math.hypot(a.x - target.x, a.lane - target.lane) -
        Math.hypot(b.x - target.x, b.lane - target.lane),
    )
    .slice(0, kit.numbers.extraTargets ?? 0);
  for (const monster of near) {
    const hitIds = [target.id, monster.id];
    const at = { lane: monster.lane, x: monster.x };
    dealHit(ctx, hero, { kind: "monster", entity: monster }, kit.hits.beam!);
    chainFrom(ctx, hero, at, kit.hits.beam!, kit.numbers.beamChains ?? 0, hitIds);
  }
};

/** Each behavior acts on its target and returns the seconds until its next action, or null when idle. */
const ACTIONS: Record<string, Act> = {
  lightningArrow(ctx, hero, kit) {
    if (!laneFirst(ctx.state, hero.lane, hero.column, laneRange(hero))) return null;
    fireVolley(ctx.state, hero, kit.numbers.additionalProjectiles ?? 0, {
      hit: kit.hits.main!,
      pierce: kit.numbers.pierce ?? 0,
      fork: (kit.numbers.fork ?? 0) > 0,
      chains: kit.numbers.chain ?? 0,
      onHit: "lightningArrowBeams",
    });
    return kit.actionSeconds;
  },

  armourPiercingRounds(ctx, hero, kit) {
    if (!laneFirst(ctx.state, hero.lane, hero.column, laneRange(hero))) return null;
    fireVolley(ctx.state, hero, kit.numbers.additionalProjectiles ?? 0, {
      hit: kit.hits.main!,
      pierce: kit.numbers.pierce ?? 0,
      fork: (kit.numbers.fork ?? 0) > 0,
      chains: kit.numbers.chain ?? 0,
    });
    kit.counters.clipLeft = (kit.counters.clipLeft ?? 1) - 1;
    if (kit.counters.clipLeft > 0) return kit.actionSeconds;
    kit.counters.clipLeft = kit.numbers.clip ?? 1;
    return kit.actionSeconds + (kit.numbers.reloadSeconds ?? 0);
  },

  spark(ctx, hero, kit) {
    const { state } = ctx;
    const reach = t.spark.laneReach;
    const inRange = state.monsters.some(
      (m) =>
        Math.abs(m.lane - hero.lane) <= reach &&
        m.x - hero.column >= 0 &&
        m.x - hero.column <= t.spark.range,
    );
    if (!inRange) return null;
    const group = newInstanceId<"ProjectileGroup">(state);
    const lanes = [hero.lane, hero.lane - 1, hero.lane + 1];
    for (let i = 0; i < (kit.numbers.sparks ?? 1); i++) {
      fire(state, hero, lanes[i % 3]!, {
        hit: kit.hits.main!,
        range: t.spark.range,
        group,
        pierce: kit.numbers.pierce ?? 0,
      });
    }
    return kit.actionSeconds;
  },

  rollingSlam(ctx, hero, kit) {
    const { state } = ctx;
    if (inLaneAhead(state, hero, 0, t.rollingSlam.reach).length === 0) return null;
    hitAll(
      ctx,
      hero,
      monstersWithin(
        state,
        hero.lane,
        hero.column + t.rollingSlam.firstOffset,
        kit.numbers.firstRadius ?? 0,
      ),
      kit.hits.first,
    );
    hitAll(
      ctx,
      hero,
      monstersWithin(
        state,
        hero.lane,
        hero.column + t.rollingSlam.secondOffset,
        kit.numbers.secondRadius ?? 0,
      ),
      kit.hits.second,
    );
    return kit.actionSeconds;
  },

  fallingThunder(ctx, hero, kit) {
    const { state } = ctx;
    const ft = t.fallingThunder;
    if (inLaneAhead(state, hero, 0, ft.reach).length === 0) return null;
    const cone = [
      ...inLaneAhead(state, hero, ft.ownLaneFrom - 0.5, ft.reach + 0.5),
      ...inLaneAhead(state, hero, ft.adjacentLaneFrom - 0.5, ft.reach + 0.5, hero.lane - 1),
      ...inLaneAhead(state, hero, ft.adjacentLaneFrom - 0.5, ft.reach + 0.5, hero.lane + 1),
    ];
    hitAll(ctx, hero, cone, kit.hits.slam);
    kit.counters.slams = (kit.counters.slams ?? 0) + 1;
    if (kit.counters.slams % ft.volleyEvery === 0) {
      const lanes = [hero.lane, hero.lane - 1, hero.lane + 1];
      for (let i = 0; i < (kit.numbers.volleyProjectiles ?? 3); i++) {
        if (!state.lanes.includes(lanes[i % 3]!)) continue;
        fire(state, hero, lanes[i % 3]!, {
          hit: kit.hits.volley!,
          pierce: Number.MAX_SAFE_INTEGER,
        });
      }
    }
    return kit.actionSeconds;
  },

  iceStrike(ctx, hero, kit) {
    const { state } = ctx;
    const final = (kit.counters.combo ?? 0) === t.iceStrike.combo - 1;
    const reach = final ? t.iceStrike.finalReach : t.meleeReach;
    const target = mostAdvanced(inLaneAhead(state, hero, -0.5, reach + 0.5));
    if (!target) return null;
    dealHit(
      ctx,
      hero,
      { kind: "monster", entity: target },
      final ? kit.hits.final! : kit.hits.strike!,
    );
    kit.counters.combo = final ? 0 : (kit.counters.combo ?? 0) + 1;
    return final ? (kit.numbers.finalSeconds ?? kit.actionSeconds) : kit.actionSeconds;
  },
};

function acolyte(ctx: StepContext, hero: HeroState, kit: HeroKit) {
  kit.counters.orbTimer = (kit.counters.orbTimer ?? 0) - STEP_SECONDS;
  if (kit.counters.orbTimer > 1e-9) return;
  kit.counters.orbTimer += kit.actionSeconds;
  spawnOrb(ctx, {
    amount: kit.numbers.orbValue ?? 0,
    source: "acolyte",
    lane: hero.lane,
    x: hero.column,
  });
}

/**
 * The hero loop (Appendix A §3.1): each hero's action timer counts down;
 * at zero it acts if it has a target and waits its action time, else it
 * idles and fires as soon as something is in range.
 */
export const heroSystem: System = {
  id: "heroes",
  phase: "heroes",
  run(ctx) {
    for (const hero of [...ctx.state.heroes]) {
      const kit = hero.kit;
      if (!kit || !ctx.state.heroes.includes(hero)) continue;
      if (kit.behavior === "acolyte") {
        acolyte(ctx, hero, kit);
        continue;
      }
      kit.counters.actionTimer = (kit.counters.actionTimer ?? 0) - STEP_SECONDS;
      if (kit.counters.actionTimer > 1e-9) continue;
      const next = ACTIONS[kit.behavior]?.(ctx, hero, kit);
      kit.counters.actionTimer =
        next === null || next === undefined ? 0 : kit.counters.actionTimer + next;
    }
  },
};
