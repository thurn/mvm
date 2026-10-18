import { MUSIC, type MusicId } from "./music";
import { RECIPES } from "./recipes";
import type { SpriteRecipe, SpriteState } from "./recipes/types";
import { SOUNDS, type SoundId } from "./sounds";
import { GRASSLAND_TILES } from "./tiles";

/** Where `npm run assets` writes, and the game fetches, the manifest. @public (1.21 loads it) */
export const MANIFEST_URL = "/assets/manifest.json";

/** One baked animation: a single row of square frames in the atlas. */
export interface Strip {
  x: number;
  y: number;
  frameSize: number;
  frames: number;
  release?: number;
  loopFrom?: number;
}

/** @public */
export interface SpriteEntry {
  kind: SpriteRecipe["kind"];
  facing: SpriteRecipe["facing"];
  placeholderColor: string;
  /** Null when the sprite is a placeholder capsule. */
  animations: Partial<Record<SpriteState, Strip>> | null;
}

/** @public */
export interface TileEntry {
  placeholderColor: string;
  width: number;
  height: number;
  /** Atlas positions of each frame; null for a flat placeholder tile. */
  frames: { x: number; y: number }[] | null;
}

/** @public */
export interface SoundEntry {
  /** Asset URLs; empty means ZzFX. */
  variants: string[];
  layers: string[];
}

export interface AssetManifest {
  version: 1;
  /** True when the libraries were absent and every entry is a placeholder. */
  placeholder: boolean;
  atlas: { url: string; width: number; height: number } | null;
  sprites: Record<string, SpriteEntry>;
  tiles: Record<string, TileEntry>;
  sounds: Record<SoundId, SoundEntry>;
  music: Record<MusicId, string | null>;
}

/** The manifest for a checkout without the asset libraries: capsules, flat tiles and ZzFX. */
export function placeholderManifest(): AssetManifest {
  return {
    version: 1,
    placeholder: true,
    atlas: null,
    sprites: Object.fromEntries(
      RECIPES.map((recipe) => [
        recipe.id,
        {
          kind: recipe.kind,
          facing: recipe.facing,
          placeholderColor: recipe.placeholderColor,
          animations: null,
        },
      ]),
    ),
    tiles: Object.fromEntries(
      Object.entries(GRASSLAND_TILES).map(([tileId, tile]) => [
        tileId,
        {
          placeholderColor: tile.placeholderColor,
          width: tile.width,
          height: tile.height,
          frames: null,
        },
      ]),
    ),
    sounds: Object.fromEntries(
      Object.keys(SOUNDS).map((soundId) => [soundId, { variants: [], layers: [] }]),
    ) as unknown as Record<SoundId, SoundEntry>,
    music: Object.fromEntries(Object.keys(MUSIC).map((musicId) => [musicId, null])) as Record<
      MusicId,
      string | null
    >,
  };
}
