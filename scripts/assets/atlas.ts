import { blank, drawOver, type Image } from "./image";

export interface Placed {
  key: string;
  image: Image;
  x: number;
  y: number;
}

/** Shelf-packs images into one atlas, tallest first; keys break ties so output is stable. */
export function pack(
  images: ReadonlyMap<string, Image>,
  width = 2048,
): { atlas: Image; placed: Map<string, Placed> } {
  const items = [...images.entries()].sort(
    ([keyA, a], [keyB, b]) => b.height - a.height || b.width - a.width || keyA.localeCompare(keyB),
  );
  const placed = new Map<string, Placed>();
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const [key, image] of items) {
    if (image.width > width) throw new Error(`${key} is wider than the atlas`);
    if (x + image.width > width) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    placed.set(key, { key, image, x, y });
    x += image.width;
    shelf = Math.max(shelf, image.height);
  }
  const atlas = blank(width, y + shelf);
  for (const item of placed.values())
    drawOver(atlas, item.x, item.y, item.image, 0, 0, item.image.width, item.image.height);
  return { atlas, placed };
}
