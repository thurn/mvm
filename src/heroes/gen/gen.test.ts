import { describe, expect, test } from "vitest";
import { createStreams, streamRng } from "../../sim/rng";
import { HERO_GEN_TUNING } from "../../tuning/heroes";
import { STARTER_HEROES } from "../model/catalog";
import {
  chooseOneOfThree,
  generateHero,
  generateSpell,
  heroPool,
  rollLevel,
  rollRarity,
  sharesRosterTags,
  spellPool,
  supportCount,
  unlockAreaLevel,
} from "./generate";
import {
  conflicts,
  evaluateTypes,
  isCompatible,
  rollSupports,
  skillTypes,
  supportInfo,
} from "./supports";

const rngFor = (seed: number) => streamRng(createStreams(seed), "heroGen");

describe("support types (B §1.10 step 2)", () => {
  test("RPN with AND, OR, NOT; leftovers are OR-ed", () => {
    const types = new Set(["Attack", "Bow"]);
    expect(evaluateTypes(["Attack", "Bow", "AND"], types)).toBe(true);
    expect(evaluateTypes(["Spell", "Bow", "AND"], types)).toBe(false);
    expect(evaluateTypes(["Spell", "Attack"], types)).toBe(true);
    expect(evaluateTypes(["Persistent", "NOT", "Attack", "AND"], types)).toBe(true);
  });

  test("crossbow heroes use the union of their shot and ammo skills", () => {
    const types = skillTypes("Metadata/Items/Gem/SkillGemArmourPiercingRounds");
    expect(types.has("CrossbowAmmoSkill")).toBe(true);
    expect(types.has("Projectile")).toBe(true);
  });

  test("acolytes use the MvM types", () => {
    expect([...skillTypes("MvM/Heroes/EzomyteAcolyte")]).toEqual(HERO_GEN_TUNING.acolyteTypes);
  });
});

describe("support roll (B §1.10)", () => {
  const heroes = heroPool();

  test("never yields an incompatible, duplicate, same-family or conflicting support (property)", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = rngFor(seed);
      const skillId = heroes[seed % heroes.length]!;
      const level = 1 + Math.floor(rng() * 32);
      const supports = rollSupports(skillId, level, 1 + Math.floor(rng() * 5), rng);
      expect(new Set(supports).size, `${skillId} ${level}`).toBe(supports.length);
      const families = supports.map((id) => supportInfo(id).family);
      expect(new Set(families).size).toBe(families.length);
      for (const id of supports) {
        expect(isCompatible(id, skillId), `${id} on ${skillId}`).toBe(true);
        for (const other of supports) if (other !== id) expect(conflicts(id, other)).toBe(false);
      }
    }
  });

  test("a support's tier never exceeds its level gate", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = rngFor(seed);
      const level = 1 + (seed % 30);
      for (const id of rollSupports(heroes[seed % heroes.length]!, level, 4, rng))
        expect(supportInfo(id).minLevel).toBeLessThanOrEqual(level);
    }
  });

  test("recommended supports are about 3× as likely as the rest", () => {
    const skillId = "Metadata/Items/Gems/SkillGemRollingSlam";
    const counts = new Map<string, number>();
    for (let seed = 1; seed <= 3000; seed++)
      for (const id of rollSupports(skillId, 30, 1, rngFor(seed)))
        counts.set(id, (counts.get(id) ?? 0) + 1);
    const recommended = counts.get("Metadata/Items/Gem/SupportGemBrink") ?? 0;
    const plain = counts.get("Metadata/Items/Gem/SupportGemSwiftAffliction") ?? 0;
    expect(plain).toBeGreaterThan(0);
    expect(recommended / plain).toBeGreaterThan(2);
    expect(recommended / plain).toBeLessThan(4.5);
  });

  test("dead rolls are excluded: no Longshot on melee, no Close Combat at range", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const melee = rollSupports("Metadata/Items/Gems/SkillGemRollingSlam", 30, 4, rngFor(seed));
      expect(melee.map((id) => supportInfo(id).family)).not.toContain("Longshot");
      const ranged = rollSupports(
        "Metadata/Items/Gems/SkillGemLightningArrow",
        30,
        4,
        rngFor(seed),
      );
      expect(ranged.map((id) => supportInfo(id).family)).not.toContain("Close Combat");
    }
  });
});

