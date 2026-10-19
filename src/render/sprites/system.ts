import { isAttackKit } from "../../sim/state";
import type { SpriteEntry } from "../../assets/manifest";
import { BROKEN_SPRITES, HERO_SPRITES, MONSTER_SPRITES } from "../../assets/recipes";
import { audioEngine } from "../../audio";
import { createParticlePool } from "../../juice/core/particles";
import { EASINGS } from "../../juice/core/easing";
import type { PresentationFactory } from "../../juice/director/systems";
import type { Rarity, RoundState } from "../../sim/state";
import { STEP_SECONDS } from "../../sim/time";
import { SIM_TUNING } from "../../tuning/sim";
import { SPRITE_TUNING as T } from "../../tuning/sprites";
import { AILMENT_JUICE, HIT_TUNING } from "../../tuning/juice";
import { activeAilments, topTint } from "../../juice/ailments/overlay";
import type { AilmentState } from "../../combat/ailments";
import { bandEffects } from "../../juice/hits/bands";
import { placementPose, shovelPose } from "../../juice/mana/timeline";
import type { Band } from "../../juice/core/significance";
import type { Frame } from "../layers";
import { TILE } from "../scale";
import { ActorClock, AttackAnimator, bobOffset, deathFrame, walkFrameMs } from "./animation";
import { loadSpriteAssets, type SpriteAssets } from "./assets";
import { chooseFrame, type SpritePose } from "./choose";

const CAPSULE = { hero: "#4a90d9", scripted: "#b06ad9", monster: "#9a9a9a", outline: "#1b1b1b" };
const LIFE = { back: "#3a0d0d", fill: "#d23c3c", low: "#ff6060" };

/** Logical px of a continuous board x (1.0 = centre of column 1) and a lane centre. */
const boardX = (x: number) => (x - 0.5) * TILE;
const laneY = (lane: number) => (lane + 0.5) * TILE;

interface View {
  clock: ActorClock;
  animator: AttackAnimator;
  pose: SpritePose;
  frame: number;
  bornAt: number;
  hitAt: number;
  /** The last hit's significance band, which sizes knockback (H §2.6). */
  hitBand: Band;
  phaseMs: number;
}

/** One actor as this frame draws it. */
interface Actor {
  id: string;
  kind: "hero" | "monster" | "scripted";
  lane: number;
  x: number;
  entry: SpriteEntry | null;
  color: string;
  life: number;
  maxLife: number;
  rarity: Rarity | null;
  ailments: AilmentState;
  /** Monsters: their archetype, for its swaps and quirks (H §7.1). */
  archetypeId?: string;
  /** A Helmed Skeleton drawn without its helm. */
  broken?: boolean;
  /** A leaper that has made its one leap. */
  leapt?: boolean;
}

/** A leaper's jump in flight, from where it was drawn to where the sim put it. */
interface Leap {
  fromX: number;
  toX: number;
  startedAt: number;
}

/** A helm knocked off a Helmed Skeleton. */
interface Debris {
  lane: number;
  x: number;
  startedAt: number;
}

interface Corpse {
  actor: Actor;
  startedAt: number;
  /** Shovelled heroes sink and fade instead of falling (H §5.2). */
  sink: boolean;
}

function phaseOf(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % T.bobPeriodMs;
}

