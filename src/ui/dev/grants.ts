import { acquireHero, acquireItem } from "../../account/stash";
import type { OwnedHeroId } from "../../heroes/model/hero";
import type { ItemId } from "../../heroes/model/item";
import type { AccountState } from "../../account/state";
import { xpForLevel } from "../../account/xp";
import { chooseOneOfThree } from "../../heroes/gen/generate";
import type { HeroInstance } from "../../heroes/model/hero";
import type { ItemInstance } from "../../heroes/model/item";
import { generateGear } from "../../loot/items";
import type { RoundState } from "../../sim/state";

type Rng = () => number;
type Rarity = "normal" | "magic" | "rare";

/** Grants a rolled item through the real gear generator into the stash (GDD §15). */
export function grantItem(
  account: AccountState,
  request: { level: number; rarity: Rarity | "unique"; itemClass?: string },
  rng: Rng,
  newId: () => ItemId,
): ItemInstance {
  const item = generateGear(
    {
      ilvl: request.level,
      rarity: request.rarity,
      ...(request.itemClass ? { itemClass: request.itemClass } : {}),
      newId,
    },
    rng,
  );
  return acquireItem(account, item);
}

/** Grants a generated hero or spell at a chosen level and rarity into the stash. */
export function grantHero(
  account: AccountState,
  request: { kind: "hero" | "spell"; level: number; rarity: Rarity },
  rng: Rng,
  newId: () => OwnedHeroId,
): HeroInstance {
  const roster = account.roster.slots.flatMap((card) => (card ? [card.hero.skillId] : []));
  const [hero] = chooseOneOfThree({
    kind: request.kind,
    rarity: request.rarity,
    level: request.level,
    areaLevel: Math.max(1, request.level),
    roster,
    rng,
    newId,
  });
  if (!hero) throw new Error(`no ${request.kind} can generate at level ${request.level}`);
  return acquireHero(account, hero);
}

export function grantCurrency(account: AccountState, currencyId: string, count: number): void {
  account.currency[currencyId] = (account.currency[currencyId] ?? 0) + count;
}

export function grantGold(account: AccountState, amount: number): void {
  account.gold += amount;
}

/** Sets the player level, with the XP that level needs. */
export function setPlayerLevel(account: AccountState, level: number): void {
  account.player.level = Math.max(1, Math.floor(level));
  account.player.xp = xpForLevel(account.player.level);
}

/** Ends the running round with a chosen result; the game's own level end takes it from there. */
export function skipToLevelEnd(round: RoundState, result: "won" | "lost"): void {
  round.result = result;
}
