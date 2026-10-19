import type { Actor } from "../combat/actor";
import type { SkillHit } from "../combat/hit";
import type { Drop } from "../loot/drops";
import type { BossState } from "../monsters/bosses/types";
import type { BossId } from "../tuning/bosses";
import type { WaveRuntime } from "../monsters/waves";
import type { TerrainTile } from "./terrain";
import type { SpellShape } from "../spells/shapes";
import type { ManaOrb } from "./economy/orbs";
import type { RosterSlot } from "./economy/roster";
import type { Id } from "../types/ids";
import { id } from "../types/ids";
import { createStreams, drawUint32, type RngStreams } from "./rng";
import { SIM_TUNING } from "../tuning/sim";

export type Rarity = "normal" | "magic" | "rare" | "unique" | "boss";

export type MonsterInstanceId = Id<"MonsterInstance">;
export type HeroInstanceId = Id<"HeroInstance">;
type ScriptedActorId = Id<"ScriptedActor">;
type SpellCastId = Id<"SpellCast">;
export type EntityId = MonsterInstanceId | HeroInstanceId | ScriptedActorId | SpellCastId;

/** One timed part of a cast spell, waiting to land (Appendix B §6). */
export interface PendingSpellPart {
  castId: SpellCastId;
  spellId: string;
  part: string;
  lane: number;
  column: number;
  atSeconds: number;
  shape: SpellShape;
  hit: SkillHit;
  actor: Actor;
}

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
  /** The monster's attack on a hero blocking it (Appendix A §3.2); none for harmless monsters. */
  attack?: MonsterAttack;
  /** PoE2 monster affix IDs rolled at spawn (Appendix D §4). */
  affixes?: string[];
  /** A boss's lanes, abilities and telegraphs (Appendix D §7); absent for every other monster. */
  boss?: BossState;
}

interface MonsterAttack {
  hit: SkillHit;
  /** Seconds between attacks. */
  seconds: number;
  /** Seconds until the next attack while blocked. */
  timer: number;
}

/** One behavior's kit shape: its named hits, numbers and running counters. */
interface Kit<
  Behavior extends string,
  Hits extends string,
  Numbers extends string,
  Counters extends string,
> {
  behavior: Behavior;
  /** Seconds between actions in play, after `K_heroActionRate`. */
  actionSeconds: number;
  hits: Record<Hits, SkillHit>;
  numbers: Record<Numbers, number>;
  counters: Record<Counters, number>;
}

/** Pierce, fork, chain and extra projectiles, from the card's supports and stats. */
type ProjectileNumbers = "pierce" | "fork" | "chain" | "additionalProjectiles";

/**
 * A placed hero's skill, resolved from its card at placement (P16): its
 * behavior, cadence, named hits and numbers, and its running counters. One
 * shape per behavior (mason hv-7ic2.100), so a kit missing a hit, number or
 * counter its behavior reads is a type error rather than a silent zero.
 * Persisted in the round section with these exact keys.
 */
export type HeroKit =
  | Kit<"acolyte", never, "orbValue", "orbTimer">
  | Kit<
      "lightningArrow",
      "main" | "beam",
      ProjectileNumbers | "extraTargets" | "beamChains",
      "actionTimer"
    >
  | Kit<
      "armourPiercingRounds",
      "main",
      ProjectileNumbers | "clip" | "reloadSeconds",
      "actionTimer" | "clipLeft"
    >
  | Kit<"spark", "main", ProjectileNumbers | "sparks", "actionTimer">
  | Kit<"rollingSlam", "first" | "second", "firstRadius" | "secondRadius", "actionTimer">
  | Kit<"fallingThunder", "slam" | "volley", "volleyProjectiles", "actionTimer" | "slams">
  | Kit<"iceStrike", "strike" | "final", "finalSeconds", "actionTimer" | "combo">;

export type KitOf<Behavior extends HeroKit["behavior"]> = Extract<HeroKit, { behavior: Behavior }>;

