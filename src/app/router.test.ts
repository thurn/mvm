import { describe, expect, test } from "vitest";
import { route, titleOptions, type RouteAction, type Screen } from "./router";

const fresh = { hasAccount: false, hasRound: false };
const returning = { hasAccount: true, hasRound: false };
const midRound = { hasAccount: true, hasRound: true };

function walk(start: Screen, actions: RouteAction[], save = returning): Screen[] {
  const screens: Screen[] = [];
  let at = start;
  for (const action of actions) screens.push((at = route(at, action, save)));
  return screens;
}

describe("the M1 flow (1.34)", () => {
  test("a new player reaches Level 1 in three clicks: New game, a focus, Level 1", () => {
    expect(titleOptions(fresh)).toEqual({ continue: false, newGame: true });
    expect(route("title", "newGame", fresh)).toBe("focus");
    expect(route("focus", "focusChosen", fresh)).toBe("campaign");
    expect(route("campaign", "playLevel", returning)).toBe("level");
  });

  test("continue: an account goes to its campaign; a round in progress resumes the level", () => {
    expect(titleOptions(returning)).toEqual({ continue: true, newGame: false });
    expect(route("title", "continue", returning)).toBe("campaign");
    expect(route("title", "continue", midRound)).toBe("level");
    expect(route("title", "continue", fresh)).toBe("title");
  });

  test("level end leads to replay or the hideout, and the hideout back to the level", () => {
    expect(walk("level", ["levelEnded", "replay", "levelEnded", "hideout", "playLevel"])).toEqual([
      "levelEnd",
      "level",
      "levelEnd",
      "hideout",
      "level",
    ]);
  });

  test("credits and focus go back to the title", () => {
    expect(walk("title", ["credits", "back"])).toEqual(["credits", "title"]);
    expect(route("focus", "back", fresh)).toBe("title");
  });

  test("actions that don't apply leave the screen as it is", () => {
    expect(route("level", "newGame", fresh)).toBe("level");
    expect(route("title", "newGame", returning)).toBe("title");
    expect(route("hideout", "replay", returning)).toBe("hideout");
    expect(route("campaign", "levelEnded", returning)).toBe("campaign");
  });
});
