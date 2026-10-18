import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { generateGear } from "../../loot/items";
import { createStreams, streamRng } from "../../sim/rng";
import { HeroCard } from "./HeroCard";
import { ItemCard, itemName } from "./ItemCard";
import { currencies, mods } from "../../data";
import { newHero, type Card } from "../../heroes/model/hero";
import { starterCard } from "../../heroes/model/starter";
import { id } from "../../types/ids";
import { affixHeader, affixLines, modTier } from "./affixes";
import { cardSummary } from "./summary";
import { buildOrbAtlas, drawOrb } from "./orbs";

afterEach(cleanup);

const mod = (modId: string) => mods().find((m) => m.id === modId)!;

describe("affix lines (Appendix C, H §4.4)", () => {
  test("a single stat reads as its PoE2 line; Alt adds the range", () => {
    const life = mods().find(
      (m) =>
        m.stats.length === 1 &&
        m.stats[0]!.id === "base_maximum_life" &&
        m.stats[0]!.min !== m.stats[0]!.max,
    )!;
    const s = life.stats[0]!;
    expect(affixLines(life.stats, [s.min], false)).toEqual([`+${s.min} to maximum Life`]);
    expect(affixLines(life.stats, [s.min], true)).toEqual([
      `+${s.min}(${s.min}-${s.max}) to maximum Life`,
    ]);
  });

  test("an added-damage pair reads as one Adds line", () => {
    const cold = mod("AddedColdDamage1");
    expect(affixLines(cold.stats, [1, 3], false)).toEqual(["Adds 1 to 3 Cold Damage"]);
    expect(affixLines(cold.stats, [1, 3], true)).toEqual(["Adds 1 to 3(2-3) Cold Damage"]);
  });

  test("tiers count up from the weakest of the family, shown in the Alt header", () => {
    const family = mods().filter(
      (m) => m.type === "ColdResistance" && m.generationType === "suffix",
    );
    const weakest = [...family].sort((a, b) => a.requiredLevel - b.requiredLevel)[0]!;
    expect(modTier(weakest)).toBe(1);
    expect(affixHeader(weakest)).toBe(`Suffix Modifier "${weakest.name}" (Tier: 1)`);
    if (family.length > 1) {
      const strongest = [...family].sort((a, b) => b.requiredLevel - a.requiredLevel)[0]!;
      expect(modTier(strongest)).toBe(family.length);
    }
  });

  test("every M1 mod stat has line text", () => {
    for (const m of mods())
      for (const line of affixLines(
        m.stats,
        m.stats.map((s) => s.min),
        false,
      ))
        expect(line, m.id).not.toMatch(/^[a-z_+%]+: /);
  });
});

describe("card summary (H §4.4, §5.1)", () => {
  const bow = starterCard(id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 5);

  test("a starter bow hero has positive DPS, lightning-led, and EHP of life plus ES", () => {
    const s = cardSummary(bow);
    expect(s.dps).toBeGreaterThan(0);
    expect(s.ehp).toBeGreaterThan(0);
    expect(Object.keys(s.mix)).toContain("lightning");
  });

  test("a higher level raises DPS and EHP; an acolyte has no DPS", () => {
    const low = cardSummary(
      starterCard(id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 1),
    );
    const high = cardSummary(
      starterCard(id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 10),
    );
    expect(high.dps).toBeGreaterThan(low.dps);
    expect(high.ehp).toBeGreaterThan(low.ehp);
    const acolyte: Card = {
      hero: newHero("a", id<"Gem">("MvM/Heroes/EzomyteAcolyte"), 1),
      weapon: null,
      armour: null,
      accessory: null,
    };
    expect(cardSummary(acolyte).dps).toBe(0);
  });

  test("removing the weapon lowers an attacker's DPS", () => {
    expect(cardSummary({ ...bow, weapon: null }).dps).toBeLessThan(cardSummary(bow).dps);
  });
});

describe("currency orbs (H §4.3)", () => {
  /** A recording 2D context: every call succeeds and is counted. */
  function fakeContext() {
    const calls: string[] = [];
    return {
      calls,
      ctx: new Proxy({} as Record<string, unknown>, {
        get(target, key: string) {
          if (key in target) return target[key];
          return (...args: unknown[]) => {
            calls.push(key);
            void args;
          };
        },
        set(target, key: string, value) {
          target[key] = value;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D,
    };
  }

  test("every M1 currency's recipe renders without errors", () => {
    for (const currency of currencies()) {
      const { ctx, calls } = fakeContext();
      expect(() => drawOrb(ctx, currency.id, 0, 0), currency.id).not.toThrow();
      expect(calls.filter((c) => c === "fill").length).toBeGreaterThan(2);
    }
  });

  test("the atlas lays every currency out in one 32 px row", () => {
    const { cells } = buildOrbAtlas(() => null);
    expect(cells.size).toBe(currencies().length);
    expect([...cells.values()].map((c) => c.x)).toEqual(currencies().map((_, i) => i * 32));
  });
});

describe("card components (H §4.1, §5.1)", () => {
  const rng = streamRng(createStreams(5), "loot");
  let n = 0;
  const newId = () => `t-${n++}`;

  test("an item card shows its name, affix lines, and on Alt the tier headers and ranges", () => {
    const item = generateGear({ ilvl: 10, rarity: "rare", itemClass: "Ring", newId }, rng);
    const { container, rerender } = render(<ItemCard item={item} />);
    expect(container.textContent).toContain(itemName(item).name);
    expect(container.textContent).not.toContain("Tier:");
    rerender(<ItemCard item={item} alt />);
    expect(container.textContent).toContain("Tier:");
    expect(container.textContent).toMatch(/\(\d+-\d+\)/);
  });

  test("the Upgrade tag shows only when asked", () => {
    const item = generateGear({ ilvl: 10, rarity: "magic", itemClass: "Bow", newId }, rng);
    expect(render(<ItemCard item={item} upgrade />).queryAllByTestId("upgrade-tag")).toHaveLength(
      1,
    );
    cleanup();
    expect(render(<ItemCard item={item} />).queryAllByTestId("upgrade-tag")).toHaveLength(0);
  });

  test("a hero card shows cost, DPS on this card, EHP and its element strip", () => {
    const card = starterCard(id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 5);
    const view = render(<HeroCard card={card} />);
    expect(view.getByTestId("dps").textContent).toMatch(/DPS on this card: \d/);
    expect(view.getByTestId("ehp").textContent).toMatch(/EHP: \d+/);
    expect(view.getByTestId("element-strip").children.length).toBeGreaterThan(0);
  });
});
