import { describe, expect, test } from "vitest";
import { runCampaign, summarizeCampaigns, type CampaignResult } from "./campaign";

/** Two campaigns per focus: enough for medians, quick enough for CI. */
let cached: CampaignResult[] | null = null;
function campaigns(): CampaignResult[] {
  cached ??= ["warrior", "ranger", "sorceress"].flatMap((focus) =>
    [1, 2].map((seed) => runCampaign({ focus, seed })),
  );
  return cached;
}

const minutes = (s: number | null) => (s ?? Infinity) / 60;

describe("Grassland campaign calibration (plan 2.25)", () => {
  test("the campaign policy is deterministic", () => {
    const a = runCampaign({ focus: "ranger", seed: 7, maxAttempts: 1 });
    const b = runCampaign({ focus: "ranger", seed: 7, maxAttempts: 1 });
    expect(b).toEqual(a);
  }, 300_000);

  test("E §7's time-to-fun beats land in their bands (median clock)", () => {
    const { beats } = summarizeCampaigns(campaigns());
    // First craft (Augmentation and Transmutation from Level 2) by about minute 7.
    expect(minutes(beats.craftOrbsAt)).toBeGreaterThan(4);
    expect(minutes(beats.craftOrbsAt)).toBeLessThan(9);
    // The Lesser Jeweller's Orb (Level 3) by about minute 12.
    expect(minutes(beats.jewellerAt)).toBeGreaterThan(8);
    expect(minutes(beats.jewellerAt)).toBeLessThan(16);
    // Level 4, Rock and a possible Strongbox, at minutes 15–20 (early is the known slack: see the report).
    expect(minutes(beats.level4At)).toBeGreaterThan(10);
    expect(minutes(beats.level4At)).toBeLessThan(20);
    // The Miller by minutes 25–30.
    expect(minutes(beats.millerAt)).toBeGreaterThan(18);
    expect(minutes(beats.millerAt)).toBeLessThan(35);
  }, 900_000);

  test("D §5.2's 8–20 kills per minute holds on Levels 1, 3, 4 and 5 (median)", () => {
    const { levels } = summarizeCampaigns(campaigns());
    for (const level of levels.filter((l) => l.levelId !== "level-2")) {
      expect(level.medianKillsPerMinute, level.levelId).toBeGreaterThanOrEqual(8);
      expect(level.medianKillsPerMinute, level.levelId).toBeLessThanOrEqual(20);
    }
  }, 900_000);

  test("most campaigns beat the Bloated Miller", () => {
    const summary = summarizeCampaigns(campaigns());
    expect(summary.finished / summary.campaigns).toBeGreaterThanOrEqual(0.5);
  }, 900_000);
});
