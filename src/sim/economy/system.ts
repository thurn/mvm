import { placeHero } from "../../heroes/board/place";
import { placeableAt } from "../terrain";
import { ECONOMY_TUNING } from "../../tuning/economy";
import { SIM_TUNING } from "../../tuning/sim";
import type { SimEvent } from "../events";
import type { Intent } from "../intents";
import { draw } from "../rng";
import type { RoundState } from "../state";
import type { StepContext, System } from "../system";
import { STEP_SECONDS, STEPS_PER_SECOND } from "../time";
import { spawnOrb } from "./orbs";

type PlaceRefusal = Extract<SimEvent, { type: "placeRefused" }>["reason"];

function occupied(state: RoundState, lane: number, column: number): boolean {
  return (
    state.heroes.some((h) => h.lane === lane && h.column === column) ||
    state.scripted.some((s) => s.lane === lane && s.column === column)
  );
}

function place(ctx: StepContext, intent: Extract<Intent, { type: "place" }>): void {
  const { state } = ctx;
  const slot = state.roster.find((s) => s.cardId === intent.cardId);
  const refuse = (reason: PlaceRefusal) =>
    ctx.emit({
      type: "placeRefused",
      cardId: intent.cardId,
      lane: intent.lane,
      column: intent.column,
      reason,
    });
  if (!slot || slot.kind !== "hero") return refuse("unknown-card");
  if (
    !state.lanes.includes(intent.lane) ||
    intent.column < 1 ||
    intent.column > SIM_TUNING.columns
  ) {
    return refuse("out-of-bounds");
  }
  if (occupied(state, intent.lane, intent.column)) return refuse("occupied");
  if (!placeableAt(state, intent.lane, intent.column)) return refuse("terrain");
  if (slot.rechargeLeft > 1e-9) return refuse("recharging");
  if (state.mana < slot.cost) return refuse("cost");
  state.mana -= slot.cost;
  slot.rechargeLeft = slot.rechargeSeconds;
  const hero = placeHero(state, slot.card, intent.lane, intent.column);
  ctx.emit({ type: "placed", heroId: hero.id, lane: hero.lane, column: hero.column });
}

function shovel(ctx: StepContext, intent: Extract<Intent, { type: "shovel" }>): void {
  const { state } = ctx;
  const hero = state.heroes.find((h) => h.lane === intent.lane && h.column === intent.column);
  if (!hero) return;
  state.heroes = state.heroes.filter((h) => h !== hero);
  ctx.emit({ type: "shovelled", heroId: hero.id, lane: hero.lane, column: hero.column });
}

function sky(ctx: StepContext, now: number): void {
  const { state } = ctx;
  const t = ECONOMY_TUNING;
  if (state.sky.nextAtSeconds === null) {
    state.sky.nextAtSeconds =
      now +
      t.skyFirstMinSeconds +
      draw(state.rng, "sky") * (t.skyFirstMaxSeconds - t.skyFirstMinSeconds);
  }
  if (now < state.sky.nextAtSeconds - 1e-9) return;
  const lane = state.lanes[Math.floor(draw(state.rng, "sky") * state.lanes.length)]!;
  const column = 1 + Math.floor(draw(state.rng, "sky") * SIM_TUNING.columns);
  spawnOrb(ctx, { amount: t.skyManaAmount, source: "sky", lane, x: column });
  const base = Math.min(
    t.skyIntervalCapSeconds,
    t.skyIntervalBaseSeconds + t.skyIntervalPerOrbSeconds * state.sky.count,
  );
  state.sky.count++;
  state.sky.nextAtSeconds = now + base + draw(state.rng, "sky") * t.skyIntervalJitterSeconds;
}

function collect(ctx: StepContext, now: number): void {
  const { state } = ctx;
  const due = state.orbs.filter((orb) => orb.collectAtSeconds <= now + 1e-9);
  if (due.length === 0) return;
  state.orbs = state.orbs.filter((orb) => !due.includes(orb));
  for (const orb of due) {
    const amount = Math.floor(orb.amount);
    state.mana = Math.min(ECONOMY_TUNING.manaCap, state.mana + amount);
    ctx.emit({ type: "manaCollect", orbId: orb.id, amount });
  }
}

/**
 * The board economy (GDD §6.2–§6.3): applies place, shovel, setSpeed and
 * abandon intents, drops sky mana on PvZ's schedule, auto-collects orbs, and
 * recharges cards.
 */
export const economySystem: System = {
  id: "economy",
  phase: "spawning",
  run(ctx) {
    const { state } = ctx;
    const now = state.tick / STEPS_PER_SECOND;
    for (const slot of state.roster)
      slot.rechargeLeft = Math.max(0, slot.rechargeLeft - STEP_SECONDS);
    for (const intent of ctx.intents) {
      if (intent.type === "place") place(ctx, intent);
      else if (intent.type === "shovel") shovel(ctx, intent);
      else if (intent.type === "setSpeed") state.speed = intent.speed;
      else if (intent.type === "abandon" && state.result === null) {
        state.result = "lost";
        ctx.emit({ type: "levelEnd", result: "lost" });
        return;
      }
    }
    sky(ctx, now);
    collect(ctx, now);
  },
};
