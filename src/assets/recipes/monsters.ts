import type { SpriteRecipe } from "./types";

/** M1's monster recipes (Appendix G §4.2). Monsters face left. */
export const MONSTER_RECIPES: readonly SpriteRecipe[] = [
  {
    id: "m01_shambling_corpse",
    kind: "monster",
    body: "male",
    facing: "left",
    placeholderColor: "#6f8a5a",
    animations: {
      walk: { anim: "walk", loopFrom: 1 },
      attack: { anim: "slash", release: 4 },
      death: { anim: "hurt" },
    },
    layers: [
      { slot: "body", def: "body/special/body_zombie.json", color: "zombie" },
      { slot: "head", def: "head/heads/undead/heads_zombie.json" },
      {
        slot: "torso",
        def: "torso/shirts/longsleeve/torso_clothes_longsleeve.json",
        color: "brown",
      },
      { slot: "legs", def: "legs/pants/legs_pants.json", color: "charcoal" },
    ],
  },
];
