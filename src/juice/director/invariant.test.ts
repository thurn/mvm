import { expect, test } from "vitest";
import { applyStep, beginLevel, newAccount } from "../../account/lifecycle";
import { LEVEL_1 } from "../../monsters/levels/level-1";
import { hashState } from "../../sim/hash";
import { step } from "../../sim/kernel";
import { POLICIES } from "../../sim/policies/policies";
import { DEFAULT_SETTINGS } from "../core/settings";
import { createParticlePool } from "../core/particles";
import { createDirector, type PresentationSystem } from "./director";
import { createNumberAggregator } from "./numbers";

/**
 * P12's invariant: a scripted Level 1 with the whole presentation pipeline
 * attached at juice = 2 (fake audio, a no-op canvas) ends with the same
 * state hash as the bare sim.
 */
test("presentation never changes the sim's outcome", () => {
  const play = (withJuice: boolean) => {
    const account = newAccount("ranger");
    const round = beginLevel(account, LEVEL_1, 31);
    const policy = POLICIES.pvzOpener!;
    const pool = createParticlePool(
      () => ({ ...DEFAULT_SETTINGS, juice: 2 }),
      () => 0.5,
    );
    const numbers = createNumberAggregator();
    const sounds: string[] = [];
    const systems: PresentationSystem[] = [
      {
        id: "particles",
        consume(cue) {
          if (cue.kind === "particles")
            pool.emit(cue.preset, cue.x * 64, cue.lane * 64, cue.loot ? { loot: true } : {});
        },
      },
      {
        id: "numbers",
        consume: (cue, batch) => cue.kind === "number" && void numbers.add(cue, batch.at),
      },
      { id: "audio", consume: (cue) => cue.kind === "sound" && void sounds.push(cue.id) },
    ];
    let now = 0;
    const director = withJuice
      ? createDirector({
          settings: () => ({ ...DEFAULT_SETTINGS, juice: 2 }),
          now: () => now,
          speed: () => round.speed,
          systems,
        })
      : null;
    while (round.result === null && round.tick < 400 * 60) {
      const events = step(round, policy(round));
      applyStep(account, round, events);
      if (director) {
        director.handle(events, round);
        director.update(1 / 60);
        pool.update(1 / 60);
        now += 1000 / 60;
      }
    }
    return { hash: hashState(round), sounds: sounds.length };
  };
  const bare = play(false);
  const juiced = play(true);
  expect(juiced.hash).toBe(bare.hash);
  expect(juiced.sounds).toBeGreaterThan(0);
});
