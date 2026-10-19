import type { BossAbility, BossId } from "../../tuning/bosses";

/** A tile on the board. */
export interface BossTile {
  lane: number;
  column: number;
}

/**
 * A boss's own state on its monster (Appendix D §7), persisted in the round
 * (P14, P16): the lanes it covers, its ability clocks and telegraphs.
 */
export interface BossState {
  bossId: BossId;
  /** Covered lanes, ascending; the monster's `lane` is the first. */
  lanes: number[];
  areaLevel: number;
  levelIndex: number;
  /** Seconds until each ability starts its telegraph. */
  cooldowns: Record<BossAbility, number>;
  /** Abilities telegraphed and waiting to land. */
  telegraphs: { ability: BossAbility; tiles: BossTile[]; secondsLeft: number }[];
  enraged: boolean;
  /** Whether the heavy-stun bar was Primed at the last step, to announce the edge. */
  primed: boolean;
  /** Whether `bossSpawned` has been emitted. */
  announced: boolean;
}
