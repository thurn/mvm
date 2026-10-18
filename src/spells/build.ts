import { attackBase, spellBase, type SkillHit } from "../combat/hit";
import type { BaseDamage } from "../combat/hit";
import { baseItems, spellGems } from "../data";
import type { SkillData } from "../data/types";
import { aggregate } from "../heroes/model/aggregate";
import type { Card } from "../heroes/model/hero";
import { statSetAt } from "../heroes/model/levels";
import { SPELL_TUNING } from "../tuning/spells";
import { SPELL_DEFINITIONS, STARTER_SPELLS, type SpellDefinition } from "./catalog";
import type { SpellShape } from "./shapes";
import type { Actor } from "../combat/actor";

/** One timed part of a cast: when it lands, where relative to the target, and its hit. */
interface SpellPart {
  name: string;
  delaySeconds: number;
  columnOffset: number;
  shape: SpellShape;
  hit: SkillHit;
}

export interface SpellKit {
  /** The caster's stat block: supports and passives, always hitting. */
  actor: Actor;
  parts: SpellPart[];
}

/** MvM spell power E(L) (Appendix B §6.1), as a "more" multiplier on every hit. */
function spellPower(level: number) {
  const e = SPELL_TUNING.spellPowerBase + SPELL_TUNING.spellPowerPerLevel * level;
  return { percent: (e - 1) * 100 };
}

/** The normal base of a class with the highest drop level at or below the spell's level. */
function virtualWeapon(definition: SpellDefinition, level: number): BaseDamage {
  const base = baseItems()
    .filter((b) => b.itemClass === definition.virtualWeapon && b.dropLevel <= level)
    .sort((a, b) => b.dropLevel - a.dropLevel)[0];
  const p = base?.properties ?? {};
  return { physical: { min: p.physical_damage_min ?? 0, max: p.physical_damage_max ?? 0 } };
}

function staticMs(skill: SkillData, index: number, id: string): number {
  const set = skill.statSets[index];
  const stats =
    (set?.static as { stats?: { id: string; value: number | null }[] } | null)?.stats ?? [];
  return stats.find((s) => s.id === id)?.value ?? 0;
}

/** Builds a spell card's cast: its aggregated caster and its timed hits (§6.1–§6.2). */
export function buildSpell(card: Card): SpellKit {
  const definition = SPELL_DEFINITIONS[card.hero.skillId];
  const gem = spellGems().find((g) => g.id === card.hero.skillId);
  const skill = gem?.skills[0];
  if (!definition || !skill) throw new Error(`no spell definition for ${card.hero.skillId}`);
  const sheet = aggregate(card);
  const level = card.hero.level;
  const more = [...sheet.more, spellPower(level)];
  const attack = (index: number, tags: SkillHit["tags"]): SkillHit => {
    const values = statSetAt(skill.statSets[index]!, sheet.gemLevel);
    return {
      kind: "attack",
      tags,
      base: attackBase(
        virtualWeapon(definition, level),
        values.damageMultiplier,
        sheet.actor.stats,
      ),
      baseCrit: SPELL_TUNING.attackSpellCrit,
      conversion: values.conversion,
      more,
    };
  };
  const actor = { ...structuredClone(sheet.actor), accuracy: Number.MAX_SAFE_INTEGER };
  switch (card.hero.skillId) {
    case STARTER_SPELLS.earthquake:
      return {
        actor,
        parts: [
          {
            name: "impact",
            delaySeconds: 0,
            columnOffset: 0,
            shape: definition.shape,
            hit: attack(0, ["area", "melee"]),
          },
          {
            name: "aftershock",
            delaySeconds: staticMs(skill, 0, "skill_jagged_ground_base_duration_ms") / 1000,
            columnOffset: 0,
            shape: definition.shape,
            hit: attack(1, ["area", "melee"]),
          },
        ],
      };
    case STARTER_SPELLS.explosiveGrenade:
      return {
        actor,
        parts: [
          {
            name: "explosion",
            delaySeconds: staticMs(skill, 0, "base_skill_detonation_time") / 1000,
            columnOffset: -SPELL_TUNING.grenadeRollTiles,
            shape: definition.shape,
            hit: attack(0, ["area", "projectile"]),
          },
        ],
      };
    default: {
      const values = statSetAt(skill.statSets[0]!, sheet.gemLevel);
      const hit: SkillHit = {
        kind: "spell",
        tags: ["area"],
        base: spellBase(
          {
            cold: {
              min: values.stats["spell_minimum_base_cold_damage"] ?? 0,
              max: values.stats["spell_maximum_base_cold_damage"] ?? 0,
            },
          },
          values.damageMultiplier,
          sheet.actor.stats,
        ),
        baseCrit: values.critChance ?? 0,
        more,
      };
      return {
        actor,
        parts: [
          {
            name: "comet",
            delaySeconds: (values.stats["comet_fall_time_ms"] ?? 0) / 1000,
            columnOffset: 0,
            shape: definition.shape,
            hit,
          },
        ],
      };
    }
  }
}
