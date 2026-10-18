import { MANIFEST_URL, placeholderManifest, type AssetManifest } from "../../assets/manifest";
import { SPRITE_TUNING } from "../../tuning/sprites";
import { AILMENT_JUICE } from "../../tuning/juice";

export interface SpriteAssets {
  manifest: AssetManifest;
  /** Null without the baked atlas: every actor draws as a capsule. */
  atlas: CanvasImageSource | null;
  /** The atlas as flat-colour silhouettes, for the hit flash and rarity outlines. */
  silhouettes: Map<string, CanvasImageSource>;
}

const PLACEHOLDER: SpriteAssets = {
  manifest: placeholderManifest(),
  atlas: null,
  silhouettes: new Map(),
};

function silhouette(atlas: HTMLImageElement, color: string): CanvasImageSource | null {
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(atlas, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

async function load(): Promise<SpriteAssets> {
  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) return PLACEHOLDER;
    const manifest = (await response.json()) as AssetManifest;
    if (!manifest.atlas) return { ...PLACEHOLDER, manifest };
    const atlas = new Image();
    atlas.src = manifest.atlas.url;
    await atlas.decode();
    const silhouettes = new Map<string, CanvasImageSource>();
    const ailmentColors = Object.values(AILMENT_JUICE.tints).map((t) => t.color);
    for (const color of ["#ffffff", ...Object.values(SPRITE_TUNING.outline), ...ailmentColors]) {
      const tinted = silhouette(atlas, color);
      if (tinted) silhouettes.set(color, tinted);
    }
    return { manifest, atlas, silhouettes };
  } catch {
    // No baked assets (npm run assets never ran, or a test DOM): placeholders (P20).
    return PLACEHOLDER;
  }
}

let loading: Promise<SpriteAssets> | null = null;

/** The baked atlas and manifest, loaded once; placeholders when they are absent. */
export function loadSpriteAssets(): Promise<SpriteAssets> {
  loading ??= load();
  return loading;
}
