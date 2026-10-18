import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { format } from "prettier";
import { placeholderManifest, type AssetManifest, type Strip } from "../../src/assets/manifest";
import { MUSIC } from "../../src/assets/music";
import { RECIPES } from "../../src/assets/recipes";
import type { SpriteState } from "../../src/assets/recipes/types";
import { SOUNDS, type SoundId } from "../../src/assets/sounds";
import { GRASSLAND_TILES } from "../../src/assets/tiles";
import type { Credit } from "../../src/assets/credit";
import { pack } from "./atlas";
import { CreditResolver, creditsModule } from "./credits";
import { blank, drawOver, readPng, writePng, type Image } from "./image";
import { UlpcLibrary } from "./ulpc";

export interface BakeOptions {
  lpcDir: string;
  audioDir: string;
  outDir: string;
  /** The generated credits module; written only when both libraries are present. */
  creditsFile?: string;
  /** The code whose changes invalidate the bake (the committed inputs and this script). */
  codeFiles: readonly string[];
}

export interface BakeResult {
  manifest: AssetManifest;
  skipped: boolean;
  warnings: string[];
}

const naturalOrder = new Intl.Collator("en", { numeric: true }).compare;

/** Expands a `#` variant pattern (H §12.1) to the files it names, relative to `root`. */
export function expandPattern(root: string, pattern: string): string[] {
  const dir = dirname(pattern);
  const base = pattern.slice(dir.length + 1);
  const full = join(root, dir);
  if (!existsSync(full)) return [];
  if (!base.includes("#")) return existsSync(join(full, base)) ? [pattern] : [];
  const regex = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("#", "\\d+")}$`);
  return readdirSync(full)
    .filter((name) => regex.test(name))
    .sort(naturalOrder)
    .map((name) => `${dir}/${name}`);
}

/** Where an audio path lives on disk, and the name it is copied to. */
function audioSource(options: BakeOptions, path: string): { from: string; to: string } {
  const lpc = path.startsWith("lpc/");
  return {
    from: lpc ? join(options.lpcDir, path.slice(4)) : join(options.audioDir, path),
    to: path.replaceAll(" ", "_"),
  };
}

function expandAudio(
  options: BakeOptions,
  pattern: string,
  available: { lpc: boolean; audio: boolean },
) {
  const lpc = pattern.startsWith("lpc/");
  if (lpc ? !available.lpc : !available.audio) return [];
  if (lpc) return expandPattern(options.lpcDir, pattern.slice(4)).map((path) => `lpc/${path}`);
  return expandPattern(options.audioDir, pattern);
}

function hashFiles(files: Iterable<string>): string {
  const hash = createHash("sha256");
  for (const file of [...new Set(files)].sort()) {
    hash.update(file);
    hash.update(existsSync(file) ? readFileSync(file) : "missing");
  }
  return hash.digest("hex");
}

function writeIfChanged(path: string, contents: string | Buffer): void {
  if (existsSync(path) && readFileSync(path).equals(Buffer.from(contents))) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/** Bakes `public/assets/` from the libraries, or writes the placeholder manifest without them. */
export async function bake(options: BakeOptions): Promise<BakeResult> {
  const warnings: string[] = [];
  const available = {
    lpc: existsSync(join(options.lpcDir, "ulpc-generator")),
    audio: existsSync(options.audioDir),
  };
  const manifestPath = join(options.outDir, "manifest.json");
  const hashPath = join(options.outDir, ".inputs-hash");
  if (!available.lpc) warnings.push(`no LPC library at ${options.lpcDir}: placeholder art`);
  if (!available.audio) warnings.push(`no audio library at ${options.audioDir}: ZzFX sounds`);

  const lib = available.lpc ? await UlpcLibrary.open(join(options.lpcDir, "ulpc-generator")) : null;

  // Plan: every input file, so an unchanged set skips the bake.
  const inputs: string[] = [...options.codeFiles];
  if (lib) {
    for (const recipe of RECIPES) {
      for (const layer of recipe.layers)
        inputs.push(join(lib.root, "sheet_definitions", layer.def));
      for (const animation of Object.values(recipe.animations))
        for (const layer of lib.layers(recipe, animation.anim))
          inputs.push(join(lib.root, layer.path));
    }
    for (const tile of Object.values(GRASSLAND_TILES)) inputs.push(join(options.lpcDir, tile.file));
    // The palette ramps, the custom-animation table and the credits feed the bake too.
    inputs.push(join(lib.root, "sources/custom-animations.ts"), join(lib.root, "CREDITS.csv"));
    for (const material of readdirSync(join(lib.root, "palette_definitions"))) {
      const dir = join(lib.root, "palette_definitions", material);
      if (statSync(dir).isDirectory())
        for (const file of readdirSync(dir)) inputs.push(join(dir, file));
    }
  }
  const soundFiles = Object.fromEntries(
    Object.entries(SOUNDS).map(([soundId, source]) => [
      soundId,
      {
        variants: source.variants.flatMap((pattern) => expandAudio(options, pattern, available)),
        layers: ("layers" in source ? source.layers : []).flatMap((pattern) =>
          expandAudio(options, pattern, available),
        ),
      },
    ]),
  ) as Record<SoundId, { variants: string[]; layers: string[] }>;
  const musicFiles = Object.fromEntries(
    Object.entries(MUSIC).map(([musicId, path]) => [
      musicId,
      expandAudio(options, path, available)[0],
    ]),
  );
  for (const files of Object.values(soundFiles))
    for (const path of [...files.variants, ...files.layers])
      inputs.push(audioSource(options, path).from);
  for (const path of Object.values(musicFiles))
    if (path) inputs.push(audioSource(options, path).from);
  const inputHash = hashFiles(inputs);

  if (
    existsSync(manifestPath) &&
    (!options.creditsFile || existsSync(options.creditsFile)) &&
    existsSync(hashPath) &&
    readFileSync(hashPath, "utf8") === inputHash
  ) {
    return { manifest: JSON.parse(readFileSync(manifestPath, "utf8")), skipped: true, warnings };
  }

  const manifest = placeholderManifest();
  manifest.placeholder = !available.lpc && !available.audio;
  const credits: Credit[] = [];
  const resolver = new CreditResolver(options.lpcDir, options.audioDir);
  const credited = new Set<string>();
  const creditLpc = (file: string) => {
    if (credited.has(`lpc:${file}`)) return;
    credited.add(`lpc:${file}`);
    credits.push(resolver.lpc(file));
  };

  if (lib) {
    const images = new Map<string, Image>();
    const strips = new Map<string, Omit<Strip, "x" | "y">>();
    for (const recipe of RECIPES) {
      for (const [state, animation] of Object.entries(recipe.animations)) {
        const strip = lib.strip(recipe, animation);
        for (const gap of strip.gaps) warnings.push(`${recipe.id} ${state}: no ${gap}`);
        for (const source of strip.sources) creditLpc(`ulpc-generator/${source}`);
        const key = `sprite/${recipe.id}/${state}`;
        images.set(key, strip.image);
        strips.set(key, {
          frameSize: strip.format.frameSize,
          frames: strip.format.frames,
          ...(animation.release !== undefined ? { release: animation.release } : {}),
          ...(animation.loopFrom !== undefined ? { loopFrom: animation.loopFrom } : {}),
        });
      }
    }
    for (const [tileId, tile] of Object.entries(GRASSLAND_TILES)) {
      const sheet = readPng(join(options.lpcDir, tile.file));
      const image = blank(tile.width * tile.frames.length, tile.height);
      tile.frames.forEach(([x, y], index) =>
        drawOver(image, index * tile.width, 0, sheet, x, y, tile.width, tile.height),
      );
      images.set(`tile/${tileId}`, image);
      creditLpc(tile.file);
    }
    const { atlas, placed } = pack(images);
    mkdirSync(options.outDir, { recursive: true });
    writePng(join(options.outDir, "atlas.png"), atlas);
    manifest.atlas = { url: "/assets/atlas.png", width: atlas.width, height: atlas.height };
    for (const recipe of RECIPES) {
      const animations: Partial<Record<SpriteState, Strip>> = {};
      for (const state of Object.keys(recipe.animations) as SpriteState[]) {
        const key = `sprite/${recipe.id}/${state}`;
        const at = placed.get(key)!;
        animations[state] = { x: at.x, y: at.y, ...strips.get(key)! };
      }
      manifest.sprites[recipe.id]!.animations = animations;
    }
    for (const [tileId, tile] of Object.entries(GRASSLAND_TILES)) {
      const at = placed.get(`tile/${tileId}`)!;
      manifest.tiles[tileId]!.frames = tile.frames.map((_, index) => ({
        x: at.x + index * tile.width,
        y: at.y,
      }));
    }
  }

  const copyAudio = (path: string): string => {
    const { from, to } = audioSource(options, path);
    const dest = join(options.outDir, "audio", to);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(from, dest);
    if (path.startsWith("lpc/")) creditLpc(path.slice(4));
    else if (!credited.has(`audio:${path}`)) {
      credited.add(`audio:${path}`);
      credits.push(resolver.audio(path));
    }
    return `/assets/audio/${encodeURI(to)}`;
  };
  for (const [soundId, source] of Object.entries(SOUNDS) as [SoundId, (typeof SOUNDS)[SoundId]][]) {
    const files = soundFiles[soundId];
    if (available.audio && source.variants.length > 0 && files.variants.length === 0)
      warnings.push(`sound ${soundId}: no source files, ZzFX plays instead`);
    manifest.sounds[soundId] = {
      variants: files.variants.map(copyAudio),
      layers: files.layers.map(copyAudio),
    };
  }
  for (const [musicId, path] of Object.entries(musicFiles)) {
    if (!path && available.audio) warnings.push(`music ${musicId}: no source file`);
    manifest.music[musicId as keyof typeof MUSIC] = path ? copyAudio(path) : null;
  }

  writeIfChanged(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  if (options.creditsFile && available.lpc && available.audio) {
    const source = await format(creditsModule(credits), { parser: "typescript", printWidth: 100 });
    writeIfChanged(options.creditsFile, source);
  }
  // A placeholder bake is cheap; only a real bake records its input hash.
  if (available.lpc || available.audio) writeIfChanged(hashPath, inputHash);
  else rmSync(hashPath, { force: true });
  return { manifest, skipped: false, warnings };
}
