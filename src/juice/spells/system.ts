import type { Frame } from "../../render/layers";
import { TILE } from "../../render/scale";
import { shapeTiles } from "../../spells/shapes";
import { JUICE_TUNING, SPELL_JUICE as S, type PresetName } from "../../tuning/juice";
import type { PresentationFactory } from "../director/systems";
import { flashAlpha } from "../tiers/screen";

/** One impact's ground flash: its tiles, colour and start. */
interface GroundFlash {
  tiles: { lane: number; column: number }[];
  color: string;
  at: number;
}

/**
 * Player spells on the ground (H §1.1, hv-7ic2.86): from cast to landing a
 * telegraph outlines the shape's tiles under the actors, so a player can
 * lead a target; at impact the tiles flash in the element's colour, over
 * the actors, for at most 250 ms. Presentation only (P12): the telegraph
 * reads the round's pending parts, the flash the impact cue.
 */
export const spellSystem: PresentationFactory = ({ stack, settings }) => {
  let flashes: GroundFlash[] = [];

  stack.register({
    id: "spell-telegraphs",
    layer: "groundEffects",
    draw(ctx: CanvasRenderingContext2D, { state }: Frame) {
      if (state.spells.length === 0) return;
      const juice = Math.min(1, settings.get().juice);
      for (const part of state.spells) {
        for (const tile of shapeTiles(part.shape, part.lane, part.column, state.lanes)) {
          const x = (tile.column - 1) * TILE;
          const y = tile.lane * TILE;
          // The fill is juice; the outline is information and always shows.
          if (juice > 0) {
            ctx.globalAlpha = S.telegraphFillAlpha * juice;
            ctx.fillStyle = S.telegraphColor;
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          }
          ctx.globalAlpha = S.telegraphOutlineAlpha;
          ctx.strokeStyle = S.telegraphColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        }
      }
      ctx.globalAlpha = 1;
    },
  });

  stack.register({
    id: "spell-ground-flash",
    layer: "impacts",
    draw(ctx: CanvasRenderingContext2D, { now }: Frame) {
      flashes = flashes.filter((f) => now - f.at < S.flashMs);
      if (flashes.length === 0) return;
      const peak = flashAlpha(S.flashAlpha, settings.get());
      if (peak <= 0) return;
      for (const flash of flashes) {
        const alpha = peak * (1 - Math.max(0, now - flash.at) / S.flashMs);
        if (alpha <= 0) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = flash.color;
        for (const tile of flash.tiles)
          ctx.fillRect((tile.column - 1) * TILE, tile.lane * TILE, TILE, TILE);
      }
      ctx.globalAlpha = 1;
    },
  });

  return {
    id: "spells",
    consume(cue, batch) {
      if (batch.event !== "spellImpact" || cue.kind !== "particles") return;
      // An impact's particle cues name its element by preset, one per tile.
      const raw = JUICE_TUNING.presets[cue.preset as PresetName].color;
      // A multi-colour preset flashes in its first colour.
      const color: string = typeof raw === "string" ? raw : raw[0]!;
      const last = flashes.at(-1);
      if (last && last.at === batch.at && last.color === color)
        last.tiles.push({ lane: cue.lane, column: cue.x });
      else flashes.push({ tiles: [{ lane: cue.lane, column: cue.x }], color, at: batch.at });
    },
  };
};
