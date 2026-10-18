import { createRound } from "../../sim/state";
import type { Scene } from ".";

export const emptyBoard: Scene = {
  name: "empty-board",
  create: () => createRound({ seed: 1, lanes: [1, 2, 3], mana: 150 }),
};