function actorsOf(state: RoundState, frame: Frame, sprites: Record<string, SpriteEntry>): Actor[] {
  const actors: Actor[] = [];
  for (const hero of state.heroes) {
    const recipe = hero.skillId ? HERO_SPRITES[hero.skillId] : undefined;
    actors.push({
      id: hero.id,
      kind: "hero",
      lane: hero.lane,
      x: hero.column,
      entry: (recipe && sprites[recipe]) || null,
      color: CAPSULE.hero,
      life: hero.actor.life,
      ailments: hero.actor.ailments,
      maxLife: hero.actor.maxLife,
      rarity: null,
    });
  }
  for (const scripted of state.scripted) {
    actors.push({
      id: scripted.id,
      kind: "scripted",
      lane: scripted.lane,
      x: scripted.column,
      entry: null,
      color: CAPSULE.scripted,
      life: scripted.actor.life,
      ailments: scripted.actor.ailments,
      maxLife: scripted.actor.maxLife,
      rarity: null,
    });
  }
  for (const monster of state.monsters) {
    const before = frame.previousX.get(monster.id) ?? monster.x;
    // A Fully Broken Helmed Skeleton loses its helm until the break wears off (G §4.1).
    const broken =
      monster.actor.ailments.fullyBrokenSeconds > 0 &&
      BROKEN_SPRITES[monster.archetypeId] !== undefined;
    const recipe = broken
      ? BROKEN_SPRITES[monster.archetypeId]
      : MONSTER_SPRITES[monster.archetypeId];
    actors.push({
      archetypeId: monster.archetypeId,
      broken,
      leapt: monster.leapt === true,
      id: monster.id,
      kind: "monster",
      lane: monster.lane,
      x: before + (monster.x - before) * frame.alpha,
      entry: (recipe && sprites[recipe]) || null,
      color: CAPSULE.monster,
      life: monster.actor.life,
      ailments: monster.actor.ailments,
      maxLife: monster.actor.maxLife,
      rarity: monster.rarity,
    });
  }
  return actors;
}

/**
 * LPC sprites for every actor (G §1–§2, H §5.2), with a capsule fallback per
 * actor: animation states from the sim's timers and positions, and the actor
 * effects the juice cues drive. Presentation only (P12): it reads the round
 * and never writes it.
 */
