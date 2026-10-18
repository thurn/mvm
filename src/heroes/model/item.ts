import type { BaseItemData, BaseItemId, ModId } from "../../data/types";
import { catalogEntry } from "./catalog";
import type { Card, HeroInstance } from "./hero";

export type ItemSlot = "weapon" | "armour" | "accessory";

/**
 * An item as the hero model reads it. Item generation (1.14) writes these:
 * each mod's rolled `values` line up with that mod's PoE2 stats in `data/`.
 */
export interface ItemInstance {
  id: string;
  baseId: BaseItemId;
  rarity: "normal" | "magic" | "rare" | "unique";
  itemLevel: number;
  quality: number;
  mods: { modId: ModId; values: number[] }[];
  /** The base's implicits, rolled at drop (Appendix C §C.1.3). */
  implicits?: { modId: string; values: number[] }[];
  /** The unique this item is, when its rarity is unique (C.4). */
  uniqueId?: string;
}

const ACCESSORY_CLASSES = new Set(["Amulet", "Ring", "Belt"]);
const SHIELD_WEAPONS = new Set(["Spear", "One Hand Mace"]);

/** Whether a base fits a hero's slot: the locked weapon class, shields only beside a spear or one-hand mace. */
export function canEquip(hero: HeroInstance, slot: ItemSlot, base: BaseItemData): boolean {
  const weapon = catalogEntry(hero.skillId).weapon;
  switch (slot) {
    case "weapon":
      return weapon !== null && base.itemClass === weapon;
    case "armour":
      return (
        base.itemClass === "Body Armour" ||
        (base.itemClass === "Shield" && weapon !== null && SHIELD_WEAPONS.has(weapon))
      );
    case "accessory":
      return ACCESSORY_CLASSES.has(base.itemClass);
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
