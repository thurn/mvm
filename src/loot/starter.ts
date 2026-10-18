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

/** A class's starter base: its named one, else its lowest-level base (spears, staves, one-hand maces). */
function starterBase(itemClass: string) {
  const name = STARTER_BASES[itemClass];
  if (name) return baseItems().find((b) => b.name === name);
  return baseItems()
    .filter((b) => b.itemClass === itemClass)
    .sort((a, b) => a.dropLevel - b.dropLevel || a.name.localeCompare(b.name))[0];
}

/** A normal starter item of a weapon class, for the account to grant. */
export function starterItem(itemClass: string, id: string): ItemInstance {
  const base = starterBase(itemClass);
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
  return starterBase(itemClass) !== undefined;
}
