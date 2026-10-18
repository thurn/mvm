import { describe, expect, test } from "vitest";
import { cuesFor } from "../cues";
import { DEFAULT_SETTINGS } from "../core/settings";
import { KILL_TUNING } from "../../tuning/juice";
import { AUDIO_TUNING } from "../../tuning/audio";
import { createAudioEngine, type AudioContextLike } from "../../audio/engine";
import { coinCount, coinTimeline, Ladder } from "./coins";
import type { SimEvent } from "../../sim/events";

const kill = (rarity: "normal" | "magic" | "rare" | "unique" | null): SimEvent =>
  ({ type: "kill", sourceId: "h1", targetId: "m1", lane: 2, x: 5, rarity }) as SimEvent;

describe("kill cue rows (H §1.3, §7.2)", () => {
  test.each([
    ["normal", 2],
    ["magic", 2],
    ["rare", 3],
    ["unique", 5],
  ] as const)("a %s kill is T%d with the death vocal and the pop", (rarity, tier) => {
    const batch = cuesFor(kill(rarity), DEFAULT_SETTINGS);
    expect(batch.tier).toBe(tier);
    const sounds = batch.cues.filter((c) => c.kind === "sound").map((c) => c.id);
    expect(sounds).toEqual(["kill", "kill_pop"]);
  });

  test("a hero death is T3 with the falling sting and no pop", () => {
    const batch = cuesFor(kill(null), DEFAULT_SETTINGS);
    expect(batch.tier).toBe(3);
    expect(batch.cues.filter((c) => c.kind === "sound").map((c) => c.id)).toEqual(["hero_death"]);
  });
});

describe("gold coins (H §3.5)", () => {
  test("a pile splits into 3–8 coins; a rare kill showers 15", () => {
    expect(coinCount(1, false)).toBe(3);
    expect(coinCount(15, false)).toBe(5);
    expect(coinCount(500, false)).toBe(8);
    expect(coinCount(1, true)).toBe(15);
  });

  test("coins magnetise after 0.6 s, staggered 30 ms, and land 350 ms later", () => {
    expect(coinTimeline(3, 1000)).toEqual([
      { flyAt: 1600, arriveAt: 1950 },
      { flyAt: 1630, arriveAt: 1980 },
      { flyAt: 1660, arriveAt: 2010 },
    ]);
  });

  test("the coin ladder climbs a semitone per pickup within 0.4 s, wraps after 12, and resets", () => {
    const ladder = new Ladder(
      KILL_TUNING.coins.ladderWindowMs,
      KILL_TUNING.coins.ladderMaxSemitones,
    );
    const steps = Array.from({ length: 15 }, (_, i) => ladder.next(i * 30));
    expect(steps.slice(0, 13)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(steps[13]).toBe(0);
    expect(ladder.next(2000)).toBe(0);
  });

  test("coin clinks respect their per-sound cap", () => {
    const sources: { stop(): void }[] = [];
    const param = () => ({
      value: 1,
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      cancelScheduledValues() {},
    });
    const node = () => ({ connect() {}, disconnect() {} });
    const ctx = {
      currentTime: 0,
      sampleRate: 8000,
      state: "running",
      destination: node(),
      resume: () => Promise.resolve(),
      createGain: () => ({ ...node(), gain: param() }),
      createStereoPanner: () => ({ ...node(), pan: param() }),
      createDynamicsCompressor: () => ({
        ...node(),
        threshold: param(),
        ratio: param(),
        knee: param(),
      }),
      createBuffer: (_c: number, length: number) => ({
        getChannelData: () => new Float32Array(length),
      }),
      createBufferSource() {
        const source = {
          ...node(),
          buffer: null,
          playbackRate: param(),
          onended: null as null | (() => void),
          start() {},
          stop() {
            source.onended?.();
          },
        };
        sources.push(source);
        return source;
      },
    } as unknown as AudioContextLike;
    let now = 0;
    const engine = createAudioEngine({ context: ctx, now: () => now, random: () => 0.5 });
    for (let i = 0; i < 15; i++) {
      engine.play("coin");
      now += 40;
    }
    expect(engine.voices().filter((v) => v.id === "coin")).toHaveLength(AUDIO_TUNING.voiceCap.loot);
  });
});
