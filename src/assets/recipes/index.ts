import { HERO_RECIPES } from "./heroes";
import { MONSTER_RECIPES } from "./monsters";
import { WEAPON_SLOTS, type SpriteRecipe } from "./types";

/** Each starter hero's recipe, by skill ID (Appendix B §4). @public (1.21 draws them) */
export const HERO_SPRITES: Readonly<Record<string, string>> = {
  "MvM/Heroes/EzomyteAcolyte": "acolyte_robed",
  "Metadata/Items/Gems/SkillGemRollingSlam": "twohand_hammer",
  "Metadata/Items/Gems/SkillGemIceStrike": "quarterstaff_monk_cold",
  "Metadata/Items/Gems/SkillGemFallingThunder": "quarterstaff_monk_lightning",
  "Metadata/Items/Gems/SkillGemLightningArrow": "bow_ranger",
  "Metadata/Items/Gem/SkillGemArmourPiercingRounds": "crossbow_arbalist",
  "Metadata/Items/Gems/SkillGemSpark": "wand_caster",
};

/** Each monster archetype's recipe (Appendix D §1). @public (1.21 draws them) */
export const MONSTER_SPRITES: Readonly<Record<string, string>> = {
  Shambler: "m01_shambling_corpse",
};

/** The hero recipe whose weapon layers stand for each starter weapon class. */
const WEAPON_SOURCES: Readonly<Record<string, string>> = {
  Bow: "bow_ranger",
  Crossbow: "crossbow_arbalist",
  "Two Hand Mace": "twohand_hammer",
  Warstaff: "quarterstaff_monk_cold",
  Wand: "wand_caster",
  Sceptre: "acolyte_robed",
};

function weaponRecipe(weaponClass: string, heroId: string): SpriteRecipe {
  const hero = HERO_RECIPES.find((recipe) => recipe.id === heroId);
  if (!hero) throw new Error(`no hero recipe ${heroId}`);
  return {
    id: weaponSpriteId(weaponClass),
    kind: "weapon",
    body: hero.body,
    facing: hero.facing,
    placeholderColor: "#b0b0b0",
    animations: hero.animations.attack ? { attack: hero.animations.attack } : {},
    layers: hero.layers.filter((layer) => WEAPON_SLOTS.has(layer.slot)),
  };
}

/** The starter weapon layers, baked alone, by weapon class. @public (1.21 draws them) */
export function weaponSpriteId(weaponClass: string): string {
  return `weapon_${weaponClass.toLowerCase().replaceAll(" ", "_")}`;
}

/** Every recipe `npm run assets` bakes. */
export const RECIPES: readonly SpriteRecipe[] = [
  ...HERO_RECIPES,
  ...MONSTER_RECIPES,
  ...Object.entries(WEAPON_SOURCES).map(([weaponClass, heroId]) =>
    weaponRecipe(weaponClass, heroId),
  ),
];
