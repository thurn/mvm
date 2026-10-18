import type { AccountState } from "../../account/state";

/**
 * Takes one hero from a level's pending choose-1-of-3 (Appendix E §4.5)
 * into the stash and clears the choice. False, writing nothing, when there
 * is no such choice or the hero was not offered.
 */
export function chooseHero(account: AccountState, levelId: string, heroId: string): boolean {
  const index = account.pendingChoices.findIndex((c) => c.levelId === levelId);
  const hero = account.pendingChoices[index]?.options.find((h) => h.id === heroId);
  if (!hero) return false;
  account.pendingChoices.splice(index, 1);
  account.stash.heroes.push(hero);
  return true;
}
