import { describe, expect, test } from "vitest";
import type { Drop } from "../loot/drops";
import type { SimEvent } from "../sim/events";
import { DEFAULT_SETTINGS } from "./core/settings";
import { cuesFor } from "./cues";
import { fountain } from "./loot/timeline";
import { lootClass } from "./loot/timeline";

const item = (rarity: "normal" | "magic" | "rare" | "unique"): Drop =>
  ({ kind: "item", item: { id: `i-${rarity}`, rarity } }) as unknown as Drop;
const currency: Drop = {
  kind: "currency",
  currencyId: "Metadata/Items/Currency/CurrencyUpgradeToMagic",
};
const hero: Drop = { kind: "hero", rarity: "magic", itemLevel: 6 };

describe("the loot fountain (H §3.9, plan 2.17)", () => {
  test("a scripted burst launches 120 ms apart in ascending rarity, the unique last after 600 ms and highest", () => {
    const burst = [item("unique"), hero, item("rare"), currency, item("normal"), item("magic")];
    const order = fountain(burst, (d) => lootClass(d as Exclude<Drop, { kind: "gold" }>));
    expect(order.map((o) => lootClass(o.drop as Exclude<Drop, { kind: "gold" }>))).toEqual([
      "normal",
      "magic",
      "currencyLow",
      "rare",
      "hero",
      "unique",
    ]);
    expect(order.map((o) => o.delay)).toEqual([0, 120, 240, 360, 480, 480 + 600]);
    const arcs = order.map((o) => o.arcPx);
    expect(arcs.slice(0, -1).every((a) => a >= 30 && a <= 50)).toBe(true);
    expect(arcs.at(-1)).toBe(60);
  });
});

describe("boss cue rows (H §7.5, plan 2.17)", () => {
  const m = "boss-1" as never;
  const tiles = [{ lane: 2, column: 5 }];
  const rows: [SimEvent, number][] = [
    [
      { type: "bossSpawned", monsterId: m, bossId: "BloatedMiller" as never, lanes: [1, 2], x: 9 },
      4,
    ],
    [
      { type: "bossTelegraph", monsterId: m, ability: "grainSlam" as never, tiles, seconds: 1.5 },
      1,
    ],
    [{ type: "bossAbility", monsterId: m, ability: "grainSlam" as never, tiles }, 3],
    [{ type: "bossEnrage", monsterId: m }, 4],
    [{ type: "bossPrimed", monsterId: m }, 2],
  ];
  test.each(rows)("%o has a tier and a sound", (event, tier) => {
    const batch = cuesFor(event, DEFAULT_SETTINGS);
    expect(batch.tier).toBe(tier);
    expect(batch.cues.some((c) => c.kind === "sound")).toBe(true);
  });

  test("Grain Slam throws grain on its tiles; a burst becomes a fountain cue", () => {
    const slam = cuesFor(
      { type: "bossAbility", monsterId: m, ability: "grainSlam" as never, tiles },
      DEFAULT_SETTINGS,
    );
    expect(slam.cues).toContainEqual(
      expect.objectContaining({ kind: "particles", preset: "grain" }),
    );
    const burst = cuesFor(
      { type: "lootBurst", sourceId: "boss-1", dropIds: ["a", "b"], lane: 2, x: 5 },
      DEFAULT_SETTINGS,
    );
    expect(burst.cues).toContainEqual({ kind: "fountain", dropIds: ["a", "b"] });
  });
});
