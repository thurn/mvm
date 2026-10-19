import type { SpriteRecipe } from "./types";

const SKELETON_ANIMATIONS = {
  walk: { anim: "walk", loopFrom: 1 },
  attack: { anim: "slash", release: 4 },
  death: { anim: "hurt" },
} as const;

/** The monster recipes (Appendix G §4.2). Monsters face left. */
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

  // 2a. Helmed Skeleton (G §4.2): a skeleton in a pointed helm; the helm comes off at Fully Broken.
  {
    id: "m02a_helmed_skeleton",
    kind: "monster",
    body: "male",
    facing: "left",
    placeholderColor: "#c8c0a8",
    animations: SKELETON_ANIMATIONS,
    layers: [
      { slot: "body", def: "body/special/body_skeleton.json" },
      { slot: "head", def: "head/heads/undead/heads_skeleton.json" },
      { slot: "headwear", def: "headwear/helmets/helmets/hat_helmet_pointed.json" },
    ],
  },
  // The same skeleton re-baked without its helm, swapped in once it's Fully Broken (G §4.1).
  {
    id: "m02a_helmed_skeleton_broken",
    kind: "monster",
    body: "male",
    facing: "left",
    placeholderColor: "#c8c0a8",
    animations: SKELETON_ANIMATIONS,
    layers: [
      { slot: "body", def: "body/special/body_skeleton.json" },
      { slot: "head", def: "head/heads/undead/heads_skeleton.json" },
    ],
  },
  // 5. Goblin Leaper (G §4.2): leaps with the `jump` row.
  {
    id: "m05_goblin_leaper",
    kind: "monster",
    body: "teen",
    facing: "left",
    placeholderColor: "#5a8a3a",
    animations: {
      walk: { anim: "walk", loopFrom: 1 },
      attack: { anim: "slash", release: 4 },
      death: { anim: "hurt" },
      leap: { anim: "jump" },
    },
    layers: [
      { slot: "body", def: "body/body.json", color: "green" },
      { slot: "head", def: "head/heads/fantasy/heads_goblin.json", color: "green" },
      { slot: "legs", def: "legs/shorts/legs_shorts.json", color: "brown" },
      { slot: "weapon", def: "weapons/polearm/weapon_polearm_spear.json", color: "dark" },
    ],
  },
  // 12. Rat Swarm (G §4.2): the child body is already small.
  {
    id: "m12_rat_swarm",
    kind: "monster",
    body: "child",
    facing: "left",
    placeholderColor: "#7a5a3a",
    animations: {
      walk: { anim: "walk", loopFrom: 1 },
      attack: { anim: "slash", release: 4 },
      death: { anim: "hurt" },
    },
    layers: [
      { slot: "body", def: "body/body.json", color: "fur_brown" },
      { slot: "head", def: "head/heads/farm/heads_rat_child.json", color: "fur_brown" },
    ],
  },
];
