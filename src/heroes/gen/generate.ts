import { heroGems, spellGems } from "../../data";
import type { GemId } from "../../data/types";
import { HERO_GEN_TUNING as T } from "../../tuning/heroes";
import { catalogEntry, HERO_CATALOG } from "../model/catalog";
import { newHero, type HeroInstance, type OwnedHeroId } from "../model/hero";
import { rollSupports } from "./supports";

type Rng = () => number;
type Rarity = "normal" | "magic" | "rare";

const DAMAGE_TAGS = new Set(["physical", "fire", "cold", "lightning", "chaos"]);

function pickOdds<T>(table: readonly (readonly [T, number])[], rng: Rng): T {
  let roll = rng();
  for (const [value, odds] of table) {
    roll -= odds;
    if (roll < 0) return value;
  }
  return table[table.length - 1]![0];
}

const pickUniform = <T>(items: readonly T[], rng: Rng): T =>
  items[Math.floor(rng() * items.length)]!;

/** The minimum area level a skill can drop or sell at: max(1, 2 × tier − 3) (B §1.8). */
export function unlockAreaLevel(skillId: string): number {
  if (skillId.startsWith("MvM/")) return catalogEntry(skillId).unlockArea ?? 1;
  const gem = [...heroGems(), ...spellGems()].find((g) => g.id === skillId);
  if (!gem) throw new Error(`no gem data for ${skillId}`);
  return Math.max(1, 2 * gem.craftingLevel - 3);
}

/** Heroes that can generate: catalog heroes with imported gem data, or MvM custom heroes. */
export function heroPool(): string[] {
  const imported = new Set(heroGems().map((g) => g.id as string));
  return Object.keys(HERO_CATALOG)
    .filter((id) => catalogEntry(id).role !== "spell")
    .filter((id) => id.startsWith("MvM/") || imported.has(id))
    .sort();
}

/** Spells that can generate: catalog spells with imported gem data. */
export function spellPool(): string[] {
  const imported = new Set(spellGems().map((g) => g.id as string));
  return Object.keys(HERO_CATALOG)
    .filter((id) => catalogEntry(id).role === "spell" && imported.has(id))
    .sort();
}

function damageTags(skillId: string): Set<string> {
  const gem = heroGems().find((g) => g.id === skillId);
  return new Set((gem?.tags ?? []).filter((t) => DAMAGE_TAGS.has(t)));
}

/** Whether a hero shares a weapon class or a damage-type tag with a roster hero (E §3.3). */
export function sharesRosterTags(skillId: string, roster: readonly string[]): boolean {
  const weapon = catalogEntry(skillId).weapon;
  const tags = damageTags(skillId);
  return roster.some((other) => {
    if (weapon !== null && catalogEntry(other).weapon === weapon) return true;
    for (const tag of damageTags(other)) if (tags.has(tag)) return true;
    return false;
  });
}

/** Rarity from the base weights with a source's rarity bonus (B §7.3); no unique heroes. */
export function rollRarity(rarityBonus: number, rng: Rng): Rarity {
  const w = T.rarityWeights;
  const weights: [Rarity, number][] = [
    ["normal", w.normal],
    ["magic", w.magic * (1 + rarityBonus)],
    ["rare", w.rare * (1 + rarityBonus)],
  ];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  return pickOdds(
    weights.map(([rarity, weight]) => [rarity, weight / total] as const),
    rng,
  );
}

/** How many supports a rarity rolls (B §1.9). */
export function supportCount(rarity: Rarity, rng: Rng): number {
  return pickOdds(T.supportCounts[rarity], rng);
}

/** A kill drop's level: base + offset, clamped to 1 and the unlocked headroom (B §7.2). */
export function rollLevel(base: number, highestUnlocked: number, rng: Rng): number {
  const max = Math.min(T.maxHeroLevel, highestUnlocked + T.levelHeadroom);
  return Math.max(1, Math.min(max, base + pickOdds(T.levelOffsets, rng)));
}

