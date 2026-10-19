import type { Sound } from "../../audio/engine";
import { audioEngine } from "../../audio";
import { SKILLS } from "../../heroes/board/kit";
import type { HeroState, ProjectileState, RoundState } from "../../sim/state";
import { TILE } from "../../render/scale";
import { VFX_TUNING as V } from "../../tuning/juice";
import { createParticlePool } from "../core/particles";
import type { PresentationFactory } from "../director/systems";
import { elementPreset, vfxProfile, type VfxProfile } from "./profile";
import { lightningPolyline, ringAt, volleyDelayMs } from "./shapes";

const boardX = (x: number) => (x - 0.5) * TILE;
const laneY = (lane: number) => (lane + 0.5) * TILE;
/** Projectiles fly at chest height. */
const SHOT_LIFT = 18;

/** Each starter hero's launch sound (H §6.1). */
const LAUNCH: Readonly<Record<string, Sound>> = {
  [SKILLS.lightningArrow]: "bow_release",
  [SKILLS.armourPiercingRounds]: "crossbow_fire",
  [SKILLS.spark]: "spark_cast",
  [SKILLS.lightningSpear]: "bow_release",
  [SKILLS.explosiveSpear]: "bow_release",
  [SKILLS.permafrostBolts]: "crossbow_fire",
  [SKILLS.fireball]: "spark_cast",
  [SKILLS.essenceDrain]: "spark_cast",
};
/** Area heroes whose same-step hits draw a ground ring and dust (H §5.4 striker). */
const SLAMS = new Set<string>([
  SKILLS.rollingSlam,
  SKILLS.fallingThunder,
  SKILLS.iceStrike,
  SKILLS.boneshatter,
  SKILLS.fangsOfFrost,
  SKILLS.explosiveSpear,
  SKILLS.iceNova,
]);
const IMPACT_SOUND: Readonly<Record<string, Sound>> = {
  [SKILLS.rollingSlam]: "slam",
  [SKILLS.fallingThunder]: "thunder_crack",
  [SKILLS.iceStrike]: "ice_crack_heavy",
  [SKILLS.armourBreaker]: "slam",
  [SKILLS.boneshatter]: "slam",
  [SKILLS.fangsOfFrost]: "ice_crack_heavy",
};

interface Trail {
  points: { x: number; y: number }[];
  bornAt: number;
  index: number;
  sourceId: string;
  group: string;
}

/**
 * Stat-driven VFX (H §5.3–§6.2, §2.8, §11.1): projectiles in their hero's
 * profile colours with trails and outlines, volley timing, muzzle puffs,
 * lightning chains between same-step targets, AoE rings at their real size
 * with slam dust, and each starter skill's launch and impact sounds.
 */
