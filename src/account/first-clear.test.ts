import { describe, expect, test } from "vitest";
import { LEVEL_1 } from "../monsters/levels/level-1";
import { startLevel } from "../monsters/waves";
import { finishLevel, newAccount } from "./lifecycle";
import { passivePoints } from "./rewards";
import { rosterMatches } from "./rewards";
import type { AccountState } from "./state";

const CURRENCY = {
  aug: "Metadata/Items/Currency/CurrencyAddModToMagic",
  trans: "Metadata/Items/Currency/CurrencyUpgradeToMagic",
  jeweller: "Metadata/Items/Currency/CurrencyAddSkillGemSocket3",
  regal: "Metadata/Items/Currency/CurrencyUpgradeMagicToRare",
};

/** Wins a level with this id and area level, as finishLevel sees it. */
function win(account: AccountState, index: number, areaLevel: number, seed = index) {
  const round = startLevel({ ...LEVEL_1, id: `level-${index}`, index, areaLevel }, seed);
  round.result = "won";
  return finishLevel(account, round);
}

describe("first-clear rewards for Levels 2–5 (Appendix E §4.5)", () => {
  test("each level's first clear grants its reward once, and a replay grants nothing", () => {
    const account = newAccount("ranger");
    const before = { ...account.currency };
    const count = (id: string) => (account.currency[id] ?? 0) - (before[id] ?? 0);

    win(account, 2, 2);
    expect(account.roster.unlocked).toBe(5);
    expect([count(CURRENCY.aug), count(CURRENCY.trans)]).toEqual([2, 2]);
    win(account, 2, 2, 99);
    expect([count(CURRENCY.aug), count(CURRENCY.trans)]).toEqual([2, 2]);

    win(account, 3, 3);
    expect(account.roster.unlocked).toBe(6);
    expect(count(CURRENCY.jeweller)).toBe(1);

    win(account, 4, 5);
    expect(account.pendingChoices.map((c) => c.levelId)).toEqual(["level-4"]);
    win(account, 4, 5, 77);
    expect(account.pendingChoices).toHaveLength(1);

    win(account, 5, 6);
    expect(count(CURRENCY.regal)).toBe(1);
    expect(account.roster.unlocked).toBe(6);
  });

  test("Level 4 offers three distinct Magic heroes at level 6, at least one matching the roster", () => {
    for (const focus of ["warrior", "ranger", "sorceress"]) {
      for (const seed of [1, 2, 3, 4]) {
        const account = newAccount(focus);
        win(account, 4, 5, seed);
        const options = account.pendingChoices[0]!.options;
        expect(options).toHaveLength(3);
        expect(new Set(options.map((h) => h.skillId)).size).toBe(3);
        for (const hero of options) {
          expect(hero.rarity).toBe("magic");
          expect(hero.level).toBe(6);
          expect(hero.supports.length).toBeGreaterThanOrEqual(1);
        }
        expect(options.some((h) => rosterMatches(account, h.skillId))).toBe(true);
      }
    }
  });

  test("passive points: player level − 1, plus 2 for the boss's first clear, never stored", () => {
    const account = newAccount("warrior");
    account.player.level = 9;
    expect(passivePoints(account)).toBe(8);
    win(account, 5, 6);
    expect(passivePoints(account)).toBe(10);
    win(account, 5, 6, 3);
    expect(passivePoints(account)).toBe(10);
    expect(Object.keys(account)).not.toContain("passivePoints");
  });
});
