import { describe, expect, test } from "vitest";
import { attackBase, convert, gainAsExtra, scale } from "../../combat/hit";
import { damageMap } from "../../combat/damage";
import { baseItems } from "../../data";
import type { BaseItemData, GemData } from "../../data/types";
import { id } from "../../types/ids";
import { aggregate, attacksPerSecond } from "./aggregate";
import { cardCost, rechargeSeconds } from "./card";
import { HERO_CATALOG, STARTER_HEROES } from "./catalog";
import { canEquip, equip, type ItemInstance } from "./item";
import { gemLevel, statSetAt } from "./levels";
import { newHero, type Card } from "./hero";
import lightningSpear from "./fixtures/lightning-spear.json";

const spearGem = lightningSpear.hero as unknown as GemData;
const wingedSpear = lightningSpear.base as unknown as BaseItemData;
const gems = [spearGem];
const bases = [wingedSpear, ...baseItems()];

function item(base: BaseItemData, mods: ItemInstance["mods"] = []): ItemInstance {
  return {
    id: `item-${base.id}-${mods.length}`,
    baseId: base.id,
    rarity: "normal",
    itemLevel: 1,
    quality: 0,
    mods,
  };
}

function baseNamed(name: string): BaseItemData {
  const base = bases.find((b) => b.name === name);
  if (!base) throw new Error(name);
  return base;
}

describe("gem level (Appendix B §1.5)", () => {
  test.each([
    [1, 1],
    [10, 4],
    [17, 5.75],
    [20, 6.5],
    [30, 8.8],
    [32, 9.2],
  ])("hero level %d is gem level %d", (hero, gem) => {
    expect(gemLevel(hero)).toBeCloseTo(gem, 6);
  });
});

describe("Appendix B §3: level 17 Rare Lightning Spear", () => {
  const card: Card = {
    hero: {
      ...newHero("hero-1", spearGem.id, 17),
      rarity: "rare",
      supports: [
        id<"Gem">("Metadata/Items/Gems/SupportGemPrimalArmamentTwo"),
        id<"Gem">("Metadata/Items/Gems/SupportGemLightningInfusion"),
        id<"Gem">("Metadata/Items/Gems/SupportGemMartialTempo"),
      ],
    },
    weapon: item(wingedSpear),
    armour: null,
    accessory: null,
  };
  const sheet = aggregate(card, { gems, bases });
  const [spearSet, boltSet] = spearGem.skills[0]!.statSets;

  test("gem level, attributes, accuracy and life", () => {
    expect(sheet.gemLevel).toBeCloseTo(5.75);
    expect(sheet.attributes).toEqual({ strength: 7, dexterity: 47, intelligence: 7 });
    expect(sheet.actor.accuracy).toBe(376);
    expect(Math.floor(sheet.actor.maxLife)).toBe(292);
  });

  test("attack damage at gem 5.75 and the skill's conversion", () => {
    expect(statSetAt(spearSet!, sheet.gemLevel).damageMultiplier).toBeCloseTo(165.25);
    expect(statSetAt(boltSet!, sheet.gemLevel).damageMultiplier).toBeCloseTo(113);
    expect(statSetAt(spearSet!, sheet.gemLevel).conversion).toEqual({
      physical: { lightning: 80 },
    });
  });

  test("the final spear hit is 30–55 (4–7 physical, 26–48 lightning)", () => {
    const set = statSetAt(spearSet!, sheet.gemLevel);
    const hit = {
      kind: "attack" as const,
      tags: ["projectile" as const],
      weaponClass: "spear" as const,
      base: attackBase(sheet.weapon!.damage, set.damageMultiplier, sheet.actor.stats),
      baseCrit: sheet.weapon!.critChance,
      conversion: set.conversion,
      more: sheet.more,
    };
    const end = (pick: "min" | "max") => {
      const rolled = damageMap({
        physical: hit.base.physical![pick],
        lightning: hit.base.lightning?.[pick] ?? 0,
      });
      return scale(
        gainAsExtra(convert(rolled, hit.conversion, sheet.actor.stats), sheet.actor.stats),
        hit,
        sheet.actor.stats,
      );
    };
    const low = end("min");
    const high = end("max");
    expect(low.physical).toBeCloseTo(3.97, 1);
    expect(high.physical).toBeCloseTo(7.27, 1);
    expect(low.lightning).toBeCloseTo(26.03, 1);
    expect(high.lightning).toBeCloseTo(47.72, 1);
  });

  test("1.17 attacks per second raw, 5% crit, 175 mana, 7.5 s recharge", () => {
    expect(attacksPerSecond(sheet, spearGem.skills[0]!)).toBeCloseTo(1.17, 2);
    expect(sheet.weapon!.critChance).toBe(5);
    expect(cardCost(card)).toBe(175);
    expect(rechargeSeconds(card.hero.skillId)).toBe(7.5);
  });
});

