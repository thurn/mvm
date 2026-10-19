import { id } from "../types/ids";
import { describe, expect, test } from "vitest";
import { hashState } from "../sim/hash";
import { step } from "../sim/kernel";
import { STEPS_PER_SECOND } from "../sim/time";
import { createRegistry, load, serialize, SAVE_SECTIONS } from "../save/registry";
import { LEVEL_1 } from "../monsters/levels/level-1";
import { FOCUSES } from "../sim/policies/focus";
import { POLICIES } from "../sim/policies/policies";
import {
  applyStep,
  beginLevel,
  finishLevel,
  newAccount,
  saveDocument,
  resumeFromDocument,
} from "./lifecycle";
import { rosterMatches } from "./rewards";
import type { AccountState } from "./state";

const registry = createRegistry(SAVE_SECTIONS);

/** Plays a level with the PvZ opener, applying each step to the account, until it ends or times out. */
function play(account: AccountState, seed: number, maxSeconds = 400) {
  const round = beginLevel(account, LEVEL_1, seed);
  const policy = POLICIES.pvzOpener!;
  while (round.result === null && round.tick < maxSeconds * STEPS_PER_SECOND) {
    applyStep(account, round, step(round, policy(round)));
  }
  return { round, summary: finishLevel(account, round) };
}

describe("a new account", () => {
  test("a new Warrior account holds exactly the Warrior kit with normal starter bases", () => {
    const account = newAccount("warrior");
    const skills = [
      ...account.roster.slots.filter(Boolean).map((c) => c!.hero.skillId),
      account.roster.spell!.hero.skillId,
    ];
    expect(skills.sort()).toEqual([...FOCUSES.warrior!].sort());
    expect(account.roster.unlocked).toBe(3);
    expect(account.roster.slots).toHaveLength(6);
    for (const card of account.roster.slots.filter(Boolean)) {
      expect(card!.hero.rarity).toBe("normal");
      expect(card!.hero.level).toBe(1);
      if (card!.weapon) expect(card!.weapon.rarity).toBe("normal");
    }
    expect(account.player).toEqual({ level: 1, xp: 0 });
  });
});

describe("level lifecycle", () => {
  test("a scripted Level 1 win unlocks slot 4, offers 3 heroes with a roster match, and awards XP", () => {
    const account = newAccount("ranger");
    const { round, summary } = play(account, 3);
    expect(round.result).toBe("won");
    expect(summary.result).toBe("won");
    expect(account.roster.unlocked).toBe(4);
    expect(account.firstClears).toContain("level-1");
    const choice = account.pendingChoices[0]!;
    expect(choice.options).toHaveLength(3);
    expect(choice.options.every((h) => h.level === 3 && h.rarity === "normal")).toBe(true);
    expect(choice.options.some((h) => rosterMatches(account, h.skillId))).toBe(true);
    expect(account.player.xp).toBeGreaterThan(0);
    expect(summary.xpGained).toBe(account.player.xp);
    expect(account.player.level).toBeGreaterThanOrEqual(2);
    // Roster heroes share the XP (E §6.2).
    expect(account.roster.slots[0]!.hero.xp).toBe(account.player.xp);
  });

  test("a second clear grants no first-clear reward", () => {
    const account = newAccount("ranger");
    play(account, 3);
    const choices = account.pendingChoices.length;
    const { summary } = play(account, 4);
    expect(summary.firstClear).toBe(false);
    expect(account.pendingChoices).toHaveLength(choices);
  });

  test("a loss keeps every credited drop", () => {
    const account = newAccount("warrior");
    const round = beginLevel(account, LEVEL_1, 9);
    const policy = POLICIES.pvzOpener!;
    // Play well for 70 s, then shovel every hero each step until the line breaks.
    while (round.result === null && round.tick < 400 * STEPS_PER_SECOND) {
      const intents =
        round.tick < 70 * STEPS_PER_SECOND
          ? policy(round)
          : round.heroes.map((h) => ({ type: "shovel" as const, lane: h.lane, column: h.column }));
      applyStep(account, round, step(round, intents));
    }
    finishLevel(account, round);
    expect(round.result).toBe("lost");
    expect(round.earned.length).toBeGreaterThan(0);
    const earned = round.earned.map((e) => e.drop);
    expect(account.stash.items).toHaveLength(earned.filter((d) => d.kind === "item").length);
    expect(account.stash.unrolled).toHaveLength(
      earned.filter((d) => d.kind === "hero" || d.kind === "spell").length,
    );
    expect(Object.values(account.currency).reduce((a, b) => a + b, 0)).toBe(
      earned.filter((d) => d.kind === "currency").length,
    );
    expect(account.gold).toBe(
      earned.reduce((sum, d) => sum + (d.kind === "gold" ? d.amount : 0), 0),
    );
  });

  test("drops are credited at kill time to the round and the account", () => {
    const account = newAccount("ranger");
    const { round } = play(account, 5);
    const gold = round.earned
      .filter((d) => d.drop.kind === "gold")
      .reduce((s, d) => s + (d.drop.kind === "gold" ? d.drop.amount : 0), 0);
    expect(account.gold).toBe(gold);
    expect(account.stash.items.length).toBe(
      round.earned.filter((d) => d.drop.kind === "item").length,
    );
  });
});

