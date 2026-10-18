import { JUICE_TUNING, type PresetName } from "../../tuning/juice";
import type { JuiceSettings } from "./settings";

/**
 * One pooled particle array (H §2.7): struct-of-arrays, no engine. Cosmetic
 * only, so it may use its own RNG.
 */
export function createParticlePool(settings: () => JuiceSettings, rng: () => number = Math.random) {
  const capacity = JUICE_TUNING.particleCapacity;
  const x = new Float32Array(capacity);
  const y = new Float32Array(capacity);
  const vx = new Float32Array(capacity);
  const vy = new Float32Array(capacity);
  const life = new Float32Array(capacity);
  const maxLife = new Float32Array(capacity);
  const size = new Float32Array(capacity);
  const gravity = new Float32Array(capacity);
  const drag = new Float32Array(capacity);
  const color: string[] = new Array<string>(capacity).fill("");
  const additive = new Uint8Array(capacity);
  let count = 0;
  const between = ([lo, hi]: readonly [number, number]) => lo + rng() * (hi - lo);

  return {
    alive: () => count,
    /** Emits a preset's burst at a point; over 80% full it emits half, unless it is loot. */
    emit(
      name: PresetName,
      px: number,
      py: number,
      options: { loot?: boolean; scale?: number } = {},
    ) {
      const preset = JUICE_TUNING.presets[name];
      const s = settings();
      let n = Math.floor(preset.count * (options.scale ?? 1) * s.juice);
      if (!options.loot && count > capacity * JUICE_TUNING.particleBudget) n = Math.floor(n / 2);
      for (let i = 0; i < n && count < capacity; i++, count++) {
        const angle = (between(preset.angle) * Math.PI) / 180;
        const speed = between(preset.speed);
        x[count] = px;
        y[count] = py;
        vx[count] = Math.cos(angle) * speed;
        vy[count] = Math.sin(angle) * speed;
        maxLife[count] = life[count] = between(preset.life) / 1000;
        size[count] = Math.round(between(preset.size));
        gravity[count] = "gravity" in preset ? preset.gravity : 0;
        drag[count] = "drag" in preset ? preset.drag : 0;
        const colors = preset.color;
        color[count] =
          typeof colors === "string" ? colors : colors[Math.floor(rng() * colors.length)]!;
        additive[count] = "blend" in preset ? 1 : 0;
      }
    },
    /** Integrates and retires particles; `dt` in seconds. */
    update(dt: number) {
      for (let i = 0; i < count;) {
        life[i]! -= dt;
        if (life[i]! <= 0) {
          count--;
          x[i] = x[count]!;
          y[i] = y[count]!;
          vx[i] = vx[count]!;
          vy[i] = vy[count]!;
          life[i] = life[count]!;
          maxLife[i] = maxLife[count]!;
          size[i] = size[count]!;
          gravity[i] = gravity[count]!;
          drag[i] = drag[count]!;
          color[i] = color[count]!;
          additive[i] = additive[count]!;
          continue;
        }
        const damping = Math.max(0, 1 - drag[i]! * dt);
        vx[i]! *= damping;
        vy[i] = vy[i]! * damping + gravity[i]! * dt;
        x[i]! += vx[i]! * dt;
        y[i]! += vy[i]! * dt;
        i++;
      }
    },
    /** Draws every particle as a pixel-snapped square, additive where the preset says. */
    draw(ctx: CanvasRenderingContext2D) {
      for (let i = 0; i < count; i++) {
        ctx.globalCompositeOperation = additive[i] ? "lighter" : "source-over";
        ctx.globalAlpha = Math.max(0, life[i]! / maxLife[i]!);
        ctx.fillStyle = color[i]!;
        ctx.fillRect(Math.round(x[i]!), Math.round(y[i]!), size[i]!, size[i]!);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}
