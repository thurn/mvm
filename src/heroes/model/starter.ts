import { id } from "../../types/ids";
import type { GemId } from "../../data/types";
import { hasStarterItem, starterItem } from "../../loot/starter";
import { catalogEntry } from "./catalog";
import { newHero, type Card, type HeroInstance } from "./hero";
import type { ItemInstance } from "./item";

/** A normal starter card: the hero at `level` with its class's starter weapon (Appendix B §4). */
export function starterCard(
  skillId: GemId,
  level: number,
  heroId: string = `starter-${skillId}`,
): Card {
  const weaponClass = catalogEntry(skillId).weapon;
  return {
    hero: newHero(id<"OwnedHero">(heroId), skillId, level),
    weapon:
      weaponClass && hasStarterItem(weaponClass)
        ? starterItem(weaponClass, id<"Item">(`${heroId}-weapon`))
        : null,
    armour: null,
    accessory: null,
  };
}

/** The normal starter weapon a new hero brings to the stash, or null for spells (1.39). */
export function starterWeapon(hero: HeroInstance): ItemInstance | null {
  const weaponClass = catalogEntry(hero.skillId).weapon;
  return weaponClass && hasStarterItem(weaponClass)
    ? starterItem(weaponClass, id<"Item">(`${hero.id}-weapon`))
    : null;
}
