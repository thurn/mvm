import { heroGems } from "../data";
import type { GemId } from "../data/types";
import { catalogEntry, HERO_CATALOG } from "../heroes/model/catalog";
import { newHero, type HeroInstance } from "../heroes/model/hero";
import { ACCOUNT_TUNING } from "../tuning/progression";
import type { AccountState } from "./state";

type Rng = () => number;

const DAMAGE_TAGS = new Set(["physical", "fire", "cold", "lightning", "chaos"]);

function damageTags(skillId: string): Set<string> {
  const gem = heroGems().find((g) => g.id === skillId);
  return new Set((gem?.tags ?? []).filter((t) => DAMAGE_TAGS.has(t)));
}

function rosterSkills(account: AccountState): string[] {
  return account.roster.slots.flatMap((c) => (c ? [c.hero.skillId] : []));
}

/** Whether a hero shares a weapon class or a damage-type tag with a roster hero (Appendix E §3.3). */
export function rosterMatches(account: AccountState, skillId: string): boolean {
  const weapon = catalogEntry(skillId).weapon;
  const tags = damageTags(skillId);
  return rosterSkills(account).some((other) => {
    if (weapon !== null && catalogEntry(other).weapon === weapon) return true;
    for (const tag of damageTags(other)) if (tags.has(tag)) return true;
    return false;
  });
}

/** Heroes that can be offered: catalog heroes with imported gem data, or MvM custom heroes. */
function offerPool(): string[] {
  const imported = new Set(heroGems().map((g) => g.id as string));
  return Object.keys(HERO_CATALOG)
    .filter((id) => catalogEntry(id).role !== "spell")
    .filter((id) => id.startsWith("MvM/") || imported.has(id))
    .sort();
}

/**
 * A choose-1-of-3 hero offer (Appendix E §4.5): distinct heroes at the
 * listed rarity and level, at least one matching the roster. 1.18's hero
 * generation adds rarity and supports.
 */
export function heroOffer(
  account: AccountState,
  level: number,
  rng: Rng,
  newId: () => string,
): HeroInstance[] {
  const pool = offerPool();
  const picks: string[] = [];
  while (picks.length < ACCOUNT_TUNING.offerSize && picks.length < pool.length) {
    const left = pool.filter((id) => !picks.includes(id));
    picks.push(left[Math.floor(rng() * left.length)]!);
  }
  if (!picks.some((id) => rosterMatches(account, id))) {
    const matching = pool.filter((id) => !picks.includes(id) && rosterMatches(account, id));
    if (matching.length > 0)
      picks[picks.length - 1] = matching[Math.floor(rng() * matching.length)]!;
  }
  return picks.map((skillId) => newHero(newId(), skillId as GemId, level));
}
