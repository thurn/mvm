import type { RoundState } from "../sim/state";

/** Appendix H §1.4's draw order, back to front. Board layers shake; the HUD never does. */
export const LAYERS = [
  { id: "lawn", shaken: true },
  { id: "groundDecals", shaken: true },
  { id: "groundEffects", shaken: true },
  { id: "shadows", shaken: true },
  { id: "actors", shaken: true },
  { id: "projectiles", shaken: true },
  { id: "impacts", shaken: true },
  { id: "loot", shaken: true },
  { id: "numbers", shaken: true },
  { id: "lootLabels", shaken: true },
  { id: "flashes", shaken: true },
  { id: "hud", shaken: false },
] as const;

type LayerId = (typeof LAYERS)[number]["id"];

/** What every draw function sees for one rendered frame, in logical pixels. */
export interface Frame {
  state: RoundState;
  /** Positions before the latest step, by entity ID, for interpolation. */
  previousX: ReadonlyMap<string, number>;
  /** Progress from the previous step to the current one, in [0, 1). */
  alpha: number;
  /** Board shake offset in integer logical px. */
  shake: { x: number; y: number };
  /** Wall-clock milliseconds, for cosmetic animation. */
  now: number;
}

interface LayerDraw {
  id: string;
  layer: LayerId;
  draw(ctx: CanvasRenderingContext2D, frame: Frame): void;
}

export interface LayerStack {
  register(entry: LayerDraw): void;
  draw(ctx: CanvasRenderingContext2D, frame: Frame): void;
}

/** A registry of draw functions; later beads add layers without editing the shell. */
export function createLayerStack(): LayerStack {
  const entries: LayerDraw[] = [];
  return {
    register(entry) {
      if (entries.some((e) => e.id === entry.id))
        throw new Error(`layer ${entry.id} is registered twice`);
      entries.push(entry);
    },
    draw(ctx, frame) {
      for (const layer of LAYERS) {
        const drawers = entries.filter((e) => e.layer === layer.id);
        if (drawers.length === 0) continue;
        const shake = layer.shaken ? frame.shake : { x: 0, y: 0 };
        if (shake.x !== 0 || shake.y !== 0) ctx.translate?.(shake.x, shake.y);
        for (const entry of drawers) entry.draw(ctx, frame);
        if (shake.x !== 0 || shake.y !== 0) ctx.translate?.(-shake.x, -shake.y);
      }
    },
  };
}
