import { mods } from "../../data";
import { TEAM_TEXT } from "../../data/team";
import type { ModData, RawModStat } from "../../data/types";

/**
 * PoE2-style line text for each M1 mod stat (Appendix C conventions). `#` is
 * the value. Added-damage min/max pairs read as one "Adds # to # …" line.
 */
const TEXT: Readonly<Record<string, string>> = {
  accuracy_rating: "+# to Accuracy Rating",
  local_accuracy_rating: "+# to Accuracy Rating",
  additional_all_attributes: "+# to all Attributes",
  additional_strength: "+# to Strength",
  additional_dexterity: "+# to Dexterity",
  additional_intelligence: "+# to Intelligence",
  "allies_in_presence_attack_speed_+%": "Allies in your Presence have #% increased Attack Speed",
  "allies_in_presence_cast_speed_+%": "Allies in your Presence have #% increased Cast Speed",
  "allies_in_presence_critical_strike_multiplier_+":
    "Allies in your Presence have #% increased Critical Damage Bonus",
  "allies_in_presence_damage_+%": "Allies in your Presence deal #% increased Damage",
  allies_in_presence_life_regeneration_rate_per_minute:
    "Allies in your Presence Regenerate # Life per second",
  "base_cast_speed_+%": "#% increased Cast Speed",
  "base_cold_damage_resistance_%": "+#% to Cold Resistance",
  "base_fire_damage_resistance_%": "+#% to Fire Resistance",
  "base_lightning_damage_resistance_%": "+#% to Lightning Resistance",
  "base_critical_strike_multiplier_+": "#% increased Critical Damage Bonus",
  "base_spell_critical_strike_multiplier_+": "#% increased Critical Spell Damage Bonus",
  base_evasion_rating: "+# to Evasion Rating",
  local_base_evasion_rating: "+# to Evasion Rating",
  "base_item_found_rarity_+%": "#% increased Rarity of Items found",
  base_life_gained_on_enemy_death: "Gain # Life per Enemy Killed",
  base_life_regeneration_rate_per_minute: "# Life Regeneration per second",
  base_maximum_energy_shield: "+# to maximum Energy Shield",
  local_energy_shield: "+# to maximum Energy Shield",
  base_maximum_life: "+# to maximum Life",
  base_maximum_mana: "+# to maximum Mana",
  base_physical_damage_reduction_rating: "+# to Armour",
  local_base_physical_damage_reduction_rating: "+# to Armour",
  "chaos_damage_+%": "#% increased Chaos Damage",
  "cold_damage_+%": "#% increased Cold Damage",
  "fire_damage_+%": "#% increased Fire Damage",
  "lightning_damage_+%": "#% increased Lightning Damage",
  "critical_strike_chance_+%": "#% increased Critical Hit Chance",
  "elemental_damage_with_attack_skills_+%": "#% increased Elemental Damage with Attacks",
  "evasion_rating_+%": "#% increased Evasion Rating",
  "light_radius_+%": "#% increased Light Radius",
  "local_armour_and_energy_shield_+%": "#% increased Armour and Energy Shield",
  "local_armour_and_evasion_+%": "#% increased Armour and Evasion",
  "local_attack_speed_+%": "#% increased Attack Speed",
  "local_block_chance_+%": "#% increased Block chance",
  local_critical_strike_chance: "+#% to Critical Hit Chance",
  "local_critical_strike_multiplier_+": "+#% to Critical Damage Bonus",
  "local_energy_shield_+%": "#% increased Energy Shield",
  "local_evasion_and_energy_shield_+%": "#% increased Evasion and Energy Shield",
  "local_evasion_rating_+%": "#% increased Evasion Rating",
  "local_hit_damage_stun_multiplier_+%": "Causes #% increased Stun Buildup",
  "local_physical_damage_+%": "#% increased Physical Damage",
  "local_physical_damage_reduction_rating_+%": "#% increased Armour",
  "local_spirit_+%": "#% increased Spirit",
  "maximum_energy_shield_+%": "#% increased maximum Energy Shield",
  "non_skill_base_all_damage_%_to_gain_as_cold": "Gain #% of Damage as Extra Cold Damage",
  "non_skill_base_all_damage_%_to_gain_as_fire": "Gain #% of Damage as Extra Fire Damage",
  "non_skill_base_all_damage_%_to_gain_as_lightning": "Gain #% of Damage as Extra Lightning Damage",
  "physical_damage_reduction_rating_+%": "#% increased Armour",
  "spell_damage_+%": "#% increased Spell Damage",
  "spell_physical_damage_+%": "#% increased Spell Physical Damage",
  "stun_threshold_+": "+# to Stun Threshold",
  "flask_life_to_recover_+%": "#% increased Life Recovered",
  "local_weapon_implicit_hidden_%_base_damage_is_fire": "#% of Physical Damage converted to Fire",
};

