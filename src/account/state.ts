import type { Drop } from "../loot/drops";
import type { Card, HeroInstance } from "../heroes/model/hero";
import type { ItemInstance } from "../heroes/model/item";

/** A hero or spell drop waiting for hero generation (1.18) to roll it. */
type UnrolledDrop = Extract<Drop, { kind: "hero" | "spell" }>;

/** A first-clear "choose 1 of 3" waiting for the player (Appendix E §4.5). */
interface PendingChoice {
  levelId: string;
  options: HeroInstance[];
}

/**
 * The persistent account (P13): focus, roster, stash, wallet, progress.
 * JSON-safe; saved as the `account` section.
 */
export interface AccountState {
  focus: string | null;
  roster: {
    /** Six card slots; the first `unlocked` are usable. */
    slots: (Card | null)[];
    unlocked: number;
    spell: Card | null;
  };
  stash: {
    items: ItemInstance[];
    heroes: HeroInstance[];
    unrolled: UnrolledDrop[];
  };
  gold: number;
  /** Currency counts by RePoE or MvM ID. */
  currency: Record<string, number>;
  player: { level: number; xp: number };
  /** Level IDs cleared at least once. */
  firstClears: string[];
  pendingChoices: PendingChoice[];
  /** The level being played and the XP earned in it so far; a rejected round restarts that level (P14). */
  activeRun: { levelId: string; xp: number } | null;
  /** Seeds each new level from a counter, so runs are reproducible from a save. */
  nextSeed: number;
}
