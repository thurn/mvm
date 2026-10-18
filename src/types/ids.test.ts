import { expect, test } from "vitest";
import { id, type Id } from "./ids";

test("id brands a string without changing it", () => {
  const hero: Id<"Hero"> = id<"Hero">("Metadata/Hero/Warrior");
  expect(hero).toBe("Metadata/Hero/Warrior");
  // @ts-expect-error distinct brands do not mix
  const monster: Id<"Monster"> = hero;
  expect(monster).toBe(hero);
});
