import type { RoundState } from "../../sim/state";
import { emptyBoard } from "./empty-board";
import { shamblersVsScripted } from "./shamblers-vs-scripted";

/** A QA scene: a scripted board state that `?scene=<name>` boots into (P22). */
export interface Scene {
  name: string;
  create(): RoundState;
}

/** Every scene. Beads add theirs beside their features. */
export const SCENES: readonly Scene[] = [emptyBoard, shamblersVsScripted];

export function findScene(name: string): Scene | undefined {
  return SCENES.find((scene) => scene.name === name);
}
