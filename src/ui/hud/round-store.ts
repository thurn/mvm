import { useSyncExternalStore } from "react";
import type { RoundState } from "../../sim/state";

/** Per-frame view state the HUD animates from, updated outside render. */
export interface HudView {
  /** Wall-clock ms of the latest frame. */
  now: number;
  /** The mana counter's rolling display value. */
  manaShown: number;
  /** When mana last rose, for the counter's bump. */
  manaRoseAt: number;
}

/**
 * React's view of a round (P10): the sim stays plain data, and the board
 * calls `notify` once per rendered frame so the HUD re-reads it.
 */
export interface RoundStore {
  round: RoundState;
  view: HudView;
  version(): number;
  subscribe(listener: () => void): () => void;
  notify(now?: number): void;
}

export function createRoundStore(round: RoundState): RoundStore {
  let version = 0;
  let lastMana = round.mana;
  const listeners = new Set<() => void>();
  const store: RoundStore = {
    round,
    view: { now: 0, manaShown: round.mana, manaRoseAt: -Infinity },
    version: () => version,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify(now = performance.now()) {
      const view = store.view;
      if (round.mana > lastMana) view.manaRoseAt = now;
      lastMana = round.mana;
      // Roll toward the real value a quarter of the way per frame.
      view.manaShown += (round.mana - view.manaShown) * 0.25;
      if (Math.abs(round.mana - view.manaShown) < 0.5) view.manaShown = round.mana;
      view.now = now;
      version++;
      for (const listener of listeners) listener();
    },
  };
  return store;
}

/** Re-renders on every store bump and returns the round and its view state. */
export function useRound(store: RoundStore): { round: RoundState; view: HudView } {
  useSyncExternalStore(store.subscribe, store.version);
  return { round: store.round, view: store.view };
}
