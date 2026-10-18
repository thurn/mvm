/**
 * Dev knobs and accessibility settings (P21, H §14): kept in localStorage,
 * never in the save document.
 */
export interface JuiceSettings {
  /** Global multiplier on shake, hitstop, slow-mo and particle counts; 0 is the no-juice A/B. */
  juice: number;
  shakeMax: number;
  lootHoldScale: number;
  sigBands: [number, number];
  numbers: "all" | "crits" | "off";
  /** A dev multiplier on sim time (null is off). */
  debugSlowmo: number | null;
  audioLog: boolean;
  tierLog: boolean;
  shake: "off" | "low" | "full";
  reduceFlashing: boolean;
  /** The loot filter's "Show all": normal items get beams, labels and stingers (H §3.7). */
  showAllLoot: boolean;
  /** Player volume sliders, 0–1 (H §10.2 options). */
  volume: { master: number; music: number; sfx: number; loot: number; ui: number };
}

export const DEFAULT_SETTINGS: JuiceSettings = {
  juice: 1,
  shakeMax: 6,
  lootHoldScale: 1,
  sigBands: [0.05, 0.25],
  numbers: "all",
  debugSlowmo: null,
  audioLog: false,
  tierLog: false,
  shake: "full",
  reduceFlashing: false,
  showAllLoot: false,
  volume: { master: 1, music: 1, sfx: 1, loot: 1, ui: 1 },
};

const KEY = "mvm-juice-settings";

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SettingsStore {
  get(): JuiceSettings;
  set(patch: Partial<JuiceSettings>): void;
  subscribe(listener: () => void): () => void;
}

export function createSettings(
  storage: KeyValueStorage | null = typeof localStorage === "undefined" ? null : localStorage,
): SettingsStore {
  let current = { ...DEFAULT_SETTINGS };
  try {
    const raw = storage?.getItem(KEY);
    if (raw) current = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<JuiceSettings>) };
  } catch {
    current = { ...DEFAULT_SETTINGS };
  }
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(patch) {
      current = { ...current, ...patch };
      try {
        storage?.setItem(KEY, JSON.stringify(current));
      } catch {
        // Storage can be full or blocked; the in-memory settings still apply.
      }
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
