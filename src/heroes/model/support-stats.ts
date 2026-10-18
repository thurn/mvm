import type { SkillHit } from "../../combat/hit";
import { ELEMENTS, type ScalarStatKey } from "../../combat/stats";

type MoreModifier = NonNullable<SkillHit["more"]>[number];

/**
 * How a support's PoE2 stat feeds the Appendix A pipeline: a vocabulary
 * stat, or a "more" multiplier (PoE2 `_+%_final`). `fixedPercent` is for
 * flags such as "deals no Elemental damage", which are 100% less.
 */
export type SupportEffect =
  | { stat: ScalarStatKey; divisor?: number }
  | { more: Omit<MoreModifier, "percent">; fixedPercent?: number };

/**
 * PoE2 support stat id → effect, per Appendix B §5. Stats missing here are
 * mechanics a later bead models (cooldowns, pierce, stun, ailments…); the
 * aggregator reports them.
 */
export const SUPPORT_STAT_MAP: Readonly<Record<string, SupportEffect>> = {
  "attack_speed_+%": { stat: "attack_speed_+%" },
  "base_cast_speed_+%": { stat: "cast_speed_+%" },
  "base_critical_strike_multiplier_+": { stat: "critical_strike_multiplier_+" },
  "base_chance_to_inflict_bleeding_%": { stat: "bleed_chance_%" },
  "base_chance_to_poison_on_hit_%": { stat: "poison_chance_%" },
  base_life_leech_from_physical_attack_damage_permyriad: {
    stat: "life_leech_from_physical_attack_damage_%",
    divisor: 100,
  },
  "base_skill_area_of_effect_+%": { stat: "area_of_effect_+%" },
  "curse_effect_+%": { stat: "curse_effect_+%" },
  number_of_additional_projectiles: { stat: "additional_projectiles" },
  number_of_chains: { stat: "chain_count" },
  projectiles_fork: { stat: "projectiles_fork" },
  "non_skill_base_all_damage_%_to_gain_as_fire": { stat: "damage_gained_as_fire_%" },
  "non_skill_base_all_damage_%_to_gain_as_cold": { stat: "damage_gained_as_cold_%" },
  "non_skill_base_all_damage_%_to_gain_as_lightning": { stat: "damage_gained_as_lightning_%" },
  "base_reduce_enemy_fire_resistance_%": { stat: "fire_penetration_%" },
  "base_reduce_enemy_cold_resistance_%": { stat: "cold_penetration_%" },
  "base_reduce_enemy_lightning_resistance_%": { stat: "lightning_penetration_%" },
  "support_brutality_physical_damage_+%_final": { more: { types: ["physical"] } },
  deal_no_elemental_damage: { more: { types: ELEMENTS }, fixedPercent: -100 },
  base_deal_no_chaos_damage: { more: { types: ["chaos"] }, fixedPercent: -100 },
  "support_attack_skills_elemental_damage_+%_final": { more: { types: ELEMENTS, kind: "attack" } },
  "support_gem_elemental_damage_+%_final": { more: { types: ELEMENTS } },
  "support_cold_and_fire_damage_+%_final": { more: { types: ["cold", "fire"] } },
  "support_cold_and_lightning_damage_+%_final": { more: { types: ["cold", "lightning"] } },
  "support_fire_and_lightning_damage_+%_final": { more: { types: ["fire", "lightning"] } },
  "support_controlled_destruction_spell_damage_+%_final": { more: { kind: "spell" } },
  "support_slow_cast_spell_damage_+%_final": { more: { kind: "spell" } },
  "support_melee_physical_damage_+%_final": { more: { types: ["physical"], tags: ["melee"] } },
  "support_increased_area_damage_+%_final": { more: { tags: ["area"] } },
  "support_multiple_damage_+%_final": { more: {} },
  "support_deliberation_damage_+%_final": { more: {} },
};
