/** A campaign level's definition (Appendix D §6.1). */
export interface LevelDefinition {
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
}
