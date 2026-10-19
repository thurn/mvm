import { describe, expect, test } from "vitest";
import { AUDIO_TUNING } from "../tuning/audio";
import { recordAudio, type QaSurface } from "../dev/qa-surface";
import {
  createAudioEngine,
  panFor,
  type AudioContextLike,
  type AudioLogEntry,
  type Sound,
} from "./engine";
import { SFX, zzfxSamples } from "./zzfx";

interface FakeParam {
  value: number;
  setValueAtTime(value: number, at: number): void;
  linearRampToValueAtTime(value: number, at: number): void;
  cancelScheduledValues(at: number): void;
}

function param(value: number): FakeParam {
  return {
    value,
    setValueAtTime(v) {
      this.value = v;
    },
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}

function node() {
  return { connect: () => {}, disconnect: () => {} };
}

/** A fake AudioContext: it records sources and lets tests end them. */
function fakeContext() {
  const sources: { buffer: unknown; stopped: boolean; stop(): void }[] = [];
  const ctx = {
    currentTime: 0,
    sampleRate: 44100,
    state: "suspended",
    destination: node(),
    resume() {
      ctx.state = "running";
      return Promise.resolve();
    },
    createGain: () => ({ ...node(), gain: param(1) }),
    createStereoPanner: () => ({ ...node(), pan: param(0) }),
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: param(0),
      ratio: param(1),
      knee: param(30),
    }),
    createBuffer: (_channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource() {
      const source: {
        buffer: unknown;
        playbackRate: FakeParam;
        onended: null | (() => void);
        stopped: boolean;
        connect(): void;
        disconnect(): void;
        start(): void;
        stop(): void;
      } = {
        ...node(),
        buffer: null as unknown,
        playbackRate: param(1),
        onended: null as null | (() => void),
        stopped: false,
        start() {},
        stop() {
          source.stopped = true;
          source.onended?.();
        },
      };
      sources.push(source);
      return source;
    },
  };
  return { ctx: ctx as unknown as AudioContextLike, sources };
}

function setup(onLog?: (entry: AudioLogEntry) => void) {
  const { ctx, sources } = fakeContext();
  let now = 0;
  let seed = 1;
  const engine = createAudioEngine({
    context: ctx,
    now: () => now,
    ...(onLog ? { onLog } : {}),
    random: () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646,
  });
  const buffer = (n: number) => ({ id: n }) as unknown as AudioBuffer;
  return {
    engine,
    sources,
    tick: (ms = 50) => (now += ms),
    register: (id: string, count = 1) =>
      engine.register(
        id,
        Array.from({ length: count }, (_, i) => buffer(i)),
      ),
  };
}

