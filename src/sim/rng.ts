/**
 * Named, seeded RNG streams (P11). Each domain draws from its own stream, so
 * adding draws to one never perturbs another. The state is plain numbers.
 */
export const RNG_STREAMS = ["waves", "combat", "loot", "sky", "heroGen", "ids"] as const;
export type RngStreamName = (typeof RNG_STREAMS)[number];

/** sfc32 state: four unsigned 32-bit words. */
type RngState = [number, number, number, number];
export type RngStreams = Record<RngStreamName, RngState>;

function nextUint32(state: RngState): number {
  let [a, b, c, d] = state;
  const t = (((a + b) >>> 0) + d) >>> 0;
  d = (d + 1) >>> 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) >>> 0;
  c = ((c << 21) | (c >>> 11)) >>> 0;
  c = (c + t) >>> 0;
  state[0] = a >>> 0;
  state[1] = b;
  state[2] = c;
  state[3] = d;
  return t;
}

/** A 32-bit string hash (FNV-1a), to give each stream its own seed. */
function hashName(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

function seedStream(seed: number, name: string): RngState {
  const state: RngState = [seed >>> 0, hashName(name), 0x9e3779b9, 1];
  for (let i = 0; i < 15; i++) nextUint32(state);
  return state;
}

export function createStreams(seed: number): RngStreams {
  const streams = {} as RngStreams;
  for (const name of RNG_STREAMS) streams[name] = seedStream(seed, name);
  return streams;
}

/** Draws a uniform value in [0, 1) from one stream, advancing only that stream. */
export function draw(streams: RngStreams, name: RngStreamName): number {
  return nextUint32(streams[name]) / 4294967296;
}

/** Draws an unsigned 32-bit integer from one stream. */
export function drawUint32(streams: RngStreams, name: RngStreamName): number {
  return nextUint32(streams[name]);
}

/** A draw function bound to one stream, for pure helpers such as resolveHit. */
export function streamRng(streams: RngStreams, name: RngStreamName): () => number {
  return () => draw(streams, name);
}
