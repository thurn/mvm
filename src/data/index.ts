/**
 * Typed, read-only accessors over the committed PoE2 data in `data/` (P19).
 * The data is imported at build time; nothing here fetches.
 */
import bases from "../../data/bases.json";
import currency from "../../data/currency.json";
import heroes from "../../data/heroes.json";
import modsData from "../../data/mods.json";
import monsterStats from "../../data/monster-stats.json";
import spells from "../../data/spells.json";
import supports from "../../data/supports.json";
import { REPLACED_BY_TEAM, TEAM_IMPLICITS, TEAM_MODS } from "./team";
import type {
  BaseItemData,
  CurrencyData,
  GemData,
  ModData,
  MonsterLevelStats,
} from "./types";

const HEROES = heroes as unknown as readonly GemData[];
const SPELLS = spells as unknown as readonly GemData[];
const SUPPORTS = supports as unknown as readonly GemData[];
// Ring resistance implicits are team resistances (Appendix C §C.2.4, §C.3.8).
const BASES = (bases as unknown as readonly BaseItemData[]).map((base) =>
  base.implicits.some((i) => i.id in TEAM_IMPLICITS)
    ? {
        ...base,
        implicits: base.implicits.map((i) => ({ ...i, stats: TEAM_IMPLICITS[i.id] ?? i.stats })),
      }
    : base,
);
// MvM's team mods join the PoE2 catalog, and replace the hero-only resistances.
const MODS = [
  ...(modsData as unknown as readonly ModData[]).filter((m) => !REPLACED_BY_TEAM.test(m.id)),
  ...TEAM_MODS,
];
const CURRENCY = currency as unknown as readonly CurrencyData[];
const MONSTER_STATS = monsterStats as readonly MonsterLevelStats[];

export const heroGems = (): readonly GemData[] => HEROES;
export const spellGems = (): readonly GemData[] => SPELLS;
export const supportGems = (): readonly GemData[] => SUPPORTS;
export const baseItems = (): readonly BaseItemData[] => BASES;
export const mods = (): readonly ModData[] => MODS;
export const currencies = (): readonly CurrencyData[] => CURRENCY;

/** `default_monster_stats` at an area level (Appendix A §2.2). */
export function monsterLevelStats(level: number): MonsterLevelStats {
  const row = MONSTER_STATS.find((r) => r.level === level);
  if (!row) throw new Error(`no default monster stats for area level ${level}`);
  return row;
}
