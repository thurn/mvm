import type { Intent } from "../../sim/intents";
import type { RoundState } from "../../sim/state";
import { ailments } from "./ailments";
import { boss } from "./boss";
import { emptyBoard } from "./empty-board";
import { equipAb } from "./equip-ab";
import { hitBands } from "./hit-bands";
import { kills } from "./kills";
import { manaRain } from "./mana-rain";
import { shamblersVsScripted } from "./shamblers-vs-scripted";
import { spells } from "./spells";
import { starterHeroes } from "./starter-heroes";
import { strongbox } from "./strongbox";
import { terrain } from "./terrain";

/** A QA scene: a scripted board state that `?scene=<name>` boots into (P22). */
export interface Scene {
  name: string;
  create(): RoundState;
  /** Scripted player input: intents to apply on this step, if any. */
  intents?(state: RoundState): Intent[];
}

/** Every scene. Beads add theirs beside their features. */
export const SCENES: readonly Scene[] = [
  emptyBoard,
  shamblersVsScripted,
  starterHeroes,
  spells,
  hitBands,
  kills,
  manaRain,
  equipAb,
  ailments,
  boss,
  terrain,
  strongbox,
];

export function findScene(name: string): Scene | undefined {
  return SCENES.find((scene) => scene.name === name);
}
