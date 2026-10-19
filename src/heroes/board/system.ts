import { effectiveSpeed, forceHeavyStun, isPrimed } from "../../combat/ailments";
import type { SkillHit } from "../../combat/hit";
import { dealDot, dealHit } from "../../sim/combat";
import {
  newInstanceId,
  type AttackKit,
  type HeroState,
  type KitOf,
  type MonsterState,
  type RoundState,
} from "../../sim/state";
import type { StepContext, System } from "../../sim/system";
import { laneFirst, laneGap, monstersWithin, nearestLane, occupies } from "../../sim/targeting";
import { STEP_SECONDS } from "../../sim/time";
import { spawnOrb } from "../../sim/economy/orbs";
import { HERO_BOARD_TUNING } from "../../tuning/heroes";
import { SIM_TUNING } from "../../tuning/sim";
import { chainFrom, fire, fireVolley, ON_HIT } from "./projectiles";

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
    (m) => occupies(m, lane) && m.x - hero.column >= from && m.x - hero.column <= to,
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
  const kit = hero.kit;
  if (kit?.behavior !== "lightningArrow") return;
  const near = monstersWithin(ctx.state, target.lane, target.x, t.lightningArrow.beamRadius)
    .filter((m) => m.id !== target.id)
    .sort(
      (a, b) =>
        Math.hypot(a.x - target.x, laneGap(a, target.lane)) -
        Math.hypot(b.x - target.x, laneGap(b, target.lane)),
    )
    .slice(0, kit.numbers.extraTargets);
  for (const monster of near) {
    const hitIds = [target.id, monster.id];
    const at = { lane: nearestLane(monster, target.lane), x: monster.x };
    dealHit(ctx, hero, { kind: "monster", entity: monster }, kit.hits.beam);
    chainFrom(ctx, hero, at, kit.hits.beam, kit.numbers.beamChains, hitIds);
  }
};

/** Each behavior acts on its target and returns the seconds until its next action, or null when idle. */
function lightningArrow(ctx: StepContext, hero: HeroState, kit: KitOf<"lightningArrow">) {
  if (!laneFirst(ctx.state, hero.lane, hero.column, laneRange(hero))) return null;
  fireVolley(ctx.state, hero, kit.numbers.additionalProjectiles, {
    hit: kit.hits.main,
    pierce: kit.numbers.pierce,
    fork: kit.numbers.fork > 0,
    chains: kit.numbers.chain,
    onHit: "lightningArrowBeams",
  });
  return kit.actionSeconds;
}

function armourPiercingRounds(
  ctx: StepContext,
  hero: HeroState,
  kit: KitOf<"armourPiercingRounds">,
) {
  if (!laneFirst(ctx.state, hero.lane, hero.column, laneRange(hero))) return null;
  fireVolley(ctx.state, hero, kit.numbers.additionalProjectiles, {
    hit: kit.hits.main,
    pierce: kit.numbers.pierce,
    fork: kit.numbers.fork > 0,
    chains: kit.numbers.chain,
  });
  kit.counters.clipLeft -= 1;
  if (kit.counters.clipLeft > 0) return kit.actionSeconds;
  kit.counters.clipLeft = kit.numbers.clip;
  return kit.actionSeconds + kit.numbers.reloadSeconds;
}

function spark(ctx: StepContext, hero: HeroState, kit: KitOf<"spark">) {
  const { state } = ctx;
  const reach = t.spark.laneReach;
  const inRange = state.monsters.some(
    (m) =>
      laneGap(m, hero.lane) <= reach &&
      m.x - hero.column >= 0 &&
      m.x - hero.column <= t.spark.range,
  );
  if (!inRange) return null;
  const group = newInstanceId<"ProjectileGroup">(state);
  const lanes = [hero.lane, hero.lane - 1, hero.lane + 1];
  for (let i = 0; i < kit.numbers.sparks; i++) {
    fire(state, hero, lanes[i % 3]!, {
      hit: kit.hits.main,
      range: t.spark.range,
      group,
      pierce: kit.numbers.pierce,
    });
  }
  return kit.actionSeconds;
}

