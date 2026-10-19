import { audioEngine } from "../../audio";
import type { DamageType } from "../../combat/stats";
import { drawPixelText } from "../../render/layers/numbers";
import { TILE } from "../../render/scale";
import { HIT_TUNING, NUMBER_TUNING } from "../../tuning/juice";
import { createParticlePool } from "../core/particles";
import { createNumberAggregator } from "../director/numbers";
import type { PresentationFactory } from "../director/systems";
import { NumberField, numberMotion, numberStyle, type LiveNumber } from "./numbers";

const boardX = (x: number) => (x - 0.5) * TILE;
const laneY = (lane: number) => (lane + 0.5) * TILE;
/** Numbers and bursts start at the body's centre, above the feet. */
const BODY_LIFT = 20;
const DOT_MS = 500;
/** A number's starting baseline above the lane centre. */
const NUMBER_BASELINE = 10;

/**
 * Hit feel (H §2.4–§2.6, §10.3): damage numbers with the cap and DoT sums,
 * impact bursts and big-hit rings, and hit sounds through the audio engine.
 * Flash, squash, knockback and hitstop are the sprite system's and the
 * director's, sized by the same band. Presentation only (P12).
 */
export const hitSystem: PresentationFactory = ({ stack, settings, now }) => {
  const aggregator = createNumberAggregator();
  const field = new NumberField();
  const pool = createParticlePool(settings.get);
  const rings: { lane: number; x: number; start: number }[] = [];
  const keys = new WeakMap<object, string>();
  const dots = new Map<string, { amount: number; type: DamageType; lane: number; x: number }>();
  let nextKey = 0;
  let lastDotFlush = 0;
  let lastFrame: number | null = null;

  stack.register({
    id: "hits-impacts",
    layer: "impacts",
    draw(ctx, frame) {
      const dt = lastFrame === null ? 0 : Math.min(0.1, (frame.now - lastFrame) / 1000);
      lastFrame = frame.now;
      pool.update(dt);
      pool.draw(ctx);
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]!;
        const t = (frame.now - ring.start) / HIT_TUNING.ringMs;
        if (t >= 1) {
          rings.splice(i, 1);
          continue;
        }
        const [r0, r1] = HIT_TUNING.ringRadius;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(boardX(ring.x), laneY(ring.lane) - BODY_LIFT, r0 + (r1 - r0) * t, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
  });

  stack.register({
    id: "hits-numbers",
    layer: "numbers",
    draw(ctx, frame) {
      // DoT ticks are summed and shown every 0.5 s (H §2.5).
      if (frame.now - lastDotFlush >= DOT_MS) {
        lastDotFlush = frame.now;
        for (const [targetId, dot] of dots)
          field.add(
            {
              key: `dot:${targetId}:${nextKey++}`,
              amount: dot.amount,
              type: dot.type,
              crit: false,
              big: false,
              dot: true,
              lane: dot.lane,
              x: dot.x,
              jitter: 0,
            },
            frame.now,
          );
        dots.clear();
      }
      const mode = settings.get().numbers;
      for (const n of field.live(frame.now)) drawNumber(ctx, n, frame.now, mode);
    },
  });

  /** A small grey pixel shield left of a resisted number (GDD §15). */
  function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
    const rows = ["#####", "#ooo#", "#ooo#", "#ooo#", ".#o#.", "..#.."];
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        if (row[dx] === ".") continue;
        ctx.fillStyle = row[dx] === "#" ? "#1b1b1b" : "#b8c0c8";
        ctx.fillRect(Math.round(x - 3 + dx), Math.round(y - 3 + dy), 1, 1);
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawNumber(
    ctx: CanvasRenderingContext2D,
    n: LiveNumber,
    t: number,
    mode: ReturnType<typeof settings.get>["numbers"],
  ) {
    const style = numberStyle(n, mode);
    if (!style) return;
    const motion = numberMotion(t - n.bornAt);
    const early = n.fadeFrom === undefined ? 1 : 1 - (t - n.fadeFrom) / NUMBER_TUNING.fadeMs;
    const x = boardX(n.x ?? 0) + (n.jitter ?? 0);
    // From mid-body, so the full rise stays inside the target's own lane.
    const y = laneY(n.lane ?? 0) - NUMBER_BASELINE - motion.rise;
    if (n.resisted) drawShield(ctx, x - 12 * style.scale * motion.scale, y, motion.alpha);
    drawPixelText(ctx, style.text, x, y, {
      color: style.color,
      outline: NUMBER_TUNING.outline,
      scale: style.scale * motion.scale,
      alpha: Math.max(0, Math.min(motion.alpha, early)),
    });
  }

  return {
    id: "hits",
    consume(cue) {
      const t = now();
      if (cue.kind === "number") {
        if (cue.dot) {
          const dot = dots.get(cue.targetId) ?? {
            amount: 0,
            type: cue.type,
            lane: cue.lane,
            x: cue.x,
          };
          dot.amount += cue.amount;
          dot.lane = cue.lane;
          dot.x = cue.x;
          dots.set(cue.targetId, dot);
          return;
        }
        const spec = aggregator.add(cue, t);
        let key = keys.get(spec);
        if (!key) {
          key = `n${nextKey++}`;
          keys.set(spec, key);
        }
        field.add(
          {
            key,
            amount: spec.amount,
            type: spec.type,
            crit: spec.crit,
            big: spec.big,
            ...(spec.words ? { words: spec.words } : {}),
            ...(spec.resisted ? { resisted: true } : {}),
            lane: spec.lane,
            x: spec.x,
            jitter: Math.round((Math.random() * 2 - 1) * NUMBER_TUNING.jitterPx),
          },
          t,
        );
        if (cue.big) rings.push({ lane: cue.lane, x: cue.x, start: t });
      } else if (cue.kind === "particles") {
        pool.emit(cue.preset, boardX(cue.x), laneY(cue.lane) - BODY_LIFT, {
          ...(cue.scale !== undefined ? { scale: cue.scale } : {}),
          ...(cue.loot ? { loot: true } : {}),
        });
      } else if (cue.kind === "sound" && cue.id.startsWith("hit_")) {
        audioEngine()?.play(cue.id, {
          ...(cue.x !== undefined ? { x: cue.x } : {}),
          ...(cue.gainDb !== undefined ? { gainDb: cue.gainDb } : {}),
        });
      }
    },
  };
};
