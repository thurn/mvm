import { heroGems, spellGems } from "../../data";
import { draw } from "../../sim/rng";
import { newInstanceId, type HeroState, type RoundState } from "../../sim/state";
import { HERO_BOARD_TUNING } from "../../tuning/heroes";
import { aggregate } from "../model/aggregate";
import type { Card } from "../model/hero";
import { teamSheet } from "../model/team";
import { buildKit } from "./kit";

/**
 * Places a copy of a card on a tile: aggregates its stat block, with the
 * locked roster's team sheet, and stores the resolved kit in the round
 * (P16). The placement rules and mana cost belong to the economy (1.20).
 */
export function placeHero(state: RoundState, card: Card, lane: number, column: number): HeroState {
  const sheet = aggregate(card, { team: roundTeam(state) });
  const gem = [...heroGems(), ...spellGems()].find((g) => g.id === card.hero.skillId);
  const kit = buildKit(card.hero.skillId, { sheet, gem });
  if (kit?.behavior === "acolyte") {
    const t = HERO_BOARD_TUNING.acolyte;
    kit.counters.orbTimer =
      t.firstOrbMinSeconds + draw(state.rng, "sky") * (t.firstOrbMaxSeconds - t.firstOrbMinSeconds);
  }
  const hero: HeroState = {
    id: newInstanceId<"HeroInstance">(state),
    lane,
    column,
    actor: structuredClone(sheet.actor),
    skillId: card.hero.skillId,
    ...(kit ? { kit } : {}),
  };
  state.heroes.push(hero);
  return hero;
}

/** The team sheet of the round's locked roster heroes (A §2.1: fixed when the level starts). */
export function roundTeam(state: RoundState) {
  return teamSheet(state.roster.filter((s) => s.kind === "hero").map((s) => s.card));
}
