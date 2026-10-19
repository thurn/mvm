import type { Rarity } from "../sim/state";

/** Round rules the kernel uses (GDD §5, Appendix A §1 and §7). */
export const SIM_TUNING = {
  /** Life pool at every level start. */
  startingLife: 20,
  /** Life lost per leaked monster, by rarity. A boss costs the whole pool. */
  leakCost: { normal: 1, magic: 3, rare: 10, unique: 10, boss: 20 } satisfies Record<
    Rarity,
    number
  >,
  /** A monster whose x drops below this has reached the gate. */
  leakX: 0.5,
  /** A hero blocks a monster in its lane within this many tiles of the hero's column. */
  blockReach: 0.5,
  /** Heroes with a catalog life multiplier this high are walls: leapers can't leap them (D §2.2). */
  wallLifeMultiplier: 5,
  /** Board columns, numbered 1 (gate) to 9. */
  columns: 9,
} as const;
