import { describe, expect, test } from "vitest";
import { MONSTER_SPRITES, RECIPES } from "../assets/recipes";
import { ARCHETYPE_IDS } from "../monsters/archetypes";
import type { SimEvent } from "../sim/events";
import { DEFAULT_SETTINGS } from "./core/settings";
import { cuesFor } from "./cues";
import { MONSTER_FEEL } from "./monsters";

const sounds = (event: SimEvent) =>
  cuesFor(event, DEFAULT_SETTINGS)
    .cues.filter((c) => c.kind === "sound")
    .map((c) => (c as { id: string }).id);

const hit = (targetArchetype?: string): SimEvent =>
  ({
    type: "hit",
    sourceId: "h1",
    targetId: "m1",
    lane: 2,
    x: 5,
    dealt: 10,
    targetMaxLife: 100,
    breakdown: { physical: 10, fire: 0, cold: 0, lightning: 0, chaos: 0 },
    crit: false,
    avoidedBy: null,
    ...(targetArchetype ? { targetArchetype } : {}),
  }) as SimEvent;

const kill = (targetArchetype: string): SimEvent =>
  ({
    type: "kill",
    sourceId: "h1",
    targetId: "m1",
    lane: 2,
    x: 5,
    rarity: "normal",
    targetArchetype,
  }) as SimEvent;

describe("monster presentation (H §7.1, plan 2.15)", () => {
  test("every archetype has a baked sprite recipe, a hit material and a death vocal", () => {
    const baked = new Set(RECIPES.map((r) => r.id));
    for (const id of ARCHETYPE_IDS) {
      expect(baked.has(MONSTER_SPRITES[id]!), id).toBe(true);
      expect(MONSTER_FEEL[id], id).toBeDefined();
    }
  });

  test("hits on a Helmed Skeleton sound like bone; hits on flesh keep their band sound", () => {
    expect(sounds(hit("ArmouredLight"))).toContain("hit_bone");
    expect(sounds(hit("Shambler")).some((s) => s === "hit_bone")).toBe(false);
    expect(sounds(hit()).some((s) => s.startsWith("hit_"))).toBe(true);
  });

  test("each archetype dies with its own vocal: groan, bone clatter, squeak, squeal", () => {
    expect(sounds(kill("Shambler"))).toContain("kill");
    expect(sounds(kill("ArmouredLight"))).toContain("bone_clatter");
    expect(sounds(kill("Swarm"))).toContain("rat_squeak");
    expect(sounds(kill("Leaper"))).toContain("goblin_squeal");
  });

  test("a leap takes off with a whoosh", () => {
    const leap: SimEvent = { type: "leap", monsterId: "m1" as never, lane: 1, fromX: 5, toX: 3 };
    expect(sounds(leap)).toContain("leap_whoosh");
  });
});
