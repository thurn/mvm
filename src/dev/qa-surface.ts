import type { Tier } from "../tuning/juice";
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
  audioLog: unknown[];
  /** Caught errors and console errors; must be empty at the end of every QA run. */
  caps: string[];
  /** Fires a tier's global effects on the running board (`?scene=tiers`). */
  fireTier?: (tier: Tier) => void;
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

export function recordEvents(qa: QaSurface, events: readonly SimEvent[]): void {
  if (events.length === 0) return;
  qa.events.push(...events);
  if (qa.events.length > HISTORY) qa.events.splice(0, qa.events.length - HISTORY);
}
