import type { SimEvent } from "../../sim/events";
import type { RoundState } from "../../sim/state";
import type { Tier } from "../../tuning/juice";
import { cuesFor, tierCues } from "../cues";
import { createHitstop } from "../core/hitstop";
import type { JuiceSettings } from "../core/settings";
import { createShake } from "../core/shake";
import { createSlowmo } from "../core/slowmo";
import type { Cue, CueBatch } from "./cue";

/** A presentation system (renderer layers, particles, numbers, audio, HUD): it consumes cues and holds its own cosmetic state. */
export interface PresentationSystem {
  id: string;
  consume(cue: Cue, batch: CueBatch, round: RoundState | null): void;
}

export interface DirectorOptions {
  settings: () => JuiceSettings;
  /** Wall-clock ms. */
  now: () => number;
  /** The round's 1×/2× speed: hitstop and slow-mo halve at 2×. */
  speed: () => number;
  systems: PresentationSystem[];
  /** True while a boss telegraph plays: slow-mo never starts then (H §1.3). */
  telegraph?: () => boolean;
}

const LOG_LIMIT = 200;

/**
 * The juice director (P12): maps each sim event to cues through the cue
 * table, applies the tier's shake, hitstop and slow-mo through the core
 * controllers (with their rate limits and the juice knob), and fans every
 * cue out to the presentation systems. It reads the sim; it never writes it.
 */
export function createDirector(options: DirectorOptions) {
  const shake = createShake(options.settings);
  const hitstop = createHitstop(options.settings);
  const slowmo = createSlowmo(options.settings);
  const cueLog: CueBatch[] = [];
  const tierLog: { event: string; tier: Tier }[] = [];
  const push = <T>(log: T[], entry: T) => {
    log.push(entry);
    if (log.length > LOG_LIMIT) log.splice(0, log.length - LOG_LIMIT);
  };

  function dispatch(batch: CueBatch, round: RoundState | null, speed: number) {
    const now = batch.at;
    for (const cue of batch.cues) {
      if (cue.kind === "shake") shake.add(cue.trauma);
      // A refused global hitstop (inside its 1 s limit) leaves only the shake already added.
      else if (cue.kind === "hitstop" && cue.scope === "global")
        hitstop.global(batch.tier, now, speed);
      else if (cue.kind === "hitstop")
        for (const id of cue.actorIds) hitstop.actor(id, batch.tier, cue.big, now, speed);
      else if (cue.kind === "slowmo" && !options.telegraph?.())
        slowmo.start(cue.scale, cue.ms, now, speed);
      for (const system of options.systems) system.consume(cue, batch, round);
    }
    push(cueLog, batch);
    if (batch.tier >= 3 && options.settings().tierLog)
      push(tierLog, { event: batch.event, tier: batch.tier });
  }

  return {
    handle(events: readonly SimEvent[], round: RoundState | null = null) {
      const now = options.now();
      const speed = options.speed();
      for (const event of events)
        dispatch({ ...cuesFor(event, options.settings()), at: now }, round, speed);
    },
    /** Fires a tier's global effects alone, for `?scene=tiers` and tests. */
    fire(tier: Tier) {
      dispatch(
        { event: `tier${tier}`, tier, cues: tierCues(tier), at: options.now() },
        null,
        options.speed(),
      );
    },
    /** Decays shake; call once per frame with wall-clock seconds. */
    update(dt: number) {
      shake.update(dt);
    },
    /** The driver's hooks (1.10): global hitstop freezes the sim; slow-mo scales its time. */
    frozen: (now: number) => hitstop.frozen(now),
    timeScale: (now: number) => slowmo.timeScale(now),
    actorFrozen: (id: string, now: number) => hitstop.actorFrozen(id, now),
    /** The board's shake offset at wall time `t` seconds. */
    shakeOffset: (t: number) => shake.offset(t),
    cueLog: () => cueLog,
    tierLog: () => tierLog,
  };
}
