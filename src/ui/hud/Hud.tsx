import { useEffect, useState, type ReactNode } from "react";
import { heroGems, spellGems } from "../../data";
import type { RosterSlot } from "../../sim/economy/roster";
import type { Intent } from "../../sim/intents";
import type { RoundState } from "../../sim/state";
import type { Tile } from "../../sim/targeting";
import { canUse, rangePreview, tileAt } from "./placement";
import { useRound, type HudView, type RoundStore } from "./round-store";

const TILE = 64;
const BOARD_WIDTH = 9 * TILE;
const BOARD_HEIGHT = 5 * TILE;
/** Height the HUD's bars take from the viewport: the top bar and the bottom bar. */
export const HUD_TOP = 56;
export const HUD_BOTTOM = 24;
const DENY_MS = 400;
const BUMP_MS = 200;

/** Display names: PoE2 names from the data, plus MvM custom heroes. */
const CUSTOM_NAMES: Readonly<Record<string, string>> = {
  "MvM/Heroes/EzomyteAcolyte": "Ezomyte Acolyte",
};
const NAMES = new Map<string, string>([
  ...[...heroGems(), ...spellGems()].map((g) => [g.id as string, g.name] as const),
  ...Object.entries(CUSTOM_NAMES),
]);

const COLORS = {
  bar: "rgba(10, 12, 16, 0.92)",
  text: "#e8e8e8",
  dim: "#8a8f98",
  mana: "#6fd3ff",
  deny: "#ff5a5a",
  card: "#23272f",
  cardEdge: "#3a404b",
  picked: "#ffd166",
  valid: "rgba(120, 220, 140, 0.35)",
  invalid: "rgba(255, 80, 80, 0.4)",
  range: "rgba(255, 255, 255, 0.12)",
  heart: "#e0455a",
  flag: "#ffd166",
};

type Picked = RosterSlot | "shovel" | null;

function ManaCounter({ view, deniedAt }: { view: HudView; deniedAt: number }) {
  const bumping = view.now - view.manaRoseAt < BUMP_MS;
  const denied = view.now - deniedAt < DENY_MS;
  return (
    <div
      data-testid="mana-counter"
      data-deny={String(denied)}
      style={{
        minWidth: 72,
        fontSize: 22,
        fontWeight: 700,
        color: denied ? COLORS.deny : COLORS.mana,
        transform: bumping ? "scale(1.15)" : "none",
        transition: "transform 120ms",
      }}
    >
      ◆ {Math.round(view.manaShown)}
    </div>
  );
}

function RosterCard({
  slot,
  mana,
  now,
  picked,
  deniedAt,
  onPick,
}: {
  slot: RosterSlot;
  mana: number;
  now: number;
  picked: boolean;
  deniedAt: number;
  onPick(): void;
}) {
  const progress = slot.rechargeSeconds > 0 ? 1 - slot.rechargeLeft / slot.rechargeSeconds : 1;
  const ready = slot.rechargeLeft <= 1e-9;
  const affordable = mana >= slot.cost;
  const denied = now - deniedAt < DENY_MS;
  const state = denied
    ? "denied"
    : picked
      ? "picked"
      : !ready
        ? "recharging"
        : !affordable
          ? "unaffordable"
          : "ready";
  const name = NAMES.get(slot.card.hero.skillId) ?? slot.card.hero.skillId;
  return (
    <button
      type="button"
      data-testid={`card-${slot.cardId}`}
      data-state={state}
      data-recharge={String(Math.max(0, Math.min(1, progress)))}
      title={name}
      onClick={onPick}
      style={{
        position: "relative",
        width: 64,
        height: 48,
        padding: 2,
        border: `1px solid ${picked ? COLORS.picked : COLORS.cardEdge}`,
        borderRadius: 4,
        background: COLORS.card,
        color: COLORS.text,
        fontSize: 9,
        lineHeight: 1.1,
        overflow: "hidden",
        cursor: "pointer",
        transform: picked ? "translateY(-4px)" : denied ? "translateX(3px)" : "none",
        opacity: ready && affordable ? 1 : 0.6,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          right: 3,
          fontWeight: 700,
          color: affordable ? COLORS.text : COLORS.deny,
        }}
      >
        {slot.cost}
      </span>
      <span style={{ position: "absolute", bottom: 2, left: 3, right: 3, textAlign: "left" }}>
        {name}
      </span>
      {slot.kind === "spell" && (
        <span style={{ position: "absolute", top: 2, left: 3, color: COLORS.mana }}>✦</span>
      )}
      {!ready && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `conic-gradient(rgba(0,0,0,0) ${progress * 360}deg, rgba(0,0,0,0.6) 0)`,
          }}
        />
      )}
    </button>
  );
}

