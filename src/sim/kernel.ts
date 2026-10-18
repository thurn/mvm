import type { SimEvent } from "./events";
import type { Intent } from "./intents";
import type { RoundState } from "./state";
import { PHASES, type StepContext } from "./system";
import { SYSTEMS } from "./systems";

const ORDERED = PHASES.flatMap((phase) => SYSTEMS.filter((system) => system.phase === phase));

/**
 * Advances the round by one fixed 1/60 s step, mutating `state` in place,
 * and returns what happened. A finished round no longer steps.
 */
export function step(state: RoundState, intents: readonly Intent[]): SimEvent[] {
  if (state.result !== null) return [];
  const events: SimEvent[] = [];
  const ctx: StepContext = { state, intents, emit: (event) => events.push(event) };
  for (const system of ORDERED) {
    system.run(ctx);
    if (state.result !== null) break;
  }
  state.tick++;
  return events;
}
