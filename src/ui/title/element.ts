import type { AccountState } from "../../account/state";
import { teamSheet } from "../../heroes/model/team";
import type { LevelDefinition } from "../../monsters/levels/types";
import { COMBAT_RULES } from "../../tuning/combat";

/** A level's element against the team's resistance to it, for its campaign card. */
export interface ElementPreview {
  label: string;
  resist: number;
  cap: number;
}

/**
 * The biome element next to the team's resistance (GDD §15 campaign map),
 * e.g. "Fire 34% / 75%": the roster's team resistance to that element, plus
 * all-elemental for fire, cold and lightning, against the default cap.
 * Null for a biome without an element (the Grassland).
 */
export function elementPreview(
  level: LevelDefinition,
  account: AccountState,
): ElementPreview | null {
  if (!level.element) return null;
  const roster = [...account.roster.slots, account.roster.spell].flatMap((c) => (c ? [c] : []));
  const sheet = teamSheet(roster);
  const own = sheet[`${level.element}_resistance_%`] ?? 0;
  const all = level.element === "chaos" ? 0 : (sheet["all_elemental_resistances_%"] ?? 0);
  return {
    label: level.element[0]!.toUpperCase() + level.element.slice(1),
    resist: own + all,
    cap: COMBAT_RULES.defaultMaxResistPercent,
  };
}
