import type { DamageType } from "../../combat/stats";
import type { Drop } from "../../loot/drops";
import type { PresetName, Tier } from "../../tuning/juice";
import type { Band } from "../core/significance";

/** What presentation does about one sim event (P12). Cosmetic only; never fed back to the sim. */
export type Cue =
  | { kind: "shake"; trauma: number }
  | { kind: "hitstop"; scope: "global" }
  | { kind: "hitstop"; scope: "actor"; actorIds: string[]; ms: number }
  | { kind: "slowmo"; scale: number; ms: number }
  | { kind: "duck"; db: number; seconds: number }
  | {
      kind: "particles";
      preset: PresetName;
      lane: number;
      x: number;
      scale?: number;
      loot?: boolean;
    }
  | {
      kind: "sound";
      id: string;
      bus: "sfx" | "ui" | "music";
      /** Board x in tiles, for pan. */
      x?: number;
      gainDb?: number;
    }
  | {
      kind: "number";
      sourceId: string;
      targetId: string;
      amount: number;
      type: DamageType;
      crit: boolean;
      big: boolean;
      lane: number;
      x: number;
      words?: "EVADE" | "BLOCK" | "IMMUNE";
      /** A summed DoT tick. */
      dot?: boolean;
    }
  | { kind: "flash"; targetId: string; crit: boolean; band: Band }
  /** Someone died at (lane, x); rarity is null for heroes. */
  | {
      kind: "death";
      targetId: string;
      lane: number;
      x: number;
      rarity: "normal" | "magic" | "rare" | "unique" | "boss" | null;
    }
  | { kind: "lootTimeline"; dropId: string; drop: Drop; lane: number; x: number }
  | { kind: "hudBump"; target: "mana" | "life" | "wave" }
  | { kind: "banner"; text: string };

/** One event's cues and the tier that sized them. */
export interface CueBatch {
  event: string;
  tier: Tier;
  cues: Cue[];
  /** Wall-clock ms when the director handled it. */
  at: number;
}
