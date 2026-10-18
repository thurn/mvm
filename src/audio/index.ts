import { loadSpriteAssets } from "../render/sprites/assets";
import { createAudioEngine, type AudioEngine } from "./engine";
import { createMusicPlayer, type MusicPlayer } from "./music/player";

let engine: AudioEngine | null = null;
let player: MusicPlayer | null = null;
let musicUrls: Partial<Record<string, string | null>> = {};

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
  void loadSpriteAssets().then(({ manifest }) => {
    musicUrls = manifest.music;
    return created.load(manifest, (data) => context.decodeAudioData(data));
  });
  // Browsers start audio suspended; the first input unlocks it (H §10.3).
  const unlock = () => void created.unlock();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  return engine;
}

/** The one music player, on the engine's music bus; null without audio. */
export function musicPlayer(): MusicPlayer | null {
  if (player) return player;
  const created = audioEngine();
  if (!created) return null;
  const context = created.context as AudioContext;
  player = createMusicPlayer(created, {
    urls: () => musicUrls,
    decode: (data) => context.decodeAudioData(data),
  });
  return player;
}
