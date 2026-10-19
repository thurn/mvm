import { currencies } from "../../data";
import { SHARDS } from "../../loot/craft/heroes";

/** MvM currencies the PoE2 data has no entry for (the Jeweller's Shard, C §C.5.6). */
const MVM_CURRENCIES = [{ id: SHARDS.jeweller, name: "Jeweller's Shard" }];

/** Every currency the hideout lists, in display order. */
export const listedCurrencies = (): readonly { id: string; name: string }[] => [
  ...currencies(),
  ...MVM_CURRENCIES,
];

/** A currency's display name. */
export function currencyName(id: string): string {
  return listedCurrencies().find((c) => c.id === id)?.name ?? id.split("/").pop() ?? id;
}
