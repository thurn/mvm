import { effectiveSpeed } from "../../combat/ailments";
import { HERO_CATALOG } from "../../heroes/model/catalog";
import { findArchetype as archetypeOf } from "../../monsters/archetypes";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { SIM_TUNING } from "../../tuning/sim";
import { dealHit } from "../combat";
import { occupies } from "../targeting";
import type { HeroState, MonsterState, RoundState } from "../state";
import type { StepContext, System } from "../system";
import { STEP_SECONDS } from "../time";

type Blocker = { kind: "hero"; heroes: HeroState[] } | { kind: "scripted" };

/**
 * The heroes, or blocking scripted actor, in front of the monster (Appendix
 * A §3.2). A boss is blocked by a hero in any lane it covers, and its attack
 * reaches every one of them (D §7); any other monster takes the first.
 */
function blockerOf(state: RoundState, monster: MonsterState): Blocker | null {
  const reach = SIM_TUNING.blockReach;
  const blocks = (lane: number, column: number) =>
    occupies(monster, lane) && Math.abs(monster.x - column) <= reach;
  const heroes = state.heroes.filter((h) => blocks(h.lane, h.column));
  if (heroes.length > 0)
    return { kind: "hero", heroes: monster.boss ? heroes : heroes.slice(0, 1) };
  return state.scripted.some((s) => s.blocks && blocks(s.lane, s.column))
    ? { kind: "scripted" }
    : null;
}

/** Walls (catalog life ×5 or more) can't be leapt. */
function isWall(hero: HeroState): boolean {
  const entry = hero.skillId ? HERO_CATALOG[hero.skillId] : undefined;
  return (entry?.lifeMultiplier ?? 1) >= SIM_TUNING.wallLifeMultiplier;
}

/**
 * A leaper's one leap (D §2.2): reaching its first non-wall hero, it lands
 * one tile behind it and slows to its post-leap speed. Returns whether it leapt.
 */
function leap(ctx: StepContext, monster: MonsterState, hero: HeroState): boolean {
  const after = archetypeOf(monster)?.leapSecondsPerTile;
  if (after === undefined || monster.leapt || isWall(hero)) return false;
  const fromX = monster.x;
  monster.x = hero.column - 1;
  monster.leapt = true;
  monster.moveSpeed = COMBAT_KNOBS.walkSecondsPerTile / after;
  ctx.emit({ type: "leap", monsterId: monster.id, lane: monster.lane, fromX, toX: monster.x });
  return true;
}

/**
 * Monsters walk left unless blocked; a blocked monster with an attack hits
 * the hero in front of it. One below `leakX` reaches the gate, costs life by
 * rarity and despawns (Appendix A §7). Life 0 loses the level.
 */
export const locomotionSystem: System = {
  id: "locomotion",
  phase: "monsters",
  run(ctx) {
    const { state } = ctx;
    const stepTiles = STEP_SECONDS / COMBAT_KNOBS.walkSecondsPerTile;
    const leaked: MonsterState[] = [];
    for (const monster of [...state.monsters]) {
      if (!state.monsters.includes(monster)) continue;
      const speed = effectiveSpeed(monster.actor, monster.rarity);
      if (speed <= 0) continue;
      const blocker = blockerOf(state, monster);
      if (!blocker) {
        monster.x -= stepTiles * monster.moveSpeed * speed;
        if (monster.x < SIM_TUNING.leakX) leaked.push(monster);
        continue;
      }
      if (blocker.kind === "hero" && leap(ctx, monster, blocker.heroes[0]!)) {
        if (monster.x < SIM_TUNING.leakX) leaked.push(monster);
        continue;
      }
      const attack = monster.attack;
      if (!attack || blocker.kind !== "hero") continue;
      attack.timer -= STEP_SECONDS * speed;
      if (attack.timer > 0) continue;
      attack.timer = attack.seconds;
      for (const hero of blocker.heroes)
        if (state.heroes.includes(hero))
          dealHit(ctx, monster, { kind: "hero", entity: hero }, attack.hit);
    }
    if (leaked.length === 0) return;
    state.monsters = state.monsters.filter((m) => !leaked.includes(m));
    for (const monster of leaked) {
      const cost = SIM_TUNING.leakCost[monster.boss ? "boss" : monster.rarity];
      state.life = Math.max(0, state.life - cost);
      ctx.emit({
        type: "leak",
        monsterId: monster.id,
        lane: monster.lane,
        rarity: monster.rarity,
        cost,
        lifeLeft: state.life,
      });
      // A boss reaching the gate loses the level outright (D §7).
      if (state.life === 0 || monster.boss) {
        state.result = "lost";
        ctx.emit({ type: "levelEnd", result: "lost" });
        return;
      }
    }
  },
};
