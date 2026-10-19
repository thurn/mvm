import { describe, expect, test } from "vitest";
import { damageMap } from "../combat/damage";
import type { SimEvent, SimEventOf } from "../sim/events";
import { JUICE_TUNING } from "../tuning/juice";
import { id } from "../types/ids";
import { DEFAULT_SETTINGS } from "./core/settings";
import { cuesFor } from "./cues";
import { createDirector } from "./director/director";

const at = { lane: 2, x: 5 };
const hit = (dealt: number, maxLife: number, crit = false): SimEventOf<"hit"> => ({
  type: "hit",
  sourceId: "s" as never,
  targetId: "t" as never,
  ...at,
  dealt,
  targetMaxLife: maxLife,
  breakdown: damageMap({ physical: dealt }),
  crit,
  avoidedBy: null,
});

function itemDrop(rarity: "normal" | "magic" | "rare" | "unique"): SimEventOf<"drop"> {
  const item = {
    id: id<"Item">("i"),
    baseId: "b" as never,
    rarity,
    itemLevel: 1,
    quality: 0,
    mods: [],
  };
  return {
    type: "drop",
    dropId: "d",
    monsterId: "m" as never,
    ...at,
    drop: { kind: "item", item },
  };
}

/**
 * One event of every type. Typed as a complete record, so a new event type
 * without a cue-table sample here is a type error (mason hv-7ic2.102).
 */
const SAMPLES: { [K in SimEvent["type"]]: SimEventOf<K> } = {
  hit: hit(30, 100, true),
  kill: { type: "kill", sourceId: "s" as never, targetId: "t" as never, ...at, rarity: "rare" },
  drop: itemDrop("unique"),
  manaSpawn: { type: "manaSpawn", orbId: "o", amount: 25, ...at, source: "sky" },
  manaCollect: { type: "manaCollect", orbId: "o", amount: 25 },
  placed: { type: "placed", heroId: "h" as never, lane: 2, column: 3 },
  placeRefused: { type: "placeRefused", cardId: "c", lane: 2, column: 3, reason: "cost" },
  shovelled: { type: "shovelled", heroId: "h" as never, lane: 2, column: 3 },
  leak: { type: "leak", monsterId: "m" as never, lane: 2, rarity: "normal", cost: 1, lifeLeft: 19 },
  cast: { type: "cast", castId: "c" as never, spellId: "s", lane: 2, column: 5 },
  castRefused: { type: "castRefused", spellId: "s", lane: 2, column: 5, reason: "recharging" },
  spellImpact: {
    type: "spellImpact",
    castId: "c" as never,
    part: "comet",
    lane: 2,
    column: 5,
    tiles: [{ lane: 2, column: 5 }],
  },
  waveStart: { type: "waveStart", wave: 5, flag: true },
  flagWarning: { type: "flagWarning", wave: 5 },
  levelEnd: { type: "levelEnd", result: "won" },
  ailmentApplied: {
    type: "ailmentApplied",
    targetId: "t" as never,
    ailment: "freeze",
    magnitude: 1,
    seconds: 2,
  },
  ailmentExpired: { type: "ailmentExpired", targetId: "t" as never, ailment: "freeze" },
  dot: {
    type: "dot",
    sourceId: "s" as never,
    targetId: "t" as never,
    ailment: "ignite",
    amount: 2,
    ...at,
  },
  stun: { type: "stun", targetId: "t" as never, kind: "heavy", seconds: 1 },
  bossSpawned: {
    type: "bossSpawned",
    monsterId: "m" as never,
    bossId: "BloatedMiller",
    lanes: [2, 3],
    x: 9,
  },
  bossTelegraph: {
    type: "bossTelegraph",
    monsterId: "m" as never,
    ability: "grainSlam",
    tiles: [{ lane: 2, column: 5 }],
    seconds: 1.3,
  },
  bossAbility: { type: "bossAbility", monsterId: "m" as never, ability: "grainSlam", tiles: [] },
  bossEnrage: { type: "bossEnrage", monsterId: "m" as never },
  bossPrimed: { type: "bossPrimed", monsterId: "m" as never },
  lootBurst: { type: "lootBurst", sourceId: "m", dropIds: ["d"], lane: 2, x: 5 },
  leap: { type: "leap", monsterId: "m" as never, lane: 2, fromX: 5.5, toX: 4 },
  strongboxTriggered: { type: "strongboxTriggered", lane: 2, column: 6, ambushIds: [] },
};

describe("every cue row (H §1.3)", () => {
  test.each(Object.values(SAMPLES))("$type: a tier in range, and only real presets", (event) => {
    const batch = cuesFor(event, DEFAULT_SETTINGS);
    expect(batch.tier).toBeGreaterThanOrEqual(0);
    expect(batch.tier).toBeLessThanOrEqual(5);
    for (const cue of batch.cues)
      if (cue.kind === "particles") expect(JUICE_TUNING.presets).toHaveProperty(cue.preset);
  });

  test("at juice 0, no event shakes the board, freezes time or slows it", () => {
    const now = 0;
    const director = createDirector({
      settings: () => ({ ...DEFAULT_SETTINGS, juice: 0 }),
      now: () => now,
      speed: () => 1,
      systems: [],
    });
    director.handle(Object.values(SAMPLES));
    expect(director.shakeOffset(0.05)).toEqual({ x: 0, y: 0 });
    expect(director.frozen(now + 30)).toBe(false);
    expect(director.timeScale(now + 100)).toBe(1);
    expect(director.actorFrozen("t", now + 30)).toBe(false);
  });
});

/** The tier ladder is a design contract (H §1.3): bigger moments sit on higher tiers. */
describe("the tier ladder", () => {
  test.each([
    ["a small hit", hit(2, 100), 1],
    ["a big hit", hit(30, 100), 2],
    ["a crit", hit(2, 100, true), 2],
    ["a normal kill", { ...SAMPLES.kill, rarity: "normal" }, 2],
    ["a rare kill", SAMPLES.kill, 3],
    ["a leak", SAMPLES.leak, 3],
    ["a flag warning", SAMPLES.flagWarning, 4],
    ["a won level", SAMPLES.levelEnd, 5],
    ["mana collected", SAMPLES.manaCollect, 0],
  ] as const)("%s is tier %d", (_name, event, tier) => {
    expect(cuesFor(event as SimEvent, DEFAULT_SETTINGS).tier).toBe(tier);
  });

  test.each([
    ["normal", 1],
    ["magic", 2],
    ["rare", 3],
    ["unique", 5],
  ] as const)("a %s item drop is tier %d with a loot timeline", (rarity, tier) => {
    const batch = cuesFor(itemDrop(rarity), DEFAULT_SETTINGS);
    expect(batch.tier).toBe(tier);
    expect(batch.cues.some((c) => c.kind === "lootTimeline")).toBe(true);
  });
});
