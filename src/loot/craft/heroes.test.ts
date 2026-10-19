import { describe, expect, test } from "vitest";
import { newAccount } from "../../account/lifecycle";
import { conflicts, supportInfo } from "../../heroes/gen/supports";
import { newHero, type HeroInstance } from "../../heroes/model/hero";
import type { ItemInstance } from "../../heroes/model/item";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { generateGear } from "../items";
import { applyJeweller, craftHero, HERO_ORBS, mergeShards, salvage, SHARDS } from "./heroes";

const LIGHTNING_ARROW = "Metadata/Items/Gems/SkillGemLightningArrow";
const rng = (seed = 3) => streamRng(createStreams(seed), "loot");
let n = 0;
const hero = (level = 10, supports: string[] = []): HeroInstance => ({
  ...newHero(id<"OwnedHero">(`h-${n++}`), id<"Gem">(LIGHTNING_ARROW), level),
  supports: supports as never,
  rarity: supports.length === 0 ? "normal" : supports.length <= 2 ? "magic" : "rare",
});
const item = (rarity: ItemInstance["rarity"], seed = 1): ItemInstance =>
  generateGear(
    { ilvl: 10, rarity, itemClass: "Ring", newId: () => id<"Item">(`i-${n++}`) },
    rng(seed),
  );

describe("hero crafting: the Lesser Jeweller's Orb (Appendix C §C.5.4)", () => {
  test("adds one compatible support up to 3, then refuses", () => {
    let h = hero();
    for (let i = 1; i <= 3; i++) {
      const result = applyJeweller(h, "lesser", rng(i));
      expect(result.ok, `step ${i}`).toBe(true);
      if (!result.ok) return;
      h = result.hero;
      expect(h.supports).toHaveLength(i);
    }
    expect(applyJeweller(h, "lesser", rng())).toEqual({ ok: false, reason: "full" });
  });

  test("never a duplicate or two tiers of one family, and tiers respect the hero's level", () => {
    for (let seed = 1; seed <= 40; seed++) {
      let h = hero(5);
      for (let i = 0; i < 3; i++) {
        const r = applyJeweller(h, "lesser", rng(seed * 10 + i));
        if (r.ok) h = r.hero;
      }
      for (const [i, a] of h.supports.entries()) {
        expect(supportInfo(a).minLevel).toBeLessThanOrEqual(5);
        for (const b of h.supports.slice(i + 1)) expect(conflicts(a, b), `${a} ${b}`).toBe(false);
      }
    }
  });

  test("rarity follows the support count: 0 normal, 1–2 magic, 3 rare", () => {
    let h = hero();
    const rarities: string[] = [h.rarity];
    for (let i = 0; i < 3; i++) {
      const r = applyJeweller(h, "lesser", rng(i + 5));
      if (r.ok) h = r.hero;
      rarities.push(h.rarity);
    }
    expect(rarities).toEqual(["normal", "magic", "magic", "rare"]);
  });

  test("the account spends the orb only on success, for stash and roster heroes", () => {
    const account = newAccount("ranger");
    account.currency[HERO_ORBS.lesser] = 1;
    const card = account.roster.slots.find((c) => c?.hero.skillId === LIGHTNING_ARROW)!;
    expect(craftHero(account, "lesser", card.hero.id).ok).toBe(true);
    expect(card.hero.supports).toHaveLength(1);
    expect(account.currency[HERO_ORBS.lesser]).toBe(0);
    expect(craftHero(account, "lesser", card.hero.id)).toEqual({ ok: false, reason: "no-orb" });
  });
});

describe("salvage into shards (Appendix C §C.5.6)", () => {
  test.each([
    ["magic", SHARDS.transmutation, 1],
    ["rare", SHARDS.regal, 1],
    ["unique", SHARDS.regal, 4],
  ] as const)("a %s item gives %s ×%i", (rarity, shard, count) => {
    const account = newAccount("ranger");
    const it = item(rarity, 2);
    if (rarity === "rare") it.mods = it.mods.slice(0, 4);
    account.stash.items.push(it);
    expect(salvage(account, { kind: "item", id: it.id })).toEqual({ ok: true });
    expect(account.currency[shard]).toBe(count);
    expect(account.stash.items.some((i) => i.id === it.id)).toBe(false);
  });

  test("a 6-mod rare gives 2 Regal Shards; a normal item is refused (sell it instead)", () => {
    const account = newAccount("ranger");
    const six = {
      ...item("rare", 3),
      mods: Array.from({ length: 6 }, (_, i) => ({ modId: `m${i}` as never, values: [] })),
    };
    const normal = item("normal");
    account.stash.items.push(six, normal);
    salvage(account, { kind: "item", id: six.id });
    expect(account.currency[SHARDS.regal]).toBe(2);
    expect(salvage(account, { kind: "item", id: normal.id })).toEqual({
      ok: false,
      reason: "normal",
    });
    expect(account.stash.items).toContainEqual(normal);
  });

  test.each([
    [1, 1],
    [3, 3],
    [4, 4],
  ])("a hero with %i supports gives %i Jeweller's Shards", (supports, shards) => {
    const account = newAccount("ranger");
    const h = hero(
      10,
      ["a", "b", "c", "d"].slice(0, supports).map((s) => `Support${s}`),
    );
    account.stash.heroes.push(h);
    expect(salvage(account, { kind: "hero", id: h.id })).toEqual({ ok: true });
    expect(account.currency[SHARDS.jeweller]).toBe(shards);
  });

  test("equipped items and roster heroes can't be salvaged; a normal hero is refused", () => {
    const account = newAccount("ranger");
    const card = account.roster.slots.find((c) => c?.weapon)!;
    expect(salvage(account, { kind: "item", id: card.weapon!.id })).toEqual({
      ok: false,
      reason: "not-in-stash",
    });
    const normal = hero();
    account.stash.heroes.push(normal);
    expect(salvage(account, { kind: "hero", id: normal.id })).toEqual({
      ok: false,
      reason: "normal",
    });
  });

  test("10 shards merge into their orb automatically", () => {
    const account = newAccount("ranger");
    account.currency[SHARDS.transmutation] = 23;
    account.currency[SHARDS.jeweller] = 10;
    mergeShards(account);
    expect(account.currency[SHARDS.transmutation]).toBe(3);
    expect(account.currency["Metadata/Items/Currency/CurrencyUpgradeToMagic"]).toBe(2);
    expect(account.currency[SHARDS.jeweller]).toBe(0);
    expect(account.currency[HERO_ORBS.lesser]).toBe(1);
    // Salvage merges as it goes.
    const it = item("magic", 9);
    account.currency[SHARDS.transmutation] = 9;
    account.stash.items.push(it);
    salvage(account, { kind: "item", id: it.id });
    expect(account.currency[SHARDS.transmutation]).toBe(0);
    expect(account.currency["Metadata/Items/Currency/CurrencyUpgradeToMagic"]).toBe(3);
  });
});
