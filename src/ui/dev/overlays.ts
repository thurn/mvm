import type { PresentationFactory } from "../../juice/director/systems";
import { TILE } from "../../render/scale";

const boardX = (x: number) => (x - 0.5) * TILE;
const laneY = (lane: number) => (lane + 0.5) * TILE;
/** The window the DPS meter averages over. */
const DPS_WINDOW_MS = 5000;

/**
 * Dev overlays (GDD §15), drawn only when toggled in the dev menu: actor
 * hitboxes, ailment meters, and a rolling 5 s DPS meter over each hero.
 */
export const devOverlaySystem: PresentationFactory = ({ stack, settings, now }) => {
  const damage = new Map<string, { at: number; amount: number }[]>();

  stack.register({
    id: "dev-overlays",
    layer: "hud",
    draw(ctx, frame) {
      const flags = settings.get().devOverlays;
      if (!flags.hitboxes && !flags.ailments && !flags.dps) return;
      const { state } = frame;
      ctx.font = "7px monospace";
      ctx.textAlign = "center";
      if (flags.hitboxes) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(80, 255, 120, 0.9)";
        for (const hero of state.heroes)
          ctx.strokeRect(boardX(hero.column) - 16 + 0.5, laneY(hero.lane) - 24 + 0.5, 32, 48);
        ctx.strokeStyle = "rgba(255, 80, 80, 0.9)";
        for (const m of state.monsters)
          ctx.strokeRect(boardX(m.x) - 14 + 0.5, laneY(m.lane) - 22 + 0.5, 28, 44);
        ctx.strokeStyle = "rgba(255, 220, 80, 0.9)";
        for (const p of state.projectiles)
          ctx.strokeRect(boardX(p.x) - TILE / 4 + 0.5, laneY(p.lane) - 20 + 0.5, TILE / 2, 4);
      }
      if (flags.ailments) {
        for (const m of state.monsters) {
          const a = m.actor.ailments;
          const rows: [string, number, string][] = [
            ["frz", a.freezeBuildup, "#7FD4FF"],
            ["chl", a.chill ? Math.min(1, a.chill.secondsLeft / 2) : 0, "#4AA0D0"],
            ["shk", a.shock ? Math.min(1, a.shock.secondsLeft / 4) : 0, "#FFE14D"],
            ["ign", a.ignite ? Math.min(1, a.ignite.secondsLeft / 4) : 0, "#FF6A1A"],
            ["stn", Math.min(1, a.heavyStunBuildup), "#FFFFFF"],
          ];
          rows.forEach(([label, fraction, color], i) => {
            const x = boardX(m.x) + 16;
            const y = laneY(m.lane) - 20 + i * 6;
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(x, y, 22, 4);
            ctx.fillStyle = color;
            ctx.fillRect(x, y, Math.round(22 * fraction), 4);
            ctx.fillStyle = "#DDDDDD";
            ctx.fillText(label, x - 6, y + 4);
          });
        }
      }
      if (flags.dps) {
        const t = frame.now;
        for (const hero of state.heroes) {
          const hits = (damage.get(hero.id) ?? []).filter((h) => t - h.at <= DPS_WINDOW_MS);
          damage.set(hero.id, hits);
          const dps = hits.reduce((sum, h) => sum + h.amount, 0) / (DPS_WINDOW_MS / 1000);
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(boardX(hero.column) - 18, laneY(hero.lane) - 40, 36, 9);
          ctx.fillStyle = "#9CFF9C";
          ctx.fillText(`${dps.toFixed(1)}/s`, boardX(hero.column), laneY(hero.lane) - 33);
        }
      }
      ctx.textAlign = "start";
    },
  });

  return {
    id: "dev-overlays",
    consume(cue) {
      if (cue.kind !== "number" || cue.words) return;
      const list = damage.get(cue.sourceId) ?? [];
      list.push({ at: now(), amount: cue.amount });
      damage.set(cue.sourceId, list);
    },
  };
};
