import { makeActor } from "../../combat/actor";
import { effectiveSpeed, isPrimed } from "../../combat/ailments";
import type { SkillHit } from "../../combat/hit";
import { monsterLevelStats } from "../../data";
import { dealHit } from "../../sim/combat";
import { streamRng } from "../../sim/rng";
import { spawnMonster, type MonsterState, type RoundState } from "../../sim/state";
import type { System } from "../../sim/system";
import { STEP_SECONDS } from "../../sim/time";
import { BOSS_TUNING, type BossAbility, type BossId } from "../../tuning/bosses";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { SIM_TUNING } from "../../tuning/sim";
import { WAVE_TUNING } from "../../tuning/waves";
import { buildMonster } from "../model";
import type { BossState, BossTile } from "./types";

/** A monster that is a boss. */
export type BossMonster = MonsterState & { boss: BossState };

const isBoss = (monster: MonsterState): monster is BossMonster => monster.boss !== undefined;

export interface BossSpawn {
  bossId: BossId;
  areaLevel: number;
  levelIndex: number;
  x: number;
  /** Forces the top covered lane; otherwise drawn from the boss's allowed lanes on this board. */
  topLane?: number;
}

/**
 * Spawns a boss (Appendix D §7): a unique-rarity monster covering its span
 * of lanes, with life and damage relative to a white Shambler at the area
 * level, a heavy-stun threshold of 30% of its life, and its ability clocks.
 * Bosses use their own spec, not the biome element (D §2.3).
 */
export function spawnBoss(state: RoundState, spawn: BossSpawn): BossMonster {
  const t = BOSS_TUNING[spawn.bossId];
  const fits = t.topLanes.filter((top) =>
    Array.from({ length: t.span }, (_, i) => top + i).every((l) => state.lanes.includes(l)),
  );
  if (fits.length === 0) throw new Error(`no lanes fit boss ${spawn.bossId}`);
  const top = spawn.topLane ?? fits[Math.floor(streamRng(state.rng, "waves")() * fits.length)]!;
  const dms = monsterLevelStats(spawn.areaLevel);
  const maxLife = dms.life * t.lifeMult * COMBAT_KNOBS.K_monsterLife;
  const damage = dms.physicalDamage * t.damageMult * COMBAT_KNOBS.K_monsterDamage;
  const actor = makeActor({
    maxLife,
    armour: dms.armour,
    evasion: dms.evasion,
    accuracy: dms.accuracy,
  });
  actor.stunThreshold = maxLife * t.stunThresholdOfLife;
  const hit: SkillHit = {
    kind: "attack",
    tags: ["melee"],
    base: { physical: { min: damage, max: damage } },
    baseCrit: WAVE_TUNING.monsterBaseCrit,
  };
  const lanes = Array.from({ length: t.span }, (_, i) => top + i);
  const cooldowns = Object.fromEntries(
    Object.entries(t.abilities).map(([ability, a]) => [ability, a.everySeconds]),
  ) as Record<BossAbility, number>;
  return spawnMonster(state, {
    archetypeId: spawn.bossId,
    rarity: "unique",
    lane: top,
    x: spawn.x,
    moveSpeed: COMBAT_KNOBS.walkSecondsPerTile / t.secondsPerTile,
    actor,
    attack: { seconds: t.attackSeconds, timer: t.attackSeconds, hit },
    boss: {
      bossId: spawn.bossId,
      lanes,
      areaLevel: spawn.areaLevel,
      levelIndex: spawn.levelIndex,
      cooldowns,
      telegraphs: [],
      enraged: false,
      primed: false,
      announced: false,
    },
  }) as BossMonster;
}

/** The tiles an ability strikes or spawns on, from the boss's position when it telegraphs. */
function abilityTiles(state: RoundState, boss: BossMonster, ability: BossAbility): BossTile[] {
  const front = Math.round(boss.x) - 1;
  const columns =
    ability === "grainSlam" ? [front - 1, front] : [Math.min(SIM_TUNING.columns, front + 1)];
  return boss.boss.lanes.flatMap((lane) =>
    columns
      .filter((column) => column >= 1 && column <= SIM_TUNING.columns && state.lanes.includes(lane))
      .map((column) => ({ lane, column })),
  );
}

