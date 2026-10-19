/** Terrain tunables (Appendix D §8). */
export const TERRAIN_TUNING = {
  columns: 9,
  /** Map generation tries this many times at a count before trying one tile fewer (§8.2). */
  retries: 50,
  /** Every lane keeps at least this many placeable tiles… */
  minPlaceablePerLane: 5,
  /** …and at least this many in the first `earlyColumns` columns: a last line of defence. */
  minPlaceableEarly: 2,
  earlyColumns: 3,
  maxRocksPerLane: 2,
  /** Whether a hero can stand on each special tile (§8.1). */
  placeable: { rock: false },
} as const;
