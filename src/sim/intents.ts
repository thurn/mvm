/**
 * Player actions (P11). The UI enqueues intents; the driver drains the queue
 * into the next step. Systems handle the kinds they own and ignore the rest.
 */
export type Intent =
  | { type: "place"; cardId: string; lane: number; column: number }
  | { type: "shovel"; lane: number; column: number }
  | { type: "cast"; spellId: string; lane: number; x: number }
  | { type: "setSpeed"; speed: 1 | 2 }
  /** Ends the level as a loss, keeping everything credited (1.32). */
  | { type: "abandon" };

export interface IntentQueue {
  pending: Intent[];
}

export function createIntentQueue(): IntentQueue {
  return { pending: [] };
}

export function enqueue(queue: IntentQueue, intent: Intent): void {
  queue.pending.push(intent);
}

/** Removes and returns every pending intent, in order. */
export function drain(queue: IntentQueue): Intent[] {
  return queue.pending.splice(0);
}
