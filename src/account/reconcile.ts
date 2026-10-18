import { baseItems, mods } from "../data";
import type { Card } from "../heroes/model/hero";
import type { ItemInstance } from "../heroes/model/item";
import { itemSellPrice } from "../loot/prices";
import { uniques } from "../data/uniques";
import type { AccountState } from "./state";

type Log = (line: string) => void;

const knownBases = () => new Set(baseItems().map((b) => b.id as string));
const knownMods = () =>
  new Set([
    ...mods().map((m) => m.id as string),
    ...uniques().flatMap((u) => u.mods.map((m) => m.id)),
  ]);

/** Drops mods the data no longer has, logging each (P17). */
function reconcileMods(item: ItemInstance, known: Set<string>, log: Log): ItemInstance {
  const kept = item.mods.filter((m) => {
    if (known.has(m.modId)) return true;
    log(`[reconcile] item ${item.id}: unknown mod ${m.modId} dropped`);
    return false;
  });
  return kept.length === item.mods.length ? item : { ...item, mods: kept };
}

/**
 * Resolves every content reference in an account against the current data
 * (P17): an item with an unknown base is salvaged into gold at its sell
 * price; an unknown mod is dropped. Each change is logged with the old ID.
 * The retirement table that would map old IDs to new ones starts empty.
 */
export function reconcileAccount(account: AccountState, log: Log): AccountState {
  const bases = knownBases();
  const modIds = knownMods();
  let gold = account.gold;
  const salvage = (item: ItemInstance): boolean => {
    if (bases.has(item.baseId)) return false;
    const value = itemSellPrice(item);
    gold += value;
    log(`[reconcile] item ${item.id}: unknown base ${item.baseId} salvaged into ${value} gold`);
    return true;
  };
  const items = account.stash.items
    .filter((item) => !salvage(item))
    .map((item) => reconcileMods(item, modIds, log));
  const reconcileCard = (card: Card | null): Card | null => {
    if (!card) return null;
    const slot = (item: ItemInstance | null) =>
      !item || salvage(item) ? null : reconcileMods(item, modIds, log);
    return {
      ...card,
      weapon: slot(card.weapon),
      armour: slot(card.armour),
      accessory: slot(card.accessory),
    };
  };
  return {
    ...account,
    gold,
    stash: { ...account.stash, items },
    roster: {
      ...account.roster,
      slots: account.roster.slots.map(reconcileCard),
      spell: reconcileCard(account.roster.spell),
    },
  };
}
