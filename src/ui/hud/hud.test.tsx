import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { starterCard } from "../../heroes/model/starter";
import { lockRoster } from "../../sim/economy/roster";
import type { Intent } from "../../sim/intents";
import { createRound } from "../../sim/state";
import { id } from "../../types/ids";
import { Hud } from "./Hud";
import { createRoundStore } from "./round-store";

afterEach(cleanup);

const ACOLYTE = "MvM/Heroes/EzomyteAcolyte";
const LIGHTNING_ARROW = "Metadata/Items/Gems/SkillGemLightningArrow";

function setup(mana: number) {
  const round = createRound({ seed: 1, lanes: [1, 2, 3], mana });
  lockRoster(round, [
    starterCard(id<"Gem">(ACOLYTE), 1, "acolyte"),
    starterCard(id<"Gem">(LIGHTNING_ARROW), 1, "arrow"),
  ]);
  const store = createRoundStore(round);
  const enqueue = vi.fn<(intent: Intent) => void>();
  render(<Hud store={store} enqueue={enqueue} scale={1} countdown={null} />);
  return { round, store, enqueue };
}

/** Moves and clicks the placement overlay at a tile (64 logical px per tile at scale 1). */
function clickTile(lane: number, column: number) {
  const overlay = screen.getByTestId("placement-overlay");
  const at = { clientX: (column - 0.5) * 64, clientY: (lane + 0.5) * 64 };
  fireEvent.mouseMove(overlay, at);
  fireEvent.click(overlay, at);
}

describe("the HUD", () => {
  test("picking an unaffordable card is refused and flags the deny state", () => {
    setup(50);
    const arrow = screen.getByTestId("card-arrow");
    fireEvent.click(arrow);
    expect(arrow.dataset.state).toBe("denied");
    expect(screen.getByTestId("mana-counter").dataset.deny).toBe("true");
    expect(screen.getByTestId("placement-overlay").dataset.picked).toBe("");
  });

  test("clicking a valid tile after picking a card sends the place intent", () => {
    const { enqueue } = setup(150);
    fireEvent.click(screen.getByTestId("card-arrow"));
    expect(screen.getByTestId("placement-overlay").dataset.picked).toBe("arrow");
    clickTile(2, 3);
    expect(enqueue).toHaveBeenCalledWith({ type: "place", cardId: "arrow", lane: 2, column: 3 });
    expect(screen.getByTestId("placement-overlay").dataset.picked).toBe("");
  });

  test("an invalid tile tints the ghost and sends nothing; Escape cancels", () => {
    const { enqueue } = setup(150);
    fireEvent.click(screen.getByTestId("card-arrow"));
    fireEvent.mouseMove(screen.getByTestId("placement-overlay"), { clientX: 32, clientY: 32 });
    expect(screen.getByTestId("ghost").dataset.valid).toBe("false");
    clickTile(0, 1);
    expect(enqueue).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("placement-overlay").dataset.picked).toBe("");
  });

  test("the recharge sweep's progress tracks the card's timer", () => {
    const { round, store } = setup(500);
    const slot = round.roster.find((s) => s.cardId === "arrow")!;
    slot.rechargeLeft = slot.rechargeSeconds * 0.25;
    act(() => store.notify());
    expect(Number(screen.getByTestId("card-arrow").dataset.recharge)).toBeCloseTo(0.75);
    slot.rechargeLeft = 0;
    act(() => store.notify());
    expect(Number(screen.getByTestId("card-arrow").dataset.recharge)).toBe(1);
  });

  test("the shovel and speed toggle send their intents", () => {
    const { round, enqueue } = setup(150);
    round.heroes.push({ id: "h" as never, lane: 2, column: 4, actor: {} as never });
    fireEvent.click(screen.getByRole("button", { name: /shovel/i }));
    clickTile(2, 4);
    expect(enqueue).toHaveBeenCalledWith({ type: "shovel", lane: 2, column: 4 });
    fireEvent.click(screen.getByRole("button", { name: "2×" }));
    expect(enqueue).toHaveBeenCalledWith({ type: "setSpeed", speed: 2 });
  });

  test("the countdown overlay shows when driven", () => {
    const round = createRound({ seed: 1, lanes: [2], mana: 0 });
    render(<Hud store={createRoundStore(round)} enqueue={() => {}} scale={1} countdown={3} />);
    expect(screen.getByTestId("countdown").textContent).toBe("3");
  });
});
