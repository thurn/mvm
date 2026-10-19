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
  /** A pack archetype spawns this many in one lane, `packSpacing` tiles apart (D §2.2 Swarm). */
  packSize?: number;
  packSpacing?: number;
}

/** The archetypes so far (D §2.1, §5.4). Later phases add the rest. */
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
  // Helmed Skeleton: PoE2 armour, broken to Fully Broken by Armour Break (D §2.2).
  ArmouredLight: {
    id: "ArmouredLight",
    firstLevel: 2,
    pointCost: 2,
    lifeMult: 1.4,
    damageMult: 1,
    armourMult: 6,
    evasionMult: 0.5,
    secondsPerTile: 4.7,
    attackSeconds: 1,
    drawWeight: 4000,
    resist: { cold: 20 },
  },
  // Rat Swarm: three rats per pack, each with its own stats; one point buys the pack.
  Swarm: {
    id: "Swarm",
    firstLevel: 3,
    pointCost: 1,
    lifeMult: 0.35,
    damageMult: 0.4,
    armourMult: 0.5,
    evasionMult: 2,
    secondsPerTile: 3.5,
    attackSeconds: 0.6,
    drawWeight: 3000,
    resist: {},
    packSize: 3,
    packSpacing: 0.3,
  },
};

export function archetype(id: string): Archetype {
  const entry = ARCHETYPES[id];
  if (!entry) throw new Error(`unknown monster archetype ${id}`);
  return entry;
}
