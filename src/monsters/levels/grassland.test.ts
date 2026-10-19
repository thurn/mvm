import { describe, expect, test } from "vitest";
import {
  applyStep,
  beginLevel,
  finishLevel,
  furthestLevel,
  isUnlocked,
  newAccount,
} from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import type { SimEvent } from "../../sim/events";
import { step } from "../../sim/kernel";
import { POLICIES } from "../../sim/policies/policies";
import { STEPS_PER_SECOND } from "../../sim/time";
import { CAMPAIGN, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5 } from "./grassland";
import type { LevelDefinition } from "./types";

/** A focus kit levelled to the level's area level + 2 (E §6.2's cap). */
function fitting(focus: string, level: LevelDefinition): AccountState {
  const account = newAccount(focus);
  for (const card of [...account.roster.slots, account.roster.spell])
    if (card) card.hero.level = level.areaLevel + 2;
  return account;
}

function play(account: AccountState, level: LevelDefinition, seed: number) {
  const round = beginLevel(account, level, seed);
  const events: SimEvent[] = [];
  const policy = POLICIES.pvzOpener!;
  while (round.result === null && round.tick < 900 * STEPS_PER_SECOND) {
    const step_ = step(round, policy(round));
    applyStep(account, round, step_);
    for (const e of step_) if (e.type === "bossSpawned" || e.type === "waveStart") events.push(e);
  }
  return { round, events };
}

describe("Levels 2–5 (Appendix D §6.1–§6.3)", () => {
  test("each definition matches its D §6.1 row", () => {
    const rows = CAMPAIGN.map((l) => [
      l.index,
      l.areaLevel,
      l.waves,
      l.lanes.length,
      l.newArchetype,
      l.specialTiles,
    ]);
    expect(rows.slice(1)).toEqual([
      [2, 2, 6, 5, "ArmouredLight", 0],
      [3, 3, 8, 5, "Swarm", 0],
      [4, 5, 10, 5, "Leaper", 2],
      [5, 6, 8, 5, null, 2],
    ]);
    expect(LEVEL_4.newTerrain).toBe("rock");
    expect(CAMPAIGN.map((l) => l.strongboxes)).toEqual([false, false, false, true, false]);
    expect(CAMPAIGN.map((l) => l.boss ?? null)).toEqual([null, null, null, null, "BloatedMiller"]);
    // D §6.2: every archetype introduced so far (no Brute before 14).
    expect(LEVEL_5.archetypes).toEqual(["Shambler", "ArmouredLight", "Swarm", "Leaper"]);
  });

  test("levels unlock in order on first clears, and the furthest unlocked is the one to play", () => {
    const account = newAccount("warrior");
    expect(CAMPAIGN.map((l) => isUnlocked(account, l))).toEqual([true, false, false, false, false]);
    for (const level of CAMPAIGN) {
      expect(furthestLevel(account)).toBe(level);
      const round = beginLevel(account, level, 1);
      round.result = "won";
      finishLevel(account, round);
    }
    expect(CAMPAIGN.every((l) => isUnlocked(account, l))).toBe(true);
    expect(furthestLevel(account)).toBe(LEVEL_5);
  });

  test("a replay rolls a fresh seed: a new wave plan and map", () => {
    const account = newAccount("ranger");
    const a = beginLevel(account, LEVEL_4);
    const b = beginLevel(account, LEVEL_4);
    expect(a.waves!.plan).not.toEqual(b.waves!.plan);
  });

  test.each([
    [LEVEL_2, "warrior"],
    [LEVEL_2, "ranger"],
    [LEVEL_2, "sorceress"],
    [LEVEL_3, "warrior"],
    [LEVEL_3, "ranger"],
    [LEVEL_3, "sorceress"],
  ] as const)(
    "%s.id with a fitting %s roster wins at least 80% of 20 seeds",
    (level, focus) => {
      let won = 0;
      for (let seed = 1; seed <= 20; seed++)
        if (play(fitting(focus, level), level, seed).round.result === "won") won++;
      expect(won / 20).toBeGreaterThanOrEqual(0.8);
    },
    300_000,
  );

  test.each([LEVEL_4, LEVEL_5])(
    "%s.id plays to a result, and a boss level spawns exactly one Miller with its last wave",
    (level) => {
      let reached = 0;
      for (const seed of [1, 2, 3]) {
        const { round, events } = play(fitting("warrior", level), level, seed);
        expect(round.result).not.toBeNull();
        const bosses = events.filter((e) => e.type === "bossSpawned");
        if (!level.boss) {
          expect(bosses).toHaveLength(0);
          continue;
        }
        if (bosses.length === 0) continue; // lost before the last wave
        reached++;
        expect(bosses).toHaveLength(1);
        const lastWave = events.findLast((e) => e.type === "waveStart");
        expect(lastWave).toMatchObject({ wave: level.waves - 1 });
      }
      if (level.boss) expect(reached).toBeGreaterThan(0);
    },
    300_000,
  );
});
