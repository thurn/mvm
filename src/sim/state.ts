import type { Actor } from "../combat/actor";
import type { SkillHit } from "../combat/hit";
import type { Id } from "../types/ids";
import { id } from "../types/ids";
import { createStreams, drawUint32, type RngStreams } from "./rng";
import { SIM_TUNING } from "../tuning/sim";

export type Rarity = "normal" | "magic" | "rare" | "unique" | "boss";

export type MonsterInstanceId = Id<"MonsterInstance">;
export type HeroInstanceId = Id<"HeroInstance">;
type ScriptedActorId = Id<"ScriptedActor">;
export type EntityId = MonsterInstanceId | HeroInstanceId | ScriptedActorId;

export interface MonsterState {
  id: MonsterInstanceId;
  /** Monster archetype ID (Appendix D §2). */
  archetypeId: string;
  rarity: Rarity;
  lane: number;
  /** Continuous position in tiles; 1.0 is the centre of column 1 (Appendix A §1.1). */
  x: number;
  /** Walk speed multiplier; 1.0 walks one tile per `walkSecondsPerTile`. */
  moveSpeed: number;
  actor: Actor;
}

export interface HeroState {
  id: HeroInstanceId;
  lane: number;
  column: number;
  actor: Actor;
}

/**
 * A dev-only actor that deals `hit` to the nearest monster every
 * `everyTicks` ticks, so scenes and juice work run before heroes exist.
 */
export interface ScriptedActorState {
  id: ScriptedActorId;
  lane: number;
  column: number;
  everyTicks: number;
  ticksUntilHit: number;
  hit: SkillHit;
  actor: Actor;
  /** When true, the actor blocks monsters like a hero on its tile. */
  blocks: boolean;
}

interface ProjectileState {
  id: string;
  sourceId: EntityId;
  lane: number;
  x: number;
  /** Tiles per second; positive travels right. */
  speed: number;
  hit: SkillHit;
}

interface GroundEffectState {
  id: string;
  sourceId: EntityId;
  kind: string;
  lane: number;
  x: number;
  radius: number;
  secondsLeft: number;
}

/** A drop credited to the account at kill time (P13). The loot bead fills in its outcome. */
interface EarnedDrop {
  dropId: string;
  monsterId: MonsterInstanceId;
  tick: number;
}

/**
 * The whole round: JSON-safe, no classes, Maps or undefined holes (P11).
 * Saved whole for mid-wave resume (P14).
 */
export interface RoundState {
  tick: number;
  /** Board lanes in use, from 0 (top) to 4 (bottom). Level 1 uses [1, 2, 3]. */
  lanes: number[];
  heroes: HeroState[];
  monsters: MonsterState[];
  projectiles: ProjectileState[];
  groundEffects: GroundEffectState[];
  scripted: ScriptedActorState[];
  /** Named countdowns in seconds, owned by the systems that set them. */
  timers: Record<string, number>;
  mana: number;
  life: number;
  waveCursor: number;
  rng: RngStreams;
  earned: EarnedDrop[];
  result: "won" | "lost" | null;
}

export interface RoundOptions {
  seed: number;
  lanes: number[];
  mana: number;
}

export function createRound({ seed, lanes, mana }: RoundOptions): RoundState {
  return {
    tick: 0,
    lanes: [...lanes],
    heroes: [],
    monsters: [],
    projectiles: [],
    groundEffects: [],
    scripted: [],
    timers: {},
    mana,
    life: SIM_TUNING.startingLife,
    waveCursor: 0,
    rng: createStreams(seed),
    earned: [],
    result: null,
  };
}

/** A UUID v4 drawn from the `ids` stream, so instance IDs are deterministic. */
function newInstanceId<Kind extends string>(state: RoundState): Id<Kind> {
  const hex = Array.from({ length: 4 }, () =>
    drawUint32(state.rng, "ids").toString(16).padStart(8, "0"),
  ).join("");
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return id<Kind>(
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`,
  );
}

export type MonsterSpec = Omit<MonsterState, "id">;

export function spawnMonster(state: RoundState, spec: MonsterSpec): MonsterState {
  const monster: MonsterState = { ...spec, id: newInstanceId<"MonsterInstance">(state) };
  state.monsters.push(monster);
  return monster;
}

export function addHero(state: RoundState, spec: Omit<HeroState, "id">): HeroState {
  const hero: HeroState = { ...spec, id: newInstanceId<"HeroInstance">(state) };
  state.heroes.push(hero);
  return hero;
}

export interface ScriptedSpec {
  lane: number;
  column: number;
  everyTicks: number;
  hit: SkillHit;
  actor: Actor;
  blocks?: boolean;
}

export function addScripted(state: RoundState, spec: ScriptedSpec): ScriptedActorState {
  const scripted: ScriptedActorState = {
    ...spec,
    blocks: spec.blocks ?? false,
    ticksUntilHit: spec.everyTicks,
    id: newInstanceId<"ScriptedActor">(state),
  };
  state.scripted.push(scripted);
  return scripted;
}
