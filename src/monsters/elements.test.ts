import { describe, expect, test } from "vitest";
import { makeActor } from "../combat/actor";
import { damageMap } from "../combat/damage";
import { convert, gainAsExtra } from "../combat/hit";
import { armourReduction, mitigate } from "../combat/mitigation";
import { monsterConversion } from "./elements";
import { buildMonster } from "./model";

/** A Shambler's hit at a campaign level, as the combat pipeline sees it before mitigation. */
function shamblerHit(levelIndex: number, affixes: string[] = []) {
  const m = buildMonster({
    archetypeId: "Shambler",
    rarity: affixes.length > 0 ? "magic" : "normal",
    affixes,
    areaLevel: 1,
    levelIndex,
    lane: 1,
    x: 9,
  });
  const hit = m.attack!.hit;
  const physical = hit.base.physical!.min;
  const converted = convert(damageMap({ physical }), hit.conversion, m.actor.stats);
  return { physical, converted, stats: m.actor.stats };
}

describe("monster damage elements (Appendix D §2.3)", () => {
  test("a Shambler in a Bog level deals half its hit as lightning; in Grassland it is all physical", () => {
    const bog = shamblerHit(6);
    expect(bog.converted.physical).toBeCloseTo(bog.physical / 2);
    expect(bog.converted.lightning).toBeCloseTo(bog.physical / 2);
    const grass = shamblerHit(1);
    expect(grass.converted).toEqual(damageMap({ physical: grass.physical }));
    expect(monsterConversion("Shambler", 11)).toEqual({ physical: { fire: 50 } });
    expect(monsterConversion("Shambler", 16)).toEqual({ physical: { cold: 50 } });
  });

  test("75% lightning resistance cuts the converted half; armour cuts only the physical half", () => {
    const { converted } = shamblerHit(6);
    const hero = makeActor({
      maxLife: 100,
      armour: 50,
      resist: { fire: 0, cold: 0, lightning: 75, chaos: 0 },
    });
    const taken = mitigate(converted, {}, hero);
    expect(taken.lightning).toBeCloseTo(converted.lightning * 0.25);
    expect(taken.physical).toBeCloseTo(
      converted.physical * (1 - armourReduction(50, converted.physical)),
    );
  });

  test("a native element replaces the biome element", () => {
    expect(monsterConversion("Shaman", 6)).toEqual({ physical: { fire: 100 } });
    expect(monsterConversion("Splitter", 16)).toEqual({ physical: { chaos: 100 } });
    expect(monsterConversion("Shaman", 1)).toEqual({ physical: { fire: 100 } });
  });

  test("gained-as-extra fire stacks on top of the converted damage", () => {
    const { physical, converted, stats } = shamblerHit(6, ["MonsterDamageGainedAsFire1"]);
    const total = gainAsExtra(converted, stats);
    expect(total.lightning).toBeCloseTo(physical / 2);
    expect(total.physical).toBeCloseTo(physical / 2);
    expect(total.fire).toBeCloseTo(physical * 0.4);
  });
});
