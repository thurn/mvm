import { describe, expect, test } from "vitest";
import { STAT_MAP } from "./stat-map";
import { TEAM_MODS, teamStatOf } from "./team";
import { baseItems, currencies, heroGems, mods, monsterLevelStats, spellGems, supportGems } from ".";

describe("M1 data accessors", () => {
  test("the six PoE2 starter heroes of Appendix B §4 are present", () => {
    expect(heroGems().map((h) => h.name)).toEqual(
      expect.arrayContaining([
        "Armour Piercing Rounds",
        "Falling Thunder",
        "Ice Strike",
        "Lightning Arrow",
        "Rolling Slam",
        "Spark",
      ]),
    );
  });

  test("the three starter spells are present", () => {
    expect(spellGems().map((s) => s.name)).toEqual(
      expect.arrayContaining(["Comet", "Earthquake", "Explosive Grenade"]),
    );
  });

  test("level 1 monster life is 15 (Appendix A §1.3)", () => {
    expect(monsterLevelStats(1).life).toBe(15);
    expect(() => monsterLevelStats(0)).toThrow();
  });

  const imported = () => mods().filter((m) => !TEAM_MODS.includes(m));

  test("every imported mod maps to at least one vocabulary stat, and every team mod to a team stat", () => {
    expect(imported().length).toBeGreaterThan(0);
    for (const mod of imported()) {
      expect(mod.mvmStats.length, mod.id).toBeGreaterThan(0);
      for (const stat of mod.stats) expect(STAT_MAP, `${mod.id} ${stat.id}`).toHaveProperty([stat.id]);
    }
    for (const mod of TEAM_MODS) for (const stat of mod.stats) expect(teamStatOf(stat.id), mod.id).not.toBeNull();
  });

  test("the PoE2 import stays within M1's item level 10", () => {
    for (const mod of imported()) expect(mod.requiredLevel).toBeLessThanOrEqual(10);
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
