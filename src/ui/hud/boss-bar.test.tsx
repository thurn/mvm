import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { spawnBoss } from "../../monsters/bosses";
import { createRound } from "../../sim/state";
import { Hud } from "./Hud";
import { createRoundStore } from "./round-store";

afterEach(cleanup);

function bossRound() {
  const round = createRound({ seed: 5, lanes: [0, 1, 2, 3, 4], mana: 0 });
  const boss = spawnBoss(round, { bossId: "BloatedMiller", areaLevel: 6, levelIndex: 5, x: 9.5 });
  const store = createRoundStore(round);
  render(<Hud store={store} enqueue={vi.fn()} scale={1} countdown={null} />);
  return { round, boss, store };
}

describe("the boss bar (H §7.5, plan 2.17)", () => {
  test("shows the boss's name and life, with the heavy-stun bar under it", () => {
    const { boss, store } = bossRound();
    expect(screen.getByTestId("boss-bar").textContent).toContain("The Bloated Miller");
    act(() => {
      boss.actor.life = boss.actor.maxLife / 2;
      boss.actor.ailments.heavyStunBuildup = 0.35;
      store.notify(0);
    });
    expect(screen.getByTestId("boss-life").style.width).toBe("50%");
    expect(screen.getByTestId("boss-stun").style.width).toBe("35%");
    expect(screen.getByTestId("boss-stun").dataset.primed).toBe("false");
  });

  test("the heavy-stun bar flashes once Primed and reads STUNNED during the stun", () => {
    const { boss, store } = bossRound();
    act(() => {
      boss.actor.ailments.heavyStunBuildup = 0.75;
      store.notify(0);
    });
    expect(screen.getByTestId("boss-stun").dataset.primed).toBe("true");
    act(() => {
      boss.actor.ailments.heavyStunSeconds = 2;
      store.notify(1);
    });
    expect(screen.getByTestId("boss-bar").textContent).toContain("STUNNED");
  });

  test("no boss, no bar", () => {
    const round = createRound({ seed: 1, lanes: [1, 2, 3], mana: 0 });
    render(<Hud store={createRoundStore(round)} enqueue={vi.fn()} scale={1} countdown={null} />);
    expect(screen.queryByTestId("boss-bar")).toBeNull();
  });
});
