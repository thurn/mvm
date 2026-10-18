import { titleOptions, type SaveState } from "../../app/router";
import { MenuButton, MenuScreen, MENU } from "./layout";

/** The title (GDD §15): Continue when there is a save, New game without an account, and Credits. */
export function TitleScreen({
  save,
  onNewGame,
  onContinue,
  onCredits,
}: {
  save: SaveState;
  onNewGame(): void;
  onContinue(): void;
  onCredits(): void;
}) {
  const options = titleOptions(save);
  return (
    <MenuScreen music="title">
      <h1 style={{ margin: "0 0 4px", letterSpacing: 1 }}>Mercs vs. Monsters</h1>
      <div style={{ color: MENU.dim, marginBottom: 24 }}>
        A Path of Exile tower defense prototype
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {options.continue && (
          <MenuButton primary onClick={onContinue}>
            {save.hasRound ? "Continue level" : "Continue"}
          </MenuButton>
        )}
        {options.newGame && (
          <MenuButton primary onClick={onNewGame}>
            New game
          </MenuButton>
        )}
        <MenuButton onClick={onCredits}>Credits</MenuButton>
      </div>
    </MenuScreen>
  );
}
