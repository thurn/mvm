import { id } from "../../types/ids";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { newAccount, resumeFromDocument, saveDocument } from "../../account/lifecycle";
import { heroOffer } from "../../account/rewards";
import type { AccountState } from "../../account/state";
import { generateGear } from "../../loot/items";
import type { Drop } from "../../loot/drops";
import { createStreams, streamRng } from "../../sim/rng";
import { DEFAULT_SETTINGS, sharedSettings, type JuiceSettings } from "../../juice/core/settings";
import { fxProbe } from "../../juice/core/probe";
import { JUICE_TUNING } from "../../tuning/juice";
import { skillName } from "../cards/HeroCard";
import { chooseHero } from "../../account/stash";
import { createAccountStore } from "../../account/store";
import { LevelEnd } from "./LevelEnd";
import { sortDrops, type CardDrop } from "./sort";

afterEach(cleanup);

const rng = streamRng(createStreams(7), "loot");

let items = 0;
function item(rarity: "normal" | "magic" | "rare" | "unique"): Drop {
  const newId = () => id<"Item">(`item-${items++}`);
  return { kind: "item", item: generateGear({ ilvl: 40, rarity, newId }, rng) };
}

describe("loot sort (GDD §15, H §3.10)", () => {
  test("ascending rarity, heroes and spells by their rolled rarity, stable within a rarity", () => {
    const drops = [
      { drop: item("rare"), upgrade: false },
      { drop: { kind: "hero", rarity: "magic", itemLevel: 2 } as Drop, upgrade: false },
      { drop: item("normal"), upgrade: true },
      { drop: item("unique"), upgrade: false },
      { drop: { kind: "spell", rarity: "normal", itemLevel: 2 } as Drop, upgrade: false },
      { drop: item("magic"), upgrade: false },
      { drop: { kind: "gold", amount: 5 } as Drop, upgrade: false },
      { drop: { kind: "currency", currencyId: "CurrencyRerollMagic" } as Drop, upgrade: false },
    ];
    const sorted = sortDrops(drops);
    const label = (d: CardDrop) => (d.kind === "item" ? d.item.rarity : `${d.kind}:${d.rarity}`);
    expect(sorted.cards.map((c) => label(c.drop))).toEqual([
      "normal",
      "spell:normal",
      "magic",
      "hero:magic",
      "rare",
      "unique",
    ]);
    expect(sorted.cards[0]!.upgrade).toBe(true);
    expect(sorted.gold).toBe(5);
    expect(sorted.currency).toEqual({ CurrencyRerollMagic: 1 });
  });
});

function withChoice(): AccountState {
  const account = newAccount("warrior");
  let n = 0;
  account.roster.unlocked = 4;
  account.firstClears.push("level-1");
  account.pendingChoices.push({
    levelId: "level-1",
    options: heroOffer(account, 3, rng, () => id<"OwnedHero">(`offer-${n++}`)),
  });
  return account;
}

