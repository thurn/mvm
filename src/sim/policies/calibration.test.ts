import { describe, expect, test } from "vitest";
import { resolveHit } from "../../combat/resolve";
import { constantRng } from "../../combat/test-rng";
import { aggregate } from "../../heroes/model/aggregate";
import { starterCard } from "../../heroes/model/starter";
import { buildKit } from "../../heroes/board/kit";
import { heroGems } from "../../data";
import { buildMonster } from "../../monsters/model";
import { LEVEL_1 } from "../../monsters/levels/level-1";
import { id } from "../../types/ids";
import { runRound } from "./headless";
import { summarize, type SimReport } from "./report";

/**
 * Calibration bands (1.37). Each check runs 20 PvZ-opener rounds per focus.
 * A check listed in KNOWN_MISSES must still miss: the calibration report
 * (docs/plan/evidence/calibration/hv-7ic2.73.md) records why and which
 * tunable would close it, and fixing one forces this list to be updated.
 */
const KNOWN_MISSES = new Set([
  "levelLength:warrior",
  "levelLength:ranger",
  "firstGear:sorceress",
  "hitsToKill:lightningArrow",
]);

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const reports: SimReport[] = (["warrior", "ranger", "sorceress"] as const).map((focus) =>
  summarize(
    { level: LEVEL_1.id, focus, policy: "pvzOpener" },
    SEEDS.map((seed) => runRound({ level: LEVEL_1, focus, policy: "pvzOpener", seed })),
  ),
);

/** Each band, read from the appendices. Appendix E §7's clock counts a 30 s focus pick before Level 1. */
const CHECKS: { name: string; doc: string; pass: (r: SimReport) => boolean }[] = [
  { name: "win", doc: "the PvZ opener clears Level 1 (≥ 90%)", pass: (r) => r.winRate >= 0.9 },
  {
    name: "levelLength",
    doc: "Appendix E §7: Level 1 cleared ~2:30–4:00 into the session (120–210 s of level)",
    pass: (r) => r.meanLevelSeconds >= 120 && r.meanLevelSeconds <= 210,
  },
  {
    name: "killsPerMinute",
    doc: "Appendix D §5.2: 8–20 kills per minute",
    pass: (r) => r.killsPerMinute >= 8 && r.killsPerMinute <= 20,
  },
  {
    name: "firstGear",
    doc: "Appendix E §7: the first gear drop at ~1:30 into the session (median ≤ 75 s of level)",
    pass: (r) => r.firstGearDrop.medianSeconds !== null && r.firstGearDrop.medianSeconds <= 75,
  },
  {
    name: "manaShape",
    doc: "Appendix E §2.3: ~125 at 7.5 s and 15 s before the next acolyte, 150 at the start",
    pass: (r) => {
      const at = (s: number) => r.manaCurve.find((p) => p.seconds === s)!.mean;
      return at(0) === 150 && at(7.5) >= 100 && at(7.5) <= 150 && at(15) >= 100 && at(15) <= 175;
    },
  },
];

describe.each(CHECKS)("$doc", (check) => {
  test.each(reports.map((r) => [r.focus, r] as const))("%s", (focus, report) => {
    expect(check.pass(report)).toBe(!KNOWN_MISSES.has(`${check.name}:${focus}`));
  });
});

describe("Appendix A §1.3 with the real starter hero and monster", () => {
  const shambler = buildMonster({
    archetypeId: "Shambler",
    rarity: "normal",
    affixes: [],
    areaLevel: 1,
    levelIndex: 1,
    lane: 2,
    x: 5,
  });

  test("a level 1 Lightning Arrow kills a white Shambler in 8–10 arrows (a known miss: 12)", () => {
    const card = starterCard(id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 1);
    const sheet = aggregate(card);
    const gem = heroGems().find((g) => g.id === card.hero.skillId);
    const kit = buildKit(card.hero.skillId, { sheet, gem });
    if (kit?.behavior !== "lightningArrow") throw new Error("not a Lightning Arrow kit");
    const arrow = kit.hits.main;
    const perHit = resolveHit(sheet.actor, shambler.actor, arrow, constantRng(0.5)).lifeLost;
    const hits = Math.ceil(shambler.actor.maxLife / perHit);
    expect(hits >= 8 && hits <= 10).toBe(!KNOWN_MISSES.has("hitsToKill:lightningArrow"));
  });

  test("a white Shambler kills an unarmoured level 1 squishy hero in about 3.7 s", () => {
    const hero = aggregate(
      starterCard(id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 1),
    ).actor;
    const perBite = resolveHit(
      shambler.actor,
      hero,
      shambler.attack!.hit,
      constantRng(0.5),
    ).lifeLost;
    const seconds = (hero.maxLife / perBite) * shambler.attack!.seconds;
    expect(seconds).toBeGreaterThan(3.2);
    expect(seconds).toBeLessThan(4.2);
  });
});
