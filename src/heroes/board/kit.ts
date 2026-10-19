import { attackBase, spellBase, type SkillHit } from "../../combat/hit";
import { stat, type SkillTag } from "../../combat/stats";
import type { GemData, SkillData, SkillStatSet } from "../../data/types";
import type { HeroKit } from "../../sim/state";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { HERO_BOARD_TUNING, HERO_TUNING } from "../../tuning/heroes";
import type { HeroSheet } from "../model/aggregate";
import { statSetAt } from "../model/levels";

export const SKILLS = {
  acolyte: "MvM/Heroes/EzomyteAcolyte",
  rollingSlam: "Metadata/Items/Gems/SkillGemRollingSlam",
  iceStrike: "Metadata/Items/Gems/SkillGemIceStrike",
  fallingThunder: "Metadata/Items/Gems/SkillGemFallingThunder",
  lightningArrow: "Metadata/Items/Gems/SkillGemLightningArrow",
  armourPiercingRounds: "Metadata/Items/Gem/SkillGemArmourPiercingRounds",
  spark: "Metadata/Items/Gems/SkillGemSpark",
  shrinewarden: "MvM/Heroes/Shrinewarden",
  armourBreaker: "Metadata/Items/Gems/SkillGemArmourBreaker",
  boneshatter: "Metadata/Items/Gems/SkillGemBoneshatter",
  fangsOfFrost: "Metadata/Items/Gem/SkillGemFangsOfFrost",
} as const;

type Behavior = keyof typeof SKILLS;

const K = COMBAT_KNOBS.K_heroActionRate;

interface KitInputs {
  sheet: HeroSheet;
  gem: GemData | undefined;
}

function skillStatic(skill: SkillData): { attack_speed_multiplier?: number } {
  return (skill.static ?? {}) as { attack_speed_multiplier?: number };
}

function setAt(skill: SkillData, index: number, gem: number) {
  const set: SkillStatSet | undefined = skill.statSets[index];
  if (!set) throw new Error(`skill ${skill.id} has no stat set ${index}`);
  return statSetAt(set, gem);
}

/** An attack hit from the card's weapon at a stat set's attack damage % (A §4.1). */
function attackHit(
  sheet: HeroSheet,
  values: ReturnType<typeof statSetAt>,
  tags: SkillTag[],
  more: SkillHit["more"] = [],
): SkillHit {
  const weapon = sheet.weapon;
  return {
    kind: "attack",
    tags,
    ...(weapon?.weaponClass ? { weaponClass: weapon.weaponClass } : {}),
    base: attackBase(weapon?.damage ?? {}, values.damageMultiplier, sheet.actor.stats),
    baseCrit: weapon?.critChance ?? 0,
    conversion: values.conversion,
    more: [...sheet.more, ...(more ?? [])],
  };
}

/** Raw seconds per weapon attack with the skill's speed multiplier and global increases. */
function attackSeconds(sheet: HeroSheet, skillMultiplierPercent: number): number {
  const weaponSeconds = (sheet.weapon?.attackTime ?? 1000) / 1000;
  const increased = 1 + stat(sheet.actor.stats, "attack_speed_+%") / 100;
  return weaponSeconds / ((1 + skillMultiplierPercent / 100) * increased);
}

function projectileNumbers(sheet: HeroSheet) {
  const stats = sheet.actor.stats;
  return {
    pierce: stat(stats, "pierce_count"),
    fork: stat(stats, "projectiles_fork") > 0 ? 1 : 0,
    chain: stat(stats, "chain_count"),
    additionalProjectiles: stat(stats, "additional_projectiles"),
  };
}

function areaScale(sheet: HeroSheet): number {
  return Math.sqrt(1 + stat(sheet.actor.stats, "area_of_effect_+%") / 100);
}

const radiusTiles = (units: number | undefined) => (units ?? 0) / HERO_TUNING.poeUnitsPerTile;

/** An acolyte's orb kit (B H01, H03): a Spirit-scaled orb every `orbSeconds`. */
function acolyteKit(sheet: HeroSheet, orbSeconds: number): HeroKit {
  const t = HERO_BOARD_TUNING.acolyte;
  const spirit = sheet.spirit + t.spiritPerLevel * (sheet.heroLevel - 1);
  return {
    behavior: "acolyte",
    actionSeconds: orbSeconds,
    hits: {},
    numbers: { orbValue: t.orbBase * (1 + spirit / t.spiritDivisor) },
    counters: { orbTimer: 0 },
  };
}

