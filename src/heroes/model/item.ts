import { baseItems } from "../../data";
import type { BaseItemData, BaseItemId, ModId } from "../../data/types";
import type { Id } from "../../types/ids";
import { catalogEntry } from "./catalog";
import type { Card, HeroInstance } from "./hero";

export type ItemSlot = "weapon" | "armour" | "accessory";

/** An item instance's ID. */
export type ItemId = Id<"Item">;

/**
 * An item as the hero model reads it. Item generation (1.14) writes these:
 * each mod's rolled `values` line up with that mod's PoE2 stats in `data/`.
 */
export interface ItemInstance {
  id: ItemId;
  baseId: BaseItemId;
  rarity: "normal" | "magic" | "rare" | "unique";
  itemLevel: number;
  quality: number;
  mods: { modId: ModId; values: number[] }[];
  /** The base's implicits, rolled at drop (Appendix C §C.1.3). */
  implicits?: { modId: string; values: number[] }[];
  /** The unique this item is, when its rarity is unique (C.4). */
  uniqueId?: string;
  /** Corrupted by a Vaal Orb: no other currency can change it (C §C.5.2). */
  corrupted?: boolean;
}

const ACCESSORY_CLASSES = new Set(["Amulet", "Ring", "Belt"]);
const ARMOUR_CLASSES = new Set(["Body Armour", "Shield"]);
const SHIELD_WEAPONS = new Set(["Spear", "One Hand Mace"]);

/** The card slot an item class goes in (Appendix C §C.1.1): the one rule for it. */
export function slotOfClass(itemClass: string): ItemSlot {
  return ACCESSORY_CLASSES.has(itemClass)
    ? "accessory"
    : ARMOUR_CLASSES.has(itemClass)
      ? "armour"
      : "weapon";
}

/** The card slot an item goes in. */
export function itemSlot(item: ItemInstance): ItemSlot {
  return slotOfClass(baseItems().find((b) => b.id === item.baseId)?.itemClass ?? "");
}

/** Whether a base fits a hero's slot: the locked weapon class, shields only beside a spear or one-hand mace. */
export function canEquip(hero: HeroInstance, slot: ItemSlot, base: BaseItemData): boolean {
  const weapon = catalogEntry(hero.skillId).weapon;
  if (slotOfClass(base.itemClass) !== slot) return false;
  switch (slot) {
    case "weapon":
      return weapon !== null && base.itemClass === weapon;
    case "armour":
      return base.itemClass !== "Shield" || (weapon !== null && SHIELD_WEAPONS.has(weapon));
    case "accessory":
      return true;
  }
}

export type EquipResult =
  { ok: true; card: Card } | { ok: false; reason: "unknown-base" | "wrong-class" };

/** Returns a new card with the item in the slot, or why it was refused. */
export function equip(
  card: Card,
  slot: ItemSlot,
  item: ItemInstance,
  bases: readonly BaseItemData[],
): EquipResult {
  const base = bases.find((b) => b.id === item.baseId);
  if (!base) return { ok: false, reason: "unknown-base" };
  if (!canEquip(card.hero, slot, base)) return { ok: false, reason: "wrong-class" };
  return { ok: true, card: { ...card, [slot]: item } };
}
