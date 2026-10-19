import { audioEngine } from "../../audio";
import type { Frame } from "../../render/layers";
import { BOARD_WIDTH, TILE } from "../../render/scale";
import type { MonsterState, RoundState } from "../../sim/state";
import { BOSS_TUNING } from "../../tuning/bosses";
import { BOSS_JUICE as B } from "../../tuning/juice";
import { createParticlePool } from "../core/particles";
import type { PresentationFactory } from "../director/systems";

const boardX = (x: number) => (x - 0.5) * TILE;
/** The name card's top: under the HUD boss bar (about 32 px tall at 6 px from the top). */
const CARD_TOP = 46;
const laneY = (lane: number) => (lane + 0.5) * TILE;

type Boss = MonsterState & { boss: NonNullable<MonsterState["boss"]> };

const bossesOf = (state: RoundState): Boss[] =>
  state.monsters.filter((m): m is Boss => m.boss !== undefined);

/** The boss's body centre: its x, midway down its covered lanes. */
function centreOf(boss: Boss) {
  const lanes = boss.boss.lanes;
  return { x: boardX(boss.x), y: (laneY(lanes[0]!) + laneY(lanes.at(-1)!)) / 2 };
}

const telegraphKey = (boss: Boss, t: Boss["boss"]["telegraphs"][number]) =>
  `${boss.id}:${t.ability}:${t.tiles.map((x) => `${x.lane}.${x.column}`).join()}`;

/**
 * Boss moments (H §7.5, plan 2.17): the intro's name card, the rising
 * whoosh that ends exactly at each telegraph's impact (timed from the
 * telegraph's own countdown, so it holds at any game speed), Rotting
 * Brood's ground bulge, the enrage smoke, and the heavy-stun moment: a
 * crack, "HEAVY STUN" over the boss and a T4 package. Telegraph tiles are
 * the spells system's ground-telegraph layer; the HUD draws the boss and
 * heavy-stun bars. Presentation only (P12).
 */
export const bossSystem: PresentationFactory = ({ stack, settings, director }) => {
  const smoke = createParticlePool(settings.get);
  let cardAt: number | null = null;
  const whooshed = new Set<string>();
  /** Bosses heavy-stunned at the last frame, and when each stun began. */
  const stunned = new Map<string, number>();
  const enraged = new Set<string>();
  let lastNow: number | null = null;

  stack.register({
    id: "boss-ground",
    layer: "groundDecals",
    draw(ctx: CanvasRenderingContext2D, { state }: Frame) {
      // Rotting Brood: the ground bulges on each tile, swelling until the Shamblers pop out.
      for (const boss of bossesOf(state))
        for (const t of boss.boss.telegraphs) {
          if (t.ability !== "rottingBrood") continue;
          const total = BOSS_TUNING[boss.boss.bossId].telegraphSeconds;
          const p = Math.max(0, Math.min(1, 1 - t.secondsLeft / total));
          for (const tile of t.tiles) {
            ctx.fillStyle = B.bulgeColor;
            ctx.beginPath();
            const cx = boardX(tile.column);
            const cy = laneY(tile.lane) + 18;
            ctx.ellipse(cx, cy - 4 * p, 16 + 6 * p, 5 + 7 * p, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
    },
  });

  stack.register({
    id: "boss-moments",
    layer: "flashes",
    draw(ctx: CanvasRenderingContext2D, { state, now }: Frame) {
      const dt = lastNow === null ? 0 : Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      const bosses = bossesOf(state);
      const live = new Set<string>();
      for (const boss of bosses) {
        // The whoosh rises for whooshMs and ends at impact.
        for (const t of boss.boss.telegraphs) {
          const key = telegraphKey(boss, t);
          live.add(key);
          if (t.secondsLeft * 1000 > B.whooshMs || whooshed.has(key)) continue;
          whooshed.add(key);
          audioEngine()?.play("boss_whoosh", { x: boss.x });
        }
        // Heavy stun: a crack, the text and a T4 package as it begins.
        const stun = boss.actor.ailments.heavyStunSeconds > 0;
        if (stun && !stunned.has(boss.id)) {
          stunned.set(boss.id, now);
          audioEngine()?.play("boss_crack", { x: boss.x });
          director.fire(4);
        } else if (!stun && now - (stunned.get(boss.id) ?? now) > B.heavyStunMs)
          stunned.delete(boss.id);
        // Enrage: a smoke burst around the boss (the roar and T4 come from its cue row).
        if (boss.boss.enraged && !enraged.has(boss.id)) {
          enraged.add(boss.id);
          const c = centreOf(boss);
          for (let i = 0; i < B.smokeBursts; i++)
            smoke.emit("dust", c.x + (i - 1) * 16, c.y + 10, { scale: 2 });
        }
      }
      // A landed telegraph can whoosh again the next time it comes round.
      for (const key of whooshed) if (!live.has(key)) whooshed.delete(key);
      smoke.update(dt);
      smoke.draw(ctx);
      for (const boss of bosses) {
        const since = now - (stunned.get(boss.id) ?? -Infinity);
        if (since > B.heavyStunMs) continue;
        const c = centreOf(boss);
        ctx.globalAlpha = Math.min(1, (B.heavyStunMs - since) / 400);
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = "#ffffff";
        ctx.strokeText(B.heavyStunText, c.x, c.y - 50);
        ctx.fillText(B.heavyStunText, c.x, c.y - 50);
        ctx.globalAlpha = 1;
        ctx.textAlign = "start";
      }
    },
  });

  stack.register({
    id: "boss-name-card",
    layer: "hud",
    draw(ctx: CanvasRenderingContext2D, { state, now }: Frame) {
      if (cardAt === null) return;
      const C = B.nameCard;
      const since = now - cardAt;
      const boss = bossesOf(state)[0];
      const names = boss ? B.names[boss.boss.bossId] : undefined;
      if (since > C.slideMs * 2 + C.holdMs || !names) {
        if (since > C.slideMs * 2 + C.holdMs) cardAt = null;
        return;
      }
      // Slides in from the right, holds, slides back out.
      const out =
        since < C.slideMs
          ? 1 - since / C.slideMs
          : since > C.slideMs + C.holdMs
            ? (since - C.slideMs - C.holdMs) / C.slideMs
            : 0;
      const w = 240;
      const x = BOARD_WIDTH - w - 12 + out * (w + 12);
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      // Below the HUD's boss bar, which sits at the board's top centre.
      ctx.fillRect(x, CARD_TOP, w, 40);
      ctx.fillStyle = C.color;
      ctx.font = "bold 14px serif";
      ctx.fillText(names.name, x + 10, CARD_TOP + 18);
      ctx.fillStyle = "#c8c8c8";
      ctx.font = "10px serif";
      ctx.fillText(names.subtitle, x + 10, CARD_TOP + 33);
    },
  });

  return {
    id: "boss",
    consume(cue, batch) {
      if (cue.kind !== "sound") return;
      if (batch.event === "bossSpawned") {
        audioEngine()?.play(cue.id, cue.x !== undefined ? { x: cue.x } : {});
        cardAt = batch.at;
      }
      // The telegraph whoosh is timed from state above; these play as they come.
      if (
        batch.event === "bossEnrage" ||
        batch.event === "bossPrimed" ||
        batch.event === "bossAbility"
      )
        audioEngine()?.play(cue.id);
    },
  };
};
