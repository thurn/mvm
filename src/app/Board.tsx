import { useEffect, useRef, useState } from "react";
import { installQaSurface, recordCues, recordEvents } from "../dev/qa-surface";
import { createSettings } from "../juice/core/settings";
import { createPresentation } from "../juice/director/systems";
import type { Scene } from "../dev/scenes";
import type { SimEvent } from "../sim/events";
import type { RoundState } from "../sim/state";

/** What the board plays: a scene, or the persisted game. */
export interface BoardSource extends Scene {
  /** Called after every step with its events, for the lifecycle and autosave. */
  onStep?(state: RoundState, events: readonly SimEvent[]): void;
}
import { createIntentQueue, drain, type IntentQueue } from "../sim/intents";
import { step } from "../sim/kernel";
import { createLayerStack } from "../render/layers";
import { registerPlaceholderLayers } from "../render/placeholder";
import { BOARD_HEIGHT, BOARD_WIDTH, chooseScale } from "../render/scale";
import { createDriver } from "./driver";

/** The board canvas for one round: the time driver, the layer stack and the QA surface. */
/** The board's integer scale for the window, leaving `reserveHeight` px for HUD bars; follows resizes. */
export function useBoardScale(reserveHeight = 0): number {
  const choose = () => chooseScale(window.innerWidth, window.innerHeight - reserveHeight);
  const [scale, setScale] = useState(choose);
  useEffect(() => {
    const onResize = () =>
      setScale(chooseScale(window.innerWidth, window.innerHeight - reserveHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [reserveHeight]);
  return scale;
}

export interface BoardProps {
  scene: BoardSource;
  /** Overrides the board's own window-fit scale (the HUD lays out around it). */
  scale?: number;
  /** Player intents from the HUD, drained into each step. */
  queue?: IntentQueue;
  /** Called once per rendered frame, after drawing. */
  onFrame?(): void;
  /** Read every frame: true holds the sim still (the resume countdown, P14). */
  isPaused?(): boolean;
}

export function Board({ scene, scale: forcedScale, queue, onFrame, isPaused }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ownScale = useBoardScale();
  const scale = forcedScale ?? ownScale;
  // The render loop reads the scale from a ref, so a resize never restarts the round.
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  const onFrameRef = useRef(onFrame);
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    onFrameRef.current = onFrame;
    isPausedRef.current = isPaused;
  }, [onFrame, isPaused]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const qa = installQaSurface();
    qa.screen = `scene:${scene.name}`;
    const state = scene.create();
    qa.round = state;
    const intents = queue ?? createIntentQueue();
    const previousX = new Map<string, number>();
    const settings = createSettings();
    const stack = createLayerStack();
    registerPlaceholderLayers(stack);
    // The juice director (P12) reads each step's events; its hitstop and slow-mo reach the sim only through the driver.
    const { director } = createPresentation({
      stack,
      settings,
      now: () => performance.now(),
      speed: () => state.speed,
      base: [
        {
          id: "qa",
          consume: (_cue, batch) => {
            if (qa.cues.at(-1) !== batch) recordCues(qa, batch, settings.get().tierLog);
          },
        },
      ],
    });
    const driver = createDriver({
      step() {
        previousX.clear();
        for (const monster of state.monsters) previousX.set(monster.id, monster.x);
        const events = step(state, [...drain(intents), ...(scene.intents?.(state) ?? [])]);
        recordEvents(qa, events);
        director.handle(events, state);
        scene.onStep?.(state, events);
        if (driver.speed() !== state.speed) driver.setSpeed(state.speed);
      },
      hooks: {
        frozen: () => director.frozen(performance.now()),
        timeScale: () => director.timeScale(performance.now()),
      },
    });
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      driver.setPaused(isPausedRef.current?.() ?? false);
      driver.setDebugSlowmo(settings.get().debugSlowmo ?? 1);
      driver.advance(now - last);
      director.update((now - last) / 1000);
      last = now;
      ctx.save();
      ctx.setTransform(scaleRef.current, 0, 0, scaleRef.current, 0, 0);
      ctx.imageSmoothingEnabled = false;
      stack.draw(ctx, {
        state,
        previousX,
        alpha: driver.alpha(),
        shake: director.shakeOffset(now / 1000),
        now,
      });
      ctx.restore();
      onFrameRef.current?.();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [scene, queue]);

  return (
    <canvas
      ref={canvasRef}
      width={BOARD_WIDTH * scale}
      height={BOARD_HEIGHT * scale}
      style={{ imageRendering: "pixelated", display: "block", margin: "0 auto" }}
    />
  );
}
