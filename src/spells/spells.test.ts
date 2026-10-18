import { describe, expect, test } from "vitest";
import { starterCard } from "../heroes/model/starter";
import { buildMonster } from "../monsters/model";
import { lockRoster } from "../sim/economy/roster";
import type { SimEvent } from "../sim/events";
import type { Intent } from "../sim/intents";
import { step } from "../sim/kernel";
import { createRound, spawnMonster, type RoundState } from "../sim/state";
import { STEPS_PER_SECOND } from "../sim/time";
import { id } from "../types/ids";
import { shapeTiles } from "./shapes";
import { STARTER_SPELLS } from "./catalog";

const ALL_LANES = [0, 1, 2, 3, 4];

function round(spell: string, mana = 1000): RoundState {
  const state = createRound({ seed: 4, lanes: ALL_LANES, mana });
  lockRoster(state, [starterCard(id<"Gem">(spell), 1, "spell")]);
  state.roster[0]!.rechargeLeft = 0;
  return state;
}

/** A white level 1 Shambler that stands still on a tile. */
function shamblerAt(state: RoundState, lane: number, column: number) {
  return spawnMonster(state, {
    ...buildMonster({
      archetypeId: "Shambler",
      rarity: "normal",
      affixes: [],
      areaLevel: 1,
      lane,
      x: column,
    }),
    moveSpeed: 0,
  });
}

function run(state: RoundState, seconds: number, intents: Intent[] = []): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < seconds * STEPS_PER_SECOND; i++)
    events.push(...step(state, i === 0 ? intents : []));
  return events;
}

const cast = (lane: number, column: number): Intent => ({
  type: "cast",
  spellId: "spell",
  lane,
  x: column,
});

describe("grid shapes (Appendix B §6)", () => {
  test("a column covers every lane of the column", () => {
    expect(shapeTiles({ kind: "column" }, 2, 5, ALL_LANES)).toEqual(
      ALL_LANES.map((lane) => ({ lane, column: 5 })),
    );
  });

  test("a 3×3 covers the tile and its neighbours, clipped to the board", () => {
    expect(shapeTiles({ kind: "square", size: 3 }, 2, 5, ALL_LANES)).toHaveLength(9);
    expect(shapeTiles({ kind: "square", size: 3 }, 0, 1, ALL_LANES)).toEqual([
      { lane: 0, column: 1 },
      { lane: 0, column: 2 },
      { lane: 1, column: 1 },
      { lane: 1, column: 2 },
    ]);
  });
});

