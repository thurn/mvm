import type { AccountState } from "../../account/state";
import { baseItems, mods } from "../../data";
import type { ModData } from "../../data/types";
import type { ItemId, ItemInstance } from "../../heroes/model/item";
import { createStreams, streamRng } from "../../sim/rng";
import { LOOT_TUNING } from "../../tuning/loot";
import { rollAffix, rollModValues } from "../items";

type Rng = () => number;

/** The item orbs that drop by area level 6 (C §C.5.1), by their RePoE IDs. */
export const ITEM_ORBS = {
  transmutation: "Metadata/Items/Currency/CurrencyUpgradeToMagic",
  augmentation: "Metadata/Items/Currency/CurrencyAddModToMagic",
  regal: "Metadata/Items/Currency/CurrencyUpgradeMagicToRare",
  exalted: "Metadata/Items/Currency/CurrencyAddModToRare",
  alchemy: "Metadata/Items/Currency/CurrencyUpgradeToRare",
} as const;

export type ItemOrb = keyof typeof ITEM_ORBS;

/** Why an orb can't apply (C §C.5.2's valid targets), or why the account can't craft. */
export type CraftRefusal =
  "corrupted" | "wrong-rarity" | "full" | "no-legal-mod" | "no-orb" | "unknown-item";

export type CraftResult = { ok: true; item: ItemInstance } | { ok: false; reason: CraftRefusal };

/** An item's affixes as catalog mods; unique-only mods aren't in the catalog, and no orb touches uniques. */
const affixesOf = (item: ItemInstance): ModData[] =>
  item.mods.flatMap((m) => mods().find((mod) => mod.id === m.modId) ?? []);

/** Affix caps per side by rarity (C.6): magic 1 prefix + 1 suffix, rare 3 + 3. */
const capOf = (rarity: "magic" | "rare") =>
  rarity === "magic" ? LOOT_TUNING.affixCaps.magic : LOOT_TUNING.affixCaps.rare;

/**
 * Whether an orb can target an item, by C §C.5.2's rules alone (no roll):
 * the reason it can't, or null. The Craft tab pulses and dims targets with it.
 */
export function orbRefusal(item: ItemInstance, orb: ItemOrb): CraftRefusal | null {
  if (item.corrupted) return "corrupted";
  const r = item.rarity;
  switch (orb) {
    case "transmutation":
      return r === "normal" ? null : "wrong-rarity";
    case "augmentation":
      return r !== "magic"
        ? "wrong-rarity"
        : item.mods.length >= 2 * capOf("magic")
          ? "full"
          : null;
    case "regal":
      return r === "magic" ? null : "wrong-rarity";
    case "exalted":
      return r !== "rare" ? "wrong-rarity" : item.mods.length >= 2 * capOf("rare") ? "full" : null;
    case "alchemy":
      return r === "normal" || r === "magic" ? null : "wrong-rarity";
  }
}

/**
 * Applies one item orb (C §C.5.2) to an item, returning the new item or the
 * reason it can't apply. Pure: the item isn't changed, and every roll draws
 * from `rng` with the item generator's pool, item-level gating and caps.
 */
