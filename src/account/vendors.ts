import { baseItems, heroGems } from "../data";
import { uniques } from "../data/uniques";
import type { BaseItemId } from "../data/types";
import {
  buildHero,
  heroPool,
  sharesRosterTags,
  spellPool,
  unlockAreaLevel,
} from "../heroes/gen/generate";
import { catalogEntry } from "../heroes/model/catalog";
import type { HeroInstance, OwnedHeroId } from "../heroes/model/hero";
import type { ItemId, ItemInstance } from "../heroes/model/item";
import { generateGear, pickWeighted, WEAPON_CLASSES } from "../loot/items";
import {
  heroBuyPrice,
  heroGamblePrice,
  heroSellPrice,
  itemBuyPrice,
  itemGamblePrice,
  itemSellPrice,
} from "../loot/prices";
import { createStreams, streamRng } from "../sim/rng";
import { VENDOR_TUNING as T } from "../tuning/economy";
import { LOOT_TUNING } from "../tuning/loot";
import { id } from "../types/ids";
import { furthestLevel } from "./lifecycle";
import { acquireHero, acquireItem } from "./stash";
import type { AccountState, Sold } from "./state";

/**
 * The Armorer, Recruiter, buyback and gamble (Appendix E §5.2–§5.3), as
 * account functions. Every roll draws from a stream seeded by the account's
 * `vendorSeed`, apart from the level seeds, and its outcome is stored (P16).
 */

type Rng = () => number;

/** E §5.3's gamble roles. */
type GambleRole = keyof typeof T.gambleRoles;
/** A hero gamble's pick: a role or a damage tag. */
export type HeroGamble = { role: GambleRole } | { tag: string };

const odds = <R extends string>(table: Readonly<Record<R, number>>, rng: Rng): R =>
  pickWeighted(
    (Object.entries(table) as [R, number][]).map(([value, weight]) => ({ value, weight })),
    rng,
  );

/** The next vendor stream, its seed spent, and an ID maker for what it rolls. */
function vendorRoll(account: AccountState) {
  const seed = account.vendorSeed++;
  const streams = createStreams(0x7e4d_0000 + seed);
  let n = 0;
  return {
    loot: streamRng(streams, "loot"),
    heroGen: streamRng(streams, "heroGen"),
    newId: () => `vendor-${seed}-${n++}`,
  };
}

/** The highest area level unlocked: the Armorer's item level and the Recruiter's level. */
const vendorLevel = (account: AccountState) => furthestLevel(account).areaLevel;

const rosterSkills = (account: AccountState) =>
  account.roster.slots.flatMap((c) => (c ? [c.hero.skillId as string] : []));

/** `count` distinct picks from a pool, uniformly (all of it when it's smaller). */
function pickDistinct(pool: readonly string[], count: number, rng: Rng): string[] {
  const left = [...pool];
  const picks: string[] = [];
  while (picks.length < count && left.length > 0)
    picks.push(left.splice(Math.floor(rng() * left.length), 1)[0]!);
  return picks;
}

/** Rolls fresh stock for both vendors (E §5.3): after every level, won or lost, and for a new account. */
export function refreshStock(account: AccountState): void {
  const { loot, heroGen, newId } = vendorRoll(account);
  const ilvl = vendorLevel(account);
  const roster = rosterSkills(account);
  const rosterWeapons = [
    ...new Set(roster.flatMap((skill) => catalogEntry(skill).weapon ?? [])),
  ] as string[];
  const gear = (itemClass: string) =>
    generateGear(
      {
        ilvl,
        rarity: odds(T.armorer.rarity, loot),
        itemClass,
        newId: () => id<"Item">(newId()),
      },
      loot,
    );
  // Weapons shape toward the roster's weapon classes like drops do (E §3.3).
  const weapon = () => {
    const shaped = rosterWeapons.length > 0 && loot() < LOOT_TUNING.rosterWeaponShare;
    const classes: readonly string[] = shaped ? rosterWeapons : WEAPON_CLASSES;
    return gear(classes[Math.floor(loot() * classes.length)]!);
  };
  const armorer = [
    ...Array.from({ length: T.armorer.weapons }, weapon),
    ...Array.from({ length: T.armorer.armours }, () => gear(odds(LOOT_TUNING.armour, loot))),
    ...Array.from({ length: T.armorer.accessories }, () => gear(odds(LOOT_TUNING.accessory, loot))),
  ];

  const recruit = (skillId: string) =>
    buildHero(
      skillId,
      Math.max(
        1,
        ilvl + T.recruiter.levelOffsets[Math.floor(heroGen() * T.recruiter.levelOffsets.length)]!,
      ),
      odds(T.recruiter.rarity, heroGen),
      heroGen,
      id<"OwnedHero">(newId()),
    );
  const heroes = heroPool().filter((skill) => unlockAreaLevel(skill) <= ilvl);
  const matching = pickDistinct(
    heroes.filter((skill) => sharesRosterTags(skill, roster)),
    T.recruiter.matching,
    heroGen,
  );
  const rest = pickDistinct(
    heroes.filter((skill) => !matching.includes(skill)),
    T.recruiter.heroes - matching.length,
    heroGen,
  );
  const spells = pickDistinct(
    spellPool().filter((skill) => unlockAreaLevel(skill) <= ilvl),
    T.recruiter.spells,
    heroGen,
  );
  account.vendorStock = {
    armorer,
    recruiter: [...matching, ...rest].map(recruit),
    spells: spells.map(recruit),
  };
}

