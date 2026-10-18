import { emptyAilments, type AilmentState } from "./ailments";
import type { DamageType, StatSheet } from "./stats";

export type ResistType = Exclude<DamageType, "physical">;

/**
 * The shared hero and monster stat block (Appendix A §2). Percentages are
 * whole numbers. JSON-safe.
 */
export interface Actor {
  life: number;
  maxLife: number;
  es: number;
  maxEs: number;
  armour: number;
  evasion: number;
  resist: Record<ResistType, number>;
  /** Heroes block only with a shield; monsters as Shieldbearers. */
  blockChance: number;
  accuracy: number;
  stunThreshold: number;
  ailmentThreshold: number;
  /** Aggregated stat vocabulary values (§2.1). */
  stats: StatSheet;
  /** Summed "increased damage taken" per type from debuffs: shock, wither, broken armour (§5.3). */
  damageTakenIncreased: Partial<Record<DamageType, number>>;
  /** Ailments, stun and debuffs (§6). */
  ailments: AilmentState;
}

/** Builds an actor from the given fields; pools start full and thresholds default to max life. */
export function makeActor(fields: Partial<Actor> & Pick<Actor, "maxLife">): Actor {
  const maxEs = fields.maxEs ?? 0;
  return {
    life: fields.maxLife,
    es: maxEs,
    armour: 0,
    evasion: 0,
    blockChance: 0,
    accuracy: 0,
    stunThreshold: fields.maxLife,
    ailmentThreshold: fields.maxLife,
    stats: {},
    damageTakenIncreased: {},
    ailments: emptyAilments(),
    ...fields,
    maxEs,
    resist: { fire: 0, cold: 0, lightning: 0, chaos: 0, ...fields.resist },
  };
}
