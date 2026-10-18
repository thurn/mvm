import type { GemId } from "../../data/types";
import { starterCard } from "../../heroes/model/starter";
import type { LevelDefinition } from "../../monsters/levels/types";
import { startLevel } from "../../monsters/waves";
import type { Drop } from "../../loot/drops";
import { id } from "../../types/ids";
import { lockRoster } from "../economy/roster";
import { step } from "../kernel";
import { STEPS_PER_SECOND } from "../time";
import { FOCUSES } from "./focus";
import { POLICIES } from "./policies";

export interface RoundRequest {
  level: LevelDefinition;
  focus: string;
  policy: string;
  seed: number;
  /** A round that hasn't ended by then counts as a loss. */
  maxSeconds?: number;
}

/** What one headless round measured. */
export interface RoundMetrics {
  won: boolean;
  levelSeconds: number;
  kills: number;
  leaks: number;
  /** Mana at 0, 7.5, 15, 25 and 60 s. */
  mana: Record<string, number>;
  firstGearDropSeconds: number | null;
  drops: Record<
    "normal" | "magic" | "rare" | "unique" | "hero" | "spell" | "currency" | "gold",
    number
  >;
}

export const MANA_SAMPLES = [0, 7.5, 15, 25, 60] as const;

function count(drops: readonly Drop[], metrics: RoundMetrics) {
  for (const drop of drops) {
    if (drop.kind === "item") metrics.drops[drop.item.rarity]++;
    else if (drop.kind === "hero" || drop.kind === "spell") metrics.drops[drop.kind]++;
    else if (drop.kind === "currency") metrics.drops.currency++;
    else if (drop.kind === "gold") metrics.drops.gold += drop.amount;
  }
}

/**
 * Plays one round headless (GDD §17): the focus's starter kit, a scripted
 * placement policy, and the kernel at 60 Hz. Drops come from the kernel's
 * kill-time loot rolls.
 */
export function runRound(request: RoundRequest): RoundMetrics {
  const kit = FOCUSES[request.focus];
  const policy = POLICIES[request.policy];
  if (!kit || !policy)
    throw new Error(`unknown focus ${request.focus} or policy ${request.policy}`);
  const state = startLevel(request.level, request.seed);
  lockRoster(
    state,
    kit.map((skill) => starterCard(id<"Gem">(skill as string) as GemId, 1, `card-${skill}`)),
  );
  const metrics: RoundMetrics = {
    won: false,
    levelSeconds: 0,
    kills: 0,
    leaks: 0,
    mana: {},
    firstGearDropSeconds: null,
    drops: { normal: 0, magic: 0, rare: 0, unique: 0, hero: 0, spell: 0, currency: 0, gold: 0 },
  };
  const maxTicks = (request.maxSeconds ?? 600) * STEPS_PER_SECOND;
  while (state.result === null && state.tick < maxTicks) {
    const seconds = state.tick / STEPS_PER_SECOND;
    for (const sample of MANA_SAMPLES)
      if (Math.abs(seconds - sample) < 1e-9) metrics.mana[sample] = state.mana;
    for (const event of step(state, policy(state))) {
      if (event.type === "leak") metrics.leaks++;
      // Monster kills carry a rarity; hero deaths don't.
      if (event.type === "kill" && event.rarity !== null) metrics.kills++;
      if (event.type !== "drop") continue;
      if (metrics.firstGearDropSeconds === null && event.drop.kind === "item") {
        metrics.firstGearDropSeconds = state.tick / STEPS_PER_SECOND;
      }
      count([event.drop], metrics);
    }
  }
  metrics.won = state.result === "won";
  metrics.levelSeconds = state.tick / STEPS_PER_SECOND;
  return metrics;
}
