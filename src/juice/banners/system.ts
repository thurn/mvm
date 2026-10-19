import { audioEngine } from "../../audio";
import type { Frame } from "../../render/layers";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../../render/scale";
import { STRONGBOX_JUICE } from "../../tuning/juice";
import type { PresentationFactory } from "../director/systems";

/** Banner batches whose sounds this system plays; the level end's are the music system's. */
const VOICED = new Set(["flagWarning", "strongboxTriggered"]);

/**
 * Board banners (H §3.8, §6): a banner cue's text across the board's middle
 * for a couple of seconds — the flag wave's warning, the Strongbox ambush —
 * with that batch's sounds (the horn, the lid rattle, the brass hit).
 */
export const bannerSystem: PresentationFactory = ({ stack }) => {
  let shown: { text: string; at: number } | null = null;

  stack.register({
    id: "banners",
    layer: "hud",
    draw(ctx: CanvasRenderingContext2D, { now }: Frame) {
      if (!shown) return;
      const since = now - shown.at;
      if (since < 0) return;
      if (since > STRONGBOX_JUICE.bannerMs) {
        shown = null;
        return;
      }
      // Fades in over 150 ms and out over the last 400 ms.
      const alpha = Math.min(1, since / 150, (STRONGBOX_JUICE.bannerMs - since) / 400);
      const y = BOARD_HEIGHT * 0.42;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, y - 20, BOARD_WIDTH, 32);
      ctx.globalAlpha = alpha;
      ctx.font = "bold 16px serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd166";
      ctx.fillText(shown.text, BOARD_WIDTH / 2, y + 2);
      ctx.textAlign = "start";
      ctx.globalAlpha = 1;
    },
  });

  return {
    id: "banners",
    consume(cue, batch) {
      if (cue.kind === "banner" && batch.event !== "levelEnd")
        shown = { text: cue.text, at: batch.at };
      if (cue.kind === "sound" && VOICED.has(batch.event))
        audioEngine()?.play(cue.id, cue.x !== undefined ? { x: cue.x } : {});
    },
  };
};
