import { describe, expect, test } from "vitest";
import { damageMap } from "../../combat/damage";
import { mitigate } from "../../combat/mitigation";
import { baseItems, mods } from "../../data";
import type { BaseItemData, ModData } from "../../data/types";
import { generateGear } from "../../loot/items";
import { createStreams, streamRng } from "../../sim/rng";
import { lockRoster } from "../../sim/economy/roster";
import { createRound } from "../../sim/state";
import { buildSpell } from "../../spells/build";
import { STARTER_SPELLS } from "../../spells/catalog";
import { id } from "../../types/ids";
import { placeHero } from "../board/place";
import { aggregate } from "./aggregate";
import { newHero, type Card } from "./hero";
import type { ItemInstance } from "./item";
import { teamSheet } from "./team";

const ring = (name: string): BaseItemData => baseItems().find((b) => b.name === name)!;
let items = 0;
function item(base: BaseItemData, mods: ItemInstance["mods"]): ItemInstance {
  return {
    id: id<"Item">(`team-item-${items++}`),
    baseId: base.id,
    rarity: "magic",
    itemLevel: 10,
    quality: 0,
    mods,
    implicits: [],
  };
}
const teamFire = (value: number) =>
  item(ring("Iron Ring"), [{ modId: id<"Mod">("TeamFireResist4"), values: [value] }]);

function card(name: string, skill: string, accessory: ItemInstance | null = null): Card {
  return {
    hero: newHero(id<"OwnedHero">(name), id<"Gem">(skill), 1),
    weapon: null,
    armour: null,
    accessory,
  };
}
const ARROW = "Metadata/Items/Gems/SkillGemLightningArrow";
const SPARK = "Metadata/Items/Gems/SkillGemSpark";

const HERO_ONLY_RESIST = /^(Fire|Cold|Lightning|Chaos)Resist\d|^AllResistances\d/;

describe("team affixes (Appendix C §C.3.8)", () => {
  test("rolling never makes a hero-only resistance, and team mods roll only on their slots, in range", () => {
    const rng = streamRng(createStreams(11), "loot");
    const team = new Map(
      mods()
        .filter((m) => m.id.startsWith("Team"))
        .map((m) => [m.id, m]),
    );
    const slots: Record<string, string[]> = {
      TeamIncreasedLife: ["Body Armour", "Shield", "Amulet", "Ring", "Belt"],
      TeamFireResist: ["Body Armour", "Shield", "Amulet", "Ring", "Belt"],
      TeamEnergyShield: ["Amulet"],
      TeamEvasionRating: ["Ring"],
      TeamArmourRating: ["Belt"],
    };
    let rolled = 0;
    for (let i = 0; i < 3000; i++) {
      const gear = generateGear(
        { ilvl: 10, rarity: "rare", newId: () => id<"Item">(`roll-${i}`) },
        rng,
      );
      const base = baseItems().find((b) => b.id === gear.baseId)!;
      for (const m of gear.mods) {
        expect(m.modId).not.toMatch(HERO_ONLY_RESIST);
        const mod = team.get(m.modId);
        if (!mod) continue;
        rolled++;
        const family = Object.keys(slots).find((f) => m.modId.replace(/\d+$/, "") === f);
        if (family) expect(slots[family]).toContain(base.itemClass);
        mod.stats.forEach((s, j) => {
          expect(m.values[j]).toBeGreaterThanOrEqual(s.min);
          expect(m.values[j]).toBeLessThanOrEqual(s.max);
        });
      }
    }
    expect(rolled).toBeGreaterThan(0);
    expect(mods().some((m) => HERO_ONLY_RESIST.test(m.id))).toBe(false);
  });

  test("one +12% team fire resistance item gives every placed hero 12%, however many copies are out", () => {
    const carrier = card("carrier", ARROW, teamFire(12));
    const other = card("other", SPARK);
    const state = createRound({ seed: 1, lanes: [1, 2, 3], mana: 0 });
    lockRoster(state, [carrier, other]);
    const copies = [1, 2, 3].map((lane) => placeHero(state, state.roster[0]!.card, lane, 1));
    const spark = placeHero(state, state.roster[1]!.card, 1, 2);
    for (const hero of [...copies, spark]) expect(hero.actor.resist.fire).toBe(12);
  });

  test("an unplaced roster hero's team affixes apply; a stashed hero's do not", () => {
    const rosterCarrier = card("roster", ARROW, teamFire(8));
    const stashed = card("stash", ARROW, teamFire(30));
    const placed = card("placed", SPARK);
    const team = teamSheet([rosterCarrier, placed]);
    expect(team["fire_resistance_%"]).toBe(8);
    expect(aggregate(placed, { team }).actor.resist.fire).toBe(8);
    // The stashed carrier isn't in the roster, so its 30% reaches no one, itself included.
    expect(aggregate(stashed).actor.resist.fire).toBe(0);
  });

  test("team plus hero resistance caps at 75%", () => {
    const heroFire: ModData = {
      ...mods().find((m) => m.id === "TeamFireResist1")!,
      id: id<"Mod">("TestHeroFireResist"),
      stats: [{ id: "base_fire_damage_resistance_%", min: 50, max: 50 }],
      mvmStats: [{ stat: "fire_resistance_%", min: 50, max: 50 }],
    };
    const hero = card(
      "capped",
      ARROW,
      item(ring("Iron Ring"), [{ modId: heroFire.id, values: [50] }]),
    );
    const sheet = aggregate(hero, {
      mods: [...mods(), heroFire],
      team: { "fire_resistance_%": 50 },
    });
    expect(sheet.actor.resist.fire).toBe(100);
    expect(mitigate({ ...damageMap(), fire: 100 }, {}, sheet.actor).fire).toBeCloseTo(25);
  });

  test("team fire damage scales the player spell's fire damage", () => {
    const grenade = card("grenade", STARTER_SPELLS.explosiveGrenade);
    const plain = buildSpell(grenade);
    const boosted = buildSpell(grenade, { "fire_damage_+%": 40 });
    expect(plain.actor.stats["fire_damage_+%"] ?? 0).toBe(0);
    expect(boosted.actor.stats["fire_damage_+%"]).toBe(40);
  });

  test("a Ruby Ring's resistance implicit is team fire resistance at 10–15%", () => {
    const ruby = ring("Ruby Ring");
    expect(ruby.implicits[0]!.stats).toEqual([{ id: "team_fire_resistance_%", min: 10, max: 15 }]);
    const withRuby = card("ruby", ARROW, {
      ...item(ruby, []),
      implicits: [{ modId: id<"Mod">(ruby.implicits[0]!.id), values: [13] }],
    });
    expect(teamSheet([withRuby])["fire_resistance_%"]).toBe(13);
    expect(aggregate(withRuby).actor.resist.fire).toBe(0);
  });
});
