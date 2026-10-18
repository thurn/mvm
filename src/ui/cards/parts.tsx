import { useEffect, useState, type ReactNode } from "react";

export const RARITY_COLOR = {
  normal: "#C8C8C8",
  magic: "#8888FF",
  rare: "#FFFF77",
  unique: "#AF6025",
} as const;
export const TEXT = { body: "#B8B8B8", mod: "#8888FF", implicit: "#8888FF", dim: "#7A7A7A" };
export const ELEMENT_COLOR = {
  physical: "#E8E2D0",
  fire: "#FF6A1A",
  cold: "#7FD4FF",
  lightning: "#FFE14D",
  chaos: "#B44DFF",
} as const;

/** Whether Alt is held: tooltips show tiers and ranges (H §4.4). */
export function useAltKey(): boolean {
  const [alt, setAlt] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === "Alt" && setAlt(true);
    const up = (e: KeyboardEvent) => e.key === "Alt" && setAlt(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return alt;
}

/** A 1 px separator with a centre diamond (H §4.4). */
export function Separator({ color }: { color: string }) {
  return (
    <div style={{ position: "relative", height: 7, margin: "3px 0" }}>
      <div
        style={{
          position: "absolute",
          top: 3,
          left: 0,
          right: 0,
          height: 1,
          background: color,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 1,
          left: "calc(50% - 2.5px)",
          width: 5,
          height: 5,
          background: color,
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

const STYLE = `@keyframes mvm-tooltip-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes mvm-unique-glow { 0%, 100% { box-shadow: 0 0 4px rgba(175,96,37,0.6); } 50% { box-shadow: 0 0 8px rgba(175,96,37,1); } }`;

/** A tooltip panel: rarity frame, 80 ms fade and 4 px rise (H §4.1, §4.4). */
export function Panel({
  rarity,
  width = 240,
  children,
  testId,
}: {
  rarity: keyof typeof RARITY_COLOR;
  width?: number;
  children: ReactNode;
  testId?: string;
}) {
  const color = RARITY_COLOR[rarity];
  const double = rarity === "rare" || rarity === "unique";
  return (
    <div
      data-testid={testId}
      style={{
        width,
        background: "rgba(8, 8, 10, 0.94)",
        border: `${double ? 3 : 1}px ${double ? "double" : "solid"} ${color}`,
        padding: 6,
        font: "11px/1.35 monospace",
        color: TEXT.body,
        textAlign: "center",
        position: "relative",
        animation: `mvm-tooltip-in 80ms ease-out${rarity === "unique" ? ", mvm-unique-glow 2s ease-in-out infinite" : ""}`,
      }}
    >
      <style>{STYLE}</style>
      {children}
    </div>
  );
}

/** The green Upgrade tag: a bobbing ▲ in the corner (H §3.2, §4.1). */
export function UpgradeTag() {
  return (
    <span
      data-testid="upgrade-tag"
      title="Upgrade for a roster card"
      style={{ position: "absolute", top: 3, right: 5, color: "#40D040", fontWeight: 700 }}
    >
      ▲
    </span>
  );
}