export const vfxSystem: PresentationFactory = ({ stack, settings, now }) => {
  const profiles = new Map<string, VfxProfile>();
  const trails = new Map<string, Trail>();
  const groups = new Map<string, number>();
  const pool = createParticlePool(settings.get);
  const beams: { points: { x: number; y: number }[][]; color: string; start: number }[] = [];
  const rings: { x: number; y: number; radius: number; color: string; start: number }[] = [];
  const pendingHits = new Map<string, { lane: number; x: number }[]>();
  let lastFrame: number | null = null;

  function profileOf(state: RoundState, sourceId: string): VfxProfile | null {
    const cached = profiles.get(sourceId);
    if (cached) return cached;
    const hero = state.heroes.find((h) => h.id === sourceId);
    const hit = hero?.kit ? Object.values(hero.kit.hits)[0] : undefined;
    if (!hero || !hit) return null;
    const profile = vfxProfile(hit, hero.actor.stats);
    profiles.set(sourceId, profile);
    return profile;
  }

  function heroOf(state: RoundState, id: string): HeroState | undefined {
    return state.heroes.find((h) => h.id === id);
  }

  function track(state: RoundState, p: ProjectileState, t: number) {
    const x = boardX(p.x);
    const y = laneY(p.lane) - SHOT_LIFT;
    let trail = trails.get(p.id);
    if (!trail) {
      const index = groups.get(p.group) ?? 0;
      groups.set(p.group, index + 1);
      trail = { points: [], bornAt: t, index, sourceId: p.sourceId, group: p.group };
      trails.set(p.id, trail);
      const profile = profileOf(state, p.sourceId);
      if (index === 0 && profile) {
        // Muzzle puff on release, in the element colour (H §5.2).
        pool.emit(elementPreset(profile.main), x, y, { scale: V.muzzleParticles / 6 });
        const skill = heroOf(state, p.sourceId)?.skillId;
        const launch = skill ? LAUNCH[skill] : undefined;
        if (launch) audioEngine()?.play(launch, { x: p.x });
      }
    }
    trail.points.unshift({ x, y });
    const profile = profileOf(state, p.sourceId);
    trail.points.length = Math.min(
      trail.points.length,
      Math.round(profile?.trailLength ?? V.trailBase),
    );
  }

  function drawProjectile(
    ctx: CanvasRenderingContext2D,
    state: RoundState,
    trail: Trail,
    t: number,
  ) {
    if (t - trail.bornAt < volleyDelayMs(trail.index)) return;
    const profile = profileOf(state, trail.sourceId);
    const color = profile?.color ?? "#FFE066";
    const head = trail.points[0];
    if (!head) return;
    const spark = heroOf(state, trail.sourceId)?.skillId === SKILLS.spark;
    const jitter = spark ? Math.round(Math.sin(t / 37 + trail.index) * 2) : 0;
    // The trail: the second element's colour, fading and shrinking (H §11.1).
    trail.points.forEach((p, i) => {
      if (i === 0) return;
      ctx.globalAlpha = 1 - i / trail.points.length;
      ctx.fillStyle = profile?.trail ?? color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y) + jitter, 1, 1);
    });
    ctx.globalAlpha = 1;
    if (profile?.outline) {
      ctx.fillStyle = profile.outline;
      ctx.fillRect(Math.round(head.x) - 5, Math.round(head.y) - 2 + jitter, 10, 4);
    }
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(head.x) - 4, Math.round(head.y) - 1 + jitter, 8, 2);
    ctx.fillStyle = profile?.core ?? "#FFFFFF";
    ctx.fillRect(Math.round(head.x) + 1, Math.round(head.y) - 1 + jitter, 3, 2);
  }

  stack.register({
    id: "vfx-projectiles",
    layer: "projectiles",
    draw(ctx, frame) {
      const t = frame.now;
      const dt = lastFrame === null ? 0 : Math.min(0.1, (t - lastFrame) / 1000);
      lastFrame = t;
      const live = new Set<string>();
      for (const p of frame.state.projectiles) {
        if (p.delaySeconds > 0) continue;
        live.add(p.id);
        track(frame.state, p, t);
      }
      for (const [id, trail] of trails) {
        if (!live.has(id)) {
          trails.delete(id);
          // Forget a volley once its last projectile is gone, so the map stays small.
          if (![...trails.values()].some((other) => other.group === trail.group))
            groups.delete(trail.group);
          continue;
        }
        drawProjectile(ctx, frame.state, trail, t);
      }
      pool.update(dt);
      pool.draw(ctx);
    },
  });

  stack.register({
    id: "vfx-impacts",
    layer: "impacts",
    draw(ctx, frame) {
      const t = frame.now;
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]!;
        const r = ringAt(t - ring.start);
        if (r.done) {
          rings.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = r.alpha;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = V.ring.stroke;
        ctx.beginPath();
        ctx.ellipse(
          ring.x,
          ring.y,
          ring.radius * r.scale,
          ring.radius * r.scale * V.ring.aspect,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      for (let i = beams.length - 1; i >= 0; i--) {
        const beam = beams[i]!;
        const age = t - beam.start;
        if (age >= V.beamMs) {
          beams.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - age / V.beamMs;
        for (const points of beam.points) {
          for (const [width, color] of [
            [4, beam.color],
            [1, "#FFFFFF"],
          ] as const) {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            points.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    },
  });

  /** Same-step hits from one source: chains for lightning, rings and dust for slams. */
  function resolveHits(round: RoundState, t: number) {
    for (const [sourceId, targets] of pendingHits) {
      const profile = profileOf(round, sourceId);
      const hero = heroOf(round, sourceId);
      if (!profile || !hero) continue;
      const points = targets.map((h) => ({ x: boardX(h.x), y: laneY(h.lane) - SHOT_LIFT }));
      if (hero.skillId && SLAMS.has(hero.skillId)) {
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
        const cy = points.reduce((s, p) => s + p.y, 0) / points.length + SHOT_LIFT;
        rings.push({
          x: cx,
          y: cy,
          radius: (TILE / 2) * profile.ringScale,
          color: profile.color,
          start: t,
        });
        pool.emit("dust", cx, cy, { scale: 1.5 });
        if (hero.skillId === SKILLS.fallingThunder)
          beams.push({
            points: [lightningPolyline({ x: cx, y: 0 }, { x: cx, y: cy }, Math.random)],
            color: profile.color,
            start: t,
          });
        const sound = IMPACT_SOUND[hero.skillId];
        if (sound) audioEngine()?.play(sound, { x: hero.column + 1 });
      } else if (
        targets.length > 1 &&
        (profile.main === "lightning" || hero.skillId === SKILLS.lightningArrow)
      ) {
        // A chain between targets in the element colour, even for non-lightning chains (H §5.3).
        const sorted = [...points].sort((a, b) => a.x - b.x);
        beams.push({
          points: sorted.slice(1).map((p, i) => lightningPolyline(sorted[i]!, p, Math.random)),
          color: profile.color,
          start: t,
        });
        audioEngine()?.play("zap", { x: targets[0]!.x });
      }
    }
    pendingHits.clear();
  }

  return {
    id: "vfx",
    consume(cue, batch, round) {
      const t = now();
      if (batch.event === "hit" && cue.kind === "number" && !cue.words) {
        const list = pendingHits.get(cue.sourceId) ?? [];
        list.push({ lane: cue.lane, x: cue.x });
        pendingHits.set(cue.sourceId, list);
        // Hits from one step arrive in one handle(); resolve them once the batch settles.
        queueMicrotask(() => round && pendingHits.size > 0 && resolveHits(round, t));
      } else if (batch.event === "spellImpact" && cue.kind === "particles") {
        rings.push({
          x: boardX(cue.x),
          y: laneY(cue.lane),
          radius: TILE / 2,
          color: "#E8E2D0",
          start: t,
        });
      }
    },
  };
};