function rollingSlam(ctx: StepContext, hero: HeroState, kit: KitOf<"rollingSlam">) {
  const { state } = ctx;
  if (inLaneAhead(state, hero, 0, t.rollingSlam.reach).length === 0) return null;
  const slam = (offset: number, radius: number, hit: SkillHit) =>
    hitAll(ctx, hero, monstersWithin(state, hero.lane, hero.column + offset, radius), hit);
  slam(t.rollingSlam.firstOffset, kit.numbers.firstRadius, kit.hits.first);
  slam(t.rollingSlam.secondOffset, kit.numbers.secondRadius, kit.hits.second);
  return kit.actionSeconds;
}

function fallingThunder(ctx: StepContext, hero: HeroState, kit: KitOf<"fallingThunder">) {
  const { state } = ctx;
  const ft = t.fallingThunder;
  if (inLaneAhead(state, hero, 0, ft.reach).length === 0) return null;
  const cone = [
    ...inLaneAhead(state, hero, ft.ownLaneFrom - 0.5, ft.reach + 0.5),
    ...inLaneAhead(state, hero, ft.adjacentLaneFrom - 0.5, ft.reach + 0.5, hero.lane - 1),
    ...inLaneAhead(state, hero, ft.adjacentLaneFrom - 0.5, ft.reach + 0.5, hero.lane + 1),
  ];
  hitAll(ctx, hero, cone, kit.hits.slam);
  kit.counters.slams += 1;
  if (kit.counters.slams % ft.volleyEvery === 0) {
    const lanes = [hero.lane, hero.lane - 1, hero.lane + 1];
    for (let i = 0; i < kit.numbers.volleyProjectiles; i++) {
      if (!state.lanes.includes(lanes[i % 3]!)) continue;
      fire(state, hero, lanes[i % 3]!, { hit: kit.hits.volley, pierce: Number.MAX_SAFE_INTEGER });
    }
  }
  return kit.actionSeconds;
}

function iceStrike(ctx: StepContext, hero: HeroState, kit: KitOf<"iceStrike">) {
  const { state } = ctx;
  const final = kit.counters.combo === t.iceStrike.combo - 1;
  const reach = final ? t.iceStrike.finalReach : t.meleeReach;
  const target = mostAdvanced(inLaneAhead(state, hero, -0.5, reach + 0.5));
  if (!target) return null;
  dealHit(ctx, hero, { kind: "monster", entity: target }, final ? kit.hits.final : kit.hits.strike);
  kit.counters.combo = final ? 0 : kit.counters.combo + 1;
  return final ? kit.numbers.finalSeconds : kit.actionSeconds;
}

/** The most advanced monster on the hero's tile or the one ahead: a melee strike's target (B §1.2). */
const meleeTarget = (state: RoundState, hero: HeroState) =>
  mostAdvanced(inLaneAhead(state, hero, -0.5, t.meleeReach + 0.5));

function armourBreaker(ctx: StepContext, hero: HeroState, kit: KitOf<"armourBreaker">) {
  const target = meleeTarget(ctx.state, hero);
  if (!target) return null;
  dealHit(ctx, hero, { kind: "monster", entity: target }, kit.hits.main);
  return kit.actionSeconds;
}

/** B H06: the strike builds no stun; on a Primed target it heavy-stuns and releases a Shockwave. */
function boneshatter(ctx: StepContext, hero: HeroState, kit: KitOf<"boneshatter">) {
  const { state } = ctx;
  const target = meleeTarget(state, hero);
  if (!target) return null;
  const primed = isPrimed(target.actor, target.rarity);
  dealHit(ctx, hero, { kind: "monster", entity: target }, kit.hits.strike);
  if (!primed) return kit.actionSeconds;
  if (state.monsters.includes(target) && target.actor.ailments.heavyStunSeconds <= 0) {
    const stun = forceHeavyStun(target.actor);
    ctx.emit({ type: "stun", targetId: target.id, kind: "heavy", seconds: stun.seconds });
  }
  const unique = target.rarity === "unique" || target.rarity === "boss";
  const wave: SkillHit = unique
    ? {
        ...kit.hits.shockwave,
        more: [...(kit.hits.shockwave.more ?? []), { percent: kit.numbers.uniqueMorePercent }],
      }
    : kit.hits.shockwave;
  hitAll(
    ctx,
    hero,
    monstersWithin(state, target.lane, target.x, kit.numbers.shockwaveRadius),
    wave,
  );
  return kit.actionSeconds;
}

