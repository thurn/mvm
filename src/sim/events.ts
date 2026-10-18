import type { DamageMap } from "../combat/damage";
import type { HitResult } from "../combat/resolve";
import type { EntityId, HeroInstanceId, MonsterInstanceId, Rarity } from "./state";

/**
 * Everything presentation needs to know about one step (P11, P12). Events
 * carry IDs, positions and numbers, never names. Later beads add variants.
 */
export type SimEvent =
  | {
      type: "hit";
      sourceId: EntityId;
      targetId: EntityId;
      lane: number;
      x: number;
      /** Total damage dealt after mitigation, overkill included. */
      dealt: number;
      targetMaxLife: number;
      /** Dealt damage per type. */
      breakdown: DamageMap;
      crit: boolean;
      avoidedBy: HitResult["avoidedBy"];
    }
  | {
      type: "kill";
      sourceId: EntityId;
      targetId: EntityId;
      lane: number;
      x: number;
      rarity: Rarity | null;
    }
  | { type: "drop"; dropId: string; monsterId: MonsterInstanceId; lane: number; x: number }
  | {
      type: "manaSpawn";
      orbId: string;
      amount: number;
      lane: number;
      x: number;
      source: "sky" | "acolyte";
    }
  | { type: "manaCollect"; orbId: string; amount: number }
  | { type: "placed"; heroId: HeroInstanceId; lane: number; column: number }
  | {
      type: "placeRefused";
      cardId: string;
      lane: number;
      column: number;
      reason: "unknown-card" | "out-of-bounds" | "occupied" | "recharging" | "cost";
    }
  | { type: "shovelled"; heroId: HeroInstanceId; lane: number; column: number }
  | {
      type: "leak";
      monsterId: MonsterInstanceId;
      lane: number;
      rarity: Rarity;
      cost: number;
      lifeLeft: number;
    }
  | { type: "cast"; castId: EntityId; spellId: string; lane: number; column: number }
  | {
      type: "castRefused";
      spellId: string;
      lane: number;
      column: number;
      reason: "unknown-spell" | "out-of-bounds" | "recharging" | "cost";
    }
  | {
      type: "spellImpact";
      castId: EntityId;
      part: string;
      lane: number;
      column: number;
      tiles: { lane: number; column: number }[];
    }
  | { type: "waveStart"; wave: number; flag: boolean }
  | { type: "flagWarning"; wave: number }
  | { type: "levelEnd"; result: "won" | "lost" }
  | {
      type: "ailmentApplied";
      targetId: EntityId;
      ailment: string;
      magnitude: number;
      seconds: number;
    }
  | { type: "ailmentExpired"; targetId: EntityId; ailment: string }
  | { type: "stun"; targetId: EntityId; kind: "light" | "heavy"; seconds: number };
