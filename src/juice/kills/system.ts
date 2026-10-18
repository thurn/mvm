import { audioEngine } from "../../audio";
import { BOARD_HEIGHT, TILE } from "../../render/scale";
import { KILL_TUNING } from "../../tuning/juice";
import { EASINGS } from "../core/easing";
import { createParticlePool } from "../core/particles";
import type { PresentationFactory } from "../director/systems";
import { coinCount, coinTimeline, Ladder } from "./coins";

const C = KILL_TUNING.coins;
const boardX = (x: number) => (x - 0.5) * TILE;
const laneY = (lane: number) => (lane + 0.5) * TILE;
/** The pentatonic steps of the kill ladder, in semitones (H §3.3–§3.4). */
const PENTATONIC = [0, 2, 4, 7, 9, 12];

interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ground: number;
  bounces: number;
  flyAt: number;
  arriveAt: number;
  from: { x: number; y: number } | null;
  share: number;
}

/** Where coins fly: the gold readout, bottom left (H §3.5). The HUD can move it. */
const goldTarget = { x: 12, y: BOARD_HEIGHT - 8 };

/**
 * Deaths, kills and gold (H §3.5, §5.2, §7.2): the soul puff on the fall's
 * last frame, the hero tile flash, kill sounds on the kill ladder, and gold
 * piles that spray, bounce once and fly to the readout, clinking on the coin
 * ladder. The fall and fade are the sprite system's. Presentation only (P12).
 */
export const killSystem: PresentationFactory = ({ stack, settings, now }) => {
  const pool = createParticlePool(settings.get);
  const souls: { at: number; lane: number; x: number }[] = [];
  const tileFlashes: { lane: number; x: number; start: number }[] = [];
  let coins: Coin[] = [];
  const rareDeaths = new Map<string, number>();
  const killLadder = new Ladder(KILL_TUNING.killLadderWindowMs, KILL_TUNING.killLadderMaxSteps);
  const coinLadder = new Ladder(C.ladderWindowMs, C.ladderMaxSemitones);
  let last: number | null = null;

  function spawnCoins(lane: number, x: number, amount: number, rare: boolean, t: number) {
    const count = coinCount(amount, rare);
    const px = boardX(x);
    const py = laneY(lane) + 8;
    coinTimeline(count, t).forEach(({ flyAt, arriveAt }) => {
      const angle = ((200 + Math.random() * 140) * Math.PI) / 180;
      const speed = C.spraySpeed[0] + Math.random() * (C.spraySpeed[1] - C.spraySpeed[0]);
      coins.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ground: py + 6,
        bounces: 0,
        flyAt,
        arriveAt,
        from: null,
        share: amount / count,
      });
    });
    if (rare) audioEngine()?.play("coin_pile", { x });
  }

  stack.register({
    id: "kills-ground",
    layer: "groundDecals",
    draw(ctx, frame) {
      for (let i = tileFlashes.length - 1; i >= 0; i--) {
        const flash = tileFlashes[i]!;
        const t = (frame.now - flash.start) / KILL_TUNING.heroTileFlashMs;
        if (t >= 1) {
          tileFlashes.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(0, 0, 0, ${KILL_TUNING.heroTileFlashAlpha * (1 - t)})`;
        ctx.fillRect((flash.x - 1) * TILE, flash.lane * TILE, TILE, TILE);
      }
    },
  });

  stack.register({
    id: "kills-impacts",
    layer: "impacts",
    draw(ctx, frame) {
      const dt = last === null ? 0 : Math.min(0.1, (frame.now - last) / 1000);
      last = frame.now;
      for (let i = souls.length - 1; i >= 0; i--) {
        const soul = souls[i]!;
        if (frame.now < soul.at) continue;
        pool.emit("soul", boardX(soul.x), laneY(soul.lane) - 12);
        souls.splice(i, 1);
      }
      pool.update(dt);
      pool.draw(ctx);
    },
  });

  stack.register({
    id: "kills-coins",
    layer: "loot",
    draw(ctx, frame) {
      const t = frame.now;
      const dt = Math.min(0.1, Math.max(0, (t - (last ?? t)) / 1000)) || 1 / 60;
      const landed: Coin[] = [];
      for (const coin of coins) {
        if (t >= coin.arriveAt) {
          landed.push(coin);
          continue;
        }
        if (t >= coin.flyAt) {
          coin.from ??= { x: coin.x, y: coin.y };
          const p = EASINGS.inBack((t - coin.flyAt) / (coin.arriveAt - coin.flyAt));
          coin.x = coin.from.x + (goldTarget.x - coin.from.x) * p;
          coin.y = coin.from.y + (goldTarget.y - coin.from.y) * p;
        } else if (coin.bounces < 2) {
          coin.vy += C.sprayGravity * dt;
          coin.x += coin.vx * dt;
          coin.y += coin.vy * dt;
          // One bounce, then the coin settles where it lands.
          if (coin.y >= coin.ground) {
            coin.y = coin.ground;
            coin.bounces++;
            coin.vy = coin.bounces === 1 ? -coin.vy * 0.4 : 0;
            coin.vx = coin.bounces === 1 ? coin.vx * 0.6 : 0;
          }
        }
        // A spinning coin: full face, then edge-on.
        const wide = Math.floor((t + coin.flyAt) / 90) % 3 !== 2;
        const w = wide ? C.size : 1;
        ctx.fillStyle = C.color;
        ctx.fillRect(Math.round(coin.x - w / 2), Math.round(coin.y - C.size / 2), w, C.size);
        ctx.fillStyle = C.shade;
        ctx.fillRect(Math.round(coin.x - w / 2), Math.round(coin.y + C.size / 2) - 1, w, 1);
      }
      if (landed.length > 0) {
        coins = coins.filter((c) => !landed.includes(c));
        for (const coin of landed) {
          void coin.share;
          audioEngine()?.play("coin", { semitones: coinLadder.next(t) });
        }
      }
    },
  });

  return {
    id: "kills",
    consume(cue, batch) {
      const t = now();
      if (cue.kind === "death") {
        souls.push({ at: t + KILL_TUNING.soulDelayMs, lane: cue.lane, x: cue.x });
        if (cue.rarity === null) tileFlashes.push({ lane: cue.lane, x: cue.x, start: t });
        if (cue.rarity === "rare" || cue.rarity === "unique" || cue.rarity === "boss")
          rareDeaths.set(`${cue.lane}:${cue.x}`, t);
      } else if (cue.kind === "sound" && batch.event === "kill") {
        const semitones = cue.id === "kill_pop" ? (PENTATONIC[killLadder.next(t)] ?? 0) : 0;
        audioEngine()?.play(cue.id, {
          ...(cue.x !== undefined ? { x: cue.x } : {}),
          semitones,
        });
      } else if (cue.kind === "lootTimeline" && cue.drop.kind === "gold") {
        const key = `${cue.lane}:${cue.x}`;
        const rare = (rareDeaths.get(key) ?? -Infinity) > t - 100;
        if (rare) rareDeaths.delete(key);
        spawnCoins(cue.lane, cue.x, cue.drop.amount, rare, t);
      }
    },
  };
};
