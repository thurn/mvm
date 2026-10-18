import { audioEngine } from "../../audio";
import type { Bus } from "../../tuning/audio";
import { JUICE_TUNING } from "../../tuning/juice";
import type { Frame } from "../../render/layers";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../../render/scale";
import type { JuiceSettings } from "../core/settings";
import type { CueBatch } from "../director/cue";
import type { PresentationSystem } from "../director/director";
import type { PresentationFactory } from "../director/systems";
import { ScreenEffects } from "./screen";

interface Ducker {
  duck(bus: Bus, db: number, seconds: number): void;
}

interface TierSystemOptions {
  /** The audio engine, or null before audio exists (tests, headless). */
  audio: () => Ducker | null;
  screen: ScreenEffects;
  /** Wall-clock ms. */
  now: () => number;
  settings: () => JuiceSettings;
}

/**
 * The tiers' audio and screen effects (H §1.3, §10.2): duck cues duck the
 * music (and, at T5, the sfx) through 1.7's engine; T4 and T5 start the
 * vignette and the screen flash. Shake, hitstop and slow-mo are the director's.
 */
export function createTierSystem(options: TierSystemOptions): PresentationSystem {
  let lastBatch: CueBatch | null = null;
  return {
    id: "tiers",
    consume(cue, batch) {
      if (batch !== lastBatch) {
        lastBatch = batch;
        options.screen.start(batch.tier, options.now(), options.settings());
      }
      if (cue.kind !== "duck") return;
      const audio = options.audio();
      audio?.duck("music", cue.db, cue.seconds);
      if (batch.tier === 5)
        audio?.duck("sfx", JUICE_TUNING.sfxDuckT5.db, JUICE_TUNING.sfxDuckT5.seconds);
    },
  };
}

function drawScreen(ctx: CanvasRenderingContext2D, effects: { flash: number; vignette: number }) {
  if (effects.vignette > 0) {
    const cx = BOARD_WIDTH / 2;
    const cy = BOARD_HEIGHT / 2;
    const gradient = ctx.createRadialGradient(
      cx,
      cy,
      BOARD_HEIGHT * 0.35,
      cx,
      cy,
      BOARD_WIDTH * 0.6,
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, `rgba(0, 0, 0, ${effects.vignette})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  }
  if (effects.flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${effects.flash})`;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  }
}

/** The board's tier system: the flashes layer plus the audio ducking. */
export const tierSystem: PresentationFactory = ({ stack, settings, now, director }) => {
  const screen = new ScreenEffects();
  if (typeof window !== "undefined" && window.__mvm)
    window.__mvm.fireTier = (tier) => director.fire(tier);
  stack.register({
    id: "tier-screen",
    layer: "flashes",
    draw: (ctx, frame: Frame) => drawScreen(ctx, screen.sample(frame.now)),
  });
  return createTierSystem({ audio: audioEngine, screen, now, settings: settings.get });
};