export const spriteSystem: PresentationFactory = ({ stack, director, settings }) => {
  const dust = createParticlePool(settings.get);
  const leaps = new Map<string, Leap>();
  const debris: Debris[] = [];
  let assets: SpriteAssets | null = null;
  void loadSpriteAssets().then((loaded) => (assets = loaded));
  const views = new Map<string, View>();
  let previous = new Map<string, Actor>();
  const corpses: Corpse[] = [];
  const shovelled = new Set<string>();
  let lastSimMs: number | null = null;
  let flashes = new Map<string, { at: number; band: Band }>();

  const view = (id: string, now: number, firstFrame: boolean): View => {
    let found = views.get(id);
    if (!found) {
      found = {
        clock: new ActorClock(),
        animator: new AttackAnimator(),
        pose: "idle",
        frame: 0,
        bornAt: firstFrame ? -Infinity : now,
        hitAt: -Infinity,
        hitBand: "small",
        phaseMs: phaseOf(id),
      };
      views.set(id, found);
    }
    return found;
  };

  function pose(state: RoundState, frame: Frame, actor: Actor, v: View) {
    const entry = actor.entry;
    const attack = entry?.animations?.attack;
    if (actor.kind === "hero") {
      const hero = state.heroes.find((h) => h.id === actor.id);
      const kit = hero?.kit;
      if (!attack || !kit) return { pose: "idle" as const, frame: 0 };
      const raw = isAttackKit(kit) ? kit.counters.actionTimer : 0;
      const timer = raw > 0 ? Math.max(1e-6, raw - frame.alpha * STEP_SECONDS) : raw;
      const index = v.animator.sample(attack, timer, kit.actionSeconds);
      return { pose: index === 0 ? ("idle" as const) : ("attack" as const), frame: index };
    }
    if (actor.kind === "monster") {
      const leap = leaps.get(actor.id);
      const jump = entry?.animations?.leap;
      if (leap && jump) {
        const p = Math.min(1, (frame.now - leap.startedAt) / T.leapMs);
        return {
          pose: "leap" as const,
          frame: Math.min(jump.frames - 1, Math.floor(p * jump.frames)),
        };
      }
      const monster = state.monsters.find((m) => m.id === actor.id);
      const walk = entry?.animations?.walk;
      const moving = (frame.previousX.get(actor.id) ?? Infinity) > (monster?.x ?? 0) + 1e-9;
      if (moving && walk)
        return {
          pose: "walk" as const,
          frame: v.clock.frame(walkFrameMs(monster?.moveSpeed ?? 1), walk.frames, walk.loopFrom),
        };
      if (monster?.attack && attack) {
        const index = v.animator.sample(attack, monster.attack.timer, monster.attack.seconds);
        if (index > 0) return { pose: "attack" as const, frame: index };
      }
      return { pose: "walk" as const, frame: 0 };
    }
    return { pose: "idle" as const, frame: 0 };
  }

  function drawCapsule(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    alpha: number,
  ) {
    const w = 28;
    const h = 44;
    const x = Math.round(cx - w / 2);
    const y = Math.round(cy - h / 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CAPSULE.outline;
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, w + 2, h + 2, w / 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, w / 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Draws one pose of an actor centred at (cx, cy), with its outline and flash. */
  function drawBody(
    ctx: CanvasRenderingContext2D,
    actor: Actor,
    p: SpritePose,
    index: number,
    cx: number,
    cy: number,
    alpha: number,
    flash: number,
  ) {
    const rect = assets?.atlas && actor.entry ? chooseFrame(actor.entry, p, index, cx, cy) : null;
    // The top ailment's tint (H §8): one tint only, never over 45% alpha.
    const tint = topTint(activeAilments(actor.ailments));
    if (!rect || !assets?.atlas) {
      drawCapsule(ctx, cx, cy, actor.entry?.placeholderColor ?? actor.color, alpha);
      if (tint) drawCapsule(ctx, cx, cy, tint.color, alpha * tint.alpha);
      if (flash > 0) drawCapsule(ctx, cx, cy, "#ffffff", alpha * flash);
      return;
    }
    const blit = (image: CanvasImageSource, ox = 0, oy = 0) =>
      ctx.drawImage(
        image,
        rect.sx,
        rect.sy,
        rect.size,
        rect.size,
        rect.dx + ox,
        rect.dy + oy,
        rect.size,
        rect.size,
      );
    ctx.globalAlpha = alpha;
    const outline =
      actor.rarity === "magic" || actor.rarity === "rare"
        ? assets.silhouettes.get(T.outline[actor.rarity])
        : undefined;
    if (outline)
      for (const [ox, oy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const)
        blit(outline, ox, oy);
    blit(assets.atlas);
    const tinted = tint ? assets.silhouettes.get(tint.color) : undefined;
    if (tint && tinted) {
      ctx.globalAlpha = alpha * tint.alpha;
      blit(tinted);
    }
    const white = assets.silhouettes.get("#ffffff");
    if (flash > 0 && white) {
      ctx.globalAlpha = alpha * flash;
      blit(white);
    }
    ctx.globalAlpha = 1;
  }

  function lifeBar(
    ctx: CanvasRenderingContext2D,
    actor: Actor,
    cx: number,
    cy: number,
    now: number,
  ) {
    const w = 32;
    const x = Math.round(cx - w / 2);
    // Under the feet, so the top lane never clips it.
    const y = Math.round(cy + 22);
    const fraction = Math.max(0, actor.life) / actor.maxLife;
    const low = fraction < T.lowLifeFraction;
    ctx.fillStyle = LIFE.back;
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = low && Math.floor(now / 250) % 2 ? LIFE.low : LIFE.fill;
    ctx.fillRect(x, y, Math.round(w * fraction), 3);
  }

  function draw(ctx: CanvasRenderingContext2D, frame: Frame) {
    const { state, now } = frame;
    const firstFrame = lastSimMs === null;
    // Actor clocks run on sim time, so a paused or slowed round holds or slows its animation.
    const simMs = (state.tick + frame.alpha) * STEP_SECONDS * 1000;
    const dt = firstFrame ? 0 : Math.min(250, Math.max(0, simMs - (lastSimMs ?? simMs)));
    lastSimMs = simMs;
    const sprites = assets?.manifest.sprites ?? {};
    const actors = actorsOf(state, frame, sprites);
    const present = new Map(actors.map((a) => [a.id, a]));
    for (const [id, hit] of flashes) {
      const v = views.get(id);
      if (v) {
        v.hitAt = hit.at;
        v.hitBand = hit.band;
      }
    }
    flashes = new Map();

    // Actors that left the board: killed ones fall, shovelled ones sink, leaked ones just go.
    for (const [id, actor] of previous) {
      if (present.has(id)) continue;
      views.delete(id);
      const leaked = actor.kind === "monster" && actor.x <= SIM_TUNING.leakX + 0.05;
      if (leaked) continue;
      const tile = `${actor.lane}:${actor.x}`;
      corpses.push({ actor, startedAt: now, sink: shovelled.delete(tile) });
    }
    shovelled.clear();
    // A leaper that just leapt arcs from where it was drawn; a skeleton that just broke throws its helm (H §7.1).
    for (const actor of actors) {
      const before = previous.get(actor.id);
      if (!before || actor.kind !== "monster") continue;
      if (actor.leapt && !before.leapt)
        leaps.set(actor.id, { fromX: before.x, toX: actor.x, startedAt: now });
      if (actor.broken && !before.broken) {
        debris.push({ lane: actor.lane, x: actor.x, startedAt: now });
        audioEngine()?.play("helm_ping", { x: actor.x });
      }
    }
    for (const [id, leap] of leaps) {
      if (now - leap.startedAt < T.leapMs) continue;
      leaps.delete(id);
      const landed = present.get(id);
      if (!landed) continue;
      dust.emit("dust", boardX(leap.toX), laneY(landed.lane) + 20);
      audioEngine()?.play("leap_land", { x: leap.toX });
    }
    previous = present;

    const draws: { lane: number; x: number; run: () => void }[] = [];
    for (const actor of actors) {
      const v = view(actor.id, now, firstFrame);
      const frozen = director.frozen(now) || director.actorFrozen(actor.id, now);
      // Freeze stops the animation; chill slows it 30% (H §8).
      const iced = actor.ailments.frozenSeconds > 0;
      const chill = actor.ailments.chill ? AILMENT_JUICE.chillAnimationScale : 1;
      v.clock.advance(dt * chill, frozen || iced);
      if (!frozen && !iced) Object.assign(v, pose(state, frame, actor, v));
      const sinceHit = now - v.hitAt;
      const flash = sinceHit < T.flashMs ? 1 - sinceHit / T.flashMs : 0;
      let cx = boardX(actor.x);
      let cy = laneY(actor.lane);
      const leap = leaps.get(actor.id);
      if (leap) {
        const p = Math.min(1, (now - leap.startedAt) / T.leapMs);
        cx = boardX(leap.fromX + (leap.toX - leap.fromX) * EASINGS.outQuad(p));
        cy -= Math.sin(Math.PI * p) * T.leapArcPx;
      }
      if (actor.archetypeId === "Swarm")
        cy += (v.phaseMs % (2 * T.swarmJitterPx + 1)) - T.swarmJitterPx;
      // Monsters are knocked back by band and recover with outQuad; heroes never move, they jitter (H §2.4).
      if (actor.kind !== "hero" && sinceHit < HIT_TUNING.knockbackRecoverMs)
        cx += Math.round(
          bandEffects(v.hitBand).knockbackPx *
            (1 - EASINGS.outQuad(sinceHit / HIT_TUNING.knockbackRecoverMs)),
        );
      else if (actor.kind === "hero" && sinceHit < T.jitterMs)
        cx += Math.floor(sinceHit / 33) % 2 ? 1 : -1;
      if (actor.kind === "hero" && v.pose === "idle") cy -= bobOffset(now, v.phaseMs);
      const sinceBorn = now - v.bornAt;
      let squash: { x: number; y: number } | null = null;
      const placed = placementPose(sinceBorn);
      cy += placed.dy;
      if (placed.sx !== 1 || placed.sy !== 1) squash = { x: placed.sx, y: placed.sy };
      else if (sinceHit < HIT_TUNING.squash.ms) {
        const t = sinceHit / HIT_TUNING.squash.ms;
        const { x, y } = HIT_TUNING.squash;
        squash = { x: x + (1 - x) * t, y: y + (1 - y) * t };
      }
      const scale = actor.rarity === "rare" ? T.rareScale : 1;
      const showBar = now - v.hitAt < T.healthBarMs && actor.life < actor.maxLife;
      draws.push({
        lane: actor.lane,
        x: actor.x,
        run: () => {
          const sx = (squash?.x ?? 1) * scale;
          const sy = (squash?.y ?? 1) * scale;
          const feet = Math.round(cy + 24);
          if (sx !== 1 || sy !== 1) {
            ctx.save();
            ctx.translate(cx, feet);
            ctx.scale(sx, sy);
            ctx.translate(-cx, -feet);
          }
          drawBody(ctx, actor, v.pose, v.frame, cx, cy, 1, flash);
          if (sx !== 1 || sy !== 1) ctx.restore();
          if (showBar) lifeBar(ctx, actor, cx, cy, now);
        },
      });
    }

    for (let i = corpses.length - 1; i >= 0; i--) {
      const corpse = corpses[i]!;
      const ms = now - corpse.startedAt;
      const cx = boardX(corpse.actor.x);
      const cy = laneY(corpse.actor.lane);
      if (corpse.sink) {
        const sink = shovelPose(ms);
        if (sink.done) corpses.splice(i, 1);
        else
          draws.push({
            lane: corpse.actor.lane,
            x: corpse.actor.x,
            run: () => drawBody(ctx, corpse.actor, "idle", 0, cx, cy + sink.dy, sink.alpha, 0),
          });
        continue;
      }
      const death = deathFrame(ms);
      if (death.done) corpses.splice(i, 1);
      else
        draws.push({
          lane: corpse.actor.lane,
          x: corpse.actor.x,
          run: () => drawBody(ctx, corpse.actor, "death", death.frame, cx, cy, death.alpha, 0),
        });
    }

    // Sorted by lane then x (G §1.1).
    draws.sort((a, b) => a.lane - b.lane || a.x - b.x);
    for (const d of draws) d.run();
    dust.update(dt / 1000);
    dust.draw(ctx);
    drawDebris(ctx, now);
  }

  /** Each knocked-off helm: a small pointed steel cap tumbling up and back, then falling away. */
  function drawDebris(ctx: CanvasRenderingContext2D, now: number) {
    const d = T.helmDebris;
    for (let i = debris.length - 1; i >= 0; i--) {
      const piece = debris[i]!;
      const t = (now - piece.startedAt) / 1000;
      if (t * 1000 >= d.ms) {
        debris.splice(i, 1);
        continue;
      }
      const x = boardX(piece.x) + d.vx * t;
      const y = laneY(piece.lane) - 26 + d.vy * t + (d.gravity * t * t) / 2;
      ctx.save();
      ctx.globalAlpha = 1 - (t * 1000) / d.ms;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(d.spin * t);
      ctx.fillStyle = "#1b1b1b";
      ctx.fillRect(-6, -2, 12, 6);
      ctx.fillStyle = "#9aa3ad";
      ctx.fillRect(-5, -1, 10, 4);
      ctx.fillRect(-2, -5, 4, 4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  stack.register({ id: "sprites-actors", layer: "actors", draw });

  return {
    id: "sprites",
    consume(cue, batch) {
      if (cue.kind === "flash") flashes.set(cue.targetId, { at: batch.at, band: cue.band });
      // The leap's take-off whoosh; its arc and landing are drawn above (H §7.1).
      if (batch.event === "leap" && cue.kind === "sound")
        audioEngine()?.play(cue.id, cue.x !== undefined ? { x: cue.x } : {});
      if (batch.event === "shovelled" && cue.kind === "particles")
        shovelled.add(`${cue.lane}:${cue.x}`);
    },
  };
};
