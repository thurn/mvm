import type { AssetManifest } from "../assets/manifest";
import { AUDIO_TUNING, CATEGORIES, soundClass, type Bus, type Category } from "../tuning/audio";
import { SFX, zzfxSamples, type ZzfxParams } from "./zzfx";

/** The parts of AudioContext the engine uses, so tests can pass a fake. */
export type AudioContextLike = Pick<
  AudioContext,
  | "currentTime"
  | "sampleRate"
  | "state"
  | "destination"
  | "resume"
  | "createGain"
  | "createStereoPanner"
  | "createDynamicsCompressor"
  | "createBuffer"
  | "createBufferSource"
>;

export interface Voice {
  id: string;
  category: Category;
  bus: Bus;
  startedAt: number;
  source: AudioBufferSourceNode;
  gain: GainNode;
  stop(): void;
}

interface EngineOptions {
  context: AudioContextLike;
  /** Wall-clock ms. */
  now?: () => number;
  random?: () => number;
  /** Game speed: at 2× the retrigger guard halves (H §10.3). */
  speed?: () => number;
}

const dbToGain = (db: number) => 10 ** (db / 20);
const priority = (category: Category) => CATEGORIES.indexOf(category);

/** Stereo pan for a board x in tiles (H §10.3). */
export function panFor(x: number): number {
  const { boardColumns, span } = AUDIO_TUNING.pan;
  return (x / boardColumns) * span - span / 2;
}

/** The ZzFX sketch that stands in for a sound id without samples (H §11.2). */
function sketchFor(id: string): ZzfxParams {
  if (id in SFX) return SFX[id as keyof typeof SFX];
  const { category } = soundClass(id);
  if (category === "ui") return SFX.ui_click;
  if (category === "loot") return SFX.card_ready;
  return SFX.thud;
}

/**
 * The audio engine (H §10): one context, four buses into a master compressor,
 * the voice manager, ducking, round-robin variants and a ZzFX fallback.
 */