describe("each spell hits exactly its tiles", () => {
  /** Fills the board with Shamblers, casts at one tile, and splits hit and unhit around the expected centre. */
  function hitTargets(
    spell: string,
    cast: [number, number],
    centre: [number, number],
    seconds: number,
  ) {
    const state = round(spell);
    const inside: string[] = [];
    const outside: string[] = [];
    for (const l of ALL_LANES) {
      for (let c = 1; c <= 9; c++) {
        const m = shamblerAt(state, l, c);
        (Math.abs(l - centre[0]) <= 1 && Math.abs(c - centre[1]) <= 1 ? inside : outside).push(
          m.id,
        );
      }
    }
    const events = run(state, seconds, [
      { type: "cast", spellId: "spell", lane: cast[0], x: cast[1] },
    ]);
    const hits = new Set<string>(events.flatMap((e) => (e.type === "hit" ? [e.targetId] : [])));
    return { hits, inside, outside };
  }

  test("Comet lands on the 3×3 after 0.55 s", () => {
    const state = round(STARTER_SPELLS.comet);
    shamblerAt(state, 2, 5);
    expect(run(state, 0.5, [cast(2, 5)]).some((e) => e.type === "hit")).toBe(false);
    expect(run(state, 0.1).some((e) => e.type === "hit")).toBe(true);
    const { hits, inside, outside } = hitTargets(STARTER_SPELLS.comet, [2, 5], [2, 5], 1);
    expect([...hits].sort()).toEqual([...inside].sort());
    expect(outside.some((m) => hits.has(m))).toBe(false);
  });

  test("Explosive Grenade rolls one tile left and explodes on the 3×3 there after its 3 s fuse", () => {
    const state = round(STARTER_SPELLS.explosiveGrenade);
    shamblerAt(state, 2, 4);
    expect(run(state, 2.9, [cast(2, 5)]).some((e) => e.type === "hit")).toBe(false);
    expect(run(state, 0.2).some((e) => e.type === "hit")).toBe(true);
    const { hits, inside, outside } = hitTargets(
      STARTER_SPELLS.explosiveGrenade,
      [2, 5],
      [2, 4],
      3.2,
    );
    expect([...hits].sort()).toEqual([...inside].sort());
    expect(outside.some((m) => hits.has(m))).toBe(false);
  });

  test("Earthquake hits the whole column on impact and again with its Aftershock 4 s later", () => {
    const state = round(STARTER_SPELLS.earthquake);
    // Sturdy targets, so an impact crit never kills one before its Aftershock.
    const column = ALL_LANES.map((lane) => {
      const m = shamblerAt(state, lane, 6);
      m.actor.maxLife = m.actor.life = 10_000;
      return m;
    });
    const neighbour = shamblerAt(state, 2, 7);
    const impact = run(state, 0.1, [cast(2, 6)]).filter((e) => e.type === "hit");
    expect(impact.map((e) => e.type === "hit" && e.targetId).sort()).toEqual(
      column.map((m) => m.id).sort(),
    );
    expect(run(state, 3.8).some((e) => e.type === "hit")).toBe(false);
    const aftershock = run(state, 0.2).filter((e) => e.type === "hit");
    expect(aftershock).toHaveLength(5);
    expect(aftershock.some((e) => e.type === "hit" && e.targetId === neighbour.id)).toBe(false);
  });
});

describe("cost and cooldown", () => {
  test("a spell starts the level on its start cooldown", () => {
    const state = createRound({ seed: 4, lanes: ALL_LANES, mana: 1000 });
    lockRoster(state, [starterCard(id<"Gem">(STARTER_SPELLS.comet), 1, "spell")]);
    expect(run(state, 0.1, [cast(2, 5)])).toContainEqual(
      expect.objectContaining({ type: "castRefused", reason: "recharging" }),
    );
  });

  test("a cast spends mana and starts the cooldown; a second cast is refused", () => {
    const state = round(STARTER_SPELLS.comet, 200);
    expect(run(state, 0.1, [cast(2, 5)])).toContainEqual(
      expect.objectContaining({ type: "cast", spellId: "spell" }),
    );
    expect(state.mana).toBe(25);
    expect(state.roster[0]!.rechargeLeft).toBeCloseTo(45 - 0.1, 1);
    state.mana = 1000;
    expect(run(state, 0.1, [cast(2, 5)])).toContainEqual(
      expect.objectContaining({ type: "castRefused", reason: "recharging" }),
    );
  });

  test("a cast without the mana is refused", () => {
    const state = round(STARTER_SPELLS.comet, 100);
    expect(run(state, 0.1, [cast(2, 5)])).toContainEqual(
      expect.objectContaining({ type: "castRefused", reason: "cost" }),
    );
  });
});

describe("Appendix B §4: the starter spells one-shot level 1 whites", () => {
  test.each([
    ["Comet", STARTER_SPELLS.comet, 1],
    ["Earthquake's Aftershock", STARTER_SPELLS.earthquake, 4.2],
    ["Explosive Grenade", STARTER_SPELLS.explosiveGrenade, 3.2],
  ])("%s", (_name, spell, seconds) => {
    for (let seed = 0; seed < 10; seed++) {
      const state = round(spell);
      state.rng = createRound({ seed, lanes: ALL_LANES, mana: 0 }).rng;
      const target = shamblerAt(state, 2, 5);
      const events = run(state, seconds, [
        cast(2, spell === STARTER_SPELLS.explosiveGrenade ? 6 : 5),
      ]);
      expect(events).toContainEqual(expect.objectContaining({ type: "kill", targetId: target.id }));
    }
  });
});
