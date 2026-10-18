/** A board tile or prop cut from an LPC sheet; several frames make an animation. */
export interface TileSpec {
  /** The sheet, relative to `~/Documents/lpc/`. */
  file: string;
  width: number;
  height: number;
  /** Top-left pixel of each frame. */
  frames: readonly (readonly [number, number])[];
  /** The fallback colour for flat placeholder tiles. */
  placeholderColor: string;
}

const ATLAS = "lpc-tile-atlas/files/terrain_atlas.png";
const MEDIEVAL = "lpc-medieval-village-decorations/files/decoration_medieval";

/** The three fill variants in row 5 of a 3×6 terrain block at tile column `column` (G §5.1). */
function fills(column: number, blockRow: number, color: string): Record<string, TileSpec> {
  const tiles: Record<string, TileSpec> = {};
  for (let i = 0; i < 3; i++) {
    tiles[i] = {
      file: ATLAS,
      width: 32,
      height: 32,
      frames: [[(column + i) * 32, (blockRow + 5) * 32]],
      placeholderColor: color,
    };
  }
  return tiles;
}

function named(prefix: string, tiles: Record<string, TileSpec>): Record<string, TileSpec> {
  return Object.fromEntries(Object.entries(tiles).map(([key, tile]) => [`${prefix}_${key}`, tile]));
}

/** The Grassland lawn, lane and feature tiles (Appendix G §5.2–§5.5). */
export const GRASSLAND_TILES: Readonly<Record<string, TileSpec>> = {
  ...named("grass", fills(21, 0, "#4f7a2f")),
  ...named("grass_flowers", fills(21, 6, "#5a8236")),
  ...named("dirt", fills(15, 0, "#8a6a44")),
  ...named("water", fills(6, 9, "#3a6a9a")),
  ...named("burning", fills(15, 6, "#c0501a")),
  rock: {
    file: "lpc-revised/Terrain/Rocks, Grasslands.png",
    width: 64,
    height: 64,
    frames: [[128, 0]],
    placeholderColor: "#7a6e60",
  },
  shrine: {
    file: "lpc-revised/Objects/Furniture/Wolf Stone.png",
    width: 64,
    height: 64,
    frames: [[0, 0]],
    placeholderColor: "#b08a3a",
  },
  grave: {
    file: `${MEDIEVAL}/decorations-medieval.png`,
    width: 64,
    height: 96,
    frames: [[96, 0]],
    placeholderColor: "#5a5048",
  },
  // Closed, opening, open (G §5.4).
  strongbox: {
    file: "lpc-revised/Objects/Furniture/Chest.png",
    width: 32,
    height: 32,
    frames: [
      [32, 0],
      [32, 32],
      [32, 64],
    ],
    placeholderColor: "#aa9e82",
  },
  life_pool: {
    file: `${MEDIEVAL}/decorations-medieval.png`,
    width: 64,
    height: 64,
    frames: [
      [0, 512],
      [64, 512],
      [128, 512],
      [0, 576],
      [64, 576],
      [128, 576],
    ],
    placeholderColor: "#3ac0d0",
  },
  gate_wall: {
    file: `${MEDIEVAL}/fence_medieval.png`,
    width: 160,
    height: 160,
    frames: [[0, 640]],
    placeholderColor: "#77706a",
  },
};