/** Rolls stock for an account that has none yet (a save from before vendors). */
export function ensureStock(account: AccountState): void {
  if (!account.vendorStock) refreshStock(account);
}

/** Buys a vendor offer into the stash. False, changing nothing, when it's gone or the gold is short. */
export function buyOffer(account: AccountState, offerId: string): boolean {
  const stock = account.vendorStock;
  if (!stock) return false;
  const item = stock.armorer.find((i) => i.id === offerId);
  if (item) {
    const price = itemBuyPrice(item);
    if (account.gold < price) return false;
    account.gold -= price;
    stock.armorer = stock.armorer.filter((i) => i !== item);
    acquireItem(account, item);
    return true;
  }
  for (const list of ["recruiter", "spells"] as const) {
    const hero = stock[list].find((h) => h.id === offerId);
    if (!hero) continue;
    const price = heroBuyPrice(hero);
    if (account.gold < price) return false;
    account.gold -= price;
    stock[list] = stock[list].filter((h) => h !== hero);
    acquireHero(account, hero);
    return true;
  }
  return false;
}

function remember(account: AccountState, sold: Sold): void {
  account.buyback = [sold, ...account.buyback].slice(0, T.buybackSize);
}

/** Sells a stash item for its sell price (E §5.2); it goes to buyback. */
export function sellItem(account: AccountState, itemId: ItemId): boolean {
  const index = account.stash.items.findIndex((i) => i.id === itemId);
  const item = account.stash.items[index];
  if (!item) return false;
  account.stash.items.splice(index, 1);
  const price = itemSellPrice(item);
  account.gold += price;
  remember(account, { kind: "item", item, price });
  return true;
}

/** Sells a stash hero or spell for its sell price (E §5.2); it goes to buyback. */
export function sellHero(account: AccountState, heroId: OwnedHeroId): boolean {
  const index = account.stash.heroes.findIndex((h) => h.id === heroId);
  const hero = account.stash.heroes[index];
  if (!hero) return false;
  account.stash.heroes.splice(index, 1);
  const price = heroSellPrice(hero);
  account.gold += price;
  remember(account, { kind: "hero", hero, price });
  return true;
}

/** Buys back a sold thing at the price it sold for. False, changing nothing, when the gold is short. */
export function buyBack(account: AccountState, index: number): boolean {
  const sold = account.buyback[index];
  if (!sold || account.gold < sold.price) return false;
  account.gold -= sold.price;
  account.buyback.splice(index, 1);
  if (sold.kind === "item") acquireItem(account, sold.item);
  else account.stash.heroes.push(sold.hero);
  return true;
}

/**
 * Gambles on a base at the vendor's item level (E §5.3): 1.5× the magic
 * price for Magic 75% / Rare 22% / Unique 3%, the unique only where the base
 * has a demo unique. Null, changing nothing, for a base that can't drop yet
 * or short gold.
 */
export function gambleItem(account: AccountState, baseId: BaseItemId): ItemInstance | null {
  const ilvl = vendorLevel(account);
  const base = baseItems().find((b) => b.id === baseId);
  const price = itemGamblePrice(ilvl);
  if (!base || base.dropLevel > ilvl || account.gold < price) return null;
  account.gold -= price;
  const { loot, newId } = vendorRoll(account);
  const hasUnique = uniques().some((u) => u.baseId === baseId);
  const { magic, rare } = T.itemGamble;
  const rarity = hasUnique ? odds(T.itemGamble, loot) : odds({ magic, rare }, loot);
  return acquireItem(
    account,
    generateGear({ ilvl, rarity, baseId, newId: () => id<"Item">(newId()) }, loot),
  );
}

function hasTag(skillId: string, tag: string): boolean {
  return heroGems().some((g) => g.id === skillId && g.tags.includes(tag));
}

/**
 * Gambles on a hero of a role or damage tag at the vendor's level (E §5.3):
 * 1.5× the magic hero price for Magic 70% / Rare 30%. Null, changing
 * nothing, when no unlocked hero fits or the gold is short.
 */
export function gambleHero(account: AccountState, pick: HeroGamble): HeroInstance | null {
  const level = vendorLevel(account);
  const fits = (skill: string) =>
    "role" in pick
      ? (T.gambleRoles[pick.role] as readonly string[]).includes(catalogEntry(skill).role)
      : hasTag(skill, pick.tag);
  const pool = heroPool().filter((skill) => unlockAreaLevel(skill) <= level && fits(skill));
  const price = heroGamblePrice(level);
  if (pool.length === 0 || account.gold < price) return null;
  account.gold -= price;
  const { heroGen, newId } = vendorRoll(account);
  const skillId = pool[Math.floor(heroGen() * pool.length)]!;
  return acquireHero(
    account,
    buildHero(skillId, level, odds(T.heroGamble, heroGen), heroGen, id<"OwnedHero">(newId())),
  );
}
