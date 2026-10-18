import { describe, expect, test } from "vitest";
import { LEVEL_1 } from "../../monsters/levels/level-1";
import { FOCUSES } from "./focus";
import { runRound } from "./headless";
import { POLICIES } from "./policies";
import { summarize, type SimReport } from "./report";

describe("headless rounds", () => {
  test.each(Object.keys(POLICIES))("the %s policy is deterministic", (policy) => {
    const a = runRound({ level: LEVEL_1, focus: "ranger", policy, seed: 5 });
    const b = runRound({ level: LEVEL_1, focus: "ranger", policy, seed: 5 });
    expect(a).toEqual(b);
    expect(a.levelSeconds).toBeGreaterThan(0);
  });

  test("every focus has a four-card starter kit", () => {
    for (const focus of Object.keys(FOCUSES)) expect(FOCUSES[focus]!).toHaveLength(4);
  });

  test("the report has its schema", () => {
    const runs = [1, 2, 3].map((seed) =>
      runRound({ level: LEVEL_1, focus: "warrior", policy: "pvzOpener", seed }),
    );
    const report: SimReport = summarize(
      { level: LEVEL_1.id, focus: "warrior", policy: "pvzOpener" },
      runs,
    );
    expect(report).toMatchObject({
      level: "level-1",
      focus: "warrior",
      policy: "pvzOpener",
      runs: 3,
      winRate: expect.any(Number),
      meanLevelSeconds: expect.any(Number),
      killsPerMinute: expect.any(Number),
      leaksPerRun: expect.any(Number),
      firstGearDrop: { share: expect.any(Number), medianSeconds: expect.anything() },
      manaCurve: expect.any(Array),
      dropsPerRun: expect.objectContaining({
        normal: expect.any(Number),
        magic: expect.any(Number),
        currency: expect.any(Number),
        gold: expect.any(Number),
      }),
    });
    expect(report.manaCurve.map((p) => p.seconds)).toEqual([0, 7.5, 15, 25, 60]);
  });
});
