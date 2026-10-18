import { LOOT_JUICE } from "../../../tuning/juice";

interface TickerLine {
  id: number;
  text: string;
  color: string;
  /** Wall-clock ms it arrived; it flashes on arrival. */
  at: number;
  shimmer: boolean;
}

type Listener = () => void;

/** The loot ticker's lines, newest first (H §3.1, §3.10): fed by the loot system, read by the HUD. */
function createTickerStore() {
  let lines: TickerLine[] = [];
  let nextId = 0;
  const listeners = new Set<Listener>();
  return {
    lines: () => lines,
    push(line: Omit<TickerLine, "id">) {
      lines = [{ ...line, id: nextId++ }, ...lines].slice(0, LOOT_JUICE.tickerLines);
      for (const listener of listeners) listener();
    },
    /** Empties the ticker: each round starts with none. */
    clear() {
      lines = [];
      for (const listener of listeners) listener();
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export const tickerStore = createTickerStore();