describe("life (Appendix B §1.4)", () => {
  test("a level 1 squishy with Str 7 has 42 life", () => {
    const card: Card = {
      hero: newHero("h", id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 1),
      weapon: null,
      armour: null,
      accessory: null,
    };
    const sheet = aggregate(card, { bases });
    expect(sheet.attributes.strength).toBe(7);
    expect(sheet.actor.maxLife).toBe(42);
  });
});

describe("starter cards (Appendix B §4)", () => {
  test.each([
    ["MvM/Heroes/EzomyteAcolyte", 50],
    ["Metadata/Items/Gems/SkillGemRollingSlam", 150],
    ["Metadata/Items/Gem/SkillGemArmourPiercingRounds", 100],
    ["Metadata/Items/Gems/SkillGemFallingThunder", 125],
    ["Metadata/Items/Gems/SkillGemLightningArrow", 100],
    ["Metadata/Items/Gems/SkillGemIceStrike", 125],
    ["Metadata/Items/Gems/SkillGemSpark", 125],
    ["Metadata/Items/Gems/SkillGemEarthquake", 150],
    ["Metadata/Items/Gem/SkillGemExplosiveGrenade", 125],
    ["Metadata/Items/Gems/SkillGemComet", 175],
  ])("%s costs %d", (skillId, cost) => {
    expect(STARTER_HEROES).toContain(skillId);
    const card: Card = {
      hero: newHero("h", id<"Gem">(skillId), 1),
      weapon: null,
      armour: null,
      accessory: null,
    };
    expect(cardCost(card)).toBe(cost);
  });

  test("every starter hero has a catalog entry", () => {
    for (const skillId of STARTER_HEROES) expect(HERO_CATALOG[skillId], skillId).toBeDefined();
  });
});

describe("weapon lock and slots (Appendix B §1.3, C §C.1.1)", () => {
  const bowHero = newHero("h", id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 1);
  const spearHero = newHero("h2", spearGem.id, 1);

  test("a weapon of the wrong class is refused", () => {
    expect(canEquip(bowHero, "weapon", baseNamed("Crude Bow"))).toBe(true);
    expect(canEquip(bowHero, "weapon", baseNamed("Makeshift Crossbow"))).toBe(false);
    const card: Card = { hero: bowHero, weapon: null, armour: null, accessory: null };
    expect(equip(card, "weapon", item(baseNamed("Wrapped Quarterstaff")), bases)).toEqual({
      ok: false,
      reason: "wrong-class",
    });
    const equipped = equip(card, "weapon", item(baseNamed("Crude Bow")), bases);
    expect(equipped.ok && equipped.card.weapon?.baseId).toBe(baseNamed("Crude Bow").id);
  });

  test("shields only with a spear or one-hand mace; any hero takes body armour and jewellery", () => {
    const shield = baseNamed("Hardwood Targe");
    expect(canEquip(bowHero, "armour", shield)).toBe(false);
    expect(canEquip(spearHero, "armour", shield)).toBe(true);
    expect(canEquip(bowHero, "armour", baseNamed("Leather Vest"))).toBe(true);
    expect(canEquip(bowHero, "accessory", baseNamed("Iron Ring"))).toBe(true);
    expect(canEquip(bowHero, "accessory", baseNamed("Leather Vest"))).toBe(false);
  });
});

describe("item mods (Appendix C §C.1.7)", () => {
  const lifeRing = item(baseNamed("Iron Ring"), [
    { modId: id<"Mod">("IncreasedLife1"), values: [20] },
  ]);

  test("a global mod on one card's item affects only that card", () => {
    const a: Card = {
      hero: newHero("a", id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 1),
      weapon: null,
      armour: null,
      accessory: lifeRing,
    };
    const b: Card = {
      hero: newHero("b", id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 1),
      weapon: null,
      armour: null,
      accessory: null,
    };
    expect(aggregate(a, { bases }).actor.maxLife).toBe(62);
    expect(aggregate(b, { bases }).actor.maxLife).toBe(42);
  });

  test("local weapon mods fold into the weapon before the hero sees it", () => {
    const bow = item(baseNamed("Crude Bow"), [
      { modId: id<"Mod">("LocalAddedPhysicalDamage1"), values: [2, 4] },
      { modId: id<"Mod">("LocalIncreasedPhysicalDamagePercent1"), values: [50] },
      { modId: id<"Mod">("LocalIncreasedAttackSpeed1"), values: [5] },
    ]);
    const card: Card = {
      hero: newHero("h", id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 1),
      weapon: bow,
      armour: null,
      accessory: null,
    };
    const sheet = aggregate(card, { bases });
    expect(sheet.weapon!.damage.physical).toEqual({ min: 12, max: 19.5 });
    expect(sheet.weapon!.attackTime).toBeCloseTo(833 / 1.05);
    expect(sheet.actor.stats["local_physical_damage_+%"]).toBeUndefined();
  });
});
