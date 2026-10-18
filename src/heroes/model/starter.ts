import { baseItems } from "../../data";
import type { GemId } from "../../data/types";
import { catalogEntry } from "./catalog";
import { newHero, type Card } from "./hero";

/**
 * The level 1 normal base each starter hero comes with (Appendix B §4),
 * by locked weapon class. Spells have no weapon.
 */
const STARTER_BASES: Readonly<Record<string, string>> = {
  Bow: "Crude Bow",
  Crossbow: "Makeshift Crossbow",
  "Two Hand Mace": "Felled Greatclub",
  Warstaff: "Wrapped Quarterstaff",
  Wand: "Withered Wand",
  Sceptre: "Rattling Sceptre",
};

/** A normal starter card: the hero at `level` with its class's starter weapon. */
export function starterCard(skillId: GemId, level: number, heroId = `starter-${skillId}`): Card {
  const weaponClass = catalogEntry(skillId).weapon;
  const baseName = weaponClass ? STARTER_BASES[weaponClass] : undefined;
  const base = baseName ? baseItems().find((b) => b.name === baseName) : undefined;
  return {
    hero: newHero(heroId, skillId, level),
    weapon: base
      ? {
          id: `${heroId}-weapon`,
          baseId: base.id,
          rarity: "normal",
          itemLevel: 1,
          quality: 0,
          mods: [],
        }
      : null,
    armour: null,
    accessory: null,
  };
}
