import { describe, expect, test } from "vitest";
import { HERO_CATALOG } from "../heroes/model/catalog";
import { generateGear } from "../loot/items";
import { createStreams, streamRng } from "../sim/rng";
import { LOOT_TUNING } from "../tuning/loot";
import { ACCOUNT_TUNING } from "../tuning/progression";
import { id } from "../types/ids";
import { baseItems, currencies, heroGems, mods, spellGems } from ".";
import { uniques } from "./uniques";

/** Phase 2 task 2.1: everything Levels 1–5 can produce resolves in data/. */
describe("Grassland data (plan 2.1)", () => {
  const gems = new Set([...heroGems(), ...spellGems()].map((g) => g.id as string));

  test("every catalog skill resolves, MvM customs aside", () => {
    const missing = Object.keys(HERO_CATALOG).filter(
      (skill) => !skill.startsWith("MvM/") && !gems.has(skill),
    );
    expect(missing).toEqual([]);
  });

  test("the gems 2.9–2.11 implement, and Frost Bomb, are imported", () => {
    for (const skill of [
      "Metadata/Items/Gems/SkillGemArmourBreaker",
      "Metadata/Items/Gems/SkillGemBoneshatter",
      "Metadata/Items/Gem/SkillGemFangsOfFrost",
      "Metadata/Items/Gem/SkillGemExplosiveSpear",
      "Metadata/Items/Gem/SkillGemPermafrostBolts",
      "Metadata/Items/Gem/SkillGemFireball",
      "Metadata/Items/Gems/SkillGemFlameWall",
      "Metadata/Items/Gems/SkillGemIceNova",
      "Metadata/Items/Gems/SkillGemEssenceDrain",
      "Metadata/Items/Gems/SkillGemFrostBomb",
    ])
      expect(gems, skill).toContain(skill);
  });

  test("every currency the drop table, crafting and salvage name resolves", () => {
    const ids = new Set(currencies().map((c) => c.id as string));
    const named = [
      ...LOOT_TUNING.currencies.map((c) => c.id).filter((c) => !c.startsWith("MvM/")),
      "Metadata/Items/Currency/CurrencyUpgradeToMagicShard",
      "Metadata/Items/Currency/CurrencyUpgradeMagicToRareShard",
    ];
    for (const currency of named) expect(ids, currency).toContain(currency);
    for (const reward of Object.values(ACCOUNT_TUNING.firstClearRewards))
      for (const currency of Object.keys(
        (reward as { currency?: Record<string, number> }).currency ?? {},
      ))
        expect(ids, currency).toContain(currency);
  });

  test("the Bloated Miller's unique pool (C §C.4.1, L5) can drop at boss item level 8", () => {
    const pool = ["Mist Whisper", "Splinter of Lorrata", "The Blood Thorn", "Sanguine Diviner", "Enfolding Dawn", "Bramblejack"];
    for (const name of pool) {
      const unique = uniques().find((u) => u.name === name);
      expect(unique, name).toBeDefined();
      const base = baseItems().find((b) => b.id === unique!.baseId);
      expect(base, name).toBeDefined();
      expect(base!.dropLevel, name).toBeLessThanOrEqual(8);
    }
  });

  test("an item rolled at area level 8 draws only mods its item level allows", () => {
    const rng = streamRng(createStreams(8), "loot");
    const byId = new Map(mods().map((m) => [m.id as string, m]));
    for (let i = 0; i < 2000; i++) {
      const item = generateGear({ ilvl: 8, rarity: "rare", newId: () => id<"Item">(`al8-${i}`) }, rng);
      for (const m of item.mods) expect(byId.get(m.modId)!.requiredLevel).toBeLessThanOrEqual(8);
    }
  });
});
