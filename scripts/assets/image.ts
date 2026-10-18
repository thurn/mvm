import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

/** A straight-alpha RGBA image. */
export interface Image {
  width: number;
  height: number;
  data: Uint8Array;
}

export function blank(width: number, height: number): Image {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

export function readPng(path: string): Image {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

export function writePng(path: string, image: Image): void {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = Buffer.from(image.data);
  writeFileSync(path, PNG.sync.write(png));
}

/**
 * Draws a `size`×`size` region of `src` at (sx, sy) over `dest` at (dx, dy), source-over.
 * Pixels outside either image are skipped.
 */
export function drawOver(
  dest: Image,
  dx: number,
  dy: number,
  src: Image,
  sx: number,
  sy: number,
  width: number,
  height: number,
): void {
  for (let y = 0; y < height; y++) {
    const srcY = sy + y;
    const destY = dy + y;
    if (srcY < 0 || srcY >= src.height || destY < 0 || destY >= dest.height) continue;
    for (let x = 0; x < width; x++) {
      const srcX = sx + x;
      const destX = dx + x;
      if (srcX < 0 || srcX >= src.width || destX < 0 || destX >= dest.width) continue;
      const s = (srcY * src.width + srcX) * 4;
      const alpha = src.data[s + 3]! / 255;
      if (alpha === 0) continue;
      const d = (destY * dest.width + destX) * 4;
      const destAlpha = dest.data[d + 3]! / 255;
      const outAlpha = alpha + destAlpha * (1 - alpha);
      for (let c = 0; c < 3; c++) {
        const value =
          (src.data[s + c]! * alpha + dest.data[d + c]! * destAlpha * (1 - alpha)) / outAlpha;
        dest.data[d + c] = Math.round(value);
      }
      dest.data[d + 3] = Math.round(outAlpha * 255);
    }
  }
}

/** Draws a square source frame centred in a (possibly larger) destination frame. */
export function drawFrameCentred(
  dest: Image,
  destX: number,
  destY: number,
  destSize: number,
  src: Image,
  srcX: number,
  srcY: number,
  srcSize: number,
): void {
  const offset = Math.floor((destSize - srcSize) / 2);
  drawOver(dest, destX + offset, destY + offset, src, srcX, srcY, srcSize, srcSize);
}

/** Exact colour swaps from one ramp to another, matched within ±1 per channel (G §2.5). */
export function recolor(image: Image, from: readonly string[], to: readonly string[]): Image {
  const source = from.map(rgb);
  const target = to.map(rgb);
  const out = { ...image, data: new Uint8Array(image.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] === 0) continue;
    const index = source.findIndex(
      (color) =>
        Math.abs(color[0] - out.data[i]!) <= 1 &&
        Math.abs(color[1] - out.data[i + 1]!) <= 1 &&
        Math.abs(color[2] - out.data[i + 2]!) <= 1,
    );
    if (index < 0 || !target[index]) continue;
    out.data.set(target[index], i);
  }
  return out;
}

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
