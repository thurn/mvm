import type { AssetManifest } from "../assets/manifest";
import type { SoundId } from "../assets/sounds";
import { AUDIO_TUNING, CATEGORIES, soundClass, type Bus, type Category } from "../tuning/audio";
import { SFX, zzfxSamples, type ZzfxParams } from "./zzfx";

/**
 * Every sound the game can ask for: a sampled sound from the sound map, or
 * a ZzFX sketch. Cues and play() take only these, so naming a sound that
 * doesn't exist is a type error (mason hv-7ic2.102).
 */
export type Sound = SoundId | keyof typeof SFX;

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
  const master = ctx.createGain();
  compressor.connect(master);
  master.connect(ctx.destination);
  /** Player volume per bus (the settings sliders), 0–1 on top of the bus's mix level. */
  const volumes: Record<Bus, number> = { music: 1, sfx: 1, loot: 1, ui: 1 };
  const base = (bus: Bus) => dbToGain(AUDIO_TUNING.busDb[bus]) * volumes[bus];
  const buses = {} as Record<Bus, GainNode>;
  for (const bus of Object.keys(AUDIO_TUNING.busDb) as Bus[]) {
    const gain = ctx.createGain();
    gain.gain.value = base(bus);
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
  /** The deepest duck in force per bus, so a weaker one never cuts it short. */
  const ducks = new Map<Bus, { db: number; until: number }>();
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
    /** A bus's input node, for players that manage their own sources (music). */
    bus: (bus: Bus): AudioNode => buses[bus],

    /** Sets the player's volume (0–1) for a bus, or for everything with "master". */
    setVolume(bus: Bus | "master", volume: number) {
      const v = Math.max(0, Math.min(1, volume));
      if (bus === "master") {
        master.gain.value = v;
        return;
      }
      volumes[bus] = v;
      const gain = buses[bus].gain;
      gain.cancelScheduledValues(ctx.currentTime);
      gain.setValueAtTime(base(bus), ctx.currentTime);
      ducks.delete(bus);
    },

    register(id: string, buffers: AudioBuffer[], layered: AudioBuffer[] = []) {
      samples.set(id, buffers);
      layers.set(id, layered);
    },

    /** Plays a sound id at board x (tiles); null when a rule drops it. */
    play(id: Sound, at: { x?: number; gainDb?: number; semitones?: number } = {}): Voice | null {
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
      // Ladders shift pitch by semitones (H §3.4); variation rides on top.
      source.playbackRate.value =
        2 ** ((at.semitones ?? 0) / 12) * (1 + (random() * 2 - 1) * varied);
      const gain = ctx.createGain();
      const volumeDb = category === "ui" ? 0 : (random() * 2 - 1) * AUDIO_TUNING.volumeVariationDb;
      gain.gain.value = dbToGain(volumeDb + (at.gainDb ?? 0));
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
          for (const layer of extras) {
            layer.onended = null;
            layer.stop();
          }
        },
      };
      // The voice counts against the caps until its main sample and every layer end.
      let playing = 1 + extras.length;
      const ended = () => {
        if (--playing === 0) voices = voices.filter((v) => v !== voice);
      };
      source.onended = ended;
      for (const layer of extras) layer.onended = ended;
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
      const t = ctx.currentTime;
      const active = ducks.get(bus);
      if (active && active.until > t && active.db <= db && active.until >= t + seconds) return;
      ducks.set(bus, {
        db: active && active.until > t ? Math.min(active.db, db) : db,
        until: Math.max(active && active.until > t ? active.until : t, t + seconds),
      });
      const duck = ducks.get(bus)!;
      const gain = buses[bus].gain;
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(base(bus) * dbToGain(duck.db), t);
      gain.linearRampToValueAtTime(base(bus), duck.until);
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
