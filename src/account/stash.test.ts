import { describe, expect, test } from "vitest";
import { createStreams, streamRng } from "../sim/rng";
import { grantHero } from "../ui/dev/grants";
import { newAccount } from "./lifecycle";
import { heroOffer } from "./rewards";
import { acquireHero, chooseHero, equip, rollUnrolled } from "./stash";
import type { AccountState } from "./state";
import { id } from "../types/ids";

const rng = () => streamRng(createStreams(5), "heroGen");
let n = 0;
const heroId = () => id<"OwnedHero">(`hero-${n++}`);

/** The weapon a hero brought: the stash item named after it. */
function broughtWeapon(account: AccountState, hero: { id: string }) {
  return account.stash.items.find((item) => item.id === `${hero.id}-weapon`);
}

describe("acquiring a hero (mason hv-7ic2.96)", () => {
  test("every way a hero reaches the stash brings its class's normal starter weapon", () => {
    const account = newAccount("warrior");

    const granted = grantHero(account, { kind: "hero", level: 3, rarity: "normal" }, rng(), heroId);

    account.pendingChoices.push({
      levelId: "level-1",
      options: heroOffer(account, 3, rng(), heroId),
    });
    const picked = account.pendingChoices[0]!.options[0]!;
    chooseHero(account, "level-1", picked.id);

    account.stash.unrolled.push({ kind: "hero", rarity: "normal", itemLevel: 1 });
    rollUnrolled(account);
    const dropped = account.stash.heroes.at(-1)!;

    for (const hero of [granted, picked, dropped]) {
      expect(account.stash.heroes).toContainEqual(hero);
      expect(broughtWeapon(account, hero)?.rarity, hero.skillId).toBe("normal");
    }
  });

  test("a spell brings no weapon", () => {
    const account = newAccount("sorceress");
    const spell = grantHero(account, { kind: "spell", level: 1, rarity: "normal" }, rng(), heroId);
    expect(broughtWeapon(account, spell)).toBeUndefined();
  });

  test("hero and item ids don't mix", () => {
    const account = newAccount("warrior");
    const hero = acquireHero(account, account.roster.slots[0]!.hero);
    // @ts-expect-error a hero's id is not an item id
    expect(equip(account, hero.id, 0, "weapon")).toBe(false);
  });
});
