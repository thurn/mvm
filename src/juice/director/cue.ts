import type { DamageType } from "../../combat/stats";
import type { Drop } from "../../loot/drops";
import type { PresetName, Tier } from "../../tuning/juice";

/** What presentation does about one sim event (P12). Cosmetic only; never fed back to the sim. */
export type Cue =
  | { kind: "shake"; trauma: number }
  | { kind: "hitstop"; scope: "global" }
  | { kind: "hitstop"; scope: "actor"; actorIds: string[]; big: boolean }
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
  | { kind: "sound"; id: string; bus: "sfx" | "ui" | "music" }
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
    }
  | { kind: "flash"; targetId: string; crit: boolean }
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
