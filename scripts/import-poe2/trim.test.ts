import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { trim, type IdLists, type RepoeSource } from "./trim";

const sampleDir = join(import.meta.dirname, "sample");
const read = (name: string): unknown =>
  JSON.parse(readFileSync(join(sampleDir, `${name}.json`), "utf8"));

const source: RepoeSource = {
  skillGems: read("skill_gems"),
  skills: read("skills"),
  baseItems: read("base_items"),
  mods: read("mods"),
  uniques: read("uniques"),
  defaultMonsterStats: read("default_monster_stats"),
};

const ids: IdLists = {
  heroes: ["Metadata/Items/Gems/SkillGemRollingSlam"],
  spells: [],
  supports: ["SupportGemBrutality"],
  bases: ["FourBow1", "FourBow5", "FourSceptre1"],
  mods: [
    "LocalAddedFireDamage1",
    "LocalAddedFireDamage3",
    "LocalLightRadiusAndAccuracy1",
    "LocalIncreasedSpiritPercent1",
  ],
  modTypes: ["ReducedBleedDuration"],
  uniques: [
    { id: "FourUniqueCrossbow1", base: "FourCrossbow1", mods: ["UniqueLocalAddedColdDamage4"] },
  ],
  currency: ["Metadata/Items/Currency/CurrencyUpgradeToMagic"],
};

const out = trim(source, ids, { maxItemLevel: 10, maxGemLevel: 10 });

describe("trim over the checked-in RePoE sample", () => {
  test("heroes keep the gem fields MvM reads and the granted skill up to gem level 10", () => {
    expect(out["heroes.json"]).toHaveLength(1);
    const [hero] = out["heroes.json"];
    expect(hero).toMatchObject({
      id: "Metadata/Items/Gems/SkillGemRollingSlam",
      name: "Rolling Slam",
      gemType: "active",
      craftingLevel: 1,
      craftingTypes: ["Mace"],
      requirementWeights: { strength: 100, dexterity: 0, intelligence: 0 },
    });
    const [skill] = hero!.skills;
    expect(skill!.id).toBe("RollingSlamPlayer");
    expect(Object.keys(skill!.perLevel)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
    ]);
    expect(Object.keys(skill!.statSets[0]!.perLevel)).toHaveLength(10);
    expect(JSON.stringify(skill)).not.toContain("stat_text");
  });

  test("supports resolve by gem suffix and keep their allowed types", () => {
    const [support] = out["supports.json"];
    expect(support!.id).toBe("Metadata/Items/Gems/SupportGemBrutality");
    expect(support!.skills[0]!.supportGem).toMatchObject({
      allowed_types: ["Damage", "Attack", "DamageOverTime", "CrossbowAmmoSkill"],
    });
  });

  test("bases above the item level cap are dropped", () => {
    expect(out["bases.json"].map((b) => b.name)).toEqual(["Crude Bow", "Rattling Sceptre"]);
    expect(out["bases.json"][0]!.properties).toEqual({
      attack_time: 833,
      critical_strike_chance: 500,
      physical_damage_max: 9,
      physical_damage_min: 6,
      range: 120,
    });
  });

  test("mods are filtered by item level and mapped to the vocabulary", () => {
    expect(out["mods.json"].map((m) => m.id)).toEqual([
      "LocalAddedFireDamage1",
      "LocalIncreasedSpiritPercent1",
      "LocalLightRadiusAndAccuracy1",
    ]);
    const fire = out["mods.json"][0]!;
    expect(fire.mvmStats).toEqual([
      { stat: "local_added_fire_damage", part: "min", min: 1, max: 2 },
      { stat: "local_added_fire_damage", part: "max", min: 3, max: 5 },
    ]);
    const light = out["mods.json"][2]!;
    expect(light.stats.map((s) => s.id)).toContain("light_radius_+%");
    expect(light.mvmStats.map((s) => s.stat)).toEqual(["local_accuracy_rating"]);
  });

  test("a raised item level cap admits higher tiers and mod types, with unit conversion", () => {
    const all = trim(source, ids, { maxItemLevel: 40, maxGemLevel: 10 });
    const bleed = all["mods.json"].find((m) => m.id === "ReducedBleedDuration1")!;
    expect(bleed.mvmStats).toEqual([{ stat: "self_ailment_duration_-%", min: 36, max: 40 }]);
    expect(all["mods.json"].map((m) => m.id)).toContain("LocalAddedFireDamage3");
  });

  test("uniques, currency and monster stats", () => {
    expect(out["uniques.json"]).toEqual([
      expect.objectContaining({
        id: "Mist Whisper",
        visualId: "FourUniqueCrossbow1",
        baseId: "Metadata/Items/Weapons/TwoHandWeapons/Crossbows/FourCrossbow1",
        mods: [{ id: "UniqueLocalAddedColdDamage4", stats: expect.any(Array) }],
      }),
    ]);
    expect(out["currency.json"]).toEqual([
      expect.objectContaining({
        id: "Metadata/Items/Currency/CurrencyUpgradeToMagic",
        dropLevel: 1,
      }),
    ]);
    expect(out["monster-stats.json"][0]).toMatchObject({
      level: 1,
      life: 15,
      armour: 3,
      accuracy: 32,
    });
  });

  test("an unmapped PoE2 stat on a selected mod fails the import", () => {
    const broken = structuredClone(source) as { mods: Record<string, { stats: { id: string }[] }> };
    broken.mods["LocalAddedFireDamage1"]!.stats[0]!.id = "made_up_stat";
    expect(() => trim(broken as RepoeSource, ids, { maxItemLevel: 10, maxGemLevel: 10 })).toThrow(
      /made_up_stat/,
    );
  });

  test("trimming is deterministic", () => {
    expect(JSON.stringify(trim(source, ids, { maxItemLevel: 10, maxGemLevel: 10 }))).toBe(
      JSON.stringify(out),
    );
  });
});
