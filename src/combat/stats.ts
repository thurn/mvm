/**
 * The closed stat vocabulary of Appendix A §9. Every hero, support, item mod,
 * unique, passive and monster affix uses only these keys.
 */

export const DAMAGE_TYPES = ["physical", "fire", "cold", "lightning", "chaos"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const ELEMENTS = ["fire", "cold", "lightning"] as const;
export type Element = (typeof ELEMENTS)[number];

export type SkillTag = "melee" | "projectile" | "area";
export type WeaponClass = "bow" | "crossbow" | "spear" | "mace" | "quarterstaff" | "wand" | "staff";
type Ailment =
  "ignite" | "chill" | "freeze" | "shock" | "electrocute" | "bleed" | "poison" | "stun";
type Keystone = "resolute_technique" | "crimson_assault" | "chaos_inoculation" | "eldritch_battery";

/**
 * Inner stats the `allies_in_presence: <stat>` wrapper (§9.7) carries. It
 * applies the inner stat to other heroes inside this hero's Presence.
 */
type PresenceScalarStat =
  | "damage_+%"
  | "attack_speed_+%"
  | "cast_speed_+%"
  | "critical_strike_chance_+%"
  | "critical_strike_multiplier_+"
  | "all_elemental_resistances_%"
  | "life_regeneration_rate_per_second";

/** Stats whose value is an X–Y range (§9.1 added damage, §9.6 thorns). */
export type RangeStatKey =
  | `local_added_${DamageType}_damage`
  | `attack_added_${DamageType}_damage`
  | `spell_added_${DamageType}_damage`
  | "thorns_physical_damage"
  | `allies_in_presence:attack_added_${DamageType}_damage`;

/** Stats whose value is a single number. Flags use 1. */
export type ScalarStatKey =
  // §9.1 offence: base damage (weapon locals)
  | "local_physical_damage_+%"
  | "local_attack_speed_+%"
  | "local_critical_strike_chance"
  | "local_accuracy_rating"
  // §9.2 offence: scaling
  | `${DamageType | "elemental"}_damage_+%`
  | `${"spell" | "attack" | SkillTag | "damage_over_time"}_damage_+%`
  | `${WeaponClass}_damage_+%`
  | "attack_speed_+%"
  | "cast_speed_+%"
  | "critical_strike_chance_+%"
  | "spell_base_critical_strike_chance"
  | "critical_strike_multiplier_+"
  | "accuracy_rating"
  | "accuracy_rating_+%"
  | `${Element | "elemental"}_penetration_%`
  | `physical_converted_to_${Element}_%`
  | `damage_gained_as_${Exclude<DamageType, "physical">}_%`
  // §9.3 projectile and area
  | "additional_projectiles"
  | "pierce_count"
  | "chain_count"
  | "projectiles_fork"
  | "projectile_speed_+%"
  | "area_of_effect_+%"
  | "skill_effect_duration_+%"
  | "cooldown_recovery_+%"
  // §9.4 ailments and debuffs
  | "bleed_chance_%"
  | "poison_chance_%"
  | "flammability_magnitude_+%"
  | "freeze_buildup_+%"
  | "chill_magnitude_+%"
  | "shock_chance_+%"
  | "shock_magnitude_+%"
  | "electrocute_buildup"
  | "ailment_magnitude_+%"
  | "ailment_duration_+%"
  | "stun_buildup_+%"
  | "heavy_stun_buildup_vs_primed_+%"
  | "crushing_blows"
  | "armour_break_on_hit"
  | "armour_break_+%"
  | `exposure_on_hit_${Element}`
  | "culling_strike"
  | "curse_effect_+%"
  | "curse_area_+%"
  // §9.5 sustain
  | "life_leech_from_physical_attack_damage_%"
  | "life_gained_on_kill"
  | "life_regeneration_rate_per_second"
  | "life_regeneration_rate_%_per_second"
  // §9.6 defence
  | "base_maximum_life"
  | "maximum_life_+%"
  | `${"" | "local_"}${"armour" | "evasion" | "energy_shield"}`
  | `${"" | "local_"}${"armour" | "evasion" | "energy_shield"}_+%`
  | "local_hybrid_defence_+%"
  | "energy_shield_recharge_start_faster_%"
  | "local_block_chance_%"
  | "block_chance_+%"
  | `${Exclude<DamageType, "physical">}_resistance_%`
  | "all_elemental_resistances_%"
  | `maximum_${Element}_resistance_%`
  | "stun_threshold"
  | "stun_threshold_+%"
  | "ailment_threshold_+%"
  | "self_ailment_duration_-%"
  // §9.7 attributes, spirit, auras, economy, loot
  | "strength"
  | "dexterity"
  | "intelligence"
  | "all_attributes"
  | "attribute_choice"
  | `keystone_${Keystone}`
  | "spirit"
  | `allies_in_presence:${PresenceScalarStat}`
  | "aura_effect_+%"
  | "presence_area_+%"
  | `unique_${string}`
  | "acolyte_mana_generated_+%"
  | "acolyte_mana_interval_-%"
  | "acolyte_mana_per_orb"
  | "item_rarity_+%"
  | "gold_found_+%"
  // §9.8 monster-only
  | "monster_movement_speed_+%"
  | "monster_life_+%"
  | "monster_damage_+%"
  | `monster_extra_${Exclude<DamageType, "physical">}_damage_%`
  | `monster_${DamageType}_resistance_%`
  | "monster_armour_+%"
  | "monster_evasion_+%"
  | "monster_energy_shield"
  | "monster_block_frontal_projectiles_%"
  | `monster_aura_${string}`
  | `monster_on_death_${string}`
  | `cannot_be_${Ailment}`;

/** An inclusive X–Y damage range. */
export interface DamageRange {
  min: number;
  max: number;
}

/**
 * Aggregated stat values (Appendix A §2.1). Missing keys are 0. Percentages
 * are whole numbers: `"fire_damage_+%": 30` means 30% increased.
 */
export type StatSheet = { [K in ScalarStatKey]?: number } & {
  [K in RangeStatKey]?: DamageRange;
};

export function stat(sheet: StatSheet, key: ScalarStatKey): number {
  return (sheet as Record<string, number | undefined>)[key] ?? 0;
}

export function rangeStat(sheet: StatSheet, key: RangeStatKey): DamageRange | undefined {
  return sheet[key];
}

export function isElement(type: DamageType): type is Element {
  return type === "fire" || type === "cold" || type === "lightning";
}
