/** Equal-power crossfade gains `t` seconds into a fade of `duration` (H §10.4). */
export function crossfadeGains(t: number, duration: number): { from: number; to: number } {
  if (t <= 0) return { from: 1, to: 0 };
  const p = Math.min(1, t / duration);
  return { from: Math.cos((p * Math.PI) / 2), to: Math.sin((p * Math.PI) / 2) };
}

/** The same curve as Web Audio value curves, for scheduling on a GainNode. */
export function crossfadeCurves(steps = 32): { from: Float32Array; to: Float32Array } {
  const from = new Float32Array(steps);
  const to = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const g = crossfadeGains(i / (steps - 1), 1);
    from[i] = g.from;
    to[i] = g.to;
  }
  return { from, to };
}
