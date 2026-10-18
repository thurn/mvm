import { shapeTiles } from "../spells/shapes";
import type { Frame, LayerStack } from "./layers";
import { BOARD_HEIGHT, BOARD_WIDTH, TILE } from "./scale";

const COLORS = {
  lawnA: "#4f7a3a",
  lawnB: "#5a8743",
  unusedLane: "#2f3b2a",
  grid: "rgba(0, 0, 0, 0.12)",
  hero: "#4a90d9",
  scripted: "#b06ad9",
  monster: "#9a9a9a",
  outline: "#1b1b1b",
  lifeBack: "#3a0d0d",
  life: "#d23c3c",
  projectile: "#ffe066",
  spellTile: "rgba(140, 200, 255, 0.35)",
} as const;

/** Logical px of a continuous board x (1.0 = centre of column 1) and a lane centre. */
function boardX(x: number): number {
  return (x - 0.5) * TILE;
}

function laneY(lane: number): number {
  return (lane + 0.5) * TILE;
}

function capsule(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  const w = 28;
  const h = 44;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  ctx.fillStyle = COLORS.outline;
  ctx.beginPath();
  ctx.roundRect(x - 1, y - 1, w + 2, h + 2, w / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, w / 2);
  ctx.fill();
}

function lifeBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  life: number,
  maxLife: number,
) {
  if (life >= maxLife) return;
  const w = 32;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - 30);
  ctx.fillStyle = COLORS.lifeBack;
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = COLORS.life;
  ctx.fillRect(x, y, Math.round((w * Math.max(0, life)) / maxLife), 3);
}

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

function drawActors(ctx: CanvasRenderingContext2D, frame: Frame) {
  const { state, previousX, alpha } = frame;
  const sprites: { lane: number; x: number; draw: () => void }[] = [];
  for (const hero of state.heroes) {
    const cx = boardX(hero.column);
    sprites.push({
      lane: hero.lane,
      x: hero.column,
      draw: () => capsule(ctx, cx, laneY(hero.lane), COLORS.hero),
    });
  }
  for (const scripted of state.scripted) {
    const cx = boardX(scripted.column);
    sprites.push({
      lane: scripted.lane,
      x: scripted.column,
      draw: () => capsule(ctx, cx, laneY(scripted.lane), COLORS.scripted),
    });
  }
  for (const monster of state.monsters) {
    const before = previousX.get(monster.id) ?? monster.x;
    const x = before + (monster.x - before) * alpha;
    sprites.push({
      lane: monster.lane,
      x,
      draw: () => {
        const cx = boardX(x);
        const cy = laneY(monster.lane);
        capsule(ctx, cx, cy, COLORS.monster);
        lifeBar(ctx, cx, cy, monster.actor.life, monster.actor.maxLife);
      },
    });
  }
  // Sorted by lane then x (Appendix G §1.1).
  sprites.sort((a, b) => a.lane - b.lane || a.x - b.x);
  for (const sprite of sprites) sprite.draw();
}

function drawSpellTiles(ctx: CanvasRenderingContext2D, { state }: Frame) {
  ctx.fillStyle = COLORS.spellTile;
  for (const part of state.spells) {
    for (const tile of shapeTiles(part.shape, part.lane, part.column, state.lanes)) {
      ctx.fillRect((tile.column - 1) * TILE + 2, tile.lane * TILE + 2, TILE - 4, TILE - 4);
    }
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, { state }: Frame) {
  ctx.fillStyle = COLORS.projectile;
  for (const p of state.projectiles) {
    if (p.delaySeconds > 0) continue;
    ctx.fillRect(Math.round(boardX(p.x) - 4), Math.round(laneY(p.lane) - 2), 8, 4);
  }
}

/** Placeholder art straight from RoundState, until the sprite layers land. */
export function registerPlaceholderLayers(stack: LayerStack): void {
  stack.register({ id: "placeholder-lawn", layer: "lawn", draw: drawLawn });
  stack.register({ id: "placeholder-actors", layer: "actors", draw: drawActors });
  stack.register({ id: "placeholder-projectiles", layer: "projectiles", draw: drawProjectiles });
  stack.register({ id: "placeholder-spell-tiles", layer: "groundEffects", draw: drawSpellTiles });
}
