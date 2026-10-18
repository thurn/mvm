import { describe, expect, test } from "vitest";
import { applyStep, beginLevel, newAccount } from "../account/lifecycle";
import { SOUNDS } from "../assets/sounds";
import { SFX } from "../audio/zzfx";
import { LEVEL_1 } from "../monsters/levels/level-1";
import { step } from "../sim/kernel";
import { POLICIES } from "../sim/policies/policies";
import { STEPS_PER_SECOND } from "../sim/time";
import type { Tier } from "../tuning/juice";
import { DEFAULT_SETTINGS } from "./core/settings";
import { cuesFor, tierCues } from "./cues";

/** Every sound id the cue table asks for while each focus plays Level 1, plus the tier rows. */
function soundIds(): Set<string> {
  const ids = new Set<string>();
  const add = (cues: readonly { kind: string; id?: string }[]) => {
    for (const cue of cues) if (cue.kind === "sound" && cue.id) ids.add(cue.id);
  };
  for (const tier of [1, 2, 3, 4, 5] as Tier[]) add(tierCues(tier));
  for (const focus of ["warrior", "ranger", "sorceress"]) {
    const account = newAccount(focus);
    const round = beginLevel(account, LEVEL_1, 3);
    const policy = POLICIES.pvzOpener!;
    while (round.result === null && round.tick < 600 * STEPS_PER_SECOND) {
      const events = step(round, policy(round));
      applyStep(account, round, events);
      for (const event of events) add(cuesFor(event, DEFAULT_SETTINGS).cues);
    }
  }
  return ids;
}

describe("cue rows and the sound map meet (1.38 seams)", () => {
  test("every sound a Level 1 cue names has samples or a ZzFX sketch", () => {
    const missing = [...soundIds()].filter((id) => !(id in SOUNDS) && !(id in SFX));
    expect(missing).toEqual([]);
  });
});
