import { cardCost, rechargeSeconds } from "../../heroes/model/card";
import { catalogEntry } from "../../heroes/model/catalog";
import type { Card } from "../../heroes/model/hero";
import { ECONOMY_TUNING } from "../../tuning/economy";
import type { RoundState } from "../state";

/** One locked roster card for the round: its loadout, cost and recharge (GDD §6.3). */
export interface RosterSlot {
  cardId: string;
  card: Card;
  kind: "hero" | "spell";
  cost: number;
  rechargeSeconds: number;
  rechargeLeft: number;
}

/**
 * Locks the roster for the level: each card is copied into the round, so
 * hideout changes never reach it. Slow and very slow cards, and spells,
 * start recharging.
 */
export function lockRoster(state: RoundState, cards: readonly Card[]): void {
  state.roster = cards.map((card) => {
    const entry = catalogEntry(card.hero.skillId);
    const spell = entry.role === "spell";
    return {
      cardId: card.hero.id,
      card: structuredClone(card),
      kind: spell ? "spell" : "hero",
      cost: cardCost(card),
      rechargeSeconds: spell ? (entry.cooldownSeconds ?? 0) : rechargeSeconds(card.hero.skillId),
      rechargeLeft: spell
        ? (entry.startCooldownSeconds ?? 0)
        : ECONOMY_TUNING.startRecharge[entry.recharge],
    };
  });
}
