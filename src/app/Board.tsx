import { useEffect, useRef, useState } from "react";
import { installQaSurface, recordEvents } from "../dev/qa-surface";
import type { Scene } from "../dev/scenes";
import type { SimEvent } from "../sim/events";
import type { RoundState } from "../sim/state";

/** What the board plays: a scene, or the persisted game. */
export interface BoardSource extends Scene {
  /** Called after every step with its events, for the lifecycle and autosave. */
  onStep?(state: RoundState, events: readonly SimEvent[]): void;
}
import { createIntentQueue, drain } from "../sim/intents";
import { step } from "../sim/kernel";
import { createLayerStack } from "../render/layers";
import { registerPlaceholderLayers } from "../render/placeholder";
import { BOARD_HEIGHT, BOARD_WIDTH, chooseScale } from "../render/scale";
import { createDriver } from "./driver";

/** The board canvas for one round: the time driver, the layer stack and the QA surface. */
export function Board({ scene }: { scene: BoardSource }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(() => chooseScale(window.innerWidth, window.innerHeight));
  // The render loop reads the scale from a ref, so a resize never restarts the round.
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const onResize = () => setScale(chooseScale(window.innerWidth, window.innerHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const qa = installQaSurface();
    qa.screen = `scene:${scene.name}`;
    const state = scene.create();
    qa.round = state;
    const intents = createIntentQueue();
    const previousX = new Map<string, number>();
    const driver = createDriver({
      step() {
        previousX.clear();
        for (const monster of state.monsters) previousX.set(monster.id, monster.x);
        const events = step(state, [...drain(intents), ...(scene.intents?.(state) ?? [])]);
        recordEvents(qa, events);
        scene.onStep?.(state, events);
        if (driver.speed() !== state.speed) driver.setSpeed(state.speed);
      },
    });
    const stack = createLayerStack();
    registerPlaceholderLayers(stack);

    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      driver.advance(now - last);
      last = now;
      ctx.save();
      ctx.setTransform(scaleRef.current, 0, 0, scaleRef.current, 0, 0);
      ctx.imageSmoothingEnabled = false;
      stack.draw(ctx, { state, previousX, alpha: driver.alpha(), shake: { x: 0, y: 0 }, now });
      ctx.restore();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [scene]);

  return (
    <canvas
      ref={canvasRef}
      width={BOARD_WIDTH * scale}
      height={BOARD_HEIGHT * scale}
      style={{ imageRendering: "pixelated", display: "block", margin: "0 auto" }}
    />
  );
}
