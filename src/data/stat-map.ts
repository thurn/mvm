import type { RangeStatKey, ScalarStatKey } from "../combat/stats";

/**
 * How one PoE2 stat id becomes an Appendix A §9 vocabulary stat, per the
 * "MvM stat" column of Appendix C §C.3. Range stats name the half they fill.
 * `divisor` converts PoE2 units: per minute to per second, permyriad and
 * hundredths to percent.
 */
export type StatMapping =
  | { stat: ScalarStatKey; divisor?: number }
  | { stat: RangeStatKey; part: "min" | "max" };

/** PoE2 stat id → vocabulary stat, or null where Appendix C drops the stat. */
export const STAT_MAP: Readonly<Record<string, StatMapping | null>> = {
  // Weapon locals (C.3.1)
  "local_physical_damage_+%": { stat: "local_physical_damage_+%" },
  local_accuracy_rating: { stat: "local_accuracy_rating" },
  "local_attack_speed_+%": { stat: "local_attack_speed_+%" },
  local_critical_strike_chance: { stat: "local_critical_strike_chance", divisor: 100 },
  "local_critical_strike_multiplier_+": { stat: "critical_strike_multiplier_+" },
  local_life_leech_from_physical_damage_permyriad: {
    stat: "life_leech_from_physical_attack_damage_%",
    divisor: 100,
  },
  "local_hit_damage_stun_multiplier_+%": { stat: "stun_buildup_+%" },
  "light_radius_+%": null,
  local_minimum_added_physical_damage: { stat: "local_added_physical_damage", part: "min" },
  local_maximum_added_physical_damage: { stat: "local_added_physical_damage", part: "max" },
  local_minimum_added_fire_damage: { stat: "local_added_fire_damage", part: "min" },
  local_maximum_added_fire_damage: { stat: "local_added_fire_damage", part: "max" },
  local_minimum_added_cold_damage: { stat: "local_added_cold_damage", part: "min" },
  local_maximum_added_cold_damage: { stat: "local_added_cold_damage", part: "max" },
  local_minimum_added_lightning_damage: { stat: "local_added_lightning_damage", part: "min" },
  local_maximum_added_lightning_damage: { stat: "local_added_lightning_damage", part: "max" },
  "elemental_damage_with_attack_skills_+%": { stat: "elemental_damage_+%" },
  base_life_gained_on_enemy_death: { stat: "life_gained_on_kill" },
  // Caster weapons (C.3.2)
  "spell_damage_+%": { stat: "spell_damage_+%" },
  base_maximum_mana: null,
  "fire_damage_+%": { stat: "fire_damage_+%" },
  "cold_damage_+%": { stat: "cold_damage_+%" },
  "lightning_damage_+%": { stat: "lightning_damage_+%" },
  "chaos_damage_+%": { stat: "chaos_damage_+%" },
  "spell_physical_damage_+%": { stat: "physical_damage_+%" },
  "non_skill_base_all_damage_%_to_gain_as_fire": { stat: "damage_gained_as_fire_%" },
  "non_skill_base_all_damage_%_to_gain_as_cold": { stat: "damage_gained_as_cold_%" },
  "non_skill_base_all_damage_%_to_gain_as_lightning": { stat: "damage_gained_as_lightning_%" },
  "base_cast_speed_+%": { stat: "cast_speed_+%" },
  "spell_critical_strike_chance_+%": { stat: "critical_strike_chance_+%" },
  "base_spell_critical_strike_multiplier_+": { stat: "critical_strike_multiplier_+" },
  "ignite_chance_+%": { stat: "flammability_magnitude_+%" },
  "hit_damage_freeze_multiplier_+%": { stat: "freeze_buildup_+%" },
  "shock_chance_+%": { stat: "shock_chance_+%" },
  // Sceptres (C.3.3). Local % Spirit scales the sceptre's base 100 Spirit, so it is flat.
  "local_spirit_+%": { stat: "spirit" },
  "allies_in_presence_damage_+%": { stat: "allies_in_presence:damage_+%" },
  allies_in_presence_attack_minimum_added_physical_damage: {
    stat: "allies_in_presence:attack_added_physical_damage",
    part: "min",
  },
  allies_in_presence_attack_maximum_added_physical_damage: {
    stat: "allies_in_presence:attack_added_physical_damage",
    part: "max",
  },
  allies_in_presence_attack_minimum_added_fire_damage: {
    stat: "allies_in_presence:attack_added_fire_damage",
    part: "min",
  },
  allies_in_presence_attack_maximum_added_fire_damage: {
    stat: "allies_in_presence:attack_added_fire_damage",
    part: "max",
  },
  allies_in_presence_attack_minimum_added_cold_damage: {
    stat: "allies_in_presence:attack_added_cold_damage",
    part: "min",
  },
  allies_in_presence_attack_maximum_added_cold_damage: {
    stat: "allies_in_presence:attack_added_cold_damage",
    part: "max",
  },
  allies_in_presence_attack_minimum_added_lightning_damage: {
    stat: "allies_in_presence:attack_added_lightning_damage",
    part: "min",
  },
  allies_in_presence_attack_maximum_added_lightning_damage: {
    stat: "allies_in_presence:attack_added_lightning_damage",
    part: "max",
  },
  "allies_in_presence_attack_speed_+%": { stat: "allies_in_presence:attack_speed_+%" },
  "allies_in_presence_cast_speed_+%": { stat: "allies_in_presence:cast_speed_+%" },
  "allies_in_presence_critical_strike_chance_+%": {
    stat: "allies_in_presence:critical_strike_chance_+%",
  },
  "allies_in_presence_critical_strike_multiplier_+": {
    stat: "allies_in_presence:critical_strike_multiplier_+",
  },
  "allies_in_presence_resist_all_elements_%": {
    stat: "allies_in_presence:all_elemental_resistances_%",
  },
  allies_in_presence_life_regeneration_rate_per_minute: {
    stat: "allies_in_presence:life_regeneration_rate_per_second",
    divisor: 60,
  },
  "presence_area_+%": { stat: "presence_area_+%" },
  // Body armour and shields (C.3.4)
  local_base_physical_damage_reduction_rating: { stat: "local_armour" },
  local_base_evasion_rating: { stat: "local_evasion" },
  local_energy_shield: { stat: "local_energy_shield" },
  "local_physical_damage_reduction_rating_+%": { stat: "local_armour_+%" },
  "local_evasion_rating_+%": { stat: "local_evasion_+%" },
  "local_energy_shield_+%": { stat: "local_energy_shield_+%" },
  "local_armour_and_evasion_+%": { stat: "local_hybrid_defence_+%" },
  "local_armour_and_energy_shield_+%": { stat: "local_hybrid_defence_+%" },
  "local_evasion_and_energy_shield_+%": { stat: "local_hybrid_defence_+%" },
  "local_block_chance_+%": { stat: "block_chance_+%" },
  thorns_minimum_base_physical_damage: { stat: "thorns_physical_damage", part: "min" },
  thorns_maximum_base_physical_damage: { stat: "thorns_physical_damage", part: "max" },
  base_spirit_from_equipment: { stat: "spirit" },
  "self_bleed_duration_+%": { stat: "self_ailment_duration_-%", divisor: -1 },
  "self_poison_duration_+%": { stat: "self_ailment_duration_-%", divisor: -1 },
  "base_self_ignite_duration_-%": { stat: "self_ailment_duration_-%" },
  "stun_threshold_+": { stat: "stun_threshold" },
  // Shared and jewellery (C.3.5)
  base_maximum_life: { stat: "base_maximum_life" },
  "maximum_life_+%": { stat: "maximum_life_+%" },
  base_maximum_energy_shield: { stat: "energy_shield" },
  "maximum_energy_shield_+%": { stat: "energy_shield_+%" },
  "evasion_rating_+%": { stat: "evasion_+%" },
  "physical_damage_reduction_rating_+%": { stat: "armour_+%" },
  base_evasion_rating: { stat: "evasion" },
  base_physical_damage_reduction_rating: { stat: "armour" },
  accuracy_rating: { stat: "accuracy_rating" },
  "base_item_found_rarity_+%": { stat: "item_rarity_+%" },
  attack_minimum_added_physical_damage: { stat: "attack_added_physical_damage", part: "min" },
  attack_maximum_added_physical_damage: { stat: "attack_added_physical_damage", part: "max" },
  attack_minimum_added_fire_damage: { stat: "attack_added_fire_damage", part: "min" },
  attack_maximum_added_fire_damage: { stat: "attack_added_fire_damage", part: "max" },
  attack_minimum_added_cold_damage: { stat: "attack_added_cold_damage", part: "min" },
  attack_maximum_added_cold_damage: { stat: "attack_added_cold_damage", part: "max" },
  attack_minimum_added_lightning_damage: { stat: "attack_added_lightning_damage", part: "min" },
  attack_maximum_added_lightning_damage: { stat: "attack_added_lightning_damage", part: "max" },
  additional_strength: { stat: "strength" },
  additional_dexterity: { stat: "dexterity" },
  additional_intelligence: { stat: "intelligence" },
  additional_all_attributes: { stat: "all_attributes" },
  "base_fire_damage_resistance_%": { stat: "fire_resistance_%" },
  "base_cold_damage_resistance_%": { stat: "cold_resistance_%" },
  "base_lightning_damage_resistance_%": { stat: "lightning_resistance_%" },
  "base_chaos_damage_resistance_%": { stat: "chaos_resistance_%" },
  "base_resist_all_elements_%": { stat: "all_elemental_resistances_%" },
  base_life_regeneration_rate_per_minute: {
    stat: "life_regeneration_rate_per_second",
    divisor: 60,
  },
  "critical_strike_chance_+%": { stat: "critical_strike_chance_+%" },
  "base_critical_strike_multiplier_+": { stat: "critical_strike_multiplier_+" },
  base_life_leech_from_physical_attack_damage_permyriad: {
    stat: "life_leech_from_physical_attack_damage_%",
    divisor: 100,
  },
};