/** B H11: a stab; on an Off Balance target the stab consumes it for a frost explosion. */
function fangsOfFrost(ctx: StepContext, hero: HeroState, kit: KitOf<"fangsOfFrost">) {
  const { state } = ctx;
  const target = meleeTarget(state, hero);
  if (!target) return null;
  const burst = target.offBalance === true;
  if (burst) target.offBalance = false;
  dealHit(ctx, hero, { kind: "monster", entity: target }, kit.hits.stab);
  if (burst)
    hitAll(
      ctx,
      hero,
      monstersWithin(state, target.lane, target.x, kit.numbers.burstRadius),
      kit.hits.burst,
    );
  return kit.actionSeconds;
}

// Lightning Spear's bolts: up to N other monsters near the struck one, each hit once (B H16).
ON_HIT["lightningSpearBolts"] = (ctx, hero, target) => {
  const kit = hero.kit;
  if (kit?.behavior !== "lightningSpear") return;
  const near = monstersWithin(ctx.state, target.lane, target.x, kit.numbers.boltRadius)
    .filter((m) => m.id !== target.id)
    .sort(
      (a, b) =>
        Math.hypot(a.x - target.x, laneGap(a, target.lane)) -
          Math.hypot(b.x - target.x, laneGap(b, target.lane)) || a.id.localeCompare(b.id),
    )
    .slice(0, kit.numbers.bolts);
  hitAll(ctx, hero, near, kit.hits.bolt);
};

function lightningSpear(ctx: StepContext, hero: HeroState, kit: KitOf<"lightningSpear">) {
  if (!laneFirst(ctx.state, hero.lane, hero.column, laneRange(hero))) return null;
  // One spear: it can't pierce, fork or chain; its bolts do the spreading.
  fire(ctx.state, hero, hero.lane, { hit: kit.hits.spear, onHit: "lightningSpearBolts" });
  return kit.actionSeconds;
}

/** B H17: a piercing spear that lodges at the first monster's tile; at its Limit the hero waits. */
function explosiveSpear(ctx: StepContext, hero: HeroState, kit: KitOf<"explosiveSpear">) {
  const { state } = ctx;
  const target = laneFirst(state, hero.lane, hero.column, laneRange(hero));
  if (!target) return null;
  const lodged = state.groundEffects.filter(
    (g) => g.kind === "explosiveSpear" && g.sourceId === hero.id,
  );
  if (lodged.length >= kit.numbers.limit) return null;
  fire(state, hero, hero.lane, {
    hit: kit.hits.spear,
    pierce: Number.MAX_SAFE_INTEGER,
    range: Math.max(0, target.x - hero.column),
  });
  state.groundEffects.push({
    id: newInstanceId<"GroundEffect">(state),
    sourceId: hero.id,
    kind: "explosiveSpear",
    lane: hero.lane,
    x: target.x,
    radius: kit.numbers.explosionRadius,
    secondsLeft: kit.numbers.fuseSeconds,
  });
  return kit.actionSeconds;
}

/** Lodged spears count down and explode around their tile (B H17); one whose hero is gone fizzles. */
function detonate(ctx: StepContext) {
  const { state } = ctx;
  for (const spear of state.groundEffects.filter((g) => g.kind === "explosiveSpear")) {
    spear.secondsLeft -= STEP_SECONDS;
    if (spear.secondsLeft > 1e-9) continue;
    state.groundEffects = state.groundEffects.filter((g) => g !== spear);
    const hero = state.heroes.find((h) => h.id === spear.sourceId);
    if (hero?.kit?.behavior !== "explosiveSpear") continue;
    hitAll(
      ctx,
      hero,
      monstersWithin(state, spear.lane, spear.x, spear.radius),
      hero.kit.hits.explosion,
    );
  }
}