describe("saves", () => {
  test("resume equivalence: a round saved at tick 1,800 and loaded steps to the same hash at 3,600", () => {
    const account = newAccount("sorceress");
    const straight = beginLevel(structuredClone(account), LEVEL_1, 21);
    const saved = beginLevel(account, LEVEL_1, 21);
    const policy = POLICIES.pvzOpener!;
    while (straight.tick < 3600) step(straight, policy(straight));
    while (saved.tick < 1800) step(saved, policy(saved));
    const text = serialize(saveDocument(account, saved, "test", "2026-10-18T00:00:00.000Z"));
    const loaded = load(text, registry);
    expect(loaded.round.ok).toBe(true);
    const resumed = (loaded.round as { data: typeof saved }).data;
    while (resumed.tick < 3600) step(resumed, policy(resumed));
    expect(hashState(resumed)).toBe(hashState(straight));
  });

  test("an unknown base ID in the stash reconciles to gold with a log line (P17)", () => {
    const account = newAccount("warrior");
    account.stash.items.push({
      id: id<"Item">("x"),
      baseId: "Metadata/Retired/Thing" as never,
      rarity: "rare",
      itemLevel: 10,
      quality: 0,
      mods: [],
    });
    const log: string[] = [];
    const resumed = resumeFromDocument(
      saveDocument(account, null, "test", "2026-10-18T00:00:00.000Z"),
      (line) => log.push(line),
    );
    expect(resumed.account.stash.items.find((i) => i.id === "x")).toBeUndefined();
    expect(resumed.account.gold).toBe(account.gold + 0.2 * (10 + 20) * 7);
    expect(log.some((l) => l.includes("Metadata/Retired/Thing") && l.includes("gold"))).toBe(true);
  });

  test("a save holding a hero-only resistance loads with it dropped, and a Ruby Ring's implicit re-rolled into its team range (C §C.3.8)", () => {
    const account = newAccount("warrior");
    const ruby = "Metadata/Items/Rings/FourRing3" as never;
    account.stash.items.push(
      {
        id: id<"Item">("old-resist"),
        baseId: "Metadata/Items/Rings/FourRing1" as never,
        rarity: "magic",
        itemLevel: 10,
        quality: 0,
        mods: [
          { modId: id<"Mod">("FireResist2"), values: [13] },
          { modId: id<"Mod">("IncreasedLife1"), values: [12] },
        ],
      },
      {
        id: id<"Item">("old-ruby"),
        baseId: ruby,
        rarity: "normal",
        itemLevel: 10,
        quality: 0,
        mods: [],
        implicits: [{ modId: id<"Mod">("RingImplicitFireResistance1"), values: [27] }],
      },
    );
    const log: string[] = [];
    const resumed = resumeFromDocument(
      JSON.parse(JSON.stringify(saveDocument(account, null, "test", "2026-10-18T00:00:00.000Z"))),
      (line) => log.push(line),
    ).account;
    const resist = resumed.stash.items.find((i) => i.id === "old-resist")!;
    expect(resist.mods.map((m) => m.modId)).toEqual(["IncreasedLife1"]);
    const rerolled = resumed.stash.items.find((i) => i.id === "old-ruby")!.implicits![0]!
      .values[0]!;
    expect(rerolled).toBeGreaterThanOrEqual(10);
    expect(rerolled).toBeLessThanOrEqual(15);
    expect(log.some((l) => l.includes("FireResist2"))).toBe(true);
    expect(log.some((l) => l.includes("old-ruby") && l.includes("implicit"))).toBe(true);
  });

  test("a corrupt round section loads the account and restarts the level", () => {
    const account = newAccount("warrior");
    const round = beginLevel(account, LEVEL_1, 2);
    while (round.tick < 600) step(round, []);
    const doc = saveDocument(account, round, "test", "2026-10-18T00:00:00.000Z");
    (doc.round!.data as { tick: unknown }).tick = "garbage";
    const resumed = resumeFromDocument(doc);
    expect(resumed.account.focus).toBe("warrior");
    expect(resumed.roundRejected).toMatch(/tick/);
    expect(resumed.round!.tick).toBe(0);
    expect(resumed.round!.waves!.plan.levelId).toBe("level-1");
  });
});
