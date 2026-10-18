import { describe, expect, test } from "vitest";
import { heroGems } from "../../data";
import { id } from "../../types/ids";
import { buildKit } from "../board/kit";
import { aggregate } from "./aggregate";
import { HERO_CATALOG } from "./catalog";
import { heroDescription } from "./descriptions";
import { starterCard } from "./starter";

describe("hero descriptions (playtest hv-7ic2.83)", () => {
  test.each(Object.keys(HERO_CATALOG))("%s says what it does on the board", (skillId) => {
    const d = heroDescription(skillId);
    expect(d.text.length).toBeGreaterThan(30);
    expect(d.tags.length).toBeGreaterThan(0);
    expect(d.range.length).toBeGreaterThan(0);
  });

  test("Ice Strike's finisher is described as slower, as its kit times it", () => {
    const skillId = "Metadata/Items/Gems/SkillGemIceStrike";
    const card = starterCard(id<"Gem">(skillId), 1);
    const gem = heroGems().find((g) => g.id === skillId);
    const kit = buildKit(skillId, { sheet: aggregate(card), gem })!;
    expect(kit.numbers.finalSeconds).toBeGreaterThan(kit.actionSeconds);
    expect(heroDescription(skillId).text).toContain("slower");
  });

  test("an entry without a description throws, so a new catalog hero can't ship silent", () => {
    expect(() => heroDescription("Metadata/Items/Gems/SkillGemNotAHero")).toThrow();
  });
});