describe("voice manager (H §10.3)", () => {
  test("the per-sound cap stops the oldest voice of that sound", () => {
    const { engine, register, tick } = setup();
    register("hit_light");
    const first = engine.play("hit_light");
    for (let i = 0; i < AUDIO_TUNING.voiceCap.hit; i++) {
      tick();
      engine.play("hit_light");
    }
    expect(engine.voices().filter((v) => v.id === "hit_light")).toHaveLength(6);
    expect(engine.voices()).not.toContain(first);
  });

  test("over the global cap, the lowest-priority voice is dropped first", () => {
    const { engine, register, tick } = setup();
    register("kill");
    for (let i = 0; i < 3; i++) {
      engine.play("kill");
      tick();
    }
    for (let i = 0; i < 29; i++) {
      register(`hit_${i}`);
      engine.play(`hit_${i}` as Sound);
      tick();
    }
    expect(engine.voices()).toHaveLength(32);
    register("spell_impact");
    expect(engine.play("spell_impact")).not.toBeNull();
    expect(engine.voices()).toHaveLength(32);
    expect(engine.voices().filter((v) => v.id === "kill")).toHaveLength(2);
    expect(engine.log.dropped.at(-1)).toContain("kill");
  });

  test("a voice of lower priority than everything playing is the one dropped", () => {
    const { engine, register, tick } = setup();
    for (let i = 0; i < 32; i++) {
      register(`spell_${i}`);
      engine.play(`spell_${i}` as Sound);
      tick();
    }
    register("hit_light");
    expect(engine.play("hit_light")).toBeNull();
    expect(engine.log.dropped.at(-1)).toContain("hit_light");
  });

  test("loot is never culled by the global cap and never ducked", () => {
    const { engine, register, tick } = setup();
    for (let i = 0; i < 32; i++) {
      register(`drop_${i}`);
      engine.play(`drop_${i}` as Sound);
      tick();
    }
    register("ui_click");
    expect(engine.play("ui_click")).toBeNull();
    register("drop_rare");
    expect(engine.play("drop_rare")).not.toBeNull();
    expect(engine.voices().filter((v) => v.bus === "loot")).toHaveLength(33);
    const before = engine.busGain("loot");
    engine.duck("loot", -8, 2);
    expect(engine.busGain("loot")).toBe(before);
    const sfx = engine.busGain("sfx");
    engine.duck("sfx", -6, 1);
    expect(engine.busGain("sfx")).toBeLessThan(sfx);
  });

  test("the retrigger guard raises the playing voice by 1 dB instead", () => {
    const { engine, register, tick } = setup();
    register("hit_medium");
    const voice = engine.play("hit_medium")!;
    const gain = voice.gain.gain.value;
    tick(10);
    expect(engine.play("hit_medium")).toBeNull();
    expect(engine.voices()).toHaveLength(1);
    expect(voice.gain.gain.value).toBeCloseTo(gain * 10 ** (1 / 20));
  });

  test("a sound with a minimum interval plays once per window: one squeak per swarm (H §7.1)", () => {
    const { engine, register, tick } = setup();
    register("rat_squeak");
    expect(engine.play("rat_squeak")).not.toBeNull();
    tick(200);
    expect(engine.play("rat_squeak")).toBeNull();
    tick(2000);
    expect(engine.play("rat_squeak")).not.toBeNull();
  });

  test("round-robin never repeats a variant twice in a row", () => {
    const { engine, register, tick, sources } = setup();
    register("hit_heavy", 3);
    for (let i = 0; i < 60; i++) {
      engine.play("hit_heavy");
      tick();
    }
    const order = sources.map((s) => s.buffer);
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1]);
    expect(new Set(order).size).toBe(3);
  });

  test("pan by board x: -0.3 at x = 0 and +0.3 at x = 9", () => {
    expect(panFor(0)).toBeCloseTo(-0.3);
    expect(panFor(9)).toBeCloseTo(0.3);
  });

  test("a sound without samples falls back to a ZzFX tone", () => {
    const { engine, sources } = setup();
    expect(engine.play("ui_deny")).not.toBeNull();
    // An id with neither samples nor a sketch can only arrive through a cast; it still plays a fallback.
    expect(engine.play("never_registered" as Sound)).not.toBeNull();
    expect(sources).toHaveLength(2);
  });

  test("layers start and stop with their voice", () => {
    const { engine, sources, tick } = setup();
    engine.register("drop_rare", [{} as AudioBuffer], [{} as AudioBuffer, {} as AudioBuffer]);
    const voice = engine.play("drop_rare")!;
    expect(sources).toHaveLength(3);
    tick();
    voice.stop();
    expect(sources.every((s) => s.stopped)).toBe(true);
  });

  test("a weaker duck never cuts a deeper one short", () => {
    const { engine } = setup();
    engine.duck("music", -8, 2);
    const deep = engine.busGain("music");
    engine.duck("music", -4, 1);
    expect(engine.busGain("music")).toBeCloseTo(deep);
  });

  test("a voice counts until its longest layer ends", () => {
    const { engine, sources, tick } = setup();
    engine.register("drop_unique", [{} as AudioBuffer], [{} as AudioBuffer]);
    engine.play("drop_unique");
    tick();
    sources[0]!.stop();
    expect(engine.voices()).toHaveLength(1);
    sources[1]!.stop();
    expect(engine.voices()).toHaveLength(0);
  });

  test("bus volume scales the bus's mix level and survives a duck", () => {
    const { engine } = setup();
    const full = engine.busGain("sfx");
    engine.setVolume("sfx", 0.5);
    expect(engine.busGain("sfx")).toBeCloseTo(full * 0.5);
    engine.duck("sfx", -6, 1);
    expect(engine.busGain("sfx")).toBeCloseTo(full * 0.5 * 10 ** (-6 / 20));
  });

  test("unlock resumes the context", async () => {
    const { engine } = setup();
    await engine.unlock();
    expect(engine.context.state).toBe("running");
  });
});

describe("audio log (hv-7ic2.112)", () => {
  test("played and dropped sounds reach window.__mvm.audioLog, capped at 200", () => {
    const qa = { audioLog: [] } as unknown as QaSurface;
    const { engine, register, tick } = setup((entry) => recordAudio(qa, entry));
    register("place_thunk");
    engine.play("place_thunk");
    expect(qa.audioLog).toEqual([{ kind: "played", id: "place_thunk", bus: "sfx", at: 0 }]);

    register("hit_light");
    for (let i = 0; i <= AUDIO_TUNING.voiceCap.hit; i++) {
      tick();
      engine.play("hit_light");
    }
    expect(qa.audioLog.at(-2)).toMatchObject({
      kind: "dropped",
      id: "hit_light",
      reason: "sound cap",
    });

    for (let i = 0; i < 250; i++) {
      tick();
      engine.play("place_thunk");
    }
    expect(qa.audioLog).toHaveLength(200);
  });
});

describe("ZzFX sketches (H §11.2)", () => {
  test.each(Object.keys(SFX))("%s renders non-silent, 0.04–0.8 s long", (name) => {
    const samples = zzfxSamples(SFX[name as keyof typeof SFX], 44100, () => 0.5);
    expect(samples.length / 44100).toBeGreaterThanOrEqual(0.04);
    expect(samples.length / 44100).toBeLessThanOrEqual(0.8 + 0.01);
    expect(Math.max(...samples.map(Math.abs))).toBeGreaterThan(0.01);
  });
});
