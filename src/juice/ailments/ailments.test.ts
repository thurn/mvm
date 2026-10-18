import { describe, expect, test } from "vitest";
import { emptyAilments } from "../../combat/ailments";
import type { SimEvent } from "../../sim/events";
import { AILMENT_JUICE } from "../../tuning/juice";
import { DEFAULT_SETTINGS } from "../core/settings";
import { cuesFor } from "../cues";
import { activeAilments, ApplyGate, particleRate, topTint } from "./overlay";

describe("ailment cue rows (H §8)", () => {
  test.each([
    ["shock", 1],
    ["chill", 1],
    ["freeze", 2],
    ["ignite", 1],
    ["fullyBroken", 2],
  ])("%s applies with its overlay cue and sound at T%d", (ailment, tier) => {
    const event = {
      type: "ailmentApplied",
      targetId: "m1",
      ailment,
      magnitude: 1,
      seconds: 2,
    } as SimEvent;
    const batch = cuesFor(event, DEFAULT_SETTINGS);
    expect(batch.tier).toBe(tier);
    expect(batch.cues).toEqual([
      { kind: "ailment", targetId: "m1", ailment, phase: "apply" },
      { kind: "sound", id: `ailment_${ailment}`, bus: "sfx" },
    ]);
  });

  test("an expiry cues its overlay end; a heavy stun cues its pip and sound", () => {
    const expired = cuesFor(
      { type: "ailmentExpired", targetId: "m1", ailment: "freeze" } as SimEvent,
      DEFAULT_SETTINGS,
    );
    expect(expired.cues).toEqual([
      { kind: "ailment", targetId: "m1", ailment: "freeze", phase: "expire" },
    ]);
    const heavy = cuesFor(
      { type: "stun", targetId: "m1", kind: "heavy", seconds: 1 } as SimEvent,
      DEFAULT_SETTINGS,
    );
    expect(heavy.tier).toBe(3);
    // T3 also brings its tier shake.
    expect(heavy.cues.map((c) => c.kind)).toEqual(["ailment", "sound", "shake"]);
    const light = cuesFor(
      { type: "stun", targetId: "m1", kind: "light", seconds: 0.1 } as SimEvent,
      DEFAULT_SETTINGS,
    );
    expect(light.cues.map((c) => c.kind)).toEqual(["sound"]);
  });
});

describe("overlays (H §8, §1.1)", () => {
  test("every overlay stays at or under 45% alpha", () => {
    for (const name of AILMENT_JUICE.priority)
      expect(topTint([name])!.alpha).toBeLessThanOrEqual(0.45);
  });

  test("only the top-priority tint shows: freeze over shock over chill over ignite", () => {
    expect(topTint(["ignite", "chill"])!.color).toBe(AILMENT_JUICE.tints.chill.color);
    expect(topTint(["ignite", "shock", "freeze"])!.color).toBe(AILMENT_JUICE.tints.freeze.color);
    expect(topTint([])).toBeNull();
  });

  test("active ailments are read from the actor; three or more halve particle rates", () => {
    const a = emptyAilments();
    a.frozenSeconds = 1;
    a.ignite = { dps: 1, secondsLeft: 2, sourceId: "h" };
    a.shock = { magnitude: 0.2, secondsLeft: 2 };
    expect(activeAilments(a).sort()).toEqual(["freeze", "ignite", "shock"]);
    expect(particleRate(3)).toBe(0.5);
    expect(particleRate(2)).toBe(1);
  });
});

describe("apply-sound cap (H §8)", () => {
  test("one voice per ailment type per 80 ms, board-wide", () => {
    const gate = new ApplyGate();
    expect(gate.allow("shock", 0)).toBe(true);
    expect(gate.allow("shock", 50)).toBe(false);
    expect(gate.allow("chill", 50)).toBe(true);
    expect(gate.allow("shock", 80)).toBe(true);
  });
});
