import { loadSpriteAssets } from "../render/sprites/assets";
import { createAudioEngine, type AudioEngine } from "./engine";

let engine: AudioEngine | null = null;

/**
 * The game's one audio engine, created on first use. It loads the manifest's
 * samples in the background; until then, and for any sound without samples,
 * ZzFX plays. Call `unlock()` from the first user gesture.
 */
export function audioEngine(): AudioEngine | null {
  if (engine) return engine;
  if (typeof AudioContext === "undefined") return null;
  const context = new AudioContext();
  engine = createAudioEngine({ context });
  const created = engine;
  void loadSpriteAssets().then(({ manifest }) =>
    created.load(manifest, (data) => context.decodeAudioData(data)),
  );
  return engine;
}
