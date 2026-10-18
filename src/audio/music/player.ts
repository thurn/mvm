import type { MusicId } from "../../assets/music";
import { MUSIC_TUNING } from "../../tuning/audio";
import type { AudioEngine } from "../engine";
import { crossfadeCurves } from "./crossfade";

interface Playing {
  track: MusicId;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * The music player (H §10.4): one looping track at a time on the music bus,
 * switched with a 1.5 s equal-power crossfade. Tracks load from the asset
 * manifest; a track with no file stays silent.
 */
export function createMusicPlayer(
  engine: AudioEngine,
  options: {
    urls: () => Partial<Record<MusicId, string | null>>;
    decode: (data: ArrayBuffer) => Promise<AudioBuffer>;
  },
) {
  const ctx = engine.context as AudioContext;
  const buffers = new Map<MusicId, Promise<AudioBuffer | null>>();
  let current: Playing | null = null;
  let wanted: MusicId | null = null;

  const load = (track: MusicId) => {
    let found = buffers.get(track);
    if (found) return found;
    const url = options.urls()[track];
    // Until the manifest names a file, nothing is cached, so a later call retries.
    if (!url) return Promise.resolve(null);
    found = fetch(url)
      .then((r) => r.arrayBuffer())
      .then(options.decode)
      .catch(() => null);
    buffers.set(track, found);
    return found;
  };

  function fadeOut(playing: Playing, seconds: number) {
    const t = ctx.currentTime;
    playing.gain.gain.cancelScheduledValues(t);
    playing.gain.gain.setValueCurveAtTime(crossfadeCurves().from, t, seconds);
    playing.source.stop(t + seconds);
  }

  return {
    /** The track playing or loading. */
    track: () => wanted,

    /** Crossfades to `track`; playing the current track again does nothing. */
    async play(track: MusicId) {
      if (wanted === track) return;
      wanted = track;
      const buffer = await load(track);
      if (wanted !== track) return;
      if (current) fadeOut(current, MUSIC_TUNING.crossfadeSeconds);
      current = null;
      if (!buffer) {
        wanted = null;
        return;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      source.connect(gain);
      gain.connect(engine.bus("music"));
      const t = ctx.currentTime;
      gain.gain.setValueCurveAtTime(crossfadeCurves().to, t, MUSIC_TUNING.crossfadeSeconds);
      source.start(t);
      current = { track, source, gain };
    },

    /** Fades the music out. */
    stop(seconds = MUSIC_TUNING.crossfadeSeconds) {
      wanted = null;
      if (current) fadeOut(current, seconds);
      current = null;
    },
  };
}

export type MusicPlayer = ReturnType<typeof createMusicPlayer>;
