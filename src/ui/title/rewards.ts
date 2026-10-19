import { currencies } from "../../data";
import { SHARDS } from "../../loot/craft/heroes";
import type { FirstClearReward } from "../../tuning/progression";

/** A currency's display name; the MvM-only shard has no PoE2 entry. */
const currencyName = (id: string) =>
  id === SHARDS.jeweller ? "Jeweller's Shard" : (currencies().find((c) => c.id === id)?.name ?? id);

/** A first-clear reward as display lines (E §4.5): the slot, the offer, the currency, the points. */
export function rewardParts(reward: FirstClearReward | undefined): string[] {
  if (!reward) return [];
  return [
    ...(reward.unlockSlot ? [`Slot ${reward.unlockSlot} unlocked`] : []),
    ...(reward.heroOffer
      ? [`Choose 1 of 3 ${reward.heroOffer.rarity} heroes (level ${reward.heroOffer.level})`]
      : []),
    ...Object.entries(reward.currency ?? {}).map(([id, n]) => `${n}× ${currencyName(id)}`),
    ...(reward.passivePoints ? [`${reward.passivePoints} passive points`] : []),
  ];
}
