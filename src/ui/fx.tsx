import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { sharedSettings } from "../juice/core/settings";
import { flashAlpha } from "../juice/tiers/screen";

/**
 * UI juice under the player's settings (H §1.1, §14; mason hv-7ic2.104).
 * Menu screens draw their effects outside the juice director, so these are
 * the one place they meet the juice and reduce-flashing settings: a screen
 * uses the components below and never reads those settings itself.
 */
interface UiJuice {
  /** The juice knob, capped at 1 for UI effects. */
  juice: number;
  /** A flash's alpha after juice and reduce flashing; 0 means draw nothing. */
  flash(alpha: number): number;
  /** A particle count after juice. */
  particles(count: number): number;
}

function useUiJuice(): UiJuice {
  const store = sharedSettings();
  const settings = useSyncExternalStore(store.subscribe, store.get);
  const juice = Math.min(1, settings.juice);
  return {
    juice,
    flash: (alpha) => flashAlpha(alpha, settings),
    particles: (count) => Math.round(count * juice),
  };
}

const STYLE = `@keyframes mvm-fx-fade { to { opacity: 0; } }
@keyframes mvm-fx-burst { from { transform: rotate(var(--a)) translateX(0); opacity: 1; } to { transform: rotate(var(--a)) translateX(var(--d)); opacity: 0; } }
@keyframes mvm-fx-glow { from { opacity: 0.8; transform: scale(0.6); } to { opacity: 0; transform: scale(1.4); } }`;

/** A flash over its container (or the screen) that fades out; nothing at juice 0, capped under reduce flashing. */
export function Flash({
  alpha,
  ms,
  background = "#ffffff",
  screen = false,
  steps,
  testId,
}: {
  alpha: number;
  ms: number;
  background?: string;
  /** Covers the whole screen, above positioned content, instead of its container. */
  screen?: boolean;
  /** Fades in this many steps instead of linearly (a frame-exact flash). */
  steps?: number;
  testId?: string;
}) {
  const shown = useUiJuice().flash(alpha);
  if (shown <= 0) return null;
  return (
    <div
      data-testid={testId}
      data-alpha={shown}
      style={{
        opacity: shown,
        position: screen ? "fixed" : "absolute",
        inset: 0,
        ...(screen ? { zIndex: 10 } : {}),
        pointerEvents: "none",
        background,
        animation: `mvm-fx-fade ${ms}ms ${steps ? `steps(${steps})` : "linear"} forwards`,
      }}
    >
      <style>{STYLE}</style>
    </div>
  );
}

/** Particles flying out from the container's centre; scaled by juice, so none at juice 0. */
export function Burst({
  count,
  color,
  ms,
  distance,
}: {
  count: number;
  color: string;
  ms: number;
  distance: number;
}) {
  const shown = useUiJuice().particles(count);
  if (shown <= 0) return null;
  return (
    <span style={{ position: "absolute", left: "50%", top: "50%", pointerEvents: "none" }}>
      <style>{STYLE}</style>
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          data-testid="burst-particle"
          style={
            {
              position: "absolute",
              width: 4,
              height: 4,
              background: color,
              "--a": `${(360 / shown) * i}deg`,
              "--d": `${distance}px`,
              animation: `mvm-fx-burst ${ms}ms ease-out forwards`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** A soft glow in a colour that swells and fades over its container; none at juice 0. */
export function Glow({ color, ms }: { color: string; ms: number }) {
  if (useUiJuice().juice <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        pointerEvents: "none",
        animation: `mvm-fx-glow ${ms}ms ease-out forwards`,
      }}
    >
      <style>{STYLE}</style>
    </div>
  );
}

const PLACEMENT: Record<"below" | "left" | "right", CSSProperties> = {
  below: { top: "100%", left: 0, marginTop: 6 },
  left: { right: "100%", top: 0, marginRight: 6 },
  right: { left: "100%", top: 0, marginLeft: 6 },
};

/**
 * A hover tooltip beside its positioned parent. It never takes pointer
 * events, so it can't swallow a click or a drop on what it covers.
 */
export function HoverTip({
  placement,
  children,
}: {
  placement: keyof typeof PLACEMENT;
  children: ReactNode;
}) {
  return (
    <div
      style={{ position: "absolute", zIndex: 30, pointerEvents: "none", ...PLACEMENT[placement] }}
    >
      {children}
    </div>
  );
}
