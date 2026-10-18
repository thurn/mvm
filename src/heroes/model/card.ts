import { supportGems } from "../../data";
import type { GemData } from "../../data/types";
import { HERO_TUNING } from "../../tuning/heroes";
import { catalogEntry } from "./catalog";
import type { Card } from "./hero";

/**
 * Mana cost (Appendix B §1.11): role base × the supports' cost multipliers,
 * rounded to the nearest 25 (halves up), at least 25. Level and items never
 * change it.
 */
export function cardCost(card: Card, supports: readonly GemData[] = supportGems()): number {
  let cost = catalogEntry(card.hero.skillId).baseMana;
  for (const supportId of card.hero.supports) {
    const gem = supports.find((g) => g.id === supportId);
    if (!gem) throw new Error(`unknown support ${supportId}`);
    for (const skill of gem.skills) {
      const multiplier = (skill.static as { cost_multiplier?: number } | null)?.cost_multiplier;
      if (multiplier !== undefined) cost *= multiplier / 100;
    }
  }
  const { costStep, minimumCost } = HERO_TUNING;
  return Math.max(minimumCost, Math.floor(cost / costStep + 0.5) * costStep);
}

/** Recharge seconds after placing (Appendix B §1.11). */
export function rechargeSeconds(skillId: string): number {
  return HERO_TUNING.rechargeSeconds[catalogEntry(skillId).recharge];
}
