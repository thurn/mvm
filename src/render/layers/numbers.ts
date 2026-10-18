/**
 * A 5×7 pixel font for damage numbers and hit words (H §2.5, §12.4), drawn
 * with fillRect and a 1 px dark outline. Glyphs: digits, "!" and the letters
 * of IMMUNE, EVADE and BLOCK.
 */
const GLYPHS: Record<string, string[]> = {
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
};

const GLYPH_W = 5;
const GLYPH_H = 7;
const SPACING = 1;

/** The width in logical px of `text` at `scale`. */
function textWidth(text: string, scale: number): number {
  return text.length * (GLYPH_W + SPACING) * scale - SPACING * scale;
}

function drawGlyphs(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  px: number,
  ox: number,
  oy: number,
) {
  for (let i = 0; i < text.length; i++) {
    const glyph = GLYPHS[text[i]!];
    if (!glyph) continue;
    const gx = x + i * (GLYPH_W + SPACING) * px;
    for (let row = 0; row < GLYPH_H; row++)
      for (let col = 0; col < GLYPH_W; col++)
        if (glyph[row]![col] === "#")
          ctx.fillRect(
            Math.round((gx + col * px) * 2) / 2 + ox,
            Math.round((y + row * px) * 2) / 2 + oy,
            px,
            px,
          );
  }
}

/**
 * Draws `text` centred on (cx, baseline y) at `scale`, outlined. Glyph pixels
 * are `scale` logical px, so 1.0× numbers stay pixel-exact.
 */
export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  options: { color: string; outline: string; scale: number; alpha: number },
): void {
  // Snap glyph pixels to half a logical px: device pixels at the 2× render scale.
  const px = Math.max(0.5, Math.round(options.scale * 2) / 2);
  const x = Math.round(cx - textWidth(text, px) / 2);
  const top = Math.round(y - GLYPH_H * px);
  ctx.globalAlpha = options.alpha;
  ctx.fillStyle = options.outline;
  for (const [ox, oy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const)
    drawGlyphs(ctx, text, x, top, px, ox, oy);
  ctx.fillStyle = options.color;
  drawGlyphs(ctx, text, x, top, px, 0, 0);
  ctx.globalAlpha = 1;
}
