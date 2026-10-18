import { isUpgrade } from "../../account/upgrades";
import type { AccountState } from "../../account/state";
import { baseItems } from "../../data";
import { catalogEntry } from "../../heroes/model/catalog";
import type { Card, HeroInstance } from "../../heroes/model/hero";
import { generateHero, generateSpell } from "../../heroes/gen/generate";
import { canEquip, type ItemInstance, type ItemSlot } from "../../heroes/model/item";
import { createStreams, streamRng } from "../../sim/rng";

/** A roster place: one of the six card slots, or the spell slot. */
export type RosterTarget = number | "spell";

const ACCESSORY = new Set(["Amulet", "Ring", "Belt"]);
const ARMOUR = new Set(["Body Armour", "Shield"]);

function itemClass(item: ItemInstance): string {
  return baseItems().find((b) => b.id === item.baseId)?.itemClass ?? "";
}

/** The card slot an item goes in. */
export function itemSlot(item: ItemInstance): ItemSlot {
  const cls = itemClass(item);
  return ACCESSORY.has(cls) ? "accessory" : ARMOUR.has(cls) ? "armour" : "weapon";
}

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
  itemId: string,
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
export function assignHero(account: AccountState, heroId: string, target: RosterTarget): boolean {
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

export interface StashFilter {
  slot: "all" | ItemSlot | "hero";
  rarity: "all" | ItemInstance["rarity"];
  upgradeOnly: boolean;
  sort: "newest" | "rarity" | "level";
}

export type StashEntry =
  { kind: "item"; item: ItemInstance; upgrade: boolean } | { kind: "hero"; hero: HeroInstance };

const RARITY_RANK = { normal: 0, magic: 1, rare: 2, unique: 3 } as const;

function rarityOf(entry: StashEntry) {
  return RARITY_RANK[entry.kind === "item" ? entry.item.rarity : entry.hero.rarity];
}

function levelOf(entry: StashEntry) {
  return entry.kind === "item" ? entry.item.itemLevel : entry.hero.level;
}

/**
 * The stash as uniform cards (GDD §15): filtered by slot (or heroes),
 * rarity and Upgrade; sorted newest first, rarest first (then highest
 * level), or highest level first (then rarest).
 */
export function stashView(account: AccountState, filter: StashFilter): StashEntry[] {
  const entries: StashEntry[] = [
    ...account.stash.items.map((item): StashEntry => ({
      kind: "item",
      item,
      upgrade: isUpgrade(account, item),
    })),
    ...account.stash.heroes.map((hero): StashEntry => ({ kind: "hero", hero })),
  ];
  const kept = entries
    .map((entry, order) => ({ entry, order }))
    .filter(({ entry }) => {
      if (filter.slot === "hero") {
        if (entry.kind !== "hero") return false;
      } else if (filter.slot !== "all") {
        if (entry.kind !== "item" || itemSlot(entry.item) !== filter.slot) return false;
      }
      if (filter.rarity !== "all" && rarityOf(entry) !== RARITY_RANK[filter.rarity]) return false;
      if (filter.upgradeOnly && !(entry.kind === "item" && entry.upgrade)) return false;
      return true;
    });
  kept.sort((a, b) => {
    if (filter.sort === "rarity")
      return rarityOf(b.entry) - rarityOf(a.entry) || levelOf(b.entry) - levelOf(a.entry);
    if (filter.sort === "level")
      return levelOf(b.entry) - levelOf(a.entry) || rarityOf(b.entry) - rarityOf(a.entry);
    return b.order - a.order;
  });
  return kept.map(({ entry }) => entry);
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
      id: `stash-${account.nextSeed}-${account.stash.heroes.length}-${i}`,
    };
    account.stash.heroes.push(
      drop.kind === "hero" ? generateHero({ ...source, roster }) : generateSpell(source),
    );
  });
  return drops.length;
}
