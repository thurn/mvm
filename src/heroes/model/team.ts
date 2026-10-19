import { baseItems, mods } from "../../data";
import { teamStatOf, type TeamStat } from "../../data/team";
import type { Card } from "./hero";
import type { ItemInstance } from "./item";

/** The team stat sheet (Appendix A §2.1): team stats by the hero stat they become. */
export type TeamSheet = Partial<Record<TeamStat, number>>;

/** The `team_` stats one item carries, from its mods and implicits. */
function itemTeamStats(item: ItemInstance, add: (stat: TeamStat, value: number) => void) {
  const base = baseItems().find((b) => b.id === item.baseId);
  const rolled = [
    ...(item.implicits ?? []).map((r) => ({
      r,
      stats: base?.implicits.find((i) => i.id === r.modId)?.stats,
    })),
    ...item.mods.map((r) => ({ r, stats: mods().find((m) => m.id === r.modId)?.stats })),
  ];
  for (const { r, stats } of rolled)
    stats?.forEach((raw, i) => {
      const stat = teamStatOf(raw.id);
      const value = r.values[i];
      if (stat && value !== undefined) add(stat, value);
    });
}

/**
 * Sums the roster's team stats (Appendix A §2.1, C §C.1.7): each roster
 * card's items count once, placed or not, however many copies are out.
 * Pass only roster cards; stashed heroes contribute nothing.
 */
export function teamSheet(roster: readonly Card[]): TeamSheet {
  const sheet: TeamSheet = {};
  const add = (stat: TeamStat, value: number) => (sheet[stat] = (sheet[stat] ?? 0) + value);
  for (const card of roster)
    for (const item of [card.weapon, card.armour, card.accessory])
      if (item) itemTeamStats(item, add);
  return sheet;
}
