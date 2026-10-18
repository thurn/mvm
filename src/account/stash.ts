import { id } from "../types/ids";
import type { AccountState } from "./state";
import { baseItems } from "../data";
import { generateHero, generateSpell } from "../heroes/gen/generate";
import { catalogEntry } from "../heroes/model/catalog";
import type { Card, HeroInstance, OwnedHeroId } from "../heroes/model/hero";
import {
  canEquip,
  itemSlot,
  type ItemId,
  type ItemInstance,
  type ItemSlot,
} from "../heroes/model/item";
import { starterWeapon } from "../heroes/model/starter";
import { createStreams, streamRng } from "../sim/rng";

/**
 * The account's stash and roster rules (mason hv-7ic2.96): the one place a
 * hero or item enters the stash, and every move between the stash and the
 * roster. Screens and dev tools call these and hold no rules of their own.
 */

/** Puts an item in the stash. */
export function acquireItem(account: AccountState, item: ItemInstance): ItemInstance {
  account.stash.items.push(item);
  return item;
}

/** Puts a new hero in the stash, with its class's normal starter weapon so it can fight once slotted. */
export function acquireHero(account: AccountState, hero: HeroInstance): HeroInstance {
  account.stash.heroes.push(hero);
  const weapon = starterWeapon(hero);
  if (weapon) acquireItem(account, weapon);
  return hero;
}

/**
 * Takes one hero from a level's pending choose-1-of-3 (Appendix E §4.5)
 * into the stash and clears the choice. False, writing nothing, when there
 * is no such choice or the hero was not offered.
 */
export function chooseHero(account: AccountState, levelId: string, heroId: OwnedHeroId): boolean {
  const index = account.pendingChoices.findIndex((c) => c.levelId === levelId);
  const hero = account.pendingChoices[index]?.options.find((h) => h.id === heroId);
  if (!hero) return false;
  account.pendingChoices.splice(index, 1);
  acquireHero(account, hero);
  return true;
}

/** A roster place: one of the six card slots, or the spell slot. */
export type RosterTarget = number | "spell";

export function isSpell(hero: HeroInstance): boolean {
  return catalogEntry(hero.skillId).role === "spell";
}

function cardAt(account: AccountState, target: RosterTarget): Card | null {
  return target === "spell" ? account.roster.spell : (account.roster.slots[target] ?? null);
}

function setCard(account: AccountState, target: RosterTarget, card: Card | null): void {
  if (target === "spell") account.roster.spell = card;
  else account.roster.slots[target] = card;
}

function heroCount(account: AccountState): number {
  return account.roster.slots.filter((c) => c !== null).length;
}

/** Why an item can't go in a card's slot, or null when it can (Appendix C §C.1.1's weapon lock). */
export function equipRefusal(
  account: AccountState,
  item: ItemInstance,
  target: RosterTarget,
  part: ItemSlot,
): string | null {
  const card = cardAt(account, target);
  if (!card) return "no hero in this slot";
  if (isSpell(card.hero)) return "spells take no items";
  const base = baseItems().find((b) => b.id === item.baseId);
  if (!base || itemSlot(item) !== part || !canEquip(card.hero, part, base))
    return part === "weapon"
      ? `needs a ${catalogEntry(card.hero.skillId).weapon ?? "weapon"}`
      : `needs ${part === "armour" ? "body armour" : "a ring, amulet or belt"}`;
  return null;
}

/** Equips a stash item on a card, returning the replaced item to the stash. False when refused. */
export function equip(
  account: AccountState,
  itemId: ItemId,
  target: RosterTarget,
  part: ItemSlot,
): boolean {
  const index = account.stash.items.findIndex((i) => i.id === itemId);
  const item = account.stash.items[index];
  const card = cardAt(account, target);
  if (!item || !card || equipRefusal(account, item, target, part) !== null) return false;
  account.stash.items.splice(index, 1);
  const old = card[part];
  if (old) account.stash.items.push(old);
  card[part] = item;
  return true;
}

/** Moves a card's item to the stash. */
export function unequip(account: AccountState, target: RosterTarget, part: ItemSlot): boolean {
  const card = cardAt(account, target);
  const item = card?.[part];
  if (!card || !item) return false;
  card[part] = null;
  account.stash.items.push(item);
  return true;
}

/**
 * Puts a stash hero in a roster place: heroes in unlocked card slots, spells
 * in the spell slot. A hero already there goes to the stash; its items stay
 * on the card when they fit the new hero, else go to the stash too.
 */
export function assignHero(
  account: AccountState,
  heroId: OwnedHeroId,
  target: RosterTarget,
): boolean {
  const index = account.stash.heroes.findIndex((h) => h.id === heroId);
  const hero = account.stash.heroes[index];
  if (!hero) return false;
  if ((target === "spell") !== isSpell(hero)) return false;
  if (target !== "spell" && target >= account.roster.unlocked) return false;
  account.stash.heroes.splice(index, 1);
  const old = cardAt(account, target);
  const card: Card = { hero, weapon: null, armour: null, accessory: null };
  if (old) {
    account.stash.heroes.push(old.hero);
    for (const part of ["weapon", "armour", "accessory"] as const) {
      const item = old[part];
      if (!item) continue;
      const base = baseItems().find((b) => b.id === item.baseId);
      if (base && canEquip(hero, part, base)) card[part] = item;
      else account.stash.items.push(item);
    }
  }
  setCard(account, target, card);
  return true;
}

/** Moves a card between two unlocked hero slots, swapping with any card already there. */
export function moveCard(account: AccountState, from: RosterTarget, to: RosterTarget): boolean {
  if (from === "spell" || to === "spell" || from === to) return false;
  if (to >= account.roster.unlocked || !account.roster.slots[from]) return false;
  const slots = account.roster.slots;
  [slots[from], slots[to]] = [slots[to] ?? null, slots[from] ?? null];
  return true;
}

/** Moves a roster hero and its items to the stash; refused when it is the last hero. */
export function benchHero(account: AccountState, target: RosterTarget): boolean {
  const card = cardAt(account, target);
  if (!card) return false;
  if (target !== "spell" && heroCount(account) <= 1) return false;
  setCard(account, target, null);
  account.stash.heroes.push(card.hero);
  for (const part of ["weapon", "armour", "accessory"] as const) {
    const item = card[part];
    if (item) account.stash.items.push(item);
  }
  return true;
}

/**
 * Rolls the stash's hero and spell drops into heroes with 1.18's generator,
 * keeping each drop's rarity and item level. Seeded from the account, so a
 * save rolls the same heroes wherever it is opened. Returns how many rolled.
 */
export function rollUnrolled(account: AccountState): number {
  const drops = account.stash.unrolled.splice(0);
  if (drops.length === 0) return 0;
  const rng = streamRng(
    createStreams(account.nextSeed * 1009 + account.stash.heroes.length),
    "heroGen",
  );
  const roster = account.roster.slots.flatMap((c) => (c ? [c.hero.skillId as string] : []));
  const highestUnlocked = 1 + account.firstClears.length;
  drops.forEach((drop, i) => {
    const source = {
      areaLevel: drop.itemLevel,
      highestUnlocked,
      rarityBonus: 0,
      rarity: drop.rarity,
      rng,
      id: id<"OwnedHero">(`stash-${account.nextSeed}-${account.stash.heroes.length}-${i}`),
    };
    const hero = drop.kind === "hero" ? generateHero({ ...source, roster }) : generateSpell(source);
    acquireHero(account, hero);
  });
  return drops.length;
}
