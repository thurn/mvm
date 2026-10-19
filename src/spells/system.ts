import { dealHit } from "../sim/combat";
import { roundTeam } from "../heroes/board/place";
import type { SimEvent } from "../sim/events";
import type { Intent } from "../sim/intents";
import { newInstanceId, type PendingSpellPart } from "../sim/state";
import type { StepContext, System } from "../sim/system";
import { STEPS_PER_SECOND } from "../sim/time";
import { SIM_TUNING } from "../tuning/sim";
import { buildSpell } from "./build";
import { monstersOnTiles, shapeTiles } from "./shapes";

type CastRefusal = Extract<SimEvent, { type: "castRefused" }>["reason"];

function cast(ctx: StepContext, intent: Extract<Intent, { type: "cast" }>, now: number): void {
  const { state } = ctx;
  const column = Math.round(intent.x);
  const slot = state.roster.find((s) => s.cardId === intent.spellId);
  const refuse = (reason: CastRefusal) =>
    ctx.emit({ type: "castRefused", spellId: intent.spellId, lane: intent.lane, column, reason });
  if (!slot || slot.kind !== "spell") return refuse("unknown-spell");
  if (!state.lanes.includes(intent.lane) || column < 1 || column > SIM_TUNING.columns)
    return refuse("out-of-bounds");
  if (slot.rechargeLeft > 1e-9) return refuse("recharging");
  if (state.mana < slot.cost) return refuse("cost");
  state.mana -= slot.cost;
  slot.rechargeLeft = slot.rechargeSeconds;
  const castId = newInstanceId<"SpellCast">(state);
  const kit = buildSpell(slot.card, roundTeam(state));
  for (const part of kit.parts) {
    state.spells.push({
      castId,
      spellId: intent.spellId,
      part: part.name,
      lane: intent.lane,
      column: Math.max(1, column + part.columnOffset),
      atSeconds: now + part.delaySeconds,
      shape: part.shape,
      hit: part.hit,
      actor: kit.actor,
    });
  }
  ctx.emit({ type: "cast", castId, spellId: intent.spellId, lane: intent.lane, column });
}

function land(ctx: StepContext, part: PendingSpellPart): void {
  const tiles = shapeTiles(part.shape, part.lane, part.column, ctx.state.lanes);
  ctx.emit({
    type: "spellImpact",
    castId: part.castId,
    part: part.part,
    lane: part.lane,
    column: part.column,
    tiles,
  });
  for (const monster of monstersOnTiles(ctx.state, tiles)) {
    dealHit(
      ctx,
      { id: part.castId, actor: part.actor },
      { kind: "monster", entity: monster },
      part.hit,
    );
  }
}

/** Player spells (Appendix B §6): `cast` intents, then each part lands on its tiles after its delay. */
export const spellSystem: System = {
  id: "spells",
  phase: "spawning",
  run(ctx) {
    const { state } = ctx;
    const now = state.tick / STEPS_PER_SECOND;
    for (const intent of ctx.intents) if (intent.type === "cast") cast(ctx, intent, now);
    const due = state.spells.filter((p) => p.atSeconds <= now + 1e-9);
    if (due.length === 0) return;
    state.spells = state.spells.filter((p) => !due.includes(p));
    for (const part of due) land(ctx, part);
  },
};
