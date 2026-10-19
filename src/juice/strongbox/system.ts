import { audioEngine } from "../../audio";
import type { Frame } from "../../render/layers";
import { TILE } from "../../render/scale";
import { loadSpriteAssets, type SpriteAssets } from "../../render/sprites/assets";
import type { StrongboxState } from "../../monsters/strongbox";
import { STRONGBOX_JUICE as S } from "../../tuning/juice";
import { createParticlePool } from "../core/particles";
import type { PresentationFactory } from "../director/systems";

/** The chest's frames in the baked tiles (G §5.4): closed, opening, open. */
type ChestFrame = 0 | 1 | 2;

/**
 * The Strongbox (H §3.8, plan 2.18): the chest on its tile with a gold glow
 * column and dust motes while closed; on the ambush the lid rattles; once
 * opened it shows its opening then open frames with a burst of light rays.
 * The banner, the brass hit and the ambush dust are the trigger's cue row;
 * the loot fountain is the loot system's. Presentation only (P12).
 */
export const strongboxSystem: PresentationFactory = ({ stack, settings }) => {
  let assets: SpriteAssets | null = null;
  void loadSpriteAssets().then((loaded) => (assets = loaded));
  const motes = createParticlePool(settings.get);
  let phase: StrongboxState["phase"] | null = null;
  let changedAt = 0;
  let lastMote = 0;
  let lastNow: number | null = null;

  function drawChest(
    ctx: CanvasRenderingContext2D,
    box: StrongboxState,
    frame: ChestFrame,
    dx: number,
  ) {
    const x = (box.column - 1) * TILE;
    const y = box.lane * TILE;
    const entry = assets?.manifest.tiles.strongbox;
    const at = entry?.frames?.[frame];
    // The 32 px chest drawn at 2× in its tile, its base on the tile's lower third.
    const size = 64;
    if (assets?.atlas && entry && at)
      ctx.drawImage(assets.atlas, at.x, at.y, entry.width, entry.height, x + dx, y, size, size);
    else {
      ctx.fillStyle = entry?.placeholderColor ?? "#aa9e82";
      ctx.fillRect(x + 12 + dx, y + 24 - (frame === 0 ? 0 : 6), 40, 28 + (frame === 0 ? 0 : 6));
    }
  }

  stack.register({
    id: "strongbox",
    layer: "groundDecals",
    draw(ctx: CanvasRenderingContext2D, { state, now }: Frame) {
      const box = state.strongbox;
      const dt = lastNow === null ? 0 : Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      if (!box) {
        phase = null;
        return;
      }
      if (box.phase !== phase) {
        if (phase === "ambush" && box.phase === "opened")
          audioEngine()?.play("chest_open", { x: box.column });
        phase = box.phase;
        changedAt = now;
      }
      const since = now - changedAt;
      const cx = (box.column - 0.5) * TILE;
      const top = box.lane * TILE;
      if (box.phase === "closed") {
        // The idle glow column, rising and fading, and a dust mote now and then.
        const g = ctx.createLinearGradient(0, top + 40, 0, top + 40 - S.glowHeightPx);
        g.addColorStop(0, S.glowColor);
        g.addColorStop(1, "rgba(255, 209, 102, 0)");
        ctx.globalAlpha = S.glowAlpha;
        ctx.fillStyle = g;
        ctx.fillRect(cx - 10, top + 40 - S.glowHeightPx, 20, S.glowHeightPx);
        ctx.globalAlpha = 1;
        if (now - lastMote > S.moteEveryMs) {
          lastMote = now;
          motes.emit("dust", cx, top + 44, { scale: 0.34 });
        }
        drawChest(ctx, box, 0, 0);
      } else if (box.phase === "ambush") {
        // The lid rattles ±1 px, three times over 300 ms.
        const step = Math.floor((since / S.rattleMs) * S.rattles * 2);
        const dx = since < S.rattleMs ? (step % 2 === 0 ? 1 : -1) : 0;
        drawChest(ctx, box, 0, dx);
      } else {
        drawChest(ctx, box, since < S.openingFrameMs ? 1 : 2, 0);
        // A burst of light rays from the lid as it opens (drawn in code).
        if (since < S.raysMs) {
          const p = since / S.raysMs;
          ctx.globalAlpha = 1 - p;
          ctx.fillStyle = "#fff4c0";
          for (let i = 0; i < S.rays; i++) {
            const angle = Math.PI + (Math.PI * (i + 0.5)) / S.rays;
            const len = 10 + 40 * p;
            for (let r = 6; r < len; r += 4)
              ctx.fillRect(cx + Math.cos(angle) * r - 1, top + 30 + Math.sin(angle) * r - 1, 2, 2);
          }
          ctx.globalAlpha = 1;
        }
      }
      motes.update(dt);
      motes.draw(ctx);
    },
  });

  return { id: "strongbox", consume() {} };
};
