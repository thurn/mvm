import { describe, expect, test } from "vitest";
import { newAccount } from "../../account/lifecycle";
import { baseItems, currencies } from "../../data";
import { heroPool, spellPool } from "../../heroes/gen/generate";
import { createSettings } from "../../juice/core/settings";
import { createRound } from "../../sim/state";
import { createStreams, streamRng } from "../../sim/rng";
import {
  grantCurrency,
  grantGold,
  grantHero,
  grantItem,
  setPlayerLevel,
  skipToLevelEnd,
} from "./grants";
import { applyKnob, KNOBS } from "./knobs";

const rng = () => streamRng(createStreams(33), "loot");
let n = 0;
const newId = () => `dev-${n++}`;

describe("grants (GDD §15)", () => {
  test.each(["normal", "magic", "rare", "unique"] as const)(
    "a %s item comes from the real generator",
    (rarity) => {
      const account = newAccount("warrior");
      const item = grantItem(account, { level: 10, rarity }, rng(), newId);
      expect(account.stash.items).toContain(item);
      expect(item.rarity).toBe(rarity);
      expect(baseItems().some((b) => b.id === item.baseId)).toBe(true);
      if (rarity === "magic") expect(item.mods.length).toBeGreaterThan(0);
    },
  );

  test("an item of a chosen class", () => {
    const item = grantItem(
      newAccount("warrior"),
      { level: 5, rarity: "magic", itemClass: "Bow" },
      rng(),
      newId,
    );
    expect(baseItems().find((b) => b.id === item.baseId)!.itemClass).toBe("Bow");
  });

  test.each(["hero", "spell"] as const)("a %s at a chosen level and rarity", (kind) => {
    const account = newAccount("warrior");
    const hero = grantHero(account, { kind, level: 8, rarity: "rare" }, rng(), newId);
    expect(account.stash.heroes).toContain(hero);
    expect(hero.level).toBe(8);
    expect((kind === "hero" ? heroPool() : spellPool()).includes(hero.skillId)).toBe(true);
    expect(["rare", "magic", "normal"]).toContain(hero.rarity);
  });

  test("currency, gold, player level and the level-end skip", () => {
    const account = newAccount("warrior");
    const divine = currencies().find((c) => c.name === "Divine Orb")!.id;
    grantCurrency(account, divine, 2);
    grantCurrency(account, divine, 1);
    expect(account.currency[divine]).toBe(3);
    const gold = account.gold;
    grantGold(account, 500);
    expect(account.gold).toBe(gold + 500);
    setPlayerLevel(account, 7);
    expect(account.player.level).toBe(7);
    const round = createRound({ seed: 1, lanes: [2], mana: 0 });
    skipToLevelEnd(round, "won");
    expect(round.result).toBe("won");
  });
});

describe("knobs (H §14)", () => {
  test("every knob change reaches the settings store", () => {
    const store = createSettings(null);
    for (const knob of KNOBS) {
      applyKnob(store, knob.key, knob.sample);
      expect(knob.read(store.get()), knob.key).toEqual(knob.sample);
    }
  });
});
