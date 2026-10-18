import { fxProbe, type FxReading } from "../juice/core/probe";
import type { Tier } from "../tuning/juice";
import type { AudioLogEntry } from "../audio/engine";
import type { CueBatch } from "../juice/director/cue";
import type { SimEvent } from "../sim/events";
import { installSaveDebug } from "./save-debug";
import type { RoundState } from "../sim/state";

const HISTORY = 200;

/** The read-only QA surface on `window.__mvm` (P22). */
export interface QaSurface {
  screen: string;
  round: RoundState | null;
  /** The last 200 sim events. */
  events: SimEvent[];
  /** The last 200 juice cue batches (1.15). */
  cues: CueBatch[];
  tierLog: unknown[];
  /** The last 200 played and dropped sounds, with bus and wall time (hv-7ic2.112). */
  audioLog: AudioLogEntry[];
  /** Juice measurements: live particles, and everything started since the last peaks() (mason hv-7ic2.108). */
  fx: { live(): number; peaks(): FxReading };
  /** Caught errors and console errors; must be empty at the end of every QA run. */
  caps: string[];
  /** Fires a tier's global effects on the running board (`?scene=tiers`). */
  fireTier?: (tier: Tier) => void;
  /** Feeds synthetic sim events to the running board's director (dev pages). */
  fireEvents?: (events: SimEvent[]) => void;
  /**
   * Dev only: forgets every save (IndexedDB, the log ring and the dev
   * server's mirror), optionally the juice settings too, and returns to a
   * fresh title from any screen, mid-round included. `?reset=1` (or
   * `?reset=settings`) does the same on load.
   */
  reset?: (options?: { settings?: boolean }) => Promise<void>;
}

declare global {
  interface Window {
    __mvm?: QaSurface;
  }
}

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Installs `window.__mvm` once and starts collecting errors into `caps`. */
export function installQaSurface(): QaSurface {
  if (window.__mvm) return window.__mvm;
  const qa: QaSurface = {
    screen: "title",
    round: null,
    events: [],
    cues: [],
    tierLog: [],
    audioLog: [],
    fx: { live: fxProbe.live, peaks: fxProbe.peaks },
    caps: [],
  };
  window.__mvm = qa;
  if (import.meta.env.DEV) installSaveDebug(qa as unknown as Record<string, unknown>);
  window.addEventListener("error", (e) => qa.caps.push(`error: ${describe(e.error ?? e.message)}`));
  window.addEventListener("unhandledrejection", (e) =>
    qa.caps.push(`rejection: ${describe(e.reason)}`),
  );
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    qa.caps.push(`console.error: ${args.map(describe).join(" ")}`);
    consoleError(...args);
  };
  return qa;
}

/** Records a juice cue batch, and T3+ batches in the tier log when it is on (P22). */
export function recordCues(qa: QaSurface, batch: CueBatch, tierLog: boolean): void {
  qa.cues.push(batch);
  if (qa.cues.length > HISTORY) qa.cues.splice(0, qa.cues.length - HISTORY);
  if (tierLog && batch.tier >= 3) {
    qa.tierLog.push({ event: batch.event, tier: batch.tier });
    if (qa.tierLog.length > HISTORY) qa.tierLog.splice(0, qa.tierLog.length - HISTORY);
  }
}

/** Records a played or dropped sound from the audio engine. */
export function recordAudio(qa: QaSurface, entry: AudioLogEntry): void {
  qa.audioLog.push(entry);
  if (qa.audioLog.length > HISTORY) qa.audioLog.splice(0, qa.audioLog.length - HISTORY);
}

export function recordEvents(qa: QaSurface, events: readonly SimEvent[]): void {
  if (events.length === 0) return;
  qa.events.push(...events);
  if (qa.events.length > HISTORY) qa.events.splice(0, qa.events.length - HISTORY);
}
