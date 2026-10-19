import type { Frame, LayerStack } from "./layers";
import { BOARD_HEIGHT, BOARD_WIDTH, TILE } from "./scale";

const COLORS = {
  lawnA: "#4f7a3a",
  lawnB: "#5a8743",
  unusedLane: "#2f3b2a",
  grid: "rgba(0, 0, 0, 0.12)",
} as const;

function drawLawn(ctx: CanvasRenderingContext2D, { state }: Frame) {
  for (let lane = 0; lane < 5; lane++) {
    for (let column = 1; column <= 9; column++) {
      const used = state.lanes.includes(lane);
      ctx.fillStyle = !used ? COLORS.unusedLane : (lane + column) % 2 ? COLORS.lawnA : COLORS.lawnB;
      ctx.fillRect((column - 1) * TILE, lane * TILE, TILE, TILE);
    }
  }
  ctx.strokeStyle = COLORS.grid;
  ctx.strokeRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
}

/** The placeholder lawn straight from RoundState; spell telegraphs are src/juice/spells/, actors are src/render/sprites/, projectiles src/juice/vfx/. */
export function registerPlaceholderLayers(stack: LayerStack): void {
  stack.register({ id: "placeholder-lawn", layer: "lawn", draw: drawLawn });
}
