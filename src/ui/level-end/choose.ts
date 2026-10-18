import type { AccountState } from "../../account/state";
import { starterWeapon } from "../../heroes/model/starter";

/**
 * Takes one hero from a level's pending choose-1-of-3 (Appendix E §4.5)
 * into the stash, with its starter weapon, and clears the choice. False,
 * writing nothing, when there is no such choice or the hero was not offered.
 */
export function chooseHero(account: AccountState, levelId: string, heroId: string): boolean {
  const index = account.pendingChoices.findIndex((c) => c.levelId === levelId);
  const hero = account.pendingChoices[index]?.options.find((h) => h.id === heroId);
  if (!hero) return false;
  account.pendingChoices.splice(index, 1);
  account.stash.heroes.push(hero);
  // A new hero brings its class's starter weapon, so it can fight once slotted.
  const weapon = starterWeapon(hero);
  if (weapon) account.stash.items.push(weapon);
  return true;
}