function humanize(statId: string, v: string): string {
  const words = statId
    .replace(/^(base|local)_/, "")
    .replace(/_\+%$/, "")
    .replace(/_%$/, "")
    .replace(/_/g, " ");
  return statId.endsWith("+%") ? `${v}% increased ${words}` : `${v} ${words}`;
}

/** Matches the minimum half of an added-damage pair; its maximum names the same rest. */
const ADDED = /^(.*?)(minimum|maximum)_(?:added|base)_(.+?)_damage$/;

function addsLine(prefix: string, element: string, min: string, max: string): string {
  const name = element === "physical" ? "Physical" : element[0]!.toUpperCase() + element.slice(1);
  const who = prefix.startsWith("allies_in_presence") ? "Allies in your Presence have: " : "";
  const thorns = prefix.startsWith("thorns") ? " Thorns damage" : "";
  return `${who}Adds ${min} to ${max} ${name} Damage${thorns}`.replace(
    "Damage Thorns damage",
    "Thorns damage",
  );
}

const value = (v: number, range: RawModStat | undefined, alt: boolean) =>
  alt && range && range.min !== range.max ? `${v}(${range.min}-${range.max})` : `${v}`;

/** A mod's display lines, one per stat (added-damage pairs merged), with ranges when `alt`. */
export function affixLines(
  stats: readonly RawModStat[],
  values: readonly number[],
  alt: boolean,
): string[] {
  const lines: string[] = [];
  const used = new Set<number>();
  stats.forEach((s, i) => {
    if (used.has(i)) return;
    const added = ADDED.exec(s.id);
    if (added && added[2] === "minimum") {
      const maxId = s.id.replace("minimum", "maximum");
      const j = stats.findIndex((o) => o.id === maxId);
      if (j >= 0) {
        used.add(j);
        lines.push(
          addsLine(
            added[1]!,
            added[3]!,
            value(values[i] ?? s.min, s, alt),
            value(values[j] ?? stats[j]!.min, stats[j], alt),
          ),
        );
        return;
      }
    }
    const template = TEXT[s.id] ?? TEAM_TEXT[s.id];
    const v = value(values[i] ?? s.min, s, alt);
    // Stats without a template (unique-only ones) read as words rather than ids.
    lines.push(template ? template.replace("#", v) : humanize(s.id, v));
  });
  return lines;
}

/** A mod's tier, counting up from the weakest of its family on the same affix side (Appendix C). */
export function modTier(mod: ModData): number {
  const family = mods()
    .filter((m) => m.type === mod.type && m.generationType === mod.generationType)
    .sort((a, b) => a.requiredLevel - b.requiredLevel || a.id.localeCompare(b.id));
  return family.findIndex((m) => m.id === mod.id) + 1;
}

/** The Alt header PoE2 shows above a mod: its side, name and tier. */
export function affixHeader(mod: ModData): string {
  const side = mod.generationType === "prefix" ? "Prefix" : "Suffix";
  return `${side} Modifier "${mod.name}" (Tier: ${modTier(mod)})`;
}