function Hearts({ life }: { life: number }) {
  return (
    <div data-testid="hearts" style={{ color: COLORS.heart, fontWeight: 700 }}>
      ♥ {life}
    </div>
  );
}

function WaveProgress({ round }: { round: RoundState }) {
  const waves = round.waves;
  if (!waves) return <div data-testid="wave-progress" />;
  const total = waves.plan.waves.length;
  const done = waves.next;
  return (
    <div
      data-testid="wave-progress"
      style={{ position: "relative", flex: 1, height: 8, background: "#2a2f38", borderRadius: 4 }}
    >
      <div
        style={{
          width: `${(done / total) * 100}%`,
          height: "100%",
          background: "#7a8a3a",
          borderRadius: 4,
        }}
      />
      {waves.plan.waves.map((wave) =>
        wave.flag ? (
          <span
            key={wave.index}
            data-testid="flag-marker"
            style={{
              position: "absolute",
              top: -6,
              left: `calc(${((wave.index + 1) / total) * 100}% - 6px)`,
              color: COLORS.flag,
              fontSize: 12,
            }}
          >
            ⚑
          </span>
        ) : null,
      )}
    </div>
  );
}

function PlacementOverlay({
  round,
  scale,
  picked,
  onUse,
}: {
  round: RoundState;
  scale: number;
  picked: Picked;
  onUse(tile: Tile): void;
}) {
  const [hover, setHover] = useState<Tile | null>(null);
  const size = TILE * scale;
  const toTile = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return tileAt(event.clientX - rect.left, event.clientY - rect.top, scale);
  };
  const valid = picked && hover ? canUse(round, picked, hover) : false;
  const preview =
    picked && picked !== "shovel" && hover && valid ? rangePreview(round, picked, hover) : [];
  const box = (
    tile: Tile,
    color: string,
    key: string,
    testId?: string,
    extra?: Record<string, string>,
  ) => (
    <div
      key={key}
      data-testid={testId}
      {...extra}
      style={{
        position: "absolute",
        left: (tile.column - 1) * size,
        top: tile.lane * size,
        width: size,
        height: size,
        background: color,
        pointerEvents: "none",
      }}
    />
  );
  return (
    <div
      data-testid="placement-overlay"
      data-picked={picked === "shovel" ? "shovel" : (picked?.cardId ?? "")}
      onMouseMove={(e) => setHover(toTile(e))}
      onMouseLeave={() => setHover(null)}
      onClick={(e) => {
        if (!picked) return;
        const tile = toTile(e);
        if (canUse(round, picked, tile)) onUse(tile);
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: BOARD_WIDTH * scale,
        height: BOARD_HEIGHT * scale,
        cursor: picked ? "crosshair" : "default",
      }}
    >
      {preview.map((tile) => box(tile, COLORS.range, `range-${tile.lane}-${tile.column}`))}
      {picked &&
        hover &&
        box(hover, valid ? COLORS.valid : COLORS.invalid, "ghost", "ghost", {
          "data-valid": String(valid),
        })}
    </div>
  );
}

export interface HudProps {
  store: RoundStore;
  enqueue(intent: Intent): void;
  /** The board's integer scale, to map the mouse to tiles. */
  scale: number;
  /** The resume countdown (P14), shown over the board while non-null. */
  countdown: number | null;
  /** The board canvas, laid out under the placement overlay. */
  children?: ReactNode;
  /** Ends the round as a loss after the player confirms (1.32). */
  onAbandon?(): void;
}

/**
 * The in-level HUD (GDD §15): mana, roster bar with the spell, shovel and
 * speed on top; life and wave progress below; the loot ticker's container
 * on the right; and placement input over the board.
 */