export function createAudioEngine(options: EngineOptions) {
  const ctx = options.context;
  const now = options.now ?? (() => performance.now());
  const random = options.random ?? Math.random;
  const speed = options.speed ?? (() => 1);

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = AUDIO_TUNING.compressor.thresholdDb;
  compressor.ratio.value = AUDIO_TUNING.compressor.ratio;
  compressor.knee.value = AUDIO_TUNING.compressor.kneeDb;
  compressor.connect(ctx.destination);
  const buses = {} as Record<Bus, GainNode>;
  for (const [bus, db] of Object.entries(AUDIO_TUNING.busDb) as [Bus, number][]) {
    const gain = ctx.createGain();
    gain.gain.value = dbToGain(db);
    gain.connect(compressor);
    buses[bus] = gain;
  }

  const samples = new Map<string, AudioBuffer[]>();
  /** Files played together with each variant (H §12.1). */
  const layers = new Map<string, AudioBuffer[]>();
  const lastVariant = new Map<string, number>();
  const lastStart = new Map<string, number>();
  const sketches = new Map<string, AudioBuffer>();
  let voices: Voice[] = [];
  const log = { played: [] as string[], dropped: [] as string[] };
  const remember = (list: string[], entry: string) => {
    list.push(entry);
    if (list.length > AUDIO_TUNING.logSize) list.shift();
  };

  function sketch(id: string): AudioBuffer {
    let buffer = sketches.get(id);
    if (!buffer) {
      const data = zzfxSamples(sketchFor(id), ctx.sampleRate, random);
      buffer = ctx.createBuffer(1, Math.max(1, data.length), ctx.sampleRate);
      buffer.getChannelData(0).set(data);
      sketches.set(id, buffer);
    }
    return buffer;
  }

  /** Round-robin: a random variant, never the previous one. */
  function pick(id: string, buffers: AudioBuffer[]): AudioBuffer {
    if (buffers.length === 1) return buffers[0]!;
    const previous = lastVariant.get(id) ?? -1;
    let index = Math.floor(random() * (buffers.length - 1));
    if (index >= previous && previous >= 0) index++;
    lastVariant.set(id, index);
    return buffers[index]!;
  }

  function drop(voice: Voice, reason: string) {
    remember(log.dropped, `${voice.id} (${reason})`);
    voice.stop();
  }

  return {
    context: ctx,
    log,
    voices: () => [...voices],
    busGain: (bus: Bus) => buses[bus].gain.value,

    register(id: string, buffers: AudioBuffer[], layered: AudioBuffer[] = []) {
      samples.set(id, buffers);
      layers.set(id, layered);
    },

    /** Plays a sound id at board x (tiles); null when a rule drops it. */
    play(id: string, at: { x?: number } = {}): Voice | null {
      const { category, bus } = soundClass(id);
      const t = now();
      // Retrigger guard: raise the playing voice instead of starting another.
      const guard = AUDIO_TUNING.retriggerMs / Math.max(1, speed());
      if (t - (lastStart.get(id) ?? -Infinity) < guard) {
        const playing = voices.filter((v) => v.id === id).at(-1);
        if (playing) playing.gain.gain.value *= dbToGain(AUDIO_TUNING.retriggerBoostDb);
        return null;
      }
      // Per-sound cap: the oldest voice of this sound makes room.
      const same = voices.filter((v) => v.id === id);
      if (same.length >= AUDIO_TUNING.voiceCap[category]) drop(same[0]!, "sound cap");
      // Global cap: the lowest-priority voice goes, unless it outranks the newcomer.
      // Loot is never culled by it, and a loot voice may exceed it.
      const capped = voices.filter((v) => v.category !== "loot");
      if (voices.length >= AUDIO_TUNING.globalVoices && category !== "loot") {
        const lowest = capped.reduce<Voice | null>(
          (low, v) => (!low || priority(v.category) < priority(low.category) ? v : low),
          null,
        );
        if (!lowest || priority(lowest.category) > priority(category)) {
          remember(log.dropped, `${id} (global cap)`);
          return null;
        }
        drop(lowest, "global cap");
      } else if (voices.length >= AUDIO_TUNING.globalVoices && capped.length > 0) {
        drop(
          capped.reduce((low, v) => (priority(v.category) < priority(low.category) ? v : low)),
          "global cap",
        );
      }

      const buffers = samples.get(id);
      const source = ctx.createBufferSource();
      source.buffer = buffers && buffers.length > 0 ? pick(id, buffers) : sketch(id);
      const variation =
        category === "loot" ? AUDIO_TUNING.pitchVariation.loot : AUDIO_TUNING.pitchVariation.combat;
      const varied = category === "ui" ? 0 : variation;
      source.playbackRate.value = 1 + (random() * 2 - 1) * varied;
      const gain = ctx.createGain();
      const volumeDb = category === "ui" ? 0 : (random() * 2 - 1) * AUDIO_TUNING.volumeVariationDb;
      gain.gain.value = dbToGain(volumeDb);
      source.connect(gain);
      const extras = (buffers && buffers.length > 0 ? (layers.get(id) ?? []) : []).map((buffer) => {
        const layer = ctx.createBufferSource();
        layer.buffer = buffer;
        layer.playbackRate.value = source.playbackRate.value;
        layer.connect(gain);
        return layer;
      });
      if (at.x !== undefined) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = panFor(at.x);
        gain.connect(panner);
        panner.connect(buses[bus]);
      } else gain.connect(buses[bus]);

      const voice: Voice = {
        id,
        category,
        bus,
        startedAt: t,
        source,
        gain,
        stop() {
          voices = voices.filter((v) => v !== voice);
          source.onended = null;
          source.stop();
          for (const layer of extras) layer.stop();
        },
      };
      source.onended = () => {
        voices = voices.filter((v) => v !== voice);
      };
      voices.push(voice);
      lastStart.set(id, t);
      remember(log.played, id);
      source.start();
      for (const layer of extras) layer.start();
      return voice;
    },

    /** Ducks a bus by `db` for `seconds`, then ramps back (H §10.2). Loot is never ducked. */
    duck(bus: Bus, db: number, seconds: number) {
      if (bus === "loot") return;
      const gain = buses[bus].gain;
      const base = dbToGain(AUDIO_TUNING.busDb[bus]);
      const t = ctx.currentTime;
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(base * dbToGain(db), t);
      gain.linearRampToValueAtTime(base, t + seconds);
    },

    /** Resumes the context; call from the first user gesture (H §10.3). */
    unlock(): Promise<void> {
      return ctx.state === "running" ? Promise.resolve() : ctx.resume();
    },

    /** Fetches and decodes every sampled sound in the manifest; the rest stay ZzFX. */
    async load(manifest: AssetManifest, decode: (data: ArrayBuffer) => Promise<AudioBuffer>) {
      await Promise.all(
        Object.entries(manifest.sounds).map(async ([id, sound]) => {
          const fetchAll = async (urls: string[]) => {
            const buffers: AudioBuffer[] = [];
            for (const url of urls) {
              try {
                buffers.push(await decode(await (await fetch(url)).arrayBuffer()));
              } catch {
                remember(log.dropped, `${id} (no sample ${url})`);
              }
            }
            return buffers;
          };
          const buffers = await fetchAll(sound.variants);
          if (buffers.length > 0) {
            samples.set(id, buffers);
            layers.set(id, await fetchAll(sound.layers));
          }
        }),
      );
    },
  };
}

export type AudioEngine = ReturnType<typeof createAudioEngine>;
