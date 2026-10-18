import { describe, expect, test } from "vitest";
import type { Drop } from "../../loot/drops";
import { LOOT_JUICE } from "../../tuning/juice";
import { bounceAt, LootLadder, lootClass, lootKeyframes, lootSpec, stagger } from "./timeline";

const item = (rarity: "normal" | "magic" | "rare" | "unique"): Drop =>
  ({
    kind: "item",
    item: { id: "i", baseId: "b", rarity, itemLevel: 1, quality: 0, mods: [] },
  }) as unknown as Drop;
const currency = (suffix: string): Drop =>
  ({ kind: "currency", currencyId: `Metadata/Items/Currency/${suffix}` }) as Drop;

describe("drop timeline (H §3.1–§3.2)", () => {
  test.each([
    ["normal", 1200],
    ["magic", 1600],
    ["rare", 2500],
    ["unique", 4000],
  ] as const)(
    "a %s item lands at 350, beams up by 500, holds %d ms, and is collected 400 ms later",
    (rarity, hold) => {
      const k = lootKeyframes(lootClass(item(rarity) as never));
      expect(k).toEqual({ land: 350, beamUp: 500, holdEnd: 500 + hold, collected: 900 + hold });
    },
  );

  test("the hold scales with lootHoldScale", () => {
    expect(lootKeyframes("rare", 2).holdEnd).toBe(500 + 5000);
  });

  test("currency, hero and spell drops use their rows", () => {
    expect(lootClass(currency("CurrencyUpgradeToMagic") as never)).toBe("currencyLow");
    expect(lootClass(currency("CurrencyRerollRare") as never)).toBe("currencyMid");
    expect(lootClass(currency("CurrencyModValues") as never)).toBe("currencyTop");
    expect(lootClass({ kind: "hero", rarity: "magic", itemLevel: 3 })).toBe("hero");
    expect(lootSpec("currencyTop").beam!.heightPx).toBe(160);
    expect(lootSpec("hero").tier).toBe(4);
    expect(lootSpec("unique").tier).toBe(5);
  });

  test("beam heights follow G §1.4: normal 32, magic 48, rare 96, unique 160", () => {
    expect(
      ["normal", "magic", "rare", "unique"].map((r) => lootSpec(r as never).beam!.heightPx),
    ).toEqual([32, 48, 96, 160]);
  });

  test("lands with two bounces, 6 px then 2 px, 80 ms each", () => {
    expect(bounceAt(40)).toBeCloseTo(-6);
    expect(bounceAt(120)).toBeCloseTo(-2);
    expect(bounceAt(161)).toBe(0);
  });
});

describe("stagger (H §3.1)", () => {
  test("multiple drops land 70 ms apart in ascending rarity, the best last", () => {
    const drops = [item("unique"), item("normal"), currency("CurrencyRerollRare"), item("magic")];
    const order = stagger(drops, (d) => lootClass(d as never));
    expect(order.map((o) => lootClass(o.drop as never))).toEqual([
      "normal",
      "magic",
      "currencyMid",
      "unique",
    ]);
    expect(order.map((o) => o.delay)).toEqual([0, 70, 140, 210]);
  });
});

describe("loot ladder (H §3.4)", () => {
  test("drops within 1.5 s climb the pentatonic table to +5 steps, then reset after silence", () => {
    const ladder = new LootLadder();
    const shifts = [0, 500, 1000, 1500, 2000, 2500, 3000].map((t) => ladder.next(t));
    expect(shifts).toEqual([0, 2, 4, 7, 9, 12, 12]);
    expect(ladder.next(3000 + LOOT_JUICE.ladderWindowMs + 1)).toBe(0);
  });
});
