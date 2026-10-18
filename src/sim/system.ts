import type { SimEvent } from "./events";
import type { Intent } from "./intents";
import type { RoundState } from "./state";

/** The fixed order systems run in, each step. */
export const PHASES = [
  "spawning",
  "heroes",
  "projectiles",
  "monsters",
  "ailments",
  "economy",
  "loot",
] as const;
type Phase = (typeof PHASES)[number];

export interface StepContext {
  state: RoundState;
  intents: readonly Intent[];
  emit(event: SimEvent): void;
}

export interface System {
  id: string;
  phase: Phase;
  run(ctx: StepContext): void;
}