export function Hud({ store, enqueue, scale, countdown, children, onAbandon }: HudProps) {
  const { round, view } = useRound(store);
  const [picked, setPicked] = useState<Picked>(null);
  const [denied, setDenied] = useState<{ cardId: string; at: number }>({
    cardId: "",
    at: -Infinity,
  });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (slot: RosterSlot) => {
    if (slot.rechargeLeft > 1e-9 || round.mana < slot.cost) {
      setDenied({ cardId: slot.cardId, at: store.view.now });
      setPicked(null);
      return;
    }
    setPicked((current) => (current !== "shovel" && current?.cardId === slot.cardId ? null : slot));
  };

  const use = (tile: Tile) => {
    if (picked === "shovel") enqueue({ type: "shovel", lane: tile.lane, column: tile.column });
    else if (picked?.kind === "spell")
      enqueue({ type: "cast", spellId: picked.cardId, lane: tile.lane, x: tile.column });
    else if (picked)
      enqueue({ type: "place", cardId: picked.cardId, lane: tile.lane, column: tile.column });
    setPicked(null);
  };

  const button = {
    padding: "4px 8px",
    background: COLORS.card,
    color: COLORS.text,
    border: `1px solid ${COLORS.cardEdge}`,
    borderRadius: 4,
    cursor: "pointer",
  };
  return (
    <div
      style={{
        position: "relative",
        width: BOARD_WIDTH * scale,
        margin: "0 auto",
        color: COLORS.text,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: HUD_TOP,
          padding: "0 8px",
          background: COLORS.bar,
        }}
      >
        <ManaCounter view={view} deniedAt={denied.at} />
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {round.roster.map((slot) => (
            <RosterCard
              key={slot.cardId}
              slot={slot}
              mana={round.mana}
              now={view.now}
              picked={picked !== "shovel" && picked?.cardId === slot.cardId}
              deniedAt={denied.cardId === slot.cardId ? denied.at : -Infinity}
              onPick={() => pick(slot)}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Shovel"
          style={{ ...button, borderColor: picked === "shovel" ? COLORS.picked : COLORS.cardEdge }}
          onClick={() => setPicked(picked === "shovel" ? null : "shovel")}
        >
          ⛏ Shovel
        </button>
        {onAbandon && (
          <button type="button" style={button} onClick={() => setConfirming(true)}>
            Abandon round
          </button>
        )}
        {([1, 2] as const).map((speed) => (
          <button
            key={speed}
            type="button"
            style={{
              ...button,
              borderColor: round.speed === speed ? COLORS.picked : COLORS.cardEdge,
            }}
            onClick={() => enqueue({ type: "setSpeed", speed })}
          >
            {`${speed}×`}
          </button>
        ))}
      </div>
      <div
        style={{ position: "relative", width: BOARD_WIDTH * scale, height: BOARD_HEIGHT * scale }}
      >
        {children}
        <PlacementOverlay round={round} scale={scale} picked={picked} onUse={use} />
        <div
          data-testid="loot-ticker"
          style={{ position: "absolute", top: 8, right: 8, width: 200, pointerEvents: "none" }}
        />
        {confirming && onAbandon && (
          <div
            role="dialog"
            aria-label="Abandon round"
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                padding: 16,
                background: COLORS.bar,
                border: `1px solid ${COLORS.cardEdge}`,
                borderRadius: 6,
                textAlign: "center",
              }}
            >
              <p style={{ margin: "0 0 12px" }}>Abandon this round? Loot already found is kept.</p>
              <button
                type="button"
                style={{ ...button, marginRight: 8, borderColor: COLORS.deny }}
                onClick={() => {
                  setConfirming(false);
                  onAbandon();
                }}
              >
                Abandon
              </button>
              <button type="button" style={button} onClick={() => setConfirming(false)}>
                Keep playing
              </button>
            </div>
          </div>
        )}
        {countdown !== null && (
          <div
            data-testid="countdown"
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 96,
              fontWeight: 800,
              background: "rgba(0,0,0,0.35)",
              pointerEvents: "none",
            }}
          >
            {countdown}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: HUD_BOTTOM,
          padding: "0 8px",
          background: COLORS.bar,
        }}
      >
        <Hearts life={round.life} />
        <WaveProgress round={round} />
        <span style={{ color: COLORS.dim, fontSize: 12 }}>
          {round.waves
            ? `Wave ${Math.min(round.waves.next, round.waves.plan.waves.length)}/${round.waves.plan.waves.length}`
            : ""}
        </span>
      </div>
    </div>
  );
}
