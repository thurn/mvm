import type { AccountState } from "../../account/state";
import { rarityFor } from "../../heroes/gen/generate";
import { rollSupports } from "../../heroes/gen/supports";
import type { HeroInstance, OwnedHeroId } from "../../heroes/model/hero";
import type { ItemId } from "../../heroes/model/item";
import { createStreams, streamRng } from "../../sim/rng";
import { SALVAGE_TUNING } from "../../tuning/loot";
import { ITEM_ORBS } from ".";

type Rng = () => number;

/** The hero orbs that drop by area level 6 (C §C.5.1): the Lesser Jeweller's Orb. */
export const HERO_ORBS = {
  lesser: "Metadata/Items/Currency/CurrencyAddSkillGemSocket3",
} as const;

type HeroOrb = keyof typeof HERO_ORBS;

/** The shards salvage makes, each merging into its orb (C §C.5.6). */
export const SHARDS = {
  transmutation: "Metadata/Items/Currency/CurrencyUpgradeToMagicShard",
  regal: "Metadata/Items/Currency/CurrencyUpgradeMagicToRareShard",
  jeweller: "MvM/Currency/JewellerShard",
} as const;

const MERGES_INTO: Readonly<Record<string, string>> = {
  [SHARDS.transmutation]: ITEM_ORBS.transmutation,
  [SHARDS.regal]: ITEM_ORBS.regal,
  [SHARDS.jeweller]: HERO_ORBS.lesser,
};

type HeroCraftResult =
  | { ok: true; hero: HeroInstance }
  | { ok: false; reason: "full" | "no-legal-support" | "no-orb" | "unknown-hero" };

/**
 * A Jeweller's Orb on a hero (C §C.5.4, MvM rule): one more support slot,
 * below the orb's ceiling, filled at once with a compatible support (never
 * a duplicate or a second tier of a family, tier-gated by level); rarity
 * follows the new count. Pure.
 */
export function applyJeweller(hero: HeroInstance, orb: HeroOrb, rng: Rng): HeroCraftResult {
  if (orb === "lesser" && hero.supports.length >= SALVAGE_TUNING.lesserJewellerCeiling)
    return { ok: false, reason: "full" };
  const [support] = rollSupports(hero.skillId, hero.level, 1, rng, hero.supports);
  if (!support) return { ok: false, reason: "no-legal-support" };
  const supports = [...hero.supports, support];
  return { ok: true, hero: { ...hero, supports, rarity: rarityFor(supports.length) } };
}

/** Where a hero lives: the stash or a roster card. */
function locateHero(account: AccountState, heroId: OwnedHeroId) {
  const index = account.stash.heroes.findIndex((h) => h.id === heroId);
  if (index >= 0)
    return {
      hero: account.stash.heroes[index]!,
      put: (next: HeroInstance) => void (account.stash.heroes[index] = next),
    };
  for (const card of [...account.roster.slots, account.roster.spell])
    if (card?.hero.id === heroId)
      return { hero: card.hero, put: (next: HeroInstance) => void (card.hero = next) };
  return null;
}

/** A hero orb on an account's hero, spent only on success, logged by hero ID (plan 2.13). */
export function craftHero(
  account: AccountState,
  orb: HeroOrb,
  heroId: OwnedHeroId,
  log: (line: string) => void = () => {},
): HeroCraftResult {
  const found = locateHero(account, heroId);
  if (!found) return { ok: false, reason: "unknown-hero" };
  if ((account.currency[HERO_ORBS[orb]] ?? 0) < 1) return { ok: false, reason: "no-orb" };
  const result = applyJeweller(
    found.hero,
    orb,
    streamRng(createStreams(account.nextSeed), "heroGen"),
  );
  if (!result.ok) {
    log(`[craft] hero ${heroId}: ${orb} jeweller refused (${result.reason})`);
    return result;
  }
  account.nextSeed++;
  account.currency[HERO_ORBS[orb]] = (account.currency[HERO_ORBS[orb]] ?? 0) - 1;
  found.put(result.hero);
  log(`[craft] hero ${heroId}: ${orb} jeweller → ${result.hero.supports.join(",")}`);
  return result;
}

/** Turns every full stack of shards into its orb (C §C.5.6: merged automatically in the stash). */
export function mergeShards(account: AccountState): void {
  for (const [shard, orb] of Object.entries(MERGES_INTO)) {
    const have = account.currency[shard] ?? 0;
    const orbs = Math.floor(have / SALVAGE_TUNING.shardsPerOrb);
    if (orbs === 0) continue;
    account.currency[shard] = have - orbs * SALVAGE_TUNING.shardsPerOrb;
    account.currency[orb] = (account.currency[orb] ?? 0) + orbs;
  }
}

type SalvageTarget = { kind: "item"; id: ItemId } | { kind: "hero"; id: OwnedHeroId };
type SalvageResult = { ok: true } | { ok: false; reason: "normal" | "not-in-stash" };

/**
 * Salvages a stash item or hero into shards per C §C.5.6, then merges full
 * stacks. Normal items and heroes are refused: they sell instead. Equipped
 * items and roster heroes must go to the stash first.
 */
export function salvage(account: AccountState, target: SalvageTarget): SalvageResult {
  const t = SALVAGE_TUNING;
  let shard: string;
  let count: number;
  if (target.kind === "item") {
    const index = account.stash.items.findIndex((i) => i.id === target.id);
    const item = account.stash.items[index];
    if (!item) return { ok: false, reason: "not-in-stash" };
    if (item.rarity === "normal") return { ok: false, reason: "normal" };
    shard = item.rarity === "magic" ? SHARDS.transmutation : SHARDS.regal;
    count =
      item.rarity === "magic"
        ? t.item.magic
        : item.rarity === "unique"
          ? t.item.unique
          : item.mods.length >= 6
            ? t.item.rareSixMods
            : t.item.rare;
    account.stash.items.splice(index, 1);
  } else {
    const index = account.stash.heroes.findIndex((h) => h.id === target.id);
    const hero = account.stash.heroes[index];
    if (!hero) return { ok: false, reason: "not-in-stash" };
    if (hero.rarity === "normal") return { ok: false, reason: "normal" };
    shard = SHARDS.jeweller;
    count =
      hero.rarity === "magic"
        ? t.hero.magic
        : hero.supports.length >= 4
          ? t.hero.rareFourSupports
          : t.hero.rare;
    account.stash.heroes.splice(index, 1);
  }
  account.currency[shard] = (account.currency[shard] ?? 0) + count;
  mergeShards(account);
  return { ok: true };
}
