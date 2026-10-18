import { baseItems } from "../data";
import { aggregate } from "../heroes/model/aggregate";
import type { Card } from "../heroes/model/hero";
import { canEquip, slotOfClass, type ItemInstance, type ItemSlot } from "../heroes/model/item";
import { stat } from "../combat/stats";
import type { AccountState } from "./state";

/**
 * A rough card power: weapon damage per second (weapon and added attack
 * damage, at the weapon's speed) times effective life (life plus ES). A
 * heuristic for the level-end Upgrade tag, not the combat model.
 */
function power(card: Card): number {
  const sheet = aggregate(card);
  const weapon = sheet.weapon;
  let damage = 0;
  if (weapon) {
    for (const range of Object.values(weapon.damage)) damage += (range.min + range.max) / 2;
    for (const type of ["physical", "fire", "cold", "lightning", "chaos"] as const) {
      const added = sheet.actor.stats[`attack_added_${type}_damage`];
      if (added) damage += (added.min + added.max) / 2;
    }
    damage *= (1000 / weapon.attackTime) * (1 + stat(sheet.actor.stats, "attack_speed_+%") / 100);
  }
  return Math.max(1, damage) * (sheet.actor.maxLife + sheet.actor.maxEs);
}

/** Whether an item improves its best-fitting roster card by DPS × EHP (1.19's Upgrade flag). */
export function isUpgrade(account: AccountState, item: ItemInstance): boolean {
  const base = baseItems().find((b) => b.id === item.baseId);
  if (!base) return false;
  const slot: ItemSlot = slotOfClass(base.itemClass);
  return account.roster.slots.some((card) => {
    if (!card || !canEquip(card.hero, slot, base)) return false;
    return power({ ...card, [slot]: item }) > power(card) * 1.01;
  });
}
