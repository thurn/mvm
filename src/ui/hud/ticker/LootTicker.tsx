import { useSyncExternalStore } from "react";
import { LOOT_JUICE } from "../../../tuning/juice";
import { tickerStore } from "./store";

const LINE_HEIGHT = 14;
/** The ticker's height, so the board can leave room for it below the lanes. */
export const TICKER_HEIGHT = LOOT_JUICE.tickerLines * LINE_HEIGHT + 4;

const STYLE = `
@keyframes mvm-ticker-in { from { transform: translateX(-24px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes mvm-ticker-flash { from { background: rgba(255,255,255,0.6); } to { background: transparent; } }
@keyframes mvm-ticker-shimmer { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.6); } }
`;

/**
 * The loot ticker (H §3.1): the newest drops slide in on top with a 1-frame
 * flash; uniques shimmer for 8 s. It sits below the board, so it never covers a lane.
 */
export function LootTicker() {
  const lines = useSyncExternalStore(tickerStore.subscribe, tickerStore.lines);
  return (
    <div
      data-testid="loot-ticker"
      style={{
        height: TICKER_HEIGHT,
        overflow: "hidden",
        font: "11px monospace",
        padding: "2px 8px",
        pointerEvents: "none",
      }}
    >
      <style>{STYLE}</style>
      {lines.map((line) => (
        <div
          key={line.id}
          style={{
            color: line.color,
            height: LINE_HEIGHT,
            textShadow: "1px 1px 0 #000",
            animation: [
              "mvm-ticker-in 160ms ease-out",
              "mvm-ticker-flash 120ms steps(1)",
              ...(line.shimmer
                ? [`mvm-ticker-shimmer 800ms ease-in-out ${LOOT_JUICE.tickerShimmerMs / 800}`]
                : []),
            ].join(", "),
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}
