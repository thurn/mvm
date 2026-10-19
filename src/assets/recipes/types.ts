/** A ULPC body type key in the generator's sheet definitions (G §2.2). */
type BodyType = "male" | "female" | "teen" | "muscular" | "child";

/** The presentation states that need baked frames (G §1.3). Idle holds attack frame 0; leap is the Goblin Leaper's. */
export type SpriteState = "attack" | "walk" | "death" | "leap";

/** One layer: a sheet definition under `ulpc-generator/sheet_definitions/` and its colour. */
export interface RecipeLayer {
  slot: string;
  def: string;
  /** A file variant or a palette ramp (G §2.5); omitted means the item's default. */
  color?: string;
}

export interface SpriteAnimation {
  /** The ULPC animation, standard or custom (G §2.1, §2.3). */
  anim: string;
  /** The 0-based release or impact frame (G §3.1). */
  release?: number;
  /** The first frame of the loop; earlier frames play once (walk frame 0 is the stand). */
  loopFrom?: number;
}

export interface SpriteRecipe {
  id: string;
  kind: "hero" | "monster" | "weapon";
  body: BodyType;
  facing: "right" | "left";
  /** The fallback colour for placeholder capsules, by role. */
  placeholderColor: string;
  animations: Partial<Record<SpriteState, SpriteAnimation>>;
  layers: readonly RecipeLayer[];
}

/** Slots that make up a weapon layer set, baked alone for the starter weapons. */
export const WEAPON_SLOTS: ReadonlySet<string> = new Set(["weapon", "ammo", "shield", "gem"]);