export function applyOrb(item: ItemInstance, orb: ItemOrb, rng: Rng): CraftResult {
  if (item.corrupted) return { ok: false, reason: "corrupted" };
  const base = baseItems().find((b) => b.id === item.baseId);
  if (!base) return { ok: false, reason: "unknown-item" };
  // The target rules live in orbRefusal alone, so the Craft tab's pulse always agrees with the craft.
  const refusal = orbRefusal(item, orb);
  if (refusal) return { ok: false, reason: refusal };
  const current = affixesOf(item);
  const add = (
    onto: readonly ModData[],
    rarity: "magic" | "rare",
    side?: ModData["generationType"],
  ) => {
    const mod = rollAffix(base, item.itemLevel, onto, capOf(rarity), rng, side);
    return mod ? { ...rollModValues(mod, rng), mod } : null;
  };

  switch (orb) {
    case "transmutation": {
      // Normal → Magic with one mod from the combined pool.
      const mod = add([], "magic");
      if (!mod) return { ok: false, reason: "no-legal-mod" };
      return {
        ok: true,
        item: { ...item, rarity: "magic", mods: [{ modId: mod.modId, values: mod.values }] },
      };
    }
    case "augmentation": {
      // A 1-mod magic item gains its missing side.
      const missing =
        current[0]?.generationType === "prefix" ? "suffix" : current[0] ? "prefix" : undefined;
      const mod = add(current, "magic", missing);
      if (!mod) return { ok: false, reason: "no-legal-mod" };
      return {
        ok: true,
        item: { ...item, mods: [...item.mods, { modId: mod.modId, values: mod.values }] },
      };
    }
    case "regal": {
      // Magic → Rare, keeping its mods and adding one.
      const mod = add(current, "rare");
      if (!mod) return { ok: false, reason: "no-legal-mod" };
      return {
        ok: true,
        item: {
          ...item,
          rarity: "rare",
          mods: [...item.mods, { modId: mod.modId, values: mod.values }],
        },
      };
    }
    case "exalted": {
      // A rare under six mods gains one, within 3 prefixes and 3 suffixes.
      const mod = add(current, "rare");
      if (!mod) return { ok: false, reason: "no-legal-mod" };
      return {
        ok: true,
        item: { ...item, mods: [...item.mods, { modId: mod.modId, values: mod.values }] },
      };
    }
    case "alchemy": {
      // Normal or Magic → Rare with four new mods; the old ones go.
      const rolled: NonNullable<ReturnType<typeof add>>[] = [];
      for (let i = 0; i < LOOT_TUNING.alchemyMods; i++) {
        const mod = add(
          rolled.map((r) => r.mod),
          "rare",
        );
        if (!mod) break;
        rolled.push(mod);
      }
      if (rolled.length === 0) return { ok: false, reason: "no-legal-mod" };
      return {
        ok: true,
        item: {
          ...item,
          rarity: "rare",
          mods: rolled.map((r) => ({ modId: r.modId, values: r.values })),
        },
      };
    }
  }
}

/** Where an item lives in the account: the stash, or a roster card's slot. */
function locate(account: AccountState, itemId: ItemId) {
  const index = account.stash.items.findIndex((i) => i.id === itemId);
  if (index >= 0)
    return {
      item: account.stash.items[index]!,
      put: (next: ItemInstance) => void (account.stash.items[index] = next),
    };
  for (const card of [...account.roster.slots, account.roster.spell])
    for (const part of ["weapon", "armour", "accessory"] as const)
      if (card?.[part]?.id === itemId)
        return { item: card[part]!, put: (next: ItemInstance) => void (card[part] = next) };
  return null;
}

/**
 * Crafts on an account's item, in the stash or equipped (plan 2.6): the orb
 * is spent only when the craft applies, and a refused craft changes nothing.
 * Rolls draw from a stream seeded by the account's next seed (P11), and each
 * craft is logged by item ID.
 */
export function craft(
  account: AccountState,
  orb: ItemOrb,
  itemId: ItemId,
  log: (line: string) => void = () => {},
): CraftResult {
  const found = locate(account, itemId);
  if (!found) return { ok: false, reason: "unknown-item" };
  const currencyId = ITEM_ORBS[orb];
  if ((account.currency[currencyId] ?? 0) < 1) return { ok: false, reason: "no-orb" };
  const result = applyOrb(found.item, orb, streamRng(createStreams(account.nextSeed), "loot"));
  if (!result.ok) {
    log(`[craft] item ${itemId}: ${orb} refused (${result.reason})`);
    return result;
  }
  account.nextSeed++;
  account.currency[currencyId] = (account.currency[currencyId] ?? 0) - 1;
  found.put(result.item);
  log(
    `[craft] item ${itemId}: ${orb} → ${result.item.rarity}, mods ${result.item.mods.map((m) => m.modId).join(",")}`,
  );
  return result;
}