/** Every attacking kit times its actions with `actionTimer`; the acolyte times orbs instead. */
export type AttackKit = Exclude<HeroKit, { behavior: "acolyte" }>;

export function isAttackKit(kit: HeroKit): kit is AttackKit {
  return kit.behavior !== "acolyte";
}

export interface HeroState {
  id: HeroInstanceId;
  lane: number;
  column: number;
  actor: Actor;
  /** The card's skill gem ID; absent for bare blockers. */
  skillId?: string;
  kit?: HeroKit;
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

export interface ProjectileState {
  id: string;
  sourceId: EntityId;
  lane: number;
  x: number;
  /** Tiles per second; positive travels right. */
  speed: number;
  hit: SkillHit;
  /** Tiles left before it expires. */
  rangeLeft: number;
  /** Seconds before it starts moving (staggered extra projectiles). */
  delaySeconds: number;
  /** Monsters it passes through, damaging each (Appendix A §3.4). */
  pierceLeft: number;
  /** Whether its first non-pierced hit splits it into the adjacent lanes. */
  forks: boolean;
  chainsLeft: number;
  /** Monsters this projectile, and its cast group, already hit. */
  hitIds: string[];
  /** Projectiles from one cast share a group, so they hit a monster once (Spark). */
  group: string;
  /** A named on-hit effect the hero system resolves, such as Lightning Arrow's beams. */
  onHit: string | null;
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

/** A drop credited at kill time (P13, P16): its full outcome, stored when rolled. */
interface EarnedDrop {
  dropId: string;
  monsterId: MonsterInstanceId;
  tick: number;
  drop: Drop;
}

/** A monster killed this step, waiting for the loot system to roll its drops. */
interface KillRecord {
  monsterId: MonsterInstanceId;
  rarity: Rarity;
  affixCount: number;
  killerId: string;
  lane: number;
  x: number;
  /** Set for a boss kill, whose loot adds its guaranteed drops and bursts (D §7). */
  bossId?: BossId;
}

/**
 * The whole round: JSON-safe, no classes, Maps or undefined holes (P11).
 * Saved whole for mid-wave resume (P14).
 */
export interface RoundState {
  tick: number;
  /** Board lanes in use, from 0 (top) to 4 (bottom). Level 1 uses [1, 2, 3]. */
  lanes: number[];
  /** The level's special tiles, generated once at level start (D §8, P16). */
  terrain: TerrainTile[];
  heroes: HeroState[];
  monsters: MonsterState[];
  projectiles: ProjectileState[];
  groundEffects: GroundEffectState[];
  /** Cast spell parts waiting to land. */
  spells: PendingSpellPart[];
  scripted: ScriptedActorState[];
  /** Named countdowns in seconds, owned by the systems that set them. */
  timers: Record<string, number>;
  mana: number;
  /** Mana orbs waiting to auto-collect. */
  orbs: ManaOrb[];
  /** The sky-mana clock: when the next orb falls, and how many have fallen. */
  sky: { nextAtSeconds: number | null; count: number };
  /** The roster, locked at level start (GDD §6.3). */
  roster: RosterSlot[];
  speed: 1 | 2;
  life: number;
  waveCursor: number;
  rng: RngStreams;
  /** The level's stored wave plan and its progress (Appendix D §5); null in scenes without waves. */
  waves: WaveRuntime | null;
  earned: EarnedDrop[];
  /** Kills this step; the loot system rolls and clears them. */
  kills: KillRecord[];
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
    terrain: [],
    heroes: [],
    monsters: [],
    projectiles: [],
    groundEffects: [],
    spells: [],
    scripted: [],
    timers: {},
    mana,
    orbs: [],
    sky: { nextAtSeconds: null, count: 0 },
    roster: [],
    speed: 1,
    life: SIM_TUNING.startingLife,
    waveCursor: 0,
    rng: createStreams(seed),
    waves: null,
    earned: [],
    kills: [],
    result: null,
  };
}

/** A UUID v4 drawn from the `ids` stream, so instance IDs are deterministic. */
export function newInstanceId<Kind extends string>(state: RoundState): Id<Kind> {
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
