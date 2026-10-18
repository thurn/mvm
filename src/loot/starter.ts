import { baseItems } from "../data";
import type { ItemInstance } from "../heroes/model/item";

/** Each class's level 1 normal starter base (Appendix B §4). */
const STARTER_BASES: Readonly<Record<string, string>> = {
  Bow: "Crude Bow",
  Crossbow: "Makeshift Crossbow",
  "Two Hand Mace": "Felled Greatclub",
  Warstaff: "Wrapped Quarterstaff",
  Wand: "Withered Wand",
  Sceptre: "Rattling Sceptre",
};

/** A normal starter item of a weapon class, for the account to grant; undefined for classes without one. */
export function starterItem(itemClass: string, id: string): ItemInstance {
  const name = STARTER_BASES[itemClass];
  const base = baseItems().find((b) => b.name === name);
  if (!base) throw new Error(`no starter base for ${itemClass}`);
  return {
    id,
    baseId: base.id,
    rarity: "normal",
    itemLevel: 1,
    quality: 0,
    mods: [],
    implicits: base.implicits.map((imp) => ({
      modId: imp.id,
      values: imp.stats.map((s) => s.min),
    })),
  };
}

/** Whether a class has a starter base. */
export function hasStarterItem(itemClass: string): boolean {
  return itemClass in STARTER_BASES;
}
