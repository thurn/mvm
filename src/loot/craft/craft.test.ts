import { describe, expect, test } from "vitest";
import { newAccount } from "../../account/lifecycle";
import { mods } from "../../data";
import type { ItemInstance } from "../../heroes/model/item";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { generateGear } from "../items";
import { applyOrb, craft, ITEM_ORBS, type ItemOrb } from ".";

const modById = new Map(mods().map((m) => [m.id as string, m]));
const kinds = (item: ItemInstance) => {
  const sides = item.mods.map((m) => modById.get(m.modId)!.generationType);
  return {
    prefix: sides.filter((s) => s === "prefix").length,
    suffix: sides.filter((s) => s === "suffix").length,
  };
};

let n = 0;
function gear(rarity: ItemInstance["rarity"], seed = 1, itemClass = "Ring"): ItemInstance {
  return generateGear(
    { ilvl: 10, rarity, itemClass, newId: () => id<"Item">(`craft-${n++}`) },
    streamRng(createStreams(seed), "loot"),
  );
}
const rng = (seed = 3) => streamRng(createStreams(seed), "loot");

describe("item crafting: the orb ladder that drops by area level 6 (Appendix C §C.5.2)", () => {
  test.each([
    ["transmutation", "normal", "magic"],
    ["augmentation", "magic", "magic"],
    ["regal", "magic", "rare"],
    ["exalted", "rare", "rare"],
    ["alchemy", "normal", "rare"],
    ["alchemy", "magic", "rare"],
  ] as const)("%s applies to %s and leaves %s", (orb, from, to) => {
    let item = gear(from, 5);
    if (orb === "augmentation") item = { ...item, mods: item.mods.slice(0, 1) };
    if (orb === "exalted") item = { ...item, mods: item.mods.slice(0, 4) };
    const result = applyOrb(item, orb, rng());
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (result.ok) expect(result.item.rarity).toBe(to);
  });

  test.each([
    ["transmutation", "magic"],
    ["transmutation", "rare"],
    ["augmentation", "normal"],
    ["augmentation", "rare"],
    ["regal", "normal"],
    ["regal", "rare"],
    ["exalted", "magic"],
    ["alchemy", "rare"],
    ["alchemy", "unique"],
  ] as const)("%s refuses a %s item", (orb, rarity) => {
    const result = applyOrb(gear(rarity, 6), orb, rng());
    expect(result).toEqual({ ok: false, reason: "wrong-rarity" });
  });

  test("a corrupted item refuses every orb", () => {
    const item = { ...gear("normal"), corrupted: true };
    for (const orb of Object.keys(ITEM_ORBS) as ItemOrb[])
      expect(applyOrb(item, orb, rng())).toEqual({ ok: false, reason: "corrupted" });
  });

  test("Transmutation makes a 1-mod magic item; Augmentation adds the missing side and then refuses", () => {
    const magic = applyOrb(gear("normal", 7), "transmutation", rng());
    expect(magic.ok && magic.item.mods.length).toBe(1);
    if (!magic.ok) return;
    const augmented = applyOrb(magic.item, "augmentation", rng(4));
    expect(augmented.ok && kinds(augmented.item)).toEqual({ prefix: 1, suffix: 1 });
    if (augmented.ok)
      expect(applyOrb(augmented.item, "augmentation", rng())).toEqual({
        ok: false,
        reason: "full",
      });
  });

  test("Regal keeps the magic mods and adds one; Alchemy discards them and rolls four", () => {
    const magic = gear("magic", 8);
    const regal = applyOrb(magic, "regal", rng());
    expect(regal.ok && regal.item.mods.length).toBe(magic.mods.length + 1);
    if (regal.ok) for (const m of magic.mods) expect(regal.item.mods).toContainEqual(m);
    const alchemy = applyOrb(magic, "alchemy", rng());
    expect(alchemy.ok && alchemy.item.mods.length).toBe(4);
  });

  test("Exalted refuses a 6-mod rare and respects three prefixes and three suffixes", () => {
    for (let seed = 1; seed <= 30; seed++) {
      let item = gear("rare", seed);
      for (let i = 0; i < 6; i++) {
        const next = applyOrb(item, "exalted", rng(seed * 10 + i));
        if (!next.ok) break;
        item = next.item;
      }
      const sides = kinds(item);
      expect(sides.prefix).toBeLessThanOrEqual(3);
      expect(sides.suffix).toBeLessThanOrEqual(3);
      if (item.mods.length === 6)
        expect(applyOrb(item, "exalted", rng())).toEqual({ ok: false, reason: "full" });
    }
  });

  test("every crafted mod respects item level and one mod per group", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const result = applyOrb(gear("normal", seed, "Body Armour"), "alchemy", rng(seed));
      if (!result.ok) continue;
      const groups = result.item.mods.flatMap((m) => modById.get(m.modId)!.groups);
      expect(new Set(groups).size).toBe(groups.length);
      for (const m of result.item.mods)
        expect(modById.get(m.modId)!.requiredLevel).toBeLessThanOrEqual(10);
    }
  });

  test("crafting is deterministic for a seed", () => {
    const item = gear("normal", 9);
    expect(applyOrb(item, "alchemy", rng(42))).toEqual(applyOrb(item, "alchemy", rng(42)));
  });

  test("the account spends the orb only when the craft applies, and a refused craft changes nothing", () => {
    const account = newAccount("ranger");
    const item = gear("normal", 10);
    account.stash.items.push(item);
    account.currency[ITEM_ORBS.transmutation] = 1;
    account.currency[ITEM_ORBS.regal] = 1;
    const before = structuredClone(account);
    expect(craft(account, "regal", item.id)).toEqual({ ok: false, reason: "wrong-rarity" });
    expect(account).toEqual(before);
    expect(craft(account, "augmentation", item.id)).toEqual({ ok: false, reason: "no-orb" });
    const log: string[] = [];
    expect(craft(account, "transmutation", item.id, (l) => log.push(l)).ok).toBe(true);
    expect(account.currency[ITEM_ORBS.transmutation]).toBe(0);
    expect(account.stash.items.find((i) => i.id === item.id)!.rarity).toBe("magic");
    expect(log.some((l) => l.includes(item.id) && l.includes("transmutation"))).toBe(true);
  });

  test("an equipped item can be crafted in place", () => {
    const account = newAccount("warrior");
    const card = account.roster.slots.find((c) => c?.weapon)!;
    account.currency[ITEM_ORBS.transmutation] = 1;
    expect(craft(account, "transmutation", card.weapon!.id).ok).toBe(true);
    expect(card.weapon!.rarity).toBe("magic");
  });
});
