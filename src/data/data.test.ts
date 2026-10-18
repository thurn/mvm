import { describe, expect, test } from "vitest";
import { STAT_MAP } from "./stat-map";
import { baseItems, currencies, heroGems, mods, monsterLevelStats, spellGems, supportGems } from ".";

describe("M1 data accessors", () => {
  test("the six PoE2 starter heroes of Appendix B §4 are present", () => {
    expect(heroGems().map((h) => h.name).sort()).toEqual([
      "Armour Piercing Rounds",
      "Falling Thunder",
      "Ice Strike",
      "Lightning Arrow",
      "Rolling Slam",
      "Spark",
    ]);
  });

  test("the three starter spells are present", () => {
    expect(spellGems().map((s) => s.name).sort()).toEqual(["Comet", "Earthquake", "Explosive Grenade"]);
  });

  test("level 1 monster life is 15 (Appendix A §1.3)", () => {
    expect(monsterLevelStats(1).life).toBe(15);
    expect(() => monsterLevelStats(0)).toThrow();
  });

  test("every imported mod maps to at least one vocabulary stat", () => {
    expect(mods().length).toBeGreaterThan(0);
    for (const mod of mods()) {
      expect(mod.mvmStats.length, mod.id).toBeGreaterThan(0);
      for (const stat of mod.stats) expect(STAT_MAP, `${mod.id} ${stat.id}`).toHaveProperty([stat.id]);
    }
  });

  test("everything stays within M1's item level 10", () => {
    for (const mod of mods()) expect(mod.requiredLevel).toBeLessThanOrEqual(10);
    for (const base of baseItems()) expect(base.dropLevel).toBeLessThanOrEqual(10);
  });

  test("supports, the starter bases and currency are present", () => {
    expect(supportGems().length).toBeGreaterThan(50);
    const names = baseItems().map((b) => b.name);
    for (const starter of ["Crude Bow", "Wrapped Quarterstaff", "Withered Wand", "Rattling Sceptre"]) {
      expect(names).toContain(starter);
    }
    expect(currencies().length).toBeGreaterThan(0);
  });
});
