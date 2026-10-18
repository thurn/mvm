import type { ScalarStatKey } from "../combat/stats";

/**
 * What one PoE2 monster affix does in MvM (Appendix D §4), keyed by its
 * `mods.json` ID. Stats add to the monster's sheet; multipliers scale its
 * block. Affixes whose effect needs a later system (ailments, ground,
 * immunities) are stored on the monster and applied by that system.
 */
export interface MonsterAffix {
  requiredLevel: number;
  stats?: Partial<Record<ScalarStatKey, number>>;
  armourMult?: number;
  evasionMult?: number;
  accuracyMult?: number;
  speedMult?: number;
  /** Energy shield as a share of maximum life. */
  esFromLife?: number;
  resist?: { fire?: number; cold?: number; lightning?: number; chaos?: number };
  /** Archetypes that may not roll it (§4.10), or the only ones that may. */
  only?: readonly string[];
}

const RANGED = ["Ranged"];
const BRUTE_AND_BOSSES = ["Brute"];

export const MONSTER_AFFIXES: Readonly<Record<string, MonsterAffix>> = {
  MonsterDamageGainedAsFire1: { requiredLevel: 1, stats: { "damage_gained_as_fire_%": 40 } },
  MonsterDamageGainedAsCold1: { requiredLevel: 1, stats: { "damage_gained_as_cold_%": 40 } },
  MonsterDamageGainedAsLightning1: {
    requiredLevel: 1,
    stats: { "damage_gained_as_lightning_%": 40 },
  },
  MonsterDamageGainedAsChaos1: { requiredLevel: 1, stats: { "damage_gained_as_chaos_%": 40 } },
  MonsterIncreasedSpeed1: { requiredLevel: 7, speedMult: 1.3 },
  MonsterCriticalStrikeChance1: { requiredLevel: 12, stats: { "critical_strike_chance_+%": 300 } },
  MonsterStunDamageIncrease1: { requiredLevel: 1, stats: { "stun_buildup_+%": 100 } },
  MonsterIncreasedAccuracy1: { requiredLevel: 1, accuracyMult: 3 },
  MonsterExtraArmour1: { requiredLevel: 1, armourMult: 2 },
  MonsterExtraEvasion1: { requiredLevel: 1, evasionMult: 2 },
  MonsterExtraEnergyShield1: { requiredLevel: 1, esFromLife: 0.25 },
  MonsterFireResistance1: {
    requiredLevel: 1,
    resist: { fire: 50 },
    stats: { "maximum_fire_resistance_%": 10 },
  },
  MonsterColdResistance1: {
    requiredLevel: 1,
    resist: { cold: 50 },
    stats: { "maximum_cold_resistance_%": 10 },
  },
  MonsterLightningResistance1: {
    requiredLevel: 1,
    resist: { lightning: 50 },
    stats: { "maximum_lightning_resistance_%": 10 },
  },
  MonsterChaosResistance1: { requiredLevel: 1, resist: { chaos: 50 } },
  MonsterAlwaysPoison1: { requiredLevel: 10, stats: { "poison_chance_%": 100 } },
  MonsterAlwaysBleed1: { requiredLevel: 16, stats: { "bleed_chance_%": 100 } },
  MonsterIgniteChanceIncrease1: { requiredLevel: 12 },
  MonsterFreezeDamageIncrease1: { requiredLevel: 12 },
  MonsterShockChanceIncrease1: { requiredLevel: 12 },
  MonsterBurningGroundOnDeath1: { requiredLevel: 4 },
  MonsterChilledGroundOnDeath1: { requiredLevel: 4 },
  MonsterShockedGroundOnDeath1: { requiredLevel: 4 },
  MonsterImmuneToStun1: { requiredLevel: 1, stats: { cannot_be_stun: 1 } },
  MonsterImmuneToSlow1: { requiredLevel: 7 },
  MonsterIsHexproof1: { requiredLevel: 1 },
  MonsterCannotLeech1: { requiredLevel: 14 },
  MonsterModReducedCritMulti1: { requiredLevel: 10 },
  MonsterArmourPenetration1: { requiredLevel: 1, stats: { armour_break_on_hit: 1 } },
  MonsterAdditionalProjectiles1: {
    requiredLevel: 10,
    stats: { additional_projectiles: 4 },
    only: RANGED,
  },
  MonsterAdditionalChains1: { requiredLevel: 10, stats: { chain_count: 2 }, only: RANGED },
  MonsterProjectilesGainDamage1: {
    requiredLevel: 10,
    stats: { "projectile_damage_+%": 60 },
    only: RANGED,
  },
  MonsterAreaOfEffect1: {
    requiredLevel: 10,
    stats: { "area_of_effect_+%": 100 },
    only: BRUTE_AND_BOSSES,
  },
  MonsterPeriodicEnrage1: { requiredLevel: 16 },
};
