import { audioEngine } from "../../audio";
import { baseItems, currencies } from "../../data";
import { uniques } from "../../data/uniques";
import type { Drop } from "../../loot/drops";
import { BOARD_HEIGHT, BOARD_WIDTH, TILE } from "../../render/scale";
import { LOOT_JUICE as L, type LootClass, type LootClassSpec } from "../../tuning/juice";
import { tickerStore } from "../../ui/hud/ticker/store";
import { EASINGS } from "../core/easing";
import { createParticlePool } from "../core/particles";
import type { PresentationFactory } from "../director/systems";
import {
  bounceAt,
  fountain,
  LootLadder,
  lootClass,
  lootKeyframes,
  lootSpec,
  stagger,
} from "./timeline";

type ShownDrop = Exclude<Drop, { kind: "gold" }>;

const boardX = (x: number) => (x - 0.5) * TILE;
const laneY = (lane: number) => (lane + 0.5) * TILE;
/** The collect flight's end: the ticker's top line, below the board's left edge. */
const TICKER_TARGET = { x: 24, y: BOARD_HEIGHT + 6 };

interface Loot {
  cls: LootClass;
  spec: LootClassSpec;
  name: string;
  hidden: boolean;
  from: { x: number; y: number };
  to: { x: number; y: number };
  spawnAt: number;
  keys: ReturnType<typeof lootKeyframes>;
  seed: number;
  landed: boolean;
  arrived: boolean;
  /** The arc's height in px: the class's, or a fountain's higher one (H §3.9). */
  arcPx: number;
}

function dropName(drop: ShownDrop): string {
  if (drop.kind === "item") {
    if (drop.item.uniqueId) {
      const unique = uniques().find((u) => u.id === drop.item.uniqueId);
      if (unique) return unique.name;
    }
    return baseItems().find((b) => b.id === drop.item.baseId)?.name ?? "Item";
  }
  if (drop.kind === "currency")
    return currencies().find((c) => c.id === drop.currencyId)?.name ?? "Currency";
  const rarity = drop.rarity[0]!.toUpperCase() + drop.rarity.slice(1);
  return drop.kind === "spell" ? `Spell: ${rarity} spell` : `${rarity} hero`;
}

/**
 * Loot choreography (H §3.1–§3.4, §3.7): each drop pops from the corpse,
 * bounces twice, plays its stinger on the loot ladder, raises its beam and
 * label for its hold, then flies to the ticker. Multiple drops from one kill
 * land in ascending rarity; a boss or Strongbox burst is a fountain (H §3.9).
 * Drops the round's loot filter hid stay quiet.
 */
