import type { StatSheet } from "../combat/stats";
import { stat } from "../combat/stats";
import type { ItemId, ItemInstance } from "../heroes/model/item";
import { LOOT_TUNING, STRONGBOX_TUNING } from "../tuning/loot";
import { goldPileSize } from "./gold";
import { generateGear, itemLevel, pickWeighted, rollItemRarity, type MonsterRarity } from "./items";

type Rng = () => number;

/** One drop from a kill (Appendix E §3–§5). Heroes and spells carry their rolled rarity; 1.18 generates them. */
export type Drop =
  | { kind: "item"; item: ItemInstance }
  | { kind: "hero" | "spell"; rarity: "normal" | "magic" | "rare"; itemLevel: number }
  | { kind: "currency"; currencyId: string }
  | { kind: "gold"; amount: number };

export interface KilledMonster {
  rarity: MonsterRarity;
  affixCount: number;
  areaLevel: number;
  /** A boss's unique pool (names, C §C.4.1): it also drops one of these and a rare hero (D §7). */
  uniquePool?: readonly string[];
}

export interface DropContext {
  /** The killing hero's stats: `item_rarity_+%` and `gold_found_+%` (E §3.1). */
  killerStats?: StatSheet;
  /** Weapon classes the current roster uses, for build-aware shaping (E §3.3). */
  rosterWeaponClasses: readonly string[];
  newId: () => ItemId;
}

function rollCount(expected: number, rng: Rng): number {
  const whole = Math.floor(expected);
  return whole + (rng() < expected - whole ? 1 : 0);
}

function itemRolls(monster: KilledMonster): number {
  const r = LOOT_TUNING.itemRolls;
  switch (monster.rarity) {
    case "normal":
      return r.normal;
    case "magic":
      return r.magic;
    case "rare":
      return r.rareBase * (1 + r.rarePerAffixBonus * monster.affixCount);
    default:
      return r.boss;
  }
}

/** The monster's rarity bonus R plus the killer's item rarity (C.6 step 3). */
function rarityBonus(monster: KilledMonster, killer: StatSheet): number {
  const b = LOOT_TUNING.rarityBonus;
  const fromMonster =
    monster.rarity === "magic"
      ? b.magicPerAffix * monster.affixCount
      : monster.rarity === "rare"
        ? b.rarePerAffix * monster.affixCount
        : monster.rarity === "boss" || monster.rarity === "unique"
          ? b.boss
          : 0;
  return fromMonster + stat(killer, "item_rarity_+%") / 100;
}

function rollCurrency(areaLevel: number, rng: Rng): string | null {
  const eligible = LOOT_TUNING.currencies.filter((c) => c.dropLevel <= areaLevel);
  if (eligible.length === 0) return null;
  return pickWeighted(
    eligible.map((c) => ({ value: c.id, weight: c.weight })),
    rng,
  );
}

/**
 * Every outcome of one kill (Appendix E §3–§5): item rolls (gear, hero or
 * spell, with rarity and full gear rolls), currency, and gold piles. Pure:
 * draws only from `rng`, the `loot` stream.
 */
export function rollDrops(monster: KilledMonster, context: DropContext, rng: Rng): Drop[] {
  const t = LOOT_TUNING;
  const killer = context.killerStats ?? {};
  const drops: Drop[] = [];
  const ilvl = itemLevel(monster.areaLevel, monster.rarity);
  const bonus = rarityBonus(monster, killer);

  if (monster.uniquePool) {
    drops.push({
      kind: "item",
      item: generateGear(
        { ilvl, rarity: "unique", uniquePool: monster.uniquePool, newId: context.newId },
        rng,
      ),
    });
    drops.push({ kind: "hero", rarity: "rare", itemLevel: ilvl });
  }

  for (let i = rollCount(itemRolls(monster), rng); i > 0; i--) {
    const category = pickWeighted(
      [
        { value: "gear" as const, weight: t.categories.gear },
        { value: "hero" as const, weight: t.categories.hero },
        { value: "spell" as const, weight: t.categories.spell },
      ],
      rng,
    );
    if (category === "gear") {
      drops.push({
        kind: "item",
        item: generateGear(
          {
            ilvl,
            rarityBonus: bonus,
            rosterWeaponClasses: context.rosterWeaponClasses,
            newId: context.newId,
          },
          rng,
        ),
      });
    } else {
      // No unique heroes or spells: a unique roll becomes rare (C.6 step 3).
      const rarity = rollItemRarity(bonus, rng);
      drops.push({
        kind: category,
        rarity: rarity === "unique" ? "rare" : rarity,
        itemLevel: ilvl,
      });
    }
  }

  const currencyRolls =
    monster.rarity === "boss" || monster.rarity === "unique"
      ? t.bossCurrencyRolls
      : rng() < t.currencyChance[monster.rarity]
        ? 1
        : 0;
  for (let i = 0; i < currencyRolls; i++) {
    const currencyId = rollCurrency(monster.areaLevel, rng);
    if (currencyId) drops.push({ kind: "currency", currencyId });
  }

  const gold = t.goldPiles[monster.rarity === "unique" ? "boss" : monster.rarity];
  if (rng() < gold.chance) {
    const goldFound = stat(killer, "gold_found_+%");
    for (let i = 0; i < gold.piles; i++)
      drops.push({ kind: "gold", amount: goldPileSize(monster.areaLevel, goldFound, rng) });
  }
  return drops;
}

/**
 * A Strongbox's reward (Appendix D §9): a guaranteed rare item, item rolls
 * at rare-monster rarity, a hero roll and currency rolls, all at area level
 * + 1. Pure: draws only from `rng`, the `loot` stream.
 */
export function rollStrongboxReward(areaLevel: number, context: DropContext, rng: Rng): Drop[] {
  const r = STRONGBOX_TUNING.reward;
  const ilvl = areaLevel + r.ilvlBonus;
  const drops: Drop[] = [];
  const gear = (rarity?: "rare") =>
    generateGear(
      {
        ilvl,
        ...(rarity ? { rarity } : { rarityBonus: r.rarityBonus }),
        rosterWeaponClasses: context.rosterWeaponClasses,
        newId: context.newId,
      },
      rng,
    );
  for (let i = 0; i < r.rareItems; i++) drops.push({ kind: "item", item: gear("rare") });
  for (let i = 0; i < r.itemRolls; i++) drops.push({ kind: "item", item: gear() });
  for (let i = 0; i < r.heroRolls; i++) {
    const rarity = rollItemRarity(r.rarityBonus, rng);
    drops.push({ kind: "hero", rarity: rarity === "unique" ? "rare" : rarity, itemLevel: ilvl });
  }
  for (let i = 0; i < r.currencyRolls; i++) {
    const currencyId = rollCurrency(areaLevel, rng);
    if (currencyId) drops.push({ kind: "currency", currencyId });
  }
  return drops;
}
