/** Terrain tunables (Appendix D §8). */
export const TERRAIN_TUNING = {
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

/** How special tiles look and announce themselves (plan 2.16). */
export const TERRAIN_ART = {
  rock: {
    outline: "#2a2824",
    shadow: "#5e5a52",
    body: "#86817a",
    light: "#b3ada2",
    groundShadow: "rgba(0, 0, 0, 0.25)",
  },
  /** Unplaceable tiles while a hero card is picked: a red tint. */
  blockedTint: "rgba(200, 50, 40, 0.35)",
} as const;
