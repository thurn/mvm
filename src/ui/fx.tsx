import { useEffect, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { fxProbe } from "../juice/core/probe";
import { sharedSettings, type JuiceSettings } from "../juice/core/settings";
import { flashAlpha } from "../juice/tiers/screen";
import { JUICE_TUNING, type Tier } from "../tuning/juice";

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

function useSettings(): JuiceSettings {
  const store = sharedSettings();
  return useSyncExternalStore(store.subscribe, store.get);
}

function useUiJuice(): UiJuice {
  const settings = useSettings();
  const juice = Math.min(1, settings.juice);
  return {
    juice,
    flash: (alpha) => flashAlpha(alpha, settings),
    particles: (count) => Math.round(count * juice),
  };
}

const STYLE = `@keyframes mvm-fx-fade { to { opacity: 0; } }
@keyframes mvm-fx-burst { from { transform: rotate(var(--a)) translateX(0); opacity: 1; } to { transform: rotate(var(--a)) translateX(var(--d)); opacity: 0; } }
@keyframes mvm-fx-glow { from { opacity: 0.8; transform: scale(0.6); } to { opacity: 0; transform: scale(1.4); } }
@keyframes mvm-fx-shake { 0% { transform: translate(var(--s), calc(var(--s) * -0.6)); } 20% { transform: translate(calc(var(--s) * -0.8), calc(var(--s) * 0.5)); } 40% { transform: translate(calc(var(--s) * 0.6), calc(var(--s) * -0.4)); } 60% { transform: translate(calc(var(--s) * -0.4), calc(var(--s) * 0.3)); } 80% { transform: translate(calc(var(--s) * 0.2), calc(var(--s) * -0.1)); } 100% { transform: none; } }`;

/**
 * A tier's package on a menu screen (H §1.3), under the same settings as the
 * board's: the hitstop becomes a held beat before the shake, the trauma a
 * shake of the panel that decays at the board's rate, and the screen row a
 * flash and an edge vignette. Everything is zero at juice 0.
 */
export function menuTier(
  tier: Tier,
  settings: JuiceSettings,
): { holdMs: number; shakePx: number; shakeMs: number; flash: number; vignette: number } {
  const row = JUICE_TUNING.tiers[tier];
  const screen = JUICE_TUNING.screen[tier];
  const juice = Math.min(1, settings.juice);
  const mode =
    settings.shake === "off" ? 0 : settings.shake === "low" ? JUICE_TUNING.shakeLowScale : 1;
  return {
    holdMs: row.globalHitstopMs * juice,
    shakePx: settings.shakeMax * row.trauma * row.trauma * mode * juice,
    shakeMs: (row.trauma / JUICE_TUNING.traumaDecayPerSecond) * 1000,
    flash: screen?.flash ? flashAlpha(screen.flash.alpha, settings) : 0,
    vignette: (screen?.vignette?.alpha ?? 0) * juice,
  };
}

/**
 * Wraps a menu panel and plays a tier's package on it once `fired` turns
 * true: hold, shake, flash and vignette, reported to `window.__mvm.fx`.
 */
export function TierPackage({
  tier,
  fired,
  children,
}: {
  tier: Tier;
  fired: boolean;
  children: ReactNode;
}) {
  const settings = useSettings();
  const pkg = menuTier(tier, settings);
  const screen = JUICE_TUNING.screen[tier];
  useEffect(() => {
    if (!fired) return;
    fxProbe.shake(pkg.shakePx);
    fxProbe.screen(pkg.flash, pkg.vignette);
    // Fires once per firing; a settings change mid-reveal doesn't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fired]);
  return (
    <div
      data-testid={`tier-${tier}`}
      style={
        {
          "--s": `${pkg.shakePx}px`,
          animation:
            fired && pkg.shakePx > 0
              ? `mvm-fx-shake ${pkg.shakeMs}ms linear ${pkg.holdMs}ms both`
              : undefined,
        } as CSSProperties
      }
    >
      <style>{STYLE}</style>
      {children}
      {fired && screen?.flash && <Flash screen alpha={screen.flash.alpha} ms={screen.flash.ms} />}
      {fired && pkg.vignette > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            pointerEvents: "none",
            opacity: pkg.vignette,
            background: "radial-gradient(ellipse at center, transparent 55%, #000000 100%)",
            animation: `mvm-fx-fade ${screen!.vignette!.ms}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}

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
