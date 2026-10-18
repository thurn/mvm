import type { LayerStack } from "../../render/layers";
import { spriteSystem } from "../../render/sprites/system";
import { hitSystem } from "../hits/system";
import { tierSystem } from "../tiers/system";
import { musicSystem } from "../../audio/music/system";
import type { SettingsStore } from "../core/settings";
import { createDirector, type PresentationSystem } from "./director";

/** What a presentation system gets when the board starts: its layer stack, the settings and the director. */
interface PresentationContext {
  stack: LayerStack;
  settings: SettingsStore;
  director: ReturnType<typeof createDirector>;
  /** Wall-clock ms. */
  now: () => number;
}

export type PresentationFactory = (context: PresentationContext) => PresentationSystem;

/**
 * Every presentation system the board runs (P12). Layer, number, loot and
 * audio beads add their factory here; a factory may register draw layers
 * on the stack and returns the system that consumes cues.
 * @public
 */
export const PRESENTATION_SYSTEMS: PresentationFactory[] = [
  spriteSystem,
  tierSystem,
  musicSystem,
  hitSystem,
];

export interface PresentationOptions {
  stack: LayerStack;
  settings: SettingsStore;
  now: () => number;
  speed: () => number;
  /** Systems that exist before the registry's, such as the QA log. */
  base?: PresentationSystem[];
  factories?: readonly PresentationFactory[];
}

/** Builds the director and attaches every registered presentation system to it. */
export function createPresentation(options: PresentationOptions) {
  const systems: PresentationSystem[] = [...(options.base ?? [])];
  const director = createDirector({
    settings: options.settings.get,
    now: options.now,
    speed: options.speed,
    systems,
  });
  for (const factory of options.factories ?? PRESENTATION_SYSTEMS) {
    systems.push(
      factory({ stack: options.stack, settings: options.settings, director, now: options.now }),
    );
  }
  return { director, systems };
}
