import type { BossId } from "../../tuning/bosses";
import type { TileKind } from "../../sim/terrain";
/** A campaign level's definition (Appendix D §6.1). */
export interface LevelDefinition {
  /** The biome's element (D §6.3), previewed against team resistance on the campaign map; Grassland has none. */
  element?: "fire" | "cold" | "lightning" | "chaos";
  id: string;
  /** 1-based campaign index. */
  index: number;
  areaLevel: number;
  /** Board lanes in use, 0 (top) to 4. */
  lanes: number[];
  waves: number;
  /** Archetypes the wave draw may pick. */
  archetypes: string[];
  /** The archetype this level introduces; it appears in the middle and final waves. */
  newArchetype: string | null;
  /** Seconds before the first wave. */
  firstWaveSeconds: number;
  startingMana: number;
  /** Special tiles on the map (D §6.1), and the types unlocked so far (D §8.2). */
  specialTiles: number;
  terrainTypes: TileKind[];
  /** The type this level introduces, guaranteed at least once. */
  newTerrain: TileKind | null;
  /** Whether a Strongbox may appear (D §9: Level 4 on, never a boss level). */
  strongboxes: boolean;
  /** A boss arrives with the last regular wave (D §6.1, §7). */
  boss?: BossId;
}
