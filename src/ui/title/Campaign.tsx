import type { ReactNode } from "react";
import type { ElementPreview } from "./element";
import { MenuButton, MenuScreen, MENU } from "./layout";

/** The campaign stub (plan 1.34): the furthest unlocked level, playable; 2.24's map replaces it. */
export function Campaign({
  level,
  cleared,
  element = null,
  onPlay,
  onHideout,
}: {
  level: number;
  cleared: boolean;
  /** The biome element against the team's resistance (GDD §15); null for the Grassland. */
  element?: ElementPreview | null;
  onPlay(): void;
  onHideout(): void;
}) {
  const card = (title: string, sub: string, body: ReactNode, locked = false) => (
    <section
      style={{
        width: 220,
        background: MENU.panel,
        border: `1px solid ${locked ? MENU.edge : MENU.gold}`,
        borderRadius: 8,
        padding: 12,
        opacity: locked ? 0.55 : 1,
      }}
    >
      <h3 style={{ margin: "0 0 2px" }}>{title}</h3>
      <div style={{ color: MENU.dim, marginBottom: 12 }}>{sub}</div>
      {body}
    </section>
  );
  return (
    <MenuScreen music="hideout">
      <h2 style={{ margin: "0 0 16px" }}>The Grassland</h2>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {card(
          `Level ${level}`,
          cleared
            ? "Cleared"
            : level === 1
              ? "First clear: unlock slot 4, choose 1 of 3 heroes"
              : "First clear reward",
          <>
            {element && (
              <div data-testid="level-element" style={{ marginBottom: 8, color: MENU.text }}>
                {`${element.label} ${element.resist}% / ${element.cap}%`}
              </div>
            )}
            <MenuButton primary onClick={onPlay}>
              Play Level {level}
            </MenuButton>
          </>,
        )}
        {level < 5 &&
          card(`Level ${level + 1}`, "Locked", <MenuButton disabled>Locked</MenuButton>, true)}
      </div>
      {/* Clear of the level cards (1.39 visual review). */}
      <div style={{ marginTop: 16 }}>
        <MenuButton onClick={onHideout}>Hideout</MenuButton>
      </div>
    </MenuScreen>
  );
}
