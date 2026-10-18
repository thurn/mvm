import type { JuiceSettings, SettingsStore } from "../../juice/core/settings";

type Value = number | boolean | string | null;

/** One dev-menu control over the settings store (H §14, accessibility, volumes, overlays). */
export interface Knob {
  key: string;
  label: string;
  kind: "range" | "toggle" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  /** A non-default value the tests set and read back. */
  sample: Value;
  read(settings: JuiceSettings): Value;
  patch(settings: JuiceSettings, value: Value): Partial<JuiceSettings>;
}

const range = (
  key: keyof JuiceSettings & string,
  label: string,
  min: number,
  max: number,
  step: number,
  sample: number,
): Knob => ({
  key,
  label,
  kind: "range",
  min,
  max,
  step,
  sample,
  read: (s) => s[key] as number,
  patch: (_s, v) => ({ [key]: Number(v) }) as Partial<JuiceSettings>,
});

const toggle = (key: keyof JuiceSettings & string, label: string): Knob => ({
  key,
  label,
  kind: "toggle",
  sample: true,
  read: (s) => s[key] as boolean,
  patch: (_s, v) => ({ [key]: Boolean(v) }) as Partial<JuiceSettings>,
});

const volume = (bus: keyof JuiceSettings["volume"]): Knob => ({
  key: `volume.${bus}`,
  label: `Volume: ${bus}`,
  kind: "range",
  min: 0,
  max: 1,
  step: 0.05,
  sample: 0.5,
  read: (s) => s.volume[bus],
  patch: (s, v) => ({ volume: { ...s.volume, [bus]: Number(v) } }),
});

const overlay = (name: keyof JuiceSettings["devOverlays"], label: string): Knob => ({
  key: `devOverlays.${name}`,
  label,
  kind: "toggle",
  sample: true,
  read: (s) => s.devOverlays[name],
  patch: (s, v) => ({ devOverlays: { ...s.devOverlays, [name]: Boolean(v) } }),
});

/** Every H §14 knob, the accessibility toggles, the volumes and the dev overlays. */
export const KNOBS: readonly Knob[] = [
  range("juice", "juice", 0, 2, 0.05, 0),
  range("shakeMax", "shakeMax (px)", 0, 12, 1, 3),
  range("lootHoldScale", "lootHoldScale", 0.5, 2, 0.05, 1.5),
  {
    key: "sigBands.medium",
    label: "sigBands: medium from",
    kind: "range",
    min: 0.01,
    max: 0.2,
    step: 0.01,
    sample: 0.1,
    read: (s) => s.sigBands[0],
    patch: (s, v) => ({ sigBands: [Number(v), s.sigBands[1]] }),
  },
  {
    key: "sigBands.big",
    label: "sigBands: big from",
    kind: "range",
    min: 0.1,
    max: 0.6,
    step: 0.01,
    sample: 0.4,
    read: (s) => s.sigBands[1],
    patch: (s, v) => ({ sigBands: [s.sigBands[0], Number(v)] }),
  },
  {
    key: "numbers",
    label: "numbers",
    kind: "select",
    options: ["all", "crits", "off"],
    sample: "crits",
    read: (s) => s.numbers,
    patch: (_s, v) => ({ numbers: v as JuiceSettings["numbers"] }),
  },
  {
    key: "debugSlowmo",
    label: "debugSlowmo (1 = off)",
    kind: "range",
    min: 0.1,
    max: 1,
    step: 0.05,
    sample: 0.25,
    read: (s) => s.debugSlowmo ?? 1,
    patch: (_s, v) => ({ debugSlowmo: Number(v) >= 1 ? null : Number(v) }),
  },
  toggle("audioLog", "audioLog"),
  toggle("tierLog", "tierLog"),
  {
    key: "shake",
    label: "Shake",
    kind: "select",
    options: ["off", "low", "full"],
    sample: "low",
    read: (s) => s.shake,
    patch: (_s, v) => ({ shake: v as JuiceSettings["shake"] }),
  },
  toggle("reduceFlashing", "Reduce flashing"),
  toggle("showAllLoot", "Loot filter: Show all"),
  volume("master"),
  volume("music"),
  volume("sfx"),
  volume("loot"),
  volume("ui"),
  overlay("hitboxes", "Overlay: hitboxes"),
  overlay("ailments", "Overlay: ailment meters"),
  overlay("dps", "Overlay: DPS meters"),
];

/** Applies a knob's value to the store. */
export function applyKnob(store: SettingsStore, key: string, value: Value): void {
  const knob = KNOBS.find((k) => k.key === key);
  if (!knob) throw new Error(`unknown knob ${key}`);
  store.set(knob.patch(store.get(), value));
}
