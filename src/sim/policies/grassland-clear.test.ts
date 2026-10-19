import { describe, expect, test } from "vitest";
import { FOCUSES } from "./focus";
import { runCampaign } from "./campaign";

/** Seeds per focus, and the share that must clear Levels 1–5 in order (plan 2.26). */
const SEEDS = 10;
const CLEAR_SHARE = 0.8;

describe("the Grassland clears (plan 2.26)", () => {
  test.each(Object.keys(FOCUSES))(
    "a fresh %s account clears Levels 1–5 in order on at least 80% of 10 seeds",
    (focus) => {
      const cleared = Array.from({ length: SEEDS }, (_, i) =>
        runCampaign({ focus, seed: i + 1 }),
      ).filter((r) => r.finished).length;
      expect(cleared / SEEDS).toBeGreaterThanOrEqual(CLEAR_SHARE);
    },
    120_000,
  );
});