/** Lands an ability once its telegraph runs out (D §7.1). */
function land(
  ctx: Parameters<System["run"]>[0],
  boss: BossMonster,
  ability: BossAbility,
  tiles: BossTile[],
) {
  const { state } = ctx;
  const t = BOSS_TUNING[boss.boss.bossId];
  if (ability === "grainSlam") {
    const base = boss.attack?.hit;
    if (base) {
      const slam: SkillHit = {
        ...base,
        tags: ["area"],
        more: [{ percent: (t.abilities.grainSlam.damageMultiplier - 1) * 100 }],
      };
      const struck = state.heroes.filter((h) =>
        tiles.some((tile) => tile.lane === h.lane && tile.column === h.column),
      );
      for (const hero of struck)
        if (state.heroes.includes(hero)) dealHit(ctx, boss, { kind: "hero", entity: hero }, slam);
    }
  } else {
    const rng = streamRng(state.rng, "waves");
    const lanes = [...boss.boss.lanes, state.lanes[Math.floor(rng() * state.lanes.length)]!];
    for (const lane of lanes)
      spawnMonster(
        state,
        buildMonster({
          archetypeId: "Shambler",
          rarity: "normal",
          affixes: [],
          areaLevel: boss.boss.areaLevel,
          levelIndex: boss.boss.levelIndex,
          lane,
          x: boss.x,
        }),
      );
  }
  ctx.emit({ type: "bossAbility", monsterId: boss.id, ability, tiles });
}

/**
 * Bosses' abilities (D §7.1): each ability's clock runs at the boss's
 * speed, so a heavy stun or freeze holds it; it telegraphs its tiles, then
 * lands. Enrage fires once at half life; the Primed edge is announced.
 */
export const bossSystem: System = {
  id: "bosses",
  phase: "monsters",
  run(ctx) {
    const { state } = ctx;
    for (const boss of state.monsters.filter(isBoss)) {
      const t = BOSS_TUNING[boss.boss.bossId];
      if (!boss.boss.announced) {
        boss.boss.announced = true;
        ctx.emit({
          type: "bossSpawned",
          monsterId: boss.id,
          bossId: boss.boss.bossId,
          lanes: [...boss.boss.lanes],
          x: boss.x,
        });
      }
      if (!boss.boss.enraged && boss.actor.life <= boss.actor.maxLife * t.enrageAtLifeShare) {
        boss.boss.enraged = true;
        boss.moveSpeed *= 1 + t.enrageSpeedPercent / 100;
        ctx.emit({ type: "bossEnrage", monsterId: boss.id });
      }
      const primed = isPrimed(boss.actor, boss.rarity);
      if (primed && !boss.boss.primed) ctx.emit({ type: "bossPrimed", monsterId: boss.id });
      boss.boss.primed = primed;

      const dt = STEP_SECONDS * effectiveSpeed(boss.actor, boss.rarity);
      if (dt <= 0) continue;
      for (const telegraph of [...boss.boss.telegraphs]) {
        telegraph.secondsLeft -= dt;
        if (telegraph.secondsLeft > 1e-9) continue;
        boss.boss.telegraphs = boss.boss.telegraphs.filter((x) => x !== telegraph);
        land(ctx, boss, telegraph.ability, telegraph.tiles);
      }
      for (const ability of Object.keys(boss.boss.cooldowns) as BossAbility[]) {
        boss.boss.cooldowns[ability] -= dt;
        if (boss.boss.cooldowns[ability] > 1e-9) continue;
        boss.boss.cooldowns[ability] += t.abilities[ability].everySeconds;
        const tiles = abilityTiles(state, boss, ability);
        boss.boss.telegraphs.push({ ability, tiles, secondsLeft: t.telegraphSeconds });
        ctx.emit({
          type: "bossTelegraph",
          monsterId: boss.id,
          ability,
          tiles,
          seconds: t.telegraphSeconds,
        });
      }
    }
  },
};
