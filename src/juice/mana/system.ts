import { audioEngine } from "../../audio";
import type { RoundState } from "../../sim/state";
import { TILE } from "../../render/scale";
import { MANA_JUICE as M } from "../../tuning/juice";
import { EASINGS } from "../core/easing";
import { createParticlePool } from "../core/particles";
import type { PresentationFactory } from "../director/systems";
import { Ladder } from "../kills/coins";
import { orbFlight, orbOffset, orbSize } from "./timeline";

const boardX = (x: number) => (x - 0.5) * TILE;
const laneY = (lane: number) => (lane + 0.5) * TILE;
/** The mana counter: top left, above the board (the HUD's top bar). */
const COUNTER = { x: 20, y: -16 };
const PENTATONIC = [0, 2, 4, 7, 9, 12];

interface Orb {
  id: string;
  source: "sky" | "acolyte";
  amount: number;
  tile: { x: number; y: number };
  spawnedAt: number;
  /** Set when the sim collects it: the flight to the counter starts. */
  collectedAt: number | null;
  flightFrom: { x: number; y: number } | null;
}

/**
 * Mana orbs and placement feel (H §3.6, §5.2): sky orbs fall and sway,
 * acolyte orbs pop out after a crook-tip glow, idle orbs pulse and sparkle,
 * and collected orbs fly to the counter on the mana ladder. Placement plays
 * its thunk and spend; shovelling its chunk. The drop-in, squash and sink are
 * the sprite system's, from the same timeline. Presentation only (P12).
 */
export const manaSystem: PresentationFactory = ({ stack, settings, now }) => {
  const orbs = new Map<string, Orb>();
  const pool = createParticlePool(settings.get);
  const ladder = new Ladder(M.ladderWindowMs, M.ladderMaxSteps);
  const charging = new Set<string>();
  let lastFrame: number | null = null;
  let sparkleDebt = 0;

  function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number) {
    const pulse = 1 + 0.1 * Math.sin(2 * Math.PI * M.pulseHz * (t / 1000));
    const r = (size / 2) * pulse;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    glow.addColorStop(0, "rgba(111, 211, 255, 0.6)");
    glow.addColorStop(1, "rgba(111, 211, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.restore();
    ctx.fillStyle = M.color;
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = M.core;
    ctx.fillRect(
      Math.round(x - r / 3),
      Math.round(y - r / 3),
      Math.max(1, Math.round(r / 2)),
      Math.max(1, Math.round(r / 2)),
    );
  }

  /** The acolyte's crook-tip glow, 0.8 s before its orb (H §3.6). */
  function drawAcolyteGlow(ctx: CanvasRenderingContext2D, state: RoundState) {
    for (const hero of state.heroes) {
      const kit = hero.kit;
      if (kit?.behavior !== "acolyte") continue;
      // The acolyte times its orbs with orbTimer; it never had an actionTimer, so this glow never showed.
      const left = kit.counters.orbTimer;
      const leftMs = left * 1000;
      if (leftMs > M.acolyteGlowMs || leftMs <= 0) {
        charging.delete(hero.id);
        continue;
      }
      if (!charging.has(hero.id)) {
        charging.add(hero.id);
        audioEngine()?.play("mana_charge", { x: hero.column });
      }
      const p = EASINGS.outQuad(1 - leftMs / M.acolyteGlowMs);
      const x = boardX(hero.column) + 12;
      const y = laneY(hero.lane) - 22;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.4 + 0.6 * p;
      ctx.fillStyle = M.color;
      ctx.beginPath();
      ctx.arc(x, y, 1 + 4 * p, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  stack.register({
    id: "mana-orbs",
    layer: "loot",
    draw(ctx, frame) {
      const t = frame.now;
      const dt = lastFrame === null ? 0 : Math.min(0.1, (t - lastFrame) / 1000);
      lastFrame = t;
      drawAcolyteGlow(ctx, frame.state);
      sparkleDebt += dt * M.sparklesPerSecond;
      const sparkle = sparkleDebt >= 1;
      if (sparkle) sparkleDebt -= 1;
      for (const orb of orbs.values()) {
        const size = orbSize(orb.amount);
        if (orb.collectedAt === null || t < orb.collectedAt) {
          const off = orbOffset(orb.source, t - orb.spawnedAt);
          const x = orb.tile.x + off.dx;
          const y = orb.tile.y + off.dy;
          drawOrb(ctx, x, y, size, t);
          if (sparkle) pool.emit("manaSparkle", x, y, { loot: true });
          continue;
        }
        orb.flightFrom ??= orb.tile;
        const f = orbFlight(orb.flightFrom, COUNTER, t - orb.collectedAt);
        if (f.done) {
          orbs.delete(orb.id);
          audioEngine()?.play("mana_collect", { semitones: PENTATONIC[ladder.next(t)] ?? 0 });
          continue;
        }
        drawOrb(ctx, f.x, f.y, size, t);
      }
      pool.update(dt);
      pool.draw(ctx);
    },
  });

  return {
    id: "mana",
    consume(cue, batch, round) {
      const t = now();
      if ((batch.event === "manaSpawn" || batch.event === "manaCollect") && round) {
        // Follow the round: new orbs appear, and orbs the sim collected start their flight.
        const live = new Set(round.orbs.map((o) => o.id));
        for (const spawned of round.orbs)
          if (!orbs.has(spawned.id))
            orbs.set(spawned.id, {
              id: spawned.id,
              source: spawned.source,
              amount: spawned.amount,
              tile: { x: boardX(spawned.x), y: laneY(spawned.lane) + 10 },
              spawnedAt: t,
              collectedAt: null,
              flightFrom: null,
            });
        for (const orb of orbs.values())
          if (orb.collectedAt === null && !live.has(orb.id)) orb.collectedAt = t;
        return;
      }
      if (cue.kind !== "sound") return;
      if (cue.id === "place_thunk") {
        audioEngine()?.play("place_thunk", cue.x !== undefined ? { x: cue.x } : {});
        audioEngine()?.play("mana_spend");
      } else if (cue.id === "shovel" || cue.id === "ui_deny") audioEngine()?.play(cue.id);
    },
  };
};
