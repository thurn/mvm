import { LEVEL_END_TUNING as T } from "../../tuning/juice";

export interface RevealTimes {
  /** When each card flips, left to right. */
  cards: number[];
  xpStart: number;
  xpEnd: number;
  /** When the first-clear reward reveals, or null without one. */
  firstClear: number | null;
}

/** The level-end reveal order (H §3.10): slide up, cards flip, XP fills, the first clear reveals last. */
export function revealTimes(cardCount: number, firstClear: boolean): RevealTimes {
  const cards = Array.from({ length: cardCount }, (_, i) => T.slideMs + i * T.cardGapMs);
  const xpStart = T.slideMs + cardCount * T.cardGapMs;
  const xpEnd = xpStart + T.xpFillMs;
  return { cards, xpStart, xpEnd, firstClear: firstClear ? xpEnd + T.firstClearDelayMs : null };
}

/** How far a fill has run at `elapsed`, 0–1. */
export function fillProgress(elapsed: number, times: RevealTimes): number {
  return Math.min(1, Math.max(0, (elapsed - times.xpStart) / (times.xpEnd - times.xpStart)));
}