export const lootSystem: PresentationFactory = ({ stack, settings, director }) => {
  const pool = createParticlePool(settings.get);
  const ladder = new LootLadder();
  let pending: { dropId: string; drop: ShownDrop; lane: number; x: number; at: number }[] = [];
  /** Drop IDs a burst marked as one fountain, until they're flushed. */
  const fountainIds = new Set<string>();
  /** When to start each fountain's rising riser: the unique's wait (H §3.9). */
  let risers: number[] = [];
  let loots: Loot[] = [];
  let lastFrame: number | null = null;
  if (typeof window !== "undefined" && window.__mvm)
    window.__mvm.fireEvents = (events) => director.handle(events);
  // A new board is a new round: the ticker starts empty.
  tickerStore.clear();

  /** Turns this frame's new drops into staggered loot, grouped by kill. */
  function flush() {
    const groups = new Map<string, typeof pending>();
    for (const p of pending) {
      const key = `${p.lane}:${p.x}:${p.at}`;
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    pending = [];
    const s = settings.get();
    for (const group of groups.values()) {
      const isFountain = group.some((g) => fountainIds.has(g.dropId));
      for (const g of group) fountainIds.delete(g.dropId);
      const launches = isFountain
        ? fountain(group, (g) => lootClass(g.drop))
        : stagger(group, (g) => lootClass(g.drop)).map((l) => ({ ...l, arcPx: null }));
      const unique = launches.find((l) => lootClass(l.drop.drop) === "unique");
      if (isFountain && unique)
        risers.push(unique.drop.at + unique.delay - L.fountain.uniqueWaitMs);
      for (const { drop: p, delay, arcPx } of launches) {
        const cls = lootClass(p.drop);
        const from = { x: boardX(p.x), y: laneY(p.lane) - 8 };
        const scatter = isFountain ? L.fountain.scatterTiles : L.scatterTiles;
        const dx = (Math.random() * 2 - 1) * scatter * TILE;
        const dy = (Math.random() * 2 - 1) * (L.laneBandPx / 2);
        loots.push({
          cls,
          spec: lootSpec(cls),
          name: dropName(p.drop),
          // The round's locked loot filter decided this when the drop rolled (C §C.7).
          hidden: p.drop.kind === "item" && p.drop.hidden === true,
          from,
          to: {
            x: Math.max(4, Math.min(BOARD_WIDTH - 4, from.x + dx)),
            // Clamped to the corpse's lane band, never into another lane's centre.
            y: laneY(p.lane) + 12 + dy,
          },
          spawnAt: p.at + delay,
          keys: lootKeyframes(cls, s.lootHoldScale),
          seed: Math.random() * 10,
          landed: false,
          arrived: false,
          arcPx: arcPx ?? lootSpec(cls).arcPx,
        });
      }
    }
  }

  function position(l: Loot, age: number): { x: number; y: number; scale: number } {
    if (age < L.arcMs) {
      const p = age / L.arcMs;
      return {
        x: l.from.x + (l.to.x - l.from.x) * p,
        y: l.from.y + (l.to.y - l.from.y) * p - Math.sin(Math.PI * p) * l.arcPx,
        scale: 1,
      };
    }
    if (age < l.keys.holdEnd) return { x: l.to.x, y: l.to.y + bounceAt(age - L.arcMs), scale: 1 };
    // Collect flight: a bezier to the ticker, shrinking to 50%, inQuad.
    const p = EASINGS.inQuad(Math.min(1, (age - l.keys.holdEnd) / L.collectMs));
    const cx = (l.to.x + TICKER_TARGET.x) / 2;
    const cy = Math.min(l.to.y, TICKER_TARGET.y) - 40;
    const q = 1 - p;
    return {
      x: q * q * l.to.x + 2 * q * p * cx + p * p * TICKER_TARGET.x,
      y: q * q * l.to.y + 2 * q * p * cy + p * p * TICKER_TARGET.y,
      scale: 1 - 0.5 * p,
    };
  }

  function land(l: Loot, t: number) {
    l.landed = true;
    if (l.hidden) {
      // Hidden drops: a 3-particle grey puff and a muted coin tick, and nothing more (H §3.7).
      pool.emit("lootPuff", l.to.x, l.to.y, { loot: true });
      audioEngine()?.play("coin", { gainDb: L.hiddenCoinDb });
      return;
    }
    pool.emit("dust", l.to.x, l.to.y, { scale: 4 / 6, loot: true });
    audioEngine()?.play(l.spec.stinger, { x: l.to.x / TILE + 0.5, semitones: ladder.next(t) });
  }

  function drawBeam(ctx: CanvasRenderingContext2D, l: Loot, age: number, t: number) {
    const beam = l.spec.beam;
    if (!beam || l.hidden || age < L.arcMs) return;
    const rise = EASINGS.outBack(Math.min(1, (age - L.arcMs) / L.beamRiseMs));
    const collapse =
      age < l.keys.holdEnd ? 1 : Math.max(0, 1 - (age - l.keys.holdEnd) / L.beamCollapseMs);
    const pulse =
      l.cls === "unique"
        ? 0.8 + 0.2 * Math.cos((2 * Math.PI * (age - L.arcMs)) / L.uniquePulseMs)
        : 1;
    const h = beam.heightPx * rise * collapse;
    if (h <= 0) return;
    const shimmer = 0.85 + 0.15 * Math.sin((t / 1000) * 6 + l.seed);
    const x = Math.round(l.to.x);
    const base = Math.round(l.to.y);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [w, a] of [
      [14, 0.35],
      [6, 0.9],
    ] as const) {
      const g = ctx.createLinearGradient(0, base, 0, base - h);
      g.addColorStop(0, beam.color);
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalAlpha = a * shimmer * pulse;
      ctx.fillStyle = g;
      ctx.fillRect(x - w / 2, base - h, w, h);
    }
    if (beam.whiteCore) {
      ctx.globalAlpha = 0.9 * shimmer;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x, base - h, 1, h);
    }
    // Base flare: an ellipse, larger for uniques.
    const [fw, fh] = l.cls === "unique" ? [24, 8] : [16, 6];
    ctx.globalAlpha = 0.5 * shimmer * pulse;
    ctx.fillStyle = beam.color;
    ctx.beginPath();
    ctx.ellipse(x, base, fw / 2, fh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawItem(
    ctx: CanvasRenderingContext2D,
    l: Loot,
    pos: { x: number; y: number; scale: number },
    t: number,
  ) {
    const currency = l.cls.startsWith("currency");
    const size = Math.max(2, Math.round(6 * pos.scale));
    // Currency spins: face, then edge (H §3.1).
    const w = currency && Math.floor(t / 120) % 2 ? Math.max(1, Math.round(size / 3)) : size;
    ctx.fillStyle = "#1B1B1B";
    ctx.fillRect(Math.round(pos.x - w / 2) - 1, Math.round(pos.y - size / 2) - 1, w + 2, size + 2);
    ctx.fillStyle = l.hidden ? L.hiddenColor : l.spec.label;
    ctx.fillRect(Math.round(pos.x - w / 2), Math.round(pos.y - size / 2), w, size);
  }

  stack.register({
    id: "loot-items",
    layer: "loot",
    draw(ctx, frame) {
      const t = frame.now;
      const dt = lastFrame === null ? 0 : Math.min(0.1, (t - lastFrame) / 1000);
      lastFrame = t;
      if (pending.length > 0) flush();
      // The unique's wait rises into its launch (H §3.9).
      for (const at of risers) if (t >= at) audioEngine()?.play("riser", { gainDb: -4 });
      risers = risers.filter((at) => t < at);
      // A unique's hold dims the board under the loot (H §3.2).
      if (
        loots.some(
          (l) => l.cls === "unique" && t - l.spawnAt >= L.arcMs && t - l.spawnAt < l.keys.holdEnd,
        )
      ) {
        ctx.fillStyle = `rgba(0, 0, 0, ${L.uniqueDim})`;
        ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
      }
      pool.update(dt);
      pool.draw(ctx);
      for (const l of loots) {
        const age = t - l.spawnAt;
        if (age < 0) continue;
        if (!l.landed && age >= L.arcMs) land(l, t);
        // A hidden drop is gone once it lands: only its puff stays.
        if (l.hidden && l.landed) continue;
        drawBeam(ctx, l, age, t);
        drawItem(ctx, l, position(l, age), t);
        if (!l.arrived && age >= l.keys.collected) {
          l.arrived = true;
          if (!l.hidden)
            tickerStore.push({
              text: l.name,
              color: l.spec.label,
              at: t,
              shimmer: l.cls === "unique",
            });
          if (!l.hidden) audioEngine()?.play("ui_click", { gainDb: -6 });
        }
      }
      loots = loots.filter((l) => !l.arrived && !(l.hidden && l.landed));
    },
  });

  stack.register({
    id: "loot-labels",
    layer: "lootLabels",
    draw(ctx, frame) {
      const t = frame.now;
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#000000";
      for (const l of loots) {
        const age = t - l.spawnAt;
        if (l.hidden || age < L.arcMs || age >= l.keys.holdEnd) continue;
        ctx.globalAlpha = Math.min(1, (age - L.arcMs) / L.beamRiseMs);
        ctx.fillStyle = l.spec.label;
        const y = Math.round(l.to.y - 8);
        ctx.strokeText(l.name, Math.round(l.to.x), y);
        ctx.fillText(l.name, Math.round(l.to.x), y);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    },
  });

  return {
    id: "loot",
    consume(cue, batch) {
      if (cue.kind === "fountain") {
        for (const dropId of cue.dropIds) fountainIds.add(dropId);
        return;
      }
      if (cue.kind !== "lootTimeline" || cue.drop.kind === "gold") return;
      pending.push({ dropId: cue.dropId, drop: cue.drop, lane: cue.lane, x: cue.x, at: batch.at });
    },
  };
};
