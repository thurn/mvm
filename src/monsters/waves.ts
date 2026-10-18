import { createStreams, draw, streamRng } from "../sim/rng";
import { createRound, spawnMonster, type RoundState } from "../sim/state";
import type { System } from "../sim/system";
import { STEPS_PER_SECOND } from "../sim/time";
import { WAVE_TUNING } from "../tuning/waves";
import { archetype } from "./archetypes";
import type { LevelDefinition } from "./levels/types";
import { buildMonster } from "./model";
import { rollAffixes, rollRarity } from "./rarity";

type Rng = () => number;

/** One monster in the stored plan: what, where and when (P16). Rarity and affixes roll at spawn. */
interface PlannedMonster {
  archetypeId: string;
  lane: number;
  x: number;
  /** Seconds after its wave starts. */
  spawnOffsetSeconds: number;
}

interface PlannedWave {
  index: number;
  flag: boolean;
  /** Seconds after the previous wave starts that this one starts, unless the early trigger brings it forward. */
  gapSeconds: number;
  /** The nominal start, with no early triggers. */
  startSeconds: number;
  /** The share of the wave's spawned life at which the next wave is triggered early. */
  earlyTriggerFraction: number;
  monsters: PlannedMonster[];
}

export interface WavePlan {
  levelId: string;
  levelIndex: number;
  areaLevel: number;
  waves: PlannedWave[];
}

/** A wave's point budget (Appendix D §5.2); `w` counts from 0. */
export function waveBudget(level: LevelDefinition, w: number, flag: boolean): number {
  const t = WAVE_TUNING;
  const b = t.budgetBase + (level.index - 1) * t.budgetPerLevel;
  return (Math.floor(w / 3) + 1) * b * (flag ? t.flagBudgetMultiplier : 1);
}

function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** A weighted draw among the archetypes that still fit the remaining budget. */
function drawArchetype(level: LevelDefinition, remaining: number, rng: Rng): string | null {
  const options = level.archetypes.filter((id) => archetype(id).pointCost <= remaining);
  const total = options.reduce((sum, id) => sum + archetype(id).drawWeight, 0);
  if (total === 0) return null;
  let roll = rng() * total;
  for (const id of options) {
    roll -= archetype(id).drawWeight;
    if (roll < 0) return id;
  }
  return options.at(-1)!;
}

/** The wave's archetypes (§5.3): forced introductions, flag Shamblers, then a weighted draw. */
function compose(level: LevelDefinition, w: number, flag: boolean, rng: Rng): string[] {
  let remaining = waveBudget(level, w, flag);
  const picks: string[] = [];
  const take = (id: string) => {
    picks.push(id);
    remaining -= archetype(id).pointCost;
  };
  const middle = Math.floor(level.waves / 2);
  const intro = level.newArchetype;
  if (intro && (w === middle || w === level.waves - 1) && archetype(intro).pointCost <= remaining)
    take(intro);
  if (flag) {
    const t = WAVE_TUNING;
    let shamblerPoints = Math.min(
      waveBudget(level, w, flag) * t.flagShamblerShare,
      t.flagShamblerCap,
    );
    while (
      shamblerPoints >= archetype("Shambler").pointCost &&
      archetype("Shambler").pointCost <= remaining
    ) {
      take("Shambler");
      shamblerPoints -= archetype("Shambler").pointCost;
    }
  }
  for (let id = drawArchetype(level, remaining, rng); id; id = drawArchetype(level, remaining, rng))
    take(id);
  return picks;
}

/**
 * Uniformly random lanes, never more than 40% of the wave's points in one
 * lane, or an even split where 40% can't hold the wave (3 lanes, small waves).
 */
function assignLanes(level: LevelDefinition, picks: string[], rng: Rng): number[] {
  const total = picks.reduce((sum, id) => sum + archetype(id).pointCost, 0);
  const cap = Math.max(WAVE_TUNING.laneShareCap * total, Math.ceil(total / level.lanes.length));
  const load = new Map(level.lanes.map((lane) => [lane, 0]));
  return picks.map((id) => {
    const cost = archetype(id).pointCost;
    const open = level.lanes.filter((lane) => load.get(lane)! + cost <= cap + 1e-9);
    const choices =
      open.length > 0
        ? open
        : [...level.lanes].sort((a, b) => load.get(a)! - load.get(b)!).slice(0, 1);
    const lane = choices[Math.floor(rng() * choices.length)]!;
    load.set(lane, load.get(lane)! + cost);
    return lane;
  });
}

/** Rolls the level's whole wave plan at level start (Appendix D §5, P16). */
export function generateWavePlan(level: LevelDefinition, seedOrRng: number | Rng): WavePlan {
  const rng =
    typeof seedOrRng === "number"
      ? (() => {
          const streams = createStreams(seedOrRng);
          return () => draw(streams, "waves");
        })()
      : seedOrRng;
  const t = WAVE_TUNING;
  const waves: PlannedWave[] = [];
  let start = level.firstWaveSeconds;
  for (let w = 0; w < level.waves; w++) {
    const flag = w === level.waves - 1 || (w + 1) % t.flagEvery === 0;
    const gapSeconds =
      w === 0 ? level.firstWaveSeconds : between(rng, t.gapMinSeconds, t.gapMaxSeconds);
    if (w > 0) start += gapSeconds;
    const picks = compose(level, w, flag, rng);
    const lanes = assignLanes(level, picks, rng);
    waves.push({
      index: w,
      flag,
      gapSeconds,
      startSeconds: start,
      earlyTriggerFraction: between(rng, t.earlyTriggerMin, t.earlyTriggerMax),
      monsters: picks.map((archetypeId, i) => ({
        archetypeId,
        lane: lanes[i]!,
        x: t.spawnX + rng() * t.spawnJitter,
        spawnOffsetSeconds: rng() * t.staggerMaxSeconds,
      })),
    });
  }
  return { levelId: level.id, levelIndex: level.index, areaLevel: level.areaLevel, waves };
}

