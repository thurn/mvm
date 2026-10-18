import type { GemId } from "../../data/types";
import { hasStarterItem, starterItem } from "../../loot/starter";
import { catalogEntry } from "./catalog";
import { newHero, type Card } from "./hero";

/** A normal starter card: the hero at `level` with its class's starter weapon (Appendix B §4). */
export function starterCard(skillId: GemId, level: number, heroId = `starter-${skillId}`): Card {
  const weaponClass = catalogEntry(skillId).weapon;
  return {
    hero: newHero(heroId, skillId, level),
    weapon:
      weaponClass && hasStarterItem(weaponClass)
        ? starterItem(weaponClass, `${heroId}-weapon`)
        : null,
    armour: null,
    accessory: null,
  };
}