/** Rarity follows the support count (B §1.9): small pools drop the rarity to match. */
function rarityFor(supports: number): Rarity {
  return supports === 0 ? "normal" : supports <= 2 ? "magic" : "rare";
}

/** A hero or spell at a level and rarity, with its supports rolled. */
function build(
  skillId: string,
  level: number,
  rarity: Rarity,
  rng: Rng,
  id: OwnedHeroId,
): HeroInstance {
  const supports = rollSupports(skillId, level, supportCount(rarity, rng), rng);
  return { ...newHero(id, skillId as GemId, level), rarity: rarityFor(supports.length), supports };
}

/** Picks a hero skill: unlock-gated, 35% shaped toward the roster (B §7.4, E §3.3). */
function chooseHeroSkill(areaLevel: number, roster: readonly string[], rng: Rng): string {
  const unlocked = heroPool().filter((id) => unlockAreaLevel(id) <= areaLevel);
  const matching = unlocked.filter((id) => sharesRosterTags(id, roster));
  const shaped = matching.length > 0 && rng() < T.rosterShaping;
  return pickUniform(shaped ? matching : unlocked, rng);
}

interface DropSource {
  /** The source's area level, with E's +1 rare / +2 boss already added. */
  areaLevel: number;
  highestUnlocked: number;
  /** The source's rarity bonus as a fraction (+100% is 1). */
  rarityBonus: number;
  /** A rarity the drop already rolled (an unrolled stash drop); otherwise rolled here. */
  rarity?: Rarity;
  rng: Rng;
  id: OwnedHeroId;
}

/** A hero drop (B §7): skill, then level, then rarity and supports. */
export function generateHero(source: DropSource & { roster: readonly string[] }): HeroInstance {
  const skillId = chooseHeroSkill(source.areaLevel, source.roster, source.rng);
  const level = rollLevel(source.areaLevel, source.highestUnlocked, source.rng);
  return build(
    skillId,
    level,
    source.rarity ?? rollRarity(source.rarityBonus, source.rng),
    source.rng,
    source.id,
  );
}

/** A spell drop: unshaped over unlocked spells (B §7.4). */
export function generateSpell(source: DropSource): HeroInstance {
  const unlocked = spellPool().filter((id) => unlockAreaLevel(id) <= source.areaLevel);
  const skillId = pickUniform(unlocked, source.rng);
  const level = rollLevel(source.areaLevel, source.highestUnlocked, source.rng);
  return build(
    skillId,
    level,
    source.rarity ?? rollRarity(source.rarityBonus, source.rng),
    source.rng,
    source.id,
  );
}

/**
 * "Choose 1 of 3" (E §4.5): three distinct skills at a fixed rarity and level,
 * with at least one hero matching the roster when any can.
 */
export function chooseOneOfThree(options: {
  kind: "hero" | "spell";
  rarity: Rarity;
  level: number;
  areaLevel: number;
  roster: readonly string[];
  rng: Rng;
  newId: () => OwnedHeroId;
}): HeroInstance[] {
  const { rng } = options;
  const pool = (options.kind === "hero" ? heroPool() : spellPool()).filter(
    (id) => unlockAreaLevel(id) <= options.areaLevel,
  );
  const picks: string[] = [];
  while (picks.length < T.offerSize && picks.length < pool.length)
    picks.push(
      pickUniform(
        pool.filter((id) => !picks.includes(id)),
        rng,
      ),
    );
  if (options.kind === "hero" && !picks.some((id) => sharesRosterTags(id, options.roster))) {
    const matching = pool.filter(
      (id) => !picks.includes(id) && sharesRosterTags(id, options.roster),
    );
    if (matching.length > 0) picks[picks.length - 1] = pickUniform(matching, rng);
  }
  return picks.map((skillId) =>
    build(skillId, options.level, options.rarity, rng, options.newId()),
  );
}
