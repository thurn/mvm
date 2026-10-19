import { baseItems, mods } from "../data";
import type { Card } from "../heroes/model/hero";
import type { ItemInstance } from "../heroes/model/item";
import { itemSellPrice } from "../loot/prices";
import { uniques } from "../data/uniques";
import { createStreams, streamRng } from "../sim/rng";
import type { AccountState } from "./state";

type Log = (line: string) => void;

const knownBases = () => new Set(baseItems().map((b) => b.id as string));
const knownMods = () =>
  new Set([
    ...mods().map((m) => m.id as string),
    ...uniques().flatMap((u) => u.mods.map((m) => m.id)),
  ]);

/** A stable seed from an item's ID, so a re-roll on load is the same every load. */
function seedOf(itemId: string): number {
  let h = 2166136261;
  for (let i = 0; i < itemId.length; i++) h = Math.imul(h ^ itemId.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Re-rolls implicit values outside their base's current range, such as a
 * Ruby Ring's old 20–30% fire resistance that is now 10–15% team fire
 * resistance (Appendix C §C.3.8), logging each.
 */
function reconcileImplicits(item: ItemInstance, log: Log): ItemInstance {
  const base = baseItems().find((b) => b.id === item.baseId);
  if (!base || !item.implicits) return item;
  let changed = false;
  const implicits = item.implicits.map((rolled) => {
    const stats = base.implicits.find((i) => i.id === rolled.modId)?.stats;
    if (
      !stats ||
      stats.every(
        (s, i) => (rolled.values[i] ?? s.min) >= s.min && (rolled.values[i] ?? s.min) <= s.max,
      )
    )
      return rolled;
    const rng = streamRng(createStreams(seedOf(item.id)), "loot");
    const values = stats.map((s) => s.min + Math.floor(rng() * (s.max - s.min + 1)));
    log(
      `[reconcile] item ${item.id}: implicit ${rolled.modId} ${rolled.values.join("/")} re-rolled to ${values.join("/")}`,
    );
    changed = true;
    return { ...rolled, values };
  });
  return changed ? { ...item, implicits } : item;
}

/** Drops mods the data no longer has, and re-rolls implicits out of range, logging each (P17). */
function reconcileMods(item: ItemInstance, known: Set<string>, log: Log): ItemInstance {
  const kept = item.mods.filter((m) => {
    if (known.has(m.modId)) return true;
    log(`[reconcile] item ${item.id}: unknown mod ${m.modId} dropped`);
    return false;
  });
  return reconcileImplicits(kept.length === item.mods.length ? item : { ...item, mods: kept }, log);
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
