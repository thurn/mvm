/** One monster archetype (Appendix D §2). Mults are relative to a Shambler. */
export interface Archetype {
  id: string;
  firstLevel: number;
  pointCost: number;
  lifeMult: number;
  damageMult: number;
  armourMult: number;
  evasionMult: number;
  /** Seconds per tile. */
  secondsPerTile: number;
  attackSeconds: number;
  drawWeight: number;
  resist: { fire?: number; cold?: number; lightning?: number; chaos?: number };
}

/** The archetypes M1 uses. Later phases add the rest of §2.1. */
const ARCHETYPES: Readonly<Record<string, Archetype>> = {
  Shambler: {
    id: "Shambler",
    firstLevel: 1,
    pointCost: 1,
    lifeMult: 1,
    damageMult: 1,
    armourMult: 1,
    evasionMult: 1,
    secondsPerTile: 4.7,
    attackSeconds: 1,
    drawWeight: 4000,
    resist: {},
  },
};

export function archetype(id: string): Archetype {
  const entry = ARCHETYPES[id];
  if (!entry) throw new Error(`unknown monster archetype ${id}`);
  return entry;
}
