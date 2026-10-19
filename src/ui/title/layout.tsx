import { useEffect, type ReactNode } from "react";
import type { MusicId } from "../../assets/music";
import { musicPlayer } from "../../audio";

export const MENU = {
  bg: "#121418",
  panel: "#1b1f27",
  edge: "#3a4150",
  gold: "#ffd166",
  text: "#e8e8e8",
  dim: "#8a8f99",
};

/** A menu screen: centred content, its music, and the audio unlock on the first click (H §10.3). */
export function MenuScreen({ music, children }: { music: MusicId; children: ReactNode }) {
  useEffect(() => {
    // Creating the player creates the audio engine, whose first-input listener unlocks audio.
    void musicPlayer()?.play(music);
  }, [music]);
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: MENU.bg,
        color: MENU.text,
        padding: 16,
        textAlign: "center",
      }}
    >
      <div>{children}</div>
    </main>
  );
}

export function MenuButton({
  children,
  onClick,
  primary = false,
  disabled = false,
  testId,
}: {
  children: ReactNode;
  onClick?(): void;
  primary?: boolean;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: primary ? "10px 28px" : "6px 18px",
        fontSize: primary ? 18 : 14,
        margin: 4,
        background: disabled ? "#1a1c20" : "#23272f",
        color: disabled ? MENU.dim : MENU.text,
        border: `1px solid ${primary ? MENU.gold : MENU.edge}`,
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