/** The wave plan and its progress, stored in the round so a resume continues mid-wave (P14). */
export interface WaveRuntime {
  plan: WavePlan;
  /** The next wave to start. */
  next: number;
  /** When the next wave starts, in round seconds. */
  nextAtSeconds: number;
  warned: number[];
  current: {
    index: number;
    startedAtSeconds: number;
    monsterIds: string[];
    spawnedLife: number;
    remainingLife: number;
    triggered: boolean;
  } | null;
  pending: { wave: number; atSeconds: number; monster: PlannedMonster }[];
}

/** A new round for a level, with its wave plan rolled from the `waves` stream. */
export function startLevel(level: LevelDefinition, seed: number): RoundState {
  const state = createRound({ seed, lanes: level.lanes, mana: level.startingMana });
  const plan = generateWavePlan(level, streamRng(state.rng, "waves"));
  state.waves = {
    plan,
    next: 0,
    nextAtSeconds: level.firstWaveSeconds,
    warned: [],
    current: null,
    pending: [],
  };
  return state;
}

/**
 * Starts waves on schedule or by the early trigger, spawns their monsters
 * (rolling rarity and affixes at spawn), warns before flag waves, and wins
 * the level once the final wave is spawned and dead (Appendix D §5.1).
 */
export const waveSystem: System = {
  id: "waves",
  phase: "spawning",
  run(ctx) {
    const { state } = ctx;
    const runtime = state.waves;
    if (!runtime) return;
    const t = WAVE_TUNING;
    const now = state.tick / STEPS_PER_SECOND;
    const { plan } = runtime;
    const upcoming = plan.waves[runtime.next];

    if (
      upcoming?.flag &&
      !runtime.warned.includes(upcoming.index) &&
      now >= runtime.nextAtSeconds - t.flagWarningSeconds
    ) {
      runtime.warned.push(upcoming.index);
      ctx.emit({ type: "flagWarning", wave: upcoming.index });
    }

    if (upcoming && now >= runtime.nextAtSeconds - 1e-9) {
      ctx.emit({ type: "waveStart", wave: upcoming.index, flag: upcoming.flag });
      for (const monster of upcoming.monsters) {
        runtime.pending.push({
          wave: upcoming.index,
          atSeconds: now + monster.spawnOffsetSeconds,
          monster,
        });
      }
      runtime.current = {
        index: upcoming.index,
        startedAtSeconds: now,
        monsterIds: [],
        spawnedLife: 0,
        remainingLife: 0,
        triggered: false,
      };
      runtime.next++;
      const following = plan.waves[runtime.next];
      if (following) runtime.nextAtSeconds = now + following.gapSeconds;
    }

    const rng = streamRng(state.rng, "waves");
    const due = runtime.pending.filter((p) => p.atSeconds <= now + 1e-9);
    if (due.length > 0) {
      runtime.pending = runtime.pending.filter((p) => !due.includes(p));
      for (const { wave, monster } of due) {
        const rarity = rollRarity(plan.levelIndex, rng);
        const spawned = spawnMonster(
          state,
          buildMonster({
            archetypeId: monster.archetypeId,
            rarity,
            affixes: rollAffixes(rarity, monster.archetypeId, plan.areaLevel, rng),
            areaLevel: plan.areaLevel,
            lane: monster.lane,
            x: monster.x,
          }),
        );
        if (runtime.current?.index === wave) {
          runtime.current.monsterIds.push(spawned.id);
          runtime.current.spawnedLife += spawned.actor.maxLife;
        }
      }
    }

    const current = runtime.current;
    if (current) {
      const ids = new Set(current.monsterIds);
      current.remainingLife = state.monsters.reduce(
        (sum, m) => (ids.has(m.id) ? sum + Math.max(0, m.actor.life) : sum),
        0,
      );
      const spawning = runtime.pending.some((p) => p.wave === current.index);
      const next = plan.waves[runtime.next];
      const fraction = plan.waves[current.index]!.earlyTriggerFraction;
      if (
        next &&
        !current.triggered &&
        !spawning &&
        current.remainingLife <= fraction * current.spawnedLife
      ) {
        current.triggered = true;
        const early = Math.max(
          now + t.earlyTriggerDelaySeconds,
          current.startedAtSeconds + t.earlyTriggerMinSecondsAfterStart,
          next.flag ? now + t.flagWarningSeconds : 0,
        );
        runtime.nextAtSeconds = Math.min(runtime.nextAtSeconds, early);
      }
    }

    if (
      runtime.next >= plan.waves.length &&
      runtime.pending.length === 0 &&
      state.monsters.length === 0
    ) {
      state.result = "won";
      ctx.emit({ type: "levelEnd", result: "won" });
    }
  },
};
