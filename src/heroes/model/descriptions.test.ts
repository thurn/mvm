import { describe, expect, test } from "vitest";
import { HERO_CATALOG } from "./catalog";
import { heroDescription } from "./descriptions";

describe("hero descriptions (playtest hv-7ic2.83)", () => {
  test.each(Object.keys(HERO_CATALOG))("%s says what it does on the board", (skillId) => {
    const d = heroDescription(skillId);
    expect(d.text.length).toBeGreaterThan(30);
    expect(d.tags.length).toBeGreaterThan(0);
    expect(d.range.length).toBeGreaterThan(0);
  });

  test("an entry without a description throws, so a new catalog hero can't ship silent", () => {
    expect(() => heroDescription("Metadata/Items/Gems/SkillGemNotAHero")).toThrow();
  });
});