describe("rarity and levels (B §1.9, §7.2–§7.3)", () => {
  test("rarity gives the right support count", () => {
    const seen = { normal: new Set<number>(), magic: new Set<number>(), rare: new Set<number>() };
    for (let seed = 1; seed <= 400; seed++)
      for (const rarity of ["normal", "magic", "rare"] as const)
        seen[rarity].add(supportCount(rarity, rngFor(seed)));
    expect([...seen.normal].sort()).toEqual([0]);
    expect([...seen.magic].sort()).toEqual([1, 2]);
    expect([...seen.rare].sort()).toEqual([3, 4]);
  });

  test("generated heroes carry as many supports as their rarity says, or drop rarity to match", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const hero = generateHero({
        areaLevel: 1 + (seed % 10),
        highestUnlocked: 10,
        rarityBonus: 6,
        roster: [],
        rng: rngFor(seed),
        id: `h${seed}`,
      });
      const n = hero.supports.length;
      expect(hero.rarity).toBe(n === 0 ? "normal" : n <= 2 ? "magic" : "rare");
      expect(hero.level).toBeGreaterThanOrEqual(1);
    }
  });

  test("a normal monster's rarity odds are 76 / 20 / 4", () => {
    const counts = { normal: 0, magic: 0, rare: 0 };
    for (let seed = 1; seed <= 4000; seed++) counts[rollRarity(0, rngFor(seed))]++;
    expect(counts.normal / 4000).toBeCloseTo(0.76, 1);
    expect(counts.rare / 4000).toBeCloseTo(0.036, 1);
  });

  test("the level roll stays within 1 and the unlocked headroom", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const level = rollLevel(1, 3, rngFor(seed));
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(2);
      const high = rollLevel(10, 10, rngFor(seed));
      expect(high).toBeGreaterThanOrEqual(8);
      expect(high).toBeLessThanOrEqual(11);
    }
  });
});

describe("skill choice (B §1.8, §7.4)", () => {
  test("the unlock gate compresses gem tiers", () => {
    expect(unlockAreaLevel("Metadata/Items/Gems/SkillGemRollingSlam")).toBe(1);
    expect(unlockAreaLevel("Metadata/Items/Gems/SkillGemIceStrike")).toBe(7);
    expect(unlockAreaLevel("Metadata/Items/Gems/SkillGemComet")).toBe(19);
    expect(unlockAreaLevel("MvM/Heroes/EzomyteAcolyte")).toBe(1);
  });

  test("drops never pick a skill above the area's unlock level", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const hero = generateHero({
        areaLevel: 3,
        highestUnlocked: 3,
        rarityBonus: 0,
        roster: [],
        rng: rngFor(seed),
        id: "h",
      });
      expect(unlockAreaLevel(hero.skillId)).toBeLessThanOrEqual(3);
      const spell = generateSpell({
        areaLevel: 3,
        highestUnlocked: 3,
        rarityBonus: 0,
        rng: rngFor(seed),
        id: "s",
      });
      expect(unlockAreaLevel(spell.skillId)).toBeLessThanOrEqual(3);
    }
  });

  test("spells come from the spell catalog, heroes from the hero catalog", () => {
    expect(spellPool()).toContain("Metadata/Items/Gems/SkillGemEarthquake");
    expect(heroPool()).not.toContain("Metadata/Items/Gems/SkillGemEarthquake");
  });
});

describe("choose 1 of 3 (E §4.5)", () => {
  test("always contains a roster match, three distinct skills, at the listed rarity and level", () => {
    const rosters = [
      ["Metadata/Items/Gems/SkillGemSpark"],
      ["Metadata/Items/Gems/SkillGemRollingSlam"],
      ["MvM/Heroes/EzomyteAcolyte"],
      STARTER_HEROES.slice(0, 3),
    ];
    for (let seed = 1; seed <= 200; seed++) {
      const roster = rosters[seed % rosters.length]!;
      const offer = chooseOneOfThree({
        kind: "hero",
        rarity: "magic",
        level: 6,
        areaLevel: 4,
        roster,
        rng: rngFor(seed),
        newId: (() => {
          let n = 0;
          return () => `o${n++}`;
        })(),
      });
      expect(offer).toHaveLength(3);
      expect(new Set(offer.map((h) => h.skillId)).size).toBe(3);
      expect(offer.some((h) => sharesRosterTags(h.skillId, roster))).toBe(true);
      for (const hero of offer) {
        expect(hero.level).toBe(6);
        expect(["magic", "normal"]).toContain(hero.rarity);
      }
    }
  });
});
