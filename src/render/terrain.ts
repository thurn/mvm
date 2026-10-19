import { TERRAIN_ART } from "../tuning/terrain";
import type { Frame, LayerStack } from "./layers";
import { TILE } from "./scale";

/**
 * A Rock (D §8.1) as pixel art: rows of a 14 × 11 map, 4 px per cell, where
 * `o` is the outline, `d` shadow, `b` body, `l` light and `.` empty.
 */
const ROCK = [
  "....oooooo....",
  "..oollllbboo..",
  ".olllbbbbbbdo.",
  "olllbbbbbbbddo",
  "ollbbbbdbbbddo",
  "olbbbbddbbbddo",
  "obbbbbbbbbdddo",
  "obbbbbbbbddddo",
  ".odbbbbbdddddo",
  "..oddddddddoo.",
  "...oooooooo...",
] as const;

const CELL = 4;

function drawRock(ctx: CanvasRenderingContext2D, lane: number, column: number) {
  const c = TERRAIN_ART.rock;
  const colors: Record<string, string> = { o: c.outline, d: c.shadow, b: c.body, l: c.light };
  const left = (column - 1) * TILE + (TILE - ROCK[0].length * CELL) / 2;
  const top = lane * TILE + (TILE - ROCK.length * CELL) / 2 + 4;
  // A soft ground shadow under the boulder, inside its tile.
  ctx.fillStyle = c.groundShadow;
  ctx.fillRect(left + CELL, top + (ROCK.length - 1) * CELL, (ROCK[0].length - 2) * CELL, CELL);
  ROCK.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = colors[row[x]!];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(left + x * CELL, top + y * CELL, CELL, CELL);
    }
  });
}

/** Special tiles drawn on the lawn (D §8.1, plan 2.16): Rocks today. */
export function registerTerrainLayer(stack: LayerStack): void {
  stack.register({
    id: "terrain",
    layer: "groundDecals",
    draw(ctx: CanvasRenderingContext2D, { state }: Frame) {
      for (const tile of state.terrain)
        if (tile.kind === "rock") drawRock(ctx, tile.lane, tile.column);
    },
  });
}
