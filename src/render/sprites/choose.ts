import type { SpriteEntry } from "../../assets/manifest";
import { SPRITE_TUNING } from "../../tuning/sprites";

export type SpritePose = "idle" | "walk" | "attack" | "death";

export interface FrameRect {
  sx: number;
  sy: number;
  size: number;
  dx: number;
  dy: number;
}

/**
 * The atlas rectangle and board position of one frame, for an actor whose cell
 * centre is (cx, cy). Idle holds attack frame 0. Strips already face the
 * actor's way (heroes right, monsters left), so nothing is flipped (G §1.1–§1.3).
 */
export function chooseFrame(
  entry: SpriteEntry,
  pose: SpritePose,
  frame: number,
  cx: number,
  cy: number,
): FrameRect | null {
  const strip = entry.animations?.[pose === "idle" ? "attack" : pose];
  if (!strip) return null;
  const index = pose === "idle" ? 0 : Math.max(0, Math.min(strip.frames - 1, frame));
  const size = strip.frameSize;
  const oversize = (size - 64) / 2;
  return {
    sx: strip.x + index * size,
    sy: strip.y,
    size,
    dx: Math.round(cx - 32 - oversize),
    dy: Math.round(cy - 32 - SPRITE_TUNING.anchorLiftPx - oversize),
  };
}
