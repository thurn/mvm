import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { createRound } from "../../sim/state";
import { STEPS_PER_SECOND } from "../../sim/time";
import { id } from "../../types/ids";
import type { Scene } from ".";

/** Seconds between sky orbs in the rain (PvZ's are 4–10 s; this is for feel). */
const RAIN_SECONDS = 1.2;

/** Sky orbs raining every 1.2 s and three acolytes making mana (1.28). */
export const manaRain: Scene = {
  name: "mana-rain",
  create() {
    const state = createRound({ seed: 28, lanes: [0, 1, 2, 3, 4], mana: 50 });
    for (const lane of [1, 2, 3])
      placeHero(state, starterCard(id<"Gem">(SKILLS.acolyte), 1, `scene-acolyte-${lane}`), lane, 1);
    return state;
  },
  // Scripted: pull the next sky orb forward so the rain keeps falling.
  intents(state) {
    const now = state.tick / STEPS_PER_SECOND;
    if (state.sky.nextAtSeconds === null || state.sky.nextAtSeconds > now + RAIN_SECONDS)
      state.sky.nextAtSeconds = now + RAIN_SECONDS;
    return [];
  },
};
