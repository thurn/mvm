import { audioEngine } from "../../audio";
import type { Actor as CombatActor } from "../../combat/actor";
import type { RoundState } from "../../sim/state";
import { TILE } from "../../render/scale";
import { AILMENT_JUICE as A, type PresetName } from "../../tuning/juice";
import { createParticlePool } from "../core/particles";
import type { PresentationFactory } from "../director/systems";
import { activeAilments, ApplyGate, particleRate } from "./overlay";

const boardX = (x: number) => (x - 0.5) * TILE;
const laneY = (lane: number) => (lane + 0.5) * TILE;

interface Placed {
  id: string;
  lane: number;
  x: number;
  actor: CombatActor;
}

function placedActors(state: RoundState): Placed[] {
  return [
    ...state.monsters.map((m) => ({ id: m.id, lane: m.lane, x: m.x, actor: m.actor })),
    ...state.heroes.map((h) => ({ id: h.id, lane: h.lane, x: h.column, actor: h.actor })),
  ];
}

/**
 * Ailment feedback (H §8): particles for each active ailment (half rate when
 * crowded), the freeze buildup meter, thaw drips and a shatter as freeze
 * ends, BROKEN and STUNNED pips, and apply sounds gated to one per type per
 * 80 ms. Tints, the frozen frame and chill's slower animation are the sprite
 * system's. Presentation only (P12).
 */
export const ailmentSystem: PresentationFactory = ({ stack, settings, now }) => {
  const pool = createParticlePool(settings.get);
  const gate = new ApplyGate();
  const nextEmit = new Map<string, number>();
  let lastFrame: number | null = null;
  let lastState: RoundState | null = null;

  function pip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
    ctx.font = "7px monospace";
    ctx.textAlign = "left";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000000";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = "start";
  }

  stack.register({
    id: "ailments",
    layer: "impacts",
    draw(ctx, frame) {
      const t = frame.now;
      const dt = lastFrame === null ? 0 : Math.min(0.1, (t - lastFrame) / 1000);
      lastFrame = t;
      lastState = frame.state;
      const placed = placedActors(frame.state);
      // Forget the emit timers of actors that left the board.
      const ids = new Set(placed.map((p) => p.id));
      for (const key of nextEmit.keys())
        if (!ids.has(key.slice(0, key.lastIndexOf(":")))) nextEmit.delete(key);
      for (const p of placed) {
        const a = p.actor.ailments;
        const cx = boardX(p.x);
        const cy = laneY(p.lane);
        const active = activeAilments(a);
        const rate = particleRate(active.length);
        for (const name of active) {
          const spec = A.particles[name];
          const key = `${p.id}:${name}`;
          if (t < (nextEmit.get(key) ?? 0)) continue;
          nextEmit.set(key, t + spec.everyMs / rate);
          pool.emit(
            spec.preset as PresetName,
            cx + (Math.random() * 16 - 8),
            cy - 10 - Math.random() * 20,
            {
              scale: 1 / 6,
            },
          );
        }
        // The freeze buildup meter, under the health bar (H §8).
        if (a.freezeBuildup > 0 && a.frozenSeconds <= 0) {
          const w = 32;
          const x = Math.round(cx - w / 2);
          const y = Math.round(cy + 26);
          ctx.fillStyle = A.meter.back;
          ctx.fillRect(x, y, w, 2);
          ctx.fillStyle = A.meter.color;
          ctx.fillRect(x, y, Math.round(w * Math.min(1, a.freezeBuildup)), 2);
        }
        // Pips sit beside the sprite at mid-body, so they never spill into the lane above.
        if (a.fullyBrokenSeconds > 0) pip(ctx, "BROKEN", cx + 14, cy + 2, A.pipColor.broken);
        if (a.heavyStunSeconds > 0) pip(ctx, "STUNNED", cx + 14, cy - 6, A.pipColor.stunned);
      }
      pool.update(dt);
      pool.draw(ctx);
    },
  });

  return {
    id: "ailments",
    consume(cue, _batch, round) {
      const t = now();
      if (cue.kind === "sound" && cue.id.startsWith("ailment_")) {
        if (gate.allow(cue.id, t)) audioEngine()?.play(cue.id);
        return;
      }
      if (cue.kind !== "ailment") return;
      const state = round ?? lastState;
      const target = state ? placedActors(state).find((p) => p.id === cue.targetId) : undefined;
      if (!target) return;
      const cx = boardX(target.x);
      const cy = laneY(target.lane) - 16;
      if (cue.phase === "apply") {
        const burst =
          cue.ailment === "freeze" ? "frost" : cue.ailment === "fullyBroken" ? "dust" : null;
        if (burst) pool.emit(burst, cx, cy, { scale: 1.5 });
        if (cue.ailment === "heavyStun") pool.emit("dust", cx, cy + 20, { scale: 2 });
      } else if (cue.ailment === "freeze") {
        // Thaw: four drips, and the ice cracks off.
        pool.emit("frost", cx, cy, { scale: A.thawDrops / 8 });
        audioEngine()?.play("shatter", { x: target.x });
      }
    },
  };
};
