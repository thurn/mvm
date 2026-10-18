import { totalDamage, damageMap } from "../../combat/damage";
import { convert, critChance, critMultiplier, gainAsExtra, scale } from "../../combat/hit";
import { DAMAGE_TYPES, type DamageType } from "../../combat/stats";
import { heroGems, spellGems } from "../../data";
import { buildKit } from "../../heroes/board/kit";
import { aggregate } from "../../heroes/model/aggregate";
import type { Card } from "../../heroes/model/hero";

export interface CardSummary {
  /** Expected damage per second against an unmitigated target; 0 for heroes that don't hit. */
  dps: number;
  /** Effective hit points: life plus energy shield. */
  ehp: number;
  /** The main hit's expected damage, crits included; 0 for heroes that don't hit. */
  perHit: number;
  /** Actions (attacks or casts) per second; 0 for heroes that don't hit. */
  actionsPerSecond: number;
  /** The main hit's damage mix after conversion and gained-as-extra, as shares summing to 1. */
  mix: Partial<Record<DamageType, number>>;
}

/**
 * "DPS on this card" and EHP (H §4.4, §5.1): the card's main hit, averaged,
 * through conversion, gained-as-extra and scaling, times expected crit, over
 * its action interval. Not the full combat model: no mitigation or targets.
 */
export function cardSummary(card: Card): CardSummary {
  const sheet = aggregate(card);
  const gem = [...heroGems(), ...spellGems()].find((g) => g.id === card.hero.skillId);
  const kit = buildKit(card.hero.skillId, { sheet, gem });
  const ehp = sheet.actor.maxLife + sheet.actor.maxEs;
  const hit = kit ? Object.values(kit.hits)[0] : undefined;
  if (!kit || !hit || kit.actionSeconds <= 0)
    return { dps: 0, ehp, perHit: 0, actionsPerSecond: 0, mix: {} };
  const stats = sheet.actor.stats;
  const average = damageMap();
  for (const type of DAMAGE_TYPES) {
    const range = hit.base[type];
    if (range) average[type] = (range.min + range.max) / 2;
  }
  const scaled = scale(gainAsExtra(convert(average, hit.conversion, stats), stats), hit, stats);
  const total = totalDamage(scaled);
  const crit = critChance(hit, stats);
  const perHit = total * (1 + crit * (critMultiplier(stats) - 1));
  const mix: Partial<Record<DamageType, number>> = {};
  for (const type of DAMAGE_TYPES)
    if (scaled[type] > 0) mix[type] = scaled[type] / Math.max(1e-9, total);
  return {
    dps: perHit / kit.actionSeconds,
    ehp,
    perHit,
    actionsPerSecond: 1 / kit.actionSeconds,
    mix,
  };
}
