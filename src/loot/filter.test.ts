import { describe, expect, test } from "vitest";
import { ACCOUNT_SECTION } from "../account/sections";
import { applyStep, beginLevel, finishLevel, newAccount } from "../account/lifecycle";
import type { ModData } from "../data/types";
import type { ItemInstance } from "../heroes/model/item";
import { LEVEL_1 } from "../monsters/levels/level-1";
import { step } from "../sim/kernel";
import { POLICIES } from "../sim/policies/policies";
import { STEPS_PER_SECOND } from "../sim/time";
import { id } from "../types/ids";
import accountV1 from "../save/fixtures/account/v1.json";
import { SHARDS } from "./craft/heroes";
import { affixRank, isHidden } from "./filter";
import { itemSellPrice } from "./prices";

/** A family's tiers by required level, as C §C.7's examples list them. */
const tier = (
  id: string,
  type: string,
  requiredLevel: number,
  side: "prefix" | "suffix" = "prefix",
) =>
  ({
    id,
    type,
    generationType: side,
    requiredLevel,
    groups: [type],
    name: id,
    spawnWeights: [],
    stats: [],
    mvmStats: [],
  }) as unknown as ModData;
const CATALOG = [
  tier("LocalIncreasedPhysicalDamagePercent1", "LocalPhysicalDamagePercent", 1),
  tier("LocalIncreasedPhysicalDamagePercent2", "LocalPhysicalDamagePercent", 8),
  tier("LocalIncreasedPhysicalDamagePercent3", "LocalPhysicalDamagePercent", 16),
  tier("LocalIncreasedPhysicalDamagePercent4", "LocalPhysicalDamagePercent", 33),
  tier("Strength1", "Strength", 1, "suffix"),
  tier("Strength2", "Strength", 11, "suffix"),
  tier("IncreasedLife1", "IncreasedLife", 1),
];
const magic = (ilvl: number, ...modIds: string[]): ItemInstance => ({
  id: id<"Item">("x"),
  baseId: "b" as never,
  rarity: "magic",
  itemLevel: ilvl,
  quality: 0,
  mods: modIds.map((m) => ({ modId: m as never, values: [] })),
});

describe("the loot filter (Appendix C §C.7)", () => {
  test("C §C.7's worked examples", () => {
    // ilvl 20 magic spear "Heavy": tiers rl 1/8/16 unlocked, so Heavy is rank 3: hidden by preset 3.
    expect(affixRank(CATALOG[0]!, 20, CATALOG)).toBe(3);
    expect(
      isHidden(magic(20, "LocalIncreasedPhysicalDamagePercent1"), "hideLowMagic", CATALOG),
    ).toBe(true);
    // "Serrated … of the Brute": Serrated (rl 8) rank 2, Strength1 rank 2 at ilvl 20: shown.
    expect(
      isHidden(
        magic(20, "LocalIncreasedPhysicalDamagePercent2", "Strength1"),
        "hideLowMagic",
        CATALOG,
      ),
    ).toBe(false);
    // ilvl 4 magic ring "Hale": its only unlocked tier is rank 1: shown.
    expect(isHidden(magic(4, "IncreasedLife1"), "hideLowMagic", CATALOG)).toBe(false);
  });

  test("presets: Normal hidden by 2 and 3; low-tier Magic only by 3; never rares, uniques or anything at Show all", () => {
    const normal = { ...magic(20), rarity: "normal" as const };
    const low = magic(20, "LocalIncreasedPhysicalDamagePercent1");
    expect([
      isHidden(normal, "showAll"),
      isHidden(normal, "hideNormal"),
      isHidden(normal, "hideLowMagic"),
    ]).toEqual([false, true, true]);
    expect([
      isHidden(low, "showAll", CATALOG),
      isHidden(low, "hideNormal", CATALOG),
      isHidden(low, "hideLowMagic", CATALOG),
    ]).toEqual([false, false, true]);
    for (const rarity of ["rare", "unique"] as const)
      expect(isHidden({ ...low, rarity }, "hideLowMagic", CATALOG)).toBe(false);
  });

  test("hidden drops convert at level end, won or lost: Normal into its sell value, low-tier Magic into a Transmutation Shard", () => {
    for (const result of ["won", "lost"] as const) {
      const account = newAccount("ranger");
      account.lootFilter = "hideNormal";
      const round = beginLevel(account, LEVEL_1, 3);
      while (
        !round.earned.some((e) => e.drop.kind === "item" && e.drop.hidden) &&
        round.tick < 400 * STEPS_PER_SECOND
      )
        applyStep(account, round, step(round, POLICIES.pvzOpener!(round)));
      const hidden = round.earned.flatMap((e) =>
        e.drop.kind === "item" && e.drop.hidden ? [e.drop.item] : [],
      );
      expect(hidden.length).toBeGreaterThan(0);
      for (const item of hidden)
        expect(account.stash.items.some((i) => i.id === item.id)).toBe(false);
      const gold = account.gold;
      round.result = result;
      const summary = finishLevel(account, round);
      // The level end lists only what reached the stash; hidden drops aren't loot cards.
      for (const item of hidden)
        expect(
          summary.drops.some((d) => d.drop.kind === "item" && d.drop.item.id === item.id),
        ).toBe(false);
      const value = hidden.reduce((sum, item) => sum + itemSellPrice(item), 0);
      expect(account.gold - gold).toBeCloseTo(value);
    }
    const account = newAccount("ranger");
    account.lootFilter = "hideLowMagic";
    const round = beginLevel(account, LEVEL_1, 4);
    round.earned.push({
      dropId: "d",
      monsterId: "m" as never,
      tick: 0,
      drop: { kind: "item", item: magic(20, "Heavy"), hidden: true },
    });
    round.result = "won";
    finishLevel(account, round);
    expect(account.currency[SHARDS.transmutation]).toBe(1);
  });

  test("a v1 account loads with Show all", () => {
    const report: string[] = [];
    const account = ACCOUNT_SECTION.normalize(structuredClone(accountV1.data), (l) =>
      report.push(l),
    );
    expect(account.lootFilter).toBe("showAll");
  });
});