/** B H19: 10 fragments down its lane, each piercing, each able to hit the same target; clip and reload. */
function permafrostBolts(ctx: StepContext, hero: HeroState, kit: KitOf<"permafrostBolts">) {
  const { state } = ctx;
  if (!laneFirst(state, hero.lane, hero.column, laneRange(hero))) return null;
  for (let i = 0; i < kit.numbers.fragments; i++)
    fire(state, hero, hero.lane, { hit: kit.hits.fragment, pierce: kit.numbers.pierce });
  kit.counters.clipLeft -= 1;
  if (kit.counters.clipLeft > 0) return kit.actionSeconds;
  kit.counters.clipLeft = kit.numbers.clip;
  return kit.actionSeconds + kit.numbers.reloadSeconds;
}

// Fireball's explosion: every other monster within its radius of the struck one (B H20).
ON_HIT["fireballExplosion"] = (ctx, hero, target) => {
  const kit = hero.kit;
  if (kit?.behavior !== "fireball") return;
  const around = monstersWithin(
    ctx.state,
    target.lane,
    target.x,
    kit.numbers.explosionRadius,
  ).filter((m) => m.id !== target.id);
  hitAll(ctx, hero, around, kit.hits.explosion);
};

function fireball(ctx: StepContext, hero: HeroState, kit: KitOf<"fireball">) {
  if (!laneFirst(ctx.state, hero.lane, hero.column, laneRange(hero))) return null;
  fire(ctx.state, hero, hero.lane, { hit: kit.hits.main, onHit: "fireballExplosion" });
  return kit.actionSeconds;
}

/** B H21: wall offsets ahead of the hero, the first free one taken; recast as walls expire. */
const WALL_OFFSETS = [2, 3, 4];

function flameWall(ctx: StepContext, hero: HeroState, kit: KitOf<"flameWall">) {
  const { state } = ctx;
  const walls = state.groundEffects.filter((g) => g.kind === "flameWall" && g.sourceId === hero.id);
  if (walls.length >= kit.numbers.limit) return null;
  const reach = Math.floor(kit.numbers.halfLength);
  const threat = state.monsters.some(
    (m) => laneGap(m, hero.lane) <= reach && m.x > hero.column && m.x <= SIM_TUNING.columns + 0.5,
  );
  if (!threat) return null;
  const offset = WALL_OFFSETS.find((o) => !walls.some((w) => w.x === hero.column + o));
  if (offset === undefined || hero.column + offset > SIM_TUNING.columns) return null;
  state.groundEffects.push({
    id: newInstanceId<"GroundEffect">(state),
    sourceId: hero.id,
    kind: "flameWall",
    lane: hero.lane,
    x: hero.column + offset,
    radius: kit.numbers.halfLength,
    secondsLeft: kit.numbers.durationSeconds,
  });
  return kit.actionSeconds;
}

/** B H23: a nova around itself, only when a monster is within reach. */
function iceNova(ctx: StepContext, hero: HeroState, kit: KitOf<"iceNova">) {
  const around = monstersWithin(ctx.state, hero.lane, hero.column, kit.numbers.radius);
  if (around.length === 0) return null;
  hitAll(ctx, hero, around, kit.hits.nova);
  return kit.actionSeconds;
}

/** B H25: the first monster in its lane not yet drained, else the first; the hit adds the drain. */
function essenceDrain(ctx: StepContext, hero: HeroState, kit: KitOf<"essenceDrain">) {
  const { state } = ctx;
  const ahead = state.monsters
    .filter(
      (m) =>
        occupies(m, hero.lane) && m.x > hero.column - 0.5 && m.x - hero.column <= laneRange(hero),
    )
    .sort((a, b) => a.x - b.x);
  const target = ahead.find((m) => !m.drain) ?? ahead[0];
  if (!target) return null;
  dealHit(ctx, hero, { kind: "monster", entity: target }, kit.hits.main);
  if (state.monsters.includes(target))
    target.drain = {
      dps: kit.numbers.drainDps,
      secondsLeft: kit.numbers.drainSeconds,
      sourceId: hero.id,
    };
  return kit.actionSeconds;
}

