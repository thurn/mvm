import type { ReactNode } from "react";
import { MenuButton, MenuScreen, MENU } from "./layout";

/** The one-card campaign stub (plan 1.34): Level 1 playable, Level 2 "coming soon". */
export function Campaign({
  cleared,
  onPlay,
  onHideout,
}: {
  cleared: boolean;
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
          "Level 1",
          cleared ? "Cleared" : "First clear: unlock slot 4, choose 1 of 3 heroes",
          <MenuButton primary onClick={onPlay}>
            Play Level 1
          </MenuButton>,
        )}
        {card("Level 2", "Coming soon", <MenuButton disabled>Locked</MenuButton>, true)}
      </div>
      <MenuButton onClick={onHideout}>Hideout</MenuButton>
    </MenuScreen>
  );
}
