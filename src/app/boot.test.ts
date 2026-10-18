import { describe, expect, test } from "vitest";
import { newAccount, beginLevel } from "../account/lifecycle";
import { LEVEL_1 } from "../monsters/levels/level-1";
import { acceptsIntent, bootDecision, countdownAt } from "./boot";

describe("the boot decision (P14)", () => {
  test("no save, or no round, means the title", () => {
    expect(bootDecision(null)).toEqual({ kind: "title" });
    expect(
      bootDecision({ account: newAccount("warrior"), round: null, roundRejected: null }),
    ).toEqual({ kind: "title" });
  });

  test("a first-clear pick left unmade, with no round, reopens the level-end pick (1.35)", () => {
    const account = newAccount("warrior");
    account.pendingChoices.push({ levelId: "level-1", options: [] });
    expect(bootDecision({ account, round: null, roundRejected: null })).toEqual({ kind: "pick" });
  });

  test("a valid round means the countdown", () => {
    const account = newAccount("warrior");
    const round = beginLevel(account, LEVEL_1, 1);
    expect(bootDecision({ account, round, roundRejected: null })).toEqual({ kind: "resume" });
  });

  test("a rejected round means the restart banner", () => {
    const account = newAccount("warrior");
    const round = beginLevel(account, LEVEL_1, 1);
    expect(bootDecision({ account, round, roundRejected: "invalid: tick" })).toEqual({
      kind: "restart",
      reason: "invalid: tick",
    });
  });
});

describe("the resume countdown", () => {
  test("counts 3, 2, 1, then ends", () => {
    expect(countdownAt(1000, 1000)).toBe(3);
    expect(countdownAt(1000, 1999)).toBe(3);
    expect(countdownAt(1000, 2000)).toBe(2);
    expect(countdownAt(1000, 3500)).toBe(1);
    expect(countdownAt(1000, 4000)).toBeNull();
    expect(countdownAt(null, 4000)).toBeNull();
  });

  test("intents during the countdown are refused", () => {
    const place = { type: "place" as const, cardId: "c", lane: 2, column: 2 };
    expect(acceptsIntent(3, place)).toBe(false);
    expect(acceptsIntent(1, { type: "setSpeed", speed: 2 })).toBe(false);
    expect(acceptsIntent(null, place)).toBe(true);
  });
});
