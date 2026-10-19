import { useState } from "react";
import { furthestLevel, isUnlocked } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import { audioEngine } from "../../audio";
import { CAMPAIGN } from "../../monsters/levels/grassland";
import type { LevelDefinition } from "../../monsters/levels/types";
import { firstClearReward } from "../../tuning/progression";
import { elementPreview } from "./element";
import { MenuButton, MenuScreen, MENU } from "./layout";
import { rewardParts } from "./rewards";

/** Each level's place name (D §6.1). */
const NAMES: Readonly<Record<string, string>> = {
  "level-1": "The Riverbank",
  "level-2": "Clearfell",
  "level-3": "Clearfell",
  "level-4": "The Grelwood",
  "level-5": "The Red Vale",
};

/** Monster types by archetype, as the card previews them (GDD §15: only these are shown). */
const MONSTER_NAMES: Readonly<Record<string, string>> = {
  Shambler: "Shambling Corpse",
  ArmouredLight: "Helmed Skeleton",
  Swarm: "Rat Swarm",
  Leaper: "Goblin Leaper",
};

const BOSS_NAMES: Readonly<Record<string, string>> = { BloatedMiller: "The Bloated Miller" };

const STYLE = `@keyframes mvm-map-sparkle { 0%, 100% { text-shadow: 0 0 0 transparent; } 50% { text-shadow: 0 0 6px #ffd166; } }
@keyframes mvm-map-path { from { width: 0; } }`;

const NODE_W = 196;
const GAP = 14;

/**
 * The campaign map (GDD §15, plan 2.24): one node per level along a path,
 * each card showing the biome, area level, monster types, the first-clear
 * reward (sparkling until cleared), a Strongbox hint and the biome element
 * against the team's resistance. Locked levels can't start; cleared ones
 * replay. Picking a node rustles parchment and draws the dotted path to it
 * (H §9.3).
 */
export function Campaign({
  account,
  onPlay,
  onHideout,
  levels = CAMPAIGN,
}: {
  account: AccountState;
  onPlay(levelId: string): void;
  onHideout(): void;
  /** The levels on the map, in order; the campaign's by default. */
  levels?: readonly LevelDefinition[];
}) {
  const [selected, setSelected] = useState(() => furthestLevel(account).index);
  const select = (index: number) => {
    if (index === selected) return;
    audioEngine()?.play("parchment");
    setSelected(index);
  };
  return (
    <MenuScreen music="hideout">
      <style>{STYLE}</style>
      <h2 style={{ margin: "0 0 12px" }}>The Grassland</h2>
      <div
        style={{ position: "relative", display: "inline-flex", gap: GAP, alignItems: "stretch" }}
      >
        {/* The dotted path from the first node to the picked one. */}
        <div
          key={selected}
          data-testid="map-path"
          data-to={String(selected)}
          style={{
            position: "absolute",
            top: -10,
            left: NODE_W / 2,
            width: (selected - 1) * (NODE_W + GAP),
            borderTop: `3px dotted ${MENU.gold}`,
            animation: "mvm-map-path 400ms ease-out",
          }}
        />
        {levels.map((level) => {
          const unlocked = isUnlocked(account, level);
          const cleared = account.firstClears.includes(level.id);
          const reward = rewardParts(firstClearReward(level.id));
          const element = elementPreview(level, account);
          const monsters = [
            ...level.archetypes.map((a) => MONSTER_NAMES[a] ?? a),
            ...(level.boss ? [BOSS_NAMES[level.boss] ?? level.boss] : []),
          ];
          return (
            <section
              key={level.id}
              data-testid={`node-${level.id}`}
              onClick={() => select(level.index)}
              style={{
                width: NODE_W,
                boxSizing: "border-box",
                padding: 10,
                textAlign: "left",
                background: MENU.panel,
                border: `1px solid ${level.index === selected ? MENU.gold : MENU.edge}`,
                borderRadius: 8,
                opacity: unlocked ? 1 : 0.55,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15 }}>Level {level.index}</h3>
              <div style={{ color: MENU.gold }}>{NAMES[level.id] ?? "The Grassland"}</div>
              <div style={{ color: MENU.dim }}>Area level {level.areaLevel}</div>
              <div style={{ color: MENU.text }}>{monsters.join(", ")}</div>
              {level.strongboxes && <div style={{ color: "#c8a040" }}>Strongbox possible</div>}
              {element && (
                <div data-testid="level-element">{`${element.label} ${element.resist}% / ${element.cap}%`}</div>
              )}
              <div
                style={{
                  color: cleared ? MENU.dim : "#ffd166",
                  animation: cleared ? undefined : "mvm-map-sparkle 1.6s ease-in-out infinite",
                }}
              >
                {cleared ? "Cleared" : reward.length > 0 ? `First clear: ${reward.join(", ")}` : ""}
              </div>
              <div style={{ marginTop: "auto" }}>
                <MenuButton
                  primary={unlocked && !cleared}
                  disabled={!unlocked}
                  testId={`play-level-${level.index}`}
                  onClick={() => unlocked && onPlay(level.id)}
                >
                  {!unlocked ? "Locked" : `${cleared ? "Replay" : "Play"} Level ${level.index}`}
                </MenuButton>
              </div>
            </section>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>
        <MenuButton onClick={onHideout}>Hideout</MenuButton>
      </div>
    </MenuScreen>
  );
}