const BUILDERS: Record<Behavior, (inputs: KitInputs, skills: SkillData[]) => HeroKit> = {
  acolyte: ({ sheet }) => acolyteKit(sheet, HERO_BOARD_TUNING.acolyte.orbSeconds),

  // The sturdy acolyte: the same orbs, 25% slower (B H03).
  shrinewarden: ({ sheet }) => acolyteKit(sheet, HERO_BOARD_TUNING.shrinewarden.orbSeconds),

  armourBreaker({ sheet }, [skill]) {
    const values = setAt(skill!, 0, sheet.gemLevel);
    return {
      behavior: "armourBreaker",
      actionSeconds: attackSeconds(sheet, skillStatic(skill!).attack_speed_multiplier ?? 0) / K,
      hits: {
        main: {
          ...attackHit(sheet, values, ["melee"]),
          armourBreak: values.stats["apply_X_armour_break_on_hit"] ?? 0,
        },
      },
      numbers: {},
      counters: { actionTimer: 0 },
    };
  },

  boneshatter({ sheet }, [skill]) {
    const strike = setAt(skill!, 0, sheet.gemLevel);
    const wave = setAt(skill!, 1, sheet.gemLevel);
    const shockStats =
      (skill!.statSets[1]?.static as { stats?: { id: string; value: number }[] } | null)?.stats ??
      [];
    const constant = (id: string) => shockStats.find((s) => s.id === id)?.value ?? 0;
    return {
      behavior: "boneshatter",
      actionSeconds: attackSeconds(sheet, skillStatic(skill!).attack_speed_multiplier ?? 0) / K,
      hits: {
        // Boneshatter itself builds no stun (PoE2: −100% stun multiplier).
        strike: { ...attackHit(sheet, strike, ["melee"]), stunMorePercent: -100 },
        shockwave: attackHit(sheet, wave, ["area"]),
      },
      numbers: {
        shockwaveRadius:
          radiusTiles(constant("active_skill_base_area_of_effect_radius")) * areaScale(sheet),
        uniqueMorePercent: constant("boneshatter_damage_+%_final_if_created_from_unique"),
      },
      counters: { actionTimer: 0 },
    };
  },

  fangsOfFrost({ sheet }, [skill]) {
    const stab = setAt(skill!, 0, sheet.gemLevel);
    const burst = setAt(skill!, 1, sheet.gemLevel);
    return {
      behavior: "fangsOfFrost",
      actionSeconds: attackSeconds(sheet, skillStatic(skill!).attack_speed_multiplier ?? 0) / K,
      hits: {
        stab: attackHit(sheet, stab, ["melee"]),
        burst: attackHit(sheet, burst, ["area"]),
      },
      numbers: { burstRadius: HERO_BOARD_TUNING.fangsOfFrost.burstRadius * areaScale(sheet) },
      counters: { actionTimer: 0 },
    };
  },

  lightningArrow({ sheet }, [skill]) {
    const arrow = setAt(skill!, 0, sheet.gemLevel);
    const beam = setAt(skill!, 1, sheet.gemLevel);
    const floorValues = setAt(skill!, 0, Math.floor(sheet.gemLevel));
    return {
      behavior: "lightningArrow",
      actionSeconds: attackSeconds(sheet, skillStatic(skill!).attack_speed_multiplier ?? 0) / K,
      hits: {
        main: attackHit(sheet, arrow, ["projectile"]),
        beam: attackHit(sheet, beam, ["projectile"]),
      },
      numbers: {
        ...projectileNumbers(sheet),
        // The arrow itself cannot chain (base_projectiles_cannot_chain).
        chain: 0,
        extraTargets: floorValues.stats["lightning_arrow_maximum_number_of_extra_targets"] ?? 0,
        beamChains: beam.stats["number_of_chains"] ?? 0,
      },
      counters: { actionTimer: 0 },
    };
  },

  armourPiercingRounds({ sheet }, skills) {
    const ammo = skills.find((s) => s.statSets[0]?.id.includes("Ammo"));
    const shot = skills.find((s) => s !== ammo)!;
    const bolt = setAt(shot, 0, sheet.gemLevel);
    const clip = ammo
      ? setAt(ammo, 0, Math.floor(sheet.gemLevel)).stats["base_number_of_crossbow_bolts"]
      : 1;
    const armourBreak = bolt.stats["apply_X_armour_break_on_hit"] ?? 0;
    return {
      behavior: "armourPiercingRounds",
      actionSeconds: attackSeconds(sheet, skillStatic(shot).attack_speed_multiplier ?? 0) / K,
      hits: { main: { ...attackHit(sheet, bolt, ["projectile"]), armourBreak } },
      numbers: {
        ...projectileNumbers(sheet),
        clip: clip ?? 1,
        reloadSeconds: (ammo?.castTime ?? 0) / 1000 / K,
      },
      counters: { actionTimer: 0, clipLeft: clip ?? 1 },
    };
  },

  spark({ sheet }, [skill]) {
    const values = setAt(skill!, 0, sheet.gemLevel);
    const counts = setAt(skill!, 0, Math.floor(sheet.gemLevel));
    const min = values.stats["spell_minimum_base_lightning_damage"] ?? 0;
    const max = values.stats["spell_maximum_base_lightning_damage"] ?? 0;
    const hit: SkillHit = {
      kind: "spell",
      tags: ["projectile"],
      base: spellBase({ lightning: { min, max } }, values.damageMultiplier, sheet.actor.stats),
      baseCrit: values.critChance ?? 0,
      more: sheet.more,
    };
    const castSpeed = 1 + stat(sheet.actor.stats, "cast_speed_+%") / 100;
    return {
      behavior: "spark",
      actionSeconds: (skill!.castTime ?? 1000) / 1000 / castSpeed / K,
      hits: { main: hit },
      numbers: {
        ...projectileNumbers(sheet),
        sparks:
          (counts.stats["base_number_of_projectiles"] ?? 1) +
          stat(sheet.actor.stats, "additional_projectiles"),
      },
      counters: { actionTimer: 0 },
    };
  },

  rollingSlam({ sheet }, [skill]) {
    const first = setAt(skill!, 1, sheet.gemLevel);
    const second = setAt(skill!, 2, sheet.gemLevel);
    const extraMs = first.stats["total_attack_time_+_ms"] ?? 0;
    const weaponPart = attackSeconds(sheet, skillStatic(skill!).attack_speed_multiplier ?? 0);
    return {
      behavior: "rollingSlam",
      actionSeconds: (weaponPart + extraMs / 1000) / K,
      hits: {
        first: attackHit(sheet, first, ["melee", "area"]),
        second: attackHit(sheet, second, ["melee", "area"]),
      },
      numbers: {
        firstRadius:
          radiusTiles(first.stats["active_skill_base_area_of_effect_radius"]) * areaScale(sheet),
        secondRadius:
          radiusTiles(second.stats["active_skill_base_secondary_area_of_effect_radius"]) *
          areaScale(sheet),
      },
      counters: { actionTimer: 0 },
    };
  },

  fallingThunder({ sheet }, [skill]) {
    const slam = setAt(skill!, 0, sheet.gemLevel);
    const volley = setAt(skill!, 1, sheet.gemLevel);
    const more = [
      { percent: volley.stats["lightning_strike_damage_+%_final_when_charged"] ?? 0 },
      { percent: volley.stats["lightning_strike_damage_+%_final_per_power_charge"] ?? 0 },
    ];
    return {
      behavior: "fallingThunder",
      actionSeconds: attackSeconds(sheet, skillStatic(skill!).attack_speed_multiplier ?? 0) / K,
      hits: {
        slam: attackHit(sheet, slam, ["melee", "area"]),
        volley: attackHit(sheet, volley, ["projectile"], more),
      },
      numbers: {
        volleyProjectiles:
          volley.stats["lightning_strike_base_number_of_projectiles_per_power_charge"] ?? 3,
      },
      counters: { actionTimer: 0, slams: 0 },
    };
  },

  iceStrike({ sheet }, [skill]) {
    const strike = setAt(skill!, 0, sheet.gemLevel);
    const final = setAt(skill!, 1, sheet.gemLevel);
    const strikeSeconds =
      attackSeconds(sheet, skillStatic(skill!).attack_speed_multiplier ?? 0) / K;
    const finalSpeed =
      1 + (final.stats["supplementary_stat_container_attack_speed_+%_final"] ?? 0) / 100;
    return {
      behavior: "iceStrike",
      actionSeconds: strikeSeconds,
      hits: {
        strike: attackHit(sheet, strike, ["melee"]),
        final: attackHit(sheet, final, ["melee"]),
      },
      numbers: { finalSeconds: strikeSeconds / finalSpeed },
      counters: { actionTimer: 0, combo: 0 },
    };
  },
};

/** Builds a placed hero's kit from its card's sheet, or null for a skill with no board behavior yet. */
export function buildKit(skillId: string, inputs: KitInputs): HeroKit | null {
  const behavior = (Object.keys(SKILLS) as Behavior[]).find((b) => SKILLS[b] === skillId);
  if (!behavior) return null;
  return BUILDERS[behavior](inputs, inputs.gem?.skills ?? []);
}