describe("choose 1 of 3 (Appendix E §4.5)", () => {
  test("writes exactly one hero into the account and clears the pending choice", () => {
    const account = withChoice();
    const offered = account.pendingChoices[0]!.options;
    const heroes = account.stash.heroes.length;
    expect(chooseHero(account, "level-1", offered[1]!.id)).toBe(true);
    expect(account.stash.heroes).toHaveLength(heroes + 1);
    expect(account.stash.heroes.at(-1)).toEqual(offered[1]);
    expect(account.pendingChoices).toEqual([]);
    // The hero brings its class's normal starter weapon, so it can fight once slotted (1.39).
    const weapon = account.stash.items.at(-1)!;
    expect(weapon.id).toBe(`${offered[1]!.id}-weapon`);
    expect(weapon.rarity).toBe("normal");
    // A second pick, or a hero that was never offered, writes nothing.
    expect(chooseHero(account, "level-1", offered[0]!.id)).toBe(false);
    expect(account.stash.heroes).toHaveLength(heroes + 1);
  });

  describe("the screen", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test("the pick survives a reload: the resumed account offers it, and picking saves one hero", () => {
      const before = withChoice();
      const offered = before.pendingChoices[0]!.options;
      const doc = saveDocument(before, null, "test", "2026-10-18T00:00:00.000Z");
      const account = resumeFromDocument(JSON.parse(JSON.stringify(doc)), () => {}).account;
      expect(account.pendingChoices[0]!.options).toEqual(offered);

      const saved = vi.fn();
      render(
        <LevelEnd
          store={createAccountStore(account, saved)}
          summary={null}
          before={null}
          onReplay={() => {}}
          onHideout={() => {}}
        />,
      );
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("Slot 4 unlocked")).toBeTruthy();
      // Leaving is held until the pick is made.
      expect(screen.getByRole("button", { name: "Hideout" })).toHaveProperty("disabled", true);
      fireEvent.click(screen.getByTestId(`choose-${offered[2]!.id}`));
      expect(account.stash.heroes.map((h) => h.id)).toEqual([offered[2]!.id]);
      expect(account.pendingChoices).toEqual([]);
      expect(saved).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId(`choose-${offered[0]!.id}`)).toBeNull();
      expect(screen.getByRole("button", { name: "Hideout" })).toHaveProperty("disabled", false);
      expect(screen.getByText("Slot 4 unlocked")).toBeTruthy();
    });

    test("a won first clear reveals its loot sorted, then Slot 4 and the offer last", () => {
      const account = withChoice();
      const normal = item("normal");
      const rare = item("rare");
      render(
        <LevelEnd
          store={createAccountStore(account, () => {})}
          summary={{
            result: "won",
            xpGained: 40,
            firstClear: true,
            drops: [
              { drop: rare, upgrade: true },
              { drop: normal, upgrade: false },
            ],
          }}
          before={{ player: { level: 1, xp: 0 }, heroes: {} }}
          onReplay={() => {}}
          onHideout={() => {}}
        />,
      );
      expect(screen.getByText("Victory")).toBeTruthy();
      expect(screen.queryByText("Slot 4 unlocked")).toBeNull();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      const cards = screen.getAllByTestId(/^item-/).map((el) => el.dataset.testid);
      expect(cards).toEqual([
        `item-${normal.kind === "item" ? normal.item.id : ""}`,
        `item-${rare.kind === "item" ? rare.item.id : ""}`,
      ]);
      expect(screen.getAllByText("UPGRADE")).toHaveLength(1);
      expect(screen.getByText("Slot 4 unlocked")).toBeTruthy();
      expect(screen.getByText("+40 XP")).toBeTruthy();
    });

    test("the juice settings scale the reveal: juice 0 drops the burst, reduced flashing caps the flash", () => {
      const run = (patch: Partial<JuiceSettings>) => {
        cleanup();
        sharedSettings().set({ ...DEFAULT_SETTINGS, ...patch });
        const account = withChoice();
        account.player.xp = 600;
        render(
          <LevelEnd
            store={createAccountStore(account, () => {})}
            summary={{ result: "won", xpGained: 600, firstClear: true, drops: [] }}
            before={{ player: { level: 1, xp: 0 }, heroes: {} }}
            onReplay={() => {}}
            onHideout={() => {}}
          />,
        );
        act(() => {
          vi.advanceTimersByTime(5000);
        });
        return {
          particles: screen.queryAllByTestId("burst-particle").length,
          flash: Number(screen.queryByTestId("first-clear-flash")?.dataset.alpha ?? 0),
        };
      };
      try {
        expect(run({})).toEqual({ particles: 12, flash: 0.85 });
        expect(run({ juice: 0 })).toEqual({ particles: 0, flash: 0 });
        expect(run({ reduceFlashing: true }).flash).toBeLessThanOrEqual(
          JUICE_TUNING.reduceFlashingMaxAlpha,
        );
      } finally {
        sharedSettings().set(DEFAULT_SETTINGS);
      }
    });

    test("the first-clear reveal fires the T4 package once, and nothing at juice 0 (hv-mb9m.58)", () => {
      const run = (patch: Partial<JuiceSettings>) => {
        cleanup();
        sharedSettings().set({ ...DEFAULT_SETTINGS, ...patch });
        render(
          <LevelEnd
            store={createAccountStore(withChoice(), () => {})}
            summary={{ result: "won", xpGained: 0, firstClear: true, drops: [] }}
            before={{ player: { level: 1, xp: 0 }, heroes: {} }}
            onReplay={() => {}}
            onHideout={() => {}}
          />,
        );
        fxProbe.peaks();
        act(() => {
          vi.advanceTimersByTime(5000);
        });
        const reveal = fxProbe.peaks();
        act(() => {
          vi.advanceTimersByTime(5000);
        });
        return { reveal, after: fxProbe.peaks() };
      };
      try {
        const full = run({});
        expect(full.reveal.shake).toBeGreaterThan(0);
        expect(full.reveal.vignette).toBe(JUICE_TUNING.screen[4]!.vignette!.alpha);
        expect(full.after).toMatchObject({ shake: 0, vignette: 0, flash: 0 });
        expect(run({ juice: 0 }).reveal).toMatchObject({ shake: 0, vignette: 0, flash: 0 });
      } finally {
        sharedSettings().set(DEFAULT_SETTINGS);
      }
    });

    test("each offered hero's button is named for the hero", () => {
      const account = withChoice();
      render(
        <LevelEnd
          store={createAccountStore(account, () => {})}
          summary={null}
          before={null}
          onReplay={() => {}}
          onHideout={() => {}}
        />,
      );
      const hero = account.pendingChoices[0]!.options[0]!;
      expect(screen.getByTestId(`choose-${hero.id}`).getAttribute("aria-label")).toBe(
        `Choose ${skillName(hero.skillId)}`,
      );
    });

    test("a loss shows Defeat and no first-clear reward", () => {
      const account = newAccount("warrior");
      render(
        <LevelEnd
          store={createAccountStore(account, () => {})}
          summary={{ result: "lost", xpGained: 3, firstClear: false, drops: [] }}
          before={null}
          onReplay={() => {}}
          onHideout={() => {}}
        />,
      );
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("Defeat")).toBeTruthy();
      expect(screen.queryByText("Slot 4 unlocked")).toBeNull();
      expect(screen.getByRole("button", { name: "Replay" })).toHaveProperty("disabled", false);
    });
  });
});
