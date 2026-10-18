import type { Resumed } from "../account/lifecycle";
import type { Intent } from "../sim/intents";

/** What the game opens on (P14). */
export type BootDecision =
  { kind: "title" } | { kind: "pick" } | { kind: "resume" } | { kind: "restart"; reason: string };

/**
 * No round means the title, or the level-end pick when a first-clear choice
 * is still pending (1.35); a loaded round resumes behind the countdown; a
 * rejected one restarts its level with a banner.
 */
export function bootDecision(resumed: Resumed | null): BootDecision {
  if (!resumed) return { kind: "title" };
  if (!resumed.round) return { kind: resumed.account.pendingChoices.length > 0 ? "pick" : "title" };
  if (resumed.roundRejected) return { kind: "restart", reason: resumed.roundRejected };
  return { kind: "resume" };
}

/** The resume countdown's length: 3-2-1 (P14). */
const COUNTDOWN_SECONDS = 3;

/** The countdown digit at wall time `now` (ms) for a countdown started at `startedAt`, or null once it ends. */
export function countdownAt(startedAt: number | null, now: number): number | null {
  if (startedAt === null) return null;
  const left = COUNTDOWN_SECONDS - Math.floor((now - startedAt) / 1000);
  return left > 0 ? left : null;
}

/** The countdown is the game's only pause, and no intent passes during it (P14: no pause-and-place). */
export function acceptsIntent(countdown: number | null, intent: Intent): boolean {
  void intent;
  return countdown === null;
}
