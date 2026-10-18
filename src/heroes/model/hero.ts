import type { GemId } from "../../data/types";
import type { Id } from "../../types/ids";
import type { ItemInstance } from "./item";

type HeroRarity = "normal" | "magic" | "rare";

/** An owned hero's ID (roster, stash, offers); distinct from a placed hero's `HeroInstanceId` in the sim. */
export type OwnedHeroId = Id<"OwnedHero">;

/** A hero: one skill plus level, rarity and supports (Appendix B §1.1). JSON-safe. */
export interface HeroInstance {
  id: OwnedHeroId;
  /** The hero's skill gem ID, or an MvM ID for custom heroes. */
  skillId: GemId;
  level: number;
  xp: number;
  rarity: HeroRarity;
  /** Support gem IDs, 0–5 (§1.9). */
  supports: GemId[];
  /** Gemcutter's Prism quality, 0–20 (§1.7). */
  quality: number;
}

/** A hero plus its three equipped items: what a roster slot places (Appendix C §C.1.1). */
export interface Card {
  hero: HeroInstance;
  weapon: ItemInstance | null;
  armour: ItemInstance | null;
  accessory: ItemInstance | null;
}

export function newHero(id: OwnedHeroId, skillId: GemId, level: number): HeroInstance {
  return { id, skillId, level, xp: 0, rarity: "normal", supports: [], quality: 0 };
}
