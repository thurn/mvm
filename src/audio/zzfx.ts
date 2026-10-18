/**
 * ZzFX sound generation (H §11.2), after Frank Force's ZzFX (MIT,
 * https://github.com/KilledByAPixel/ZzFX): a parameter array becomes samples.
 */
export type ZzfxParams = readonly number[];

const MASTER = 0.3;

/** H §11.2's starting sketches; tune by ear. */
export const SFX = {
  ui_hover: [0.3, 0, 1200, 0, 0.01, 0.03, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  ui_click: [0.5, 0, 700, 0, 0.01, 0.05, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  ui_deny: [0.5, 0, 120, 0, 0.05, 0.12, 3, 1, 0, 0, 0, 0, 0.04, 0, 0, 0, 0, 1, 0, 0],
  // D5, jumping +588 Hz to D6.
  card_ready: [0.4, 0, 587, 0, 0.02, 0.15, 0, 1, 0, 0, 588, 0.04, 0, 0, 0, 0, 0, 1, 0, 0],
  // The unique drum-roll riser.
  riser: [0.6, 0, 200, 0.6, 0.1, 0.1, 2, 1, 1.5, 0, 0, 0, 0, 0.3, 0, 0, 0, 1, 0, 0.2],
  /** A soft thud: the placeholder for any combat sound without a sample. */
  thud: [0.6, 0.05, 90, 0, 0.02, 0.12, 4, 1, -2, 0, 0, 0, 0, 0.5, 0, 0, 0, 1, 0, 0],
} satisfies Record<string, ZzfxParams>;

/** Renders ZzFX parameters to mono samples at `sampleRate`. */
export function zzfxSamples(
  params: ZzfxParams,
  sampleRate = 44100,
  random: () => number = Math.random,
): number[] {
  const [
    volume = 1,
    randomness = 0.05,
    baseFrequency = 220,
    attackSeconds = 0,
    sustainSeconds = 0,
    releaseSeconds = 0.1,
    shape = 0,
    shapeCurve = 1,
    baseSlide = 0,
    baseDeltaSlide = 0,
    pitchJumpHz = 0,
    pitchJumpSeconds = 0,
    repeatTime = 0,
    noise = 0,
    modulationHz = 0,
    bitCrush = 0,
    delaySeconds = 0,
    sustainVolume = 1,
    decaySeconds = 0,
    tremolo = 0,
  ] = params;
  const PI2 = Math.PI * 2;
  const sign = (v: number) => (v < 0 ? -1 : 1);
  let slide = (baseSlide * 500 * PI2) / sampleRate / sampleRate;
  const startSlide = slide;
  let frequency = (baseFrequency * (1 + randomness * 2 * random() - randomness) * PI2) / sampleRate;
  let startFrequency = frequency;
  const attack = attackSeconds * sampleRate + 9;
  const decay = decaySeconds * sampleRate;
  const sustain = sustainSeconds * sampleRate;
  const release = releaseSeconds * sampleRate;
  const delay = delaySeconds * sampleRate;
  const deltaSlide = (baseDeltaSlide * 500 * PI2) / sampleRate ** 3;
  const modulation = (modulationHz * PI2) / sampleRate;
  const pitchJump = (pitchJumpHz * PI2) / sampleRate;
  const pitchJumpTime = pitchJumpSeconds * sampleRate;
  const repeat = (repeatTime * sampleRate) | 0;
  const length = (attack + decay + sustain + release + delay) | 0;
  const out: number[] = [];
  let t = 0;
  let tm = 0;
  let j = 1;
  let r = 0;
  let c = 0;
  let s = 0;
  const crush = (bitCrush * 100) | 0;
  for (let i = 0; i < length; out[i++] = s) {
    if (!(++c % (crush || 1)) || !crush) {
      s = shape
        ? shape > 1
          ? shape > 2
            ? shape > 3
              ? Math.sin((t % PI2) ** 3)
              : Math.max(Math.min(Math.tan(t), 1), -1)
            : 1 - (((((2 * t) / PI2) % 2) + 2) % 2)
          : 1 - 4 * Math.abs(Math.round(t / PI2) - t / PI2)
        : Math.sin(t);
      const envelope =
        i < attack
          ? i / attack
          : i < attack + decay
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
            : i < attack + decay + sustain
              ? sustainVolume
              : i < length - delay
                ? ((length - i - delay) / release) * sustainVolume
                : 0;
      s =
        (repeat ? 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeat) : 1) *
        sign(s) *
        Math.abs(s) ** shapeCurve *
        volume *
        MASTER *
        envelope;
      if (delay)
        s =
          s / 2 +
          (delay > i
            ? 0
            : ((i < length - delay ? 1 : (length - i) / delay) * out[(i - delay) | 0]!) / 2);
    }
    const f = (frequency += slide += deltaSlide) * Math.cos(modulation * tm++);
    t += f - f * noise * (1 - (((Math.sin(i) + 1) * 1e9) % 2));
    if (j && ++j > pitchJumpTime) {
      frequency += pitchJump;
      startFrequency += pitchJump;
      j = 0;
    }
    if (repeat && !(++r % repeat)) {
      frequency = startFrequency;
      slide = startSlide;
      j = j || 1;
    }
  }
  return out;
}