/** Burning walls and drains tick each step (B H21, H25); a gone caster's effects end. */
function tickEffects(ctx: StepContext) {
  const { state } = ctx;
  for (const wall of state.groundEffects.filter((g) => g.kind === "flameWall")) {
    wall.secondsLeft -= STEP_SECONDS;
    const hero = state.heroes.find((h) => h.id === wall.sourceId);
    if (wall.secondsLeft <= 1e-9 || hero?.kit?.behavior !== "flameWall") {
      state.groundEffects = state.groundEffects.filter((g) => g !== wall);
      continue;
    }
    const dps = hero.kit.numbers.dps;
    for (const m of [...state.monsters])
      if (Math.abs(m.x - wall.x) <= 0.5 && laneGap(m, wall.lane) <= wall.radius)
        dealDot(ctx, hero, { kind: "monster", entity: m }, "fire", dps * STEP_SECONDS, "flameWall");
  }
  for (const m of [...state.monsters]) {
    const drain = m.drain;
    if (!drain) continue;
    drain.secondsLeft -= STEP_SECONDS;
    if (drain.secondsLeft <= 1e-9) delete m.drain;
    const hero = state.heroes.find((h) => h.id === drain.sourceId);
    if (hero)
      dealDot(
        ctx,
        hero,
        { kind: "monster", entity: m },
        "chaos",
        drain.dps * STEP_SECONDS,
        "drain",
      );
  }
}

/** One action of an attacking kit, by behavior; the switch is exhaustive, so a new behavior must act. */
function act(ctx: StepContext, hero: HeroState, kit: AttackKit): number | null {
  switch (kit.behavior) {
    case "lightningArrow":
      return lightningArrow(ctx, hero, kit);
    case "armourPiercingRounds":
      return armourPiercingRounds(ctx, hero, kit);
    case "spark":
      return spark(ctx, hero, kit);
    case "rollingSlam":
      return rollingSlam(ctx, hero, kit);
    case "fallingThunder":
      return fallingThunder(ctx, hero, kit);
    case "iceStrike":
      return iceStrike(ctx, hero, kit);
    case "armourBreaker":
      return armourBreaker(ctx, hero, kit);
    case "boneshatter":
      return boneshatter(ctx, hero, kit);
    case "fangsOfFrost":
      return fangsOfFrost(ctx, hero, kit);
    case "lightningSpear":
      return lightningSpear(ctx, hero, kit);
    case "explosiveSpear":
      return explosiveSpear(ctx, hero, kit);
    case "permafrostBolts":
      return permafrostBolts(ctx, hero, kit);
    case "fireball":
      return fireball(ctx, hero, kit);
    case "flameWall":
      return flameWall(ctx, hero, kit);
    case "iceNova":
      return iceNova(ctx, hero, kit);
    case "essenceDrain":
      return essenceDrain(ctx, hero, kit);
  }
}

function acolyte(ctx: StepContext, hero: HeroState, kit: KitOf<"acolyte">) {
  kit.counters.orbTimer -= STEP_SECONDS;
  if (kit.counters.orbTimer > 1e-9) return;
  kit.counters.orbTimer += kit.actionSeconds;
  spawnOrb(ctx, {
    amount: kit.numbers.orbValue,
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
    detonate(ctx);
    tickEffects(ctx);
    for (const hero of [...ctx.state.heroes]) {
      const kit = hero.kit;
      if (!kit || !ctx.state.heroes.includes(hero)) continue;
      if (kit.behavior === "acolyte") {
        acolyte(ctx, hero, kit);
        continue;
      }
      const speed = effectiveSpeed(hero.actor, "normal");
      if (speed <= 0) continue;
      kit.counters.actionTimer -= STEP_SECONDS * speed;
      if (kit.counters.actionTimer > 1e-9) continue;
      const next = act(ctx, hero, kit);
      kit.counters.actionTimer = next === null ? 0 : kit.counters.actionTimer + next;
    }
  },
};
