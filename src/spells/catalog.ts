import type { WeaponItemClass } from "../heroes/model/catalog";
import type { SpellShape } from "./shapes";

export const STARTER_SPELLS = {
  earthquake: "Metadata/Items/Gems/SkillGemEarthquake",
  explosiveGrenade: "Metadata/Items/Gem/SkillGemExplosiveGrenade",
  comet: "Metadata/Items/Gems/SkillGemComet",
} as const;

/** Spells that drop from Phase 2 on (B §6.2). */
export const GRASSLAND_SPELLS = {
  frostBomb: "Metadata/Items/Gems/SkillGemFrostBomb",
} as const;

/** How each spell lands on the grid (Appendix B §6.2). */
export interface SpellDefinition {
  shape: SpellShape;
  /** PoE2 attack skills cast with a virtual normal weapon of this class (§6.1, adapted). */
  virtualWeapon: WeaponItemClass | null;
}

export const SPELL_DEFINITIONS: Readonly<Record<string, SpellDefinition>> = {
  [STARTER_SPELLS.earthquake]: { shape: { kind: "column" }, virtualWeapon: "Two Hand Mace" },
  [STARTER_SPELLS.explosiveGrenade]: {
    shape: { kind: "square", size: 3 },
    virtualWeapon: "Crossbow",
  },
  [STARTER_SPELLS.comet]: { shape: { kind: "square", size: 3 }, virtualWeapon: null },
  [GRASSLAND_SPELLS.frostBomb]: { shape: { kind: "square", size: 3 }, virtualWeapon: null },
};
