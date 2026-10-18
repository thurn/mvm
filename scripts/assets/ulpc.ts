import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SHEET_FORMAT, FACING_ROW, type SheetFormat } from "../../src/assets/sheet-format";
import type { RecipeLayer, SpriteAnimation, SpriteRecipe } from "../../src/assets/recipes/types";
import { blank, drawFrameCentred, drawOver, readPng, recolor, type Image } from "./image";

/** A custom animation from `ulpc-generator/sources/custom-animations.ts` (G §2.3). */
interface CustomAnimation {
  frameSize: number;
  frames: string[][];
  sourceSingleAnimation?: boolean;
}

interface DefLayer {
  zPos?: number;
  custom_animation?: string;
  [body: string]: unknown;
}

interface RecolorSpec {
  material: string;
  base?: string;
  palettes?: string[];
}

interface SheetDefinition {
  variants?: string[];
  animations?: string[];
  recolors?: RecolorSpec | { color_1: RecolorSpec };
  [key: string]: unknown;
}

/** One source PNG a strip draws, in z order. */
export interface ResolvedLayer {
  path: string;
  zPos: number;
  /** Set when this layer is drawn in the custom animation's own layout. */
  custom: boolean;
  ramp?: { from: string[]; to: string[] };
}

const DIRECTION_ROW: Record<string, number> = { n: 0, w: 1, s: 2, e: 3 };

/** The ULPC generator checkout: definitions, palettes, custom animations and sprite sheets. */
export class UlpcLibrary {
  private readonly defs = new Map<string, SheetDefinition>();
  private readonly images = new Map<string, Image>();

  private constructor(
    readonly root: string,
    readonly customAnimations: Record<string, CustomAnimation>,
  ) {}

  static async open(root: string): Promise<UlpcLibrary> {
    return Promise.resolve(new UlpcLibrary(root, readCustomAnimations(root)));
  }

  definition(def: string): SheetDefinition {
    let found = this.defs.get(def);
    if (!found) {
      found = JSON.parse(readFileSync(join(this.root, "sheet_definitions", def), "utf8"));
      this.defs.set(def, found!);
    }
    return found!;
  }

  exists(path: string): boolean {
    return existsSync(join(this.root, path));
  }

  image(path: string): Image {
    let found = this.images.get(path);
    if (!found) {
      found = readPng(join(this.root, path));
      this.images.set(path, found);
    }
    return found;
  }

  /** The frame grid of a standard or custom animation. */
  format(anim: string): SheetFormat {
    const custom = this.customAnimations[anim];
    if (custom) return { frameSize: custom.frameSize, frames: custom.frames[0]!.length, rows: 4 };
    const format = SHEET_FORMAT[anim];
    if (!format) throw new Error(`unknown ULPC animation ${anim}`);
    return format;
  }

  private ramp(material: string, name: string, palettes: readonly string[]): string[] | undefined {
    const [prefix, rampName] = name.includes(".")
      ? (name.split(".") as [string, string])
      : [undefined, name];
    for (const palette of prefix ? [prefix, ...palettes] : palettes) {
      const [paletteMaterial, version] = palette.includes(".")
        ? (palette.split(".") as [string, string])
        : [material, palette];
      const file = join(
        this.root,
        "palette_definitions",
        paletteMaterial,
        `${paletteMaterial}_${version}.json`,
      );
      if (!existsSync(file)) continue;
      const ramps = JSON.parse(readFileSync(file, "utf8")) as Record<string, string[]>;
      if (ramps[rampName]) return ramps[rampName];
    }
    return undefined;
  }

  private recolorRamps(spec: RecolorSpec, color: string): { from: string[]; to: string[] } {
    const palettes = spec.palettes ?? ["ulpc"];
    const meta = JSON.parse(
      readFileSync(
        join(this.root, "palette_definitions", spec.material, `meta_${spec.material}.json`),
        "utf8",
      ),
    ) as { base: string; default?: string };
    const baseName = spec.base ?? meta.base;
    const from = this.ramp(spec.material, baseName, [meta.default ?? "ulpc", ...palettes]);
    const to = this.ramp(spec.material, color, palettes);
    if (!from) throw new Error(`no base ramp ${baseName} for ${spec.material}`);
    if (!to) throw new Error(`no ramp ${color} for ${spec.material}`);
    return { from, to };
  }

  /** The source PNGs a recipe layer contributes to `anim`, per the generator's path rule (G §2.5). */
  resolve(recipe: SpriteRecipe, layer: RecipeLayer, anim: string): ResolvedLayer[] {
    const def = this.definition(layer.def);
    const custom = this.customAnimations[anim];
    const baseAnim = custom ? custom.frames[0]![0]!.split(",")[0]!.split("-")[0]! : anim;
    const variant = pickVariant(def, layer.color);
    const recolors =
      def.recolors && "color_1" in def.recolors ? def.recolors.color_1 : def.recolors;
    const ramp =
      !variant && recolors && layer.color && layer.color !== "default"
        ? this.recolorRamps(recolors, layer.color)
        : undefined;
    const fileName = variant ? `/${variant.replaceAll(" ", "_")}` : "";
    const layers: ResolvedLayer[] = [];
    for (const [key, value] of Object.entries(def)) {
      if (!/^layer_\d+$/.test(key)) continue;
      const defLayer = value as DefLayer;
      const basePath = defLayer[recipe.body];
      if (typeof basePath !== "string") continue;
      const zPos = defLayer.zPos ?? 0;
      if (defLayer.custom_animation) {
        if (defLayer.custom_animation !== anim) continue;
        const name = variant ? variant.replaceAll(" ", "_") : "";
        const path = `spritesheets/${basePath}${name}.png`.replace(/\/\.png$/, ".png");
        layers.push({ path, zPos, custom: true, ramp });
        continue;
      }
      if (def.animations && !def.animations.includes(baseAnim)) continue;
      layers.push({
        path: `spritesheets/${basePath}${baseAnim}${fileName}.png`,
        zPos,
        custom: false,
        ramp,
      });
    }
    return layers;
  }

  /** Every source layer of a recipe's animation, sorted by z (stable in recipe order). */
  layers(recipe: SpriteRecipe, anim: string): ResolvedLayer[] {
    return recipe.layers
      .flatMap((layer) => this.resolve(recipe, layer, anim))
      .map((layer, order) => ({ layer, order }))
      .sort((a, b) => a.layer.zPos - b.layer.zPos || a.order - b.order)
      .map(({ layer }) => layer);
  }

  /**
   * Composites one animation's row (the recipe's facing, or the single `hurt` row) into a strip.
   * Layers whose file is missing are skipped and reported as gaps.
   */
  strip(
    recipe: SpriteRecipe,
    animation: SpriteAnimation,
  ): { image: Image; format: SheetFormat; sources: string[]; gaps: string[] } {
    const format = this.format(animation.anim);
    const row = format.rows === 1 ? 0 : FACING_ROW[recipe.facing];
    const size = format.frameSize;
    const image = blank(size * format.frames, size);
    const custom = this.customAnimations[animation.anim];
    const sources: string[] = [];
    const gaps: string[] = [];
    for (const layer of this.layers(recipe, animation.anim)) {
      if (!this.exists(layer.path)) {
        gaps.push(layer.path);
        continue;
      }
      sources.push(layer.path);
      const raw = this.image(layer.path);
      const src = layer.ramp ? recolor(raw, layer.ramp.from, layer.ramp.to) : raw;
      if (!custom || (layer.custom && !custom.sourceSingleAnimation)) {
        drawOver(image, 0, 0, src, 0, row * size, size * format.frames, size);
        continue;
      }
      // Frames remapped from a 4-row sheet and centred (the generator's draw-frames.ts).
      const srcSize = layer.custom ? Math.round(src.height / 4) : 64;
      custom.frames[row]!.forEach((spec, column) => {
        const [rowName = "", frame] = spec.split(",");
        const srcRow = DIRECTION_ROW[rowName.split("-")[1] ?? ""] ?? 0;
        drawFrameCentred(
          image,
          column * size,
          0,
          size,
          src,
          Number(frame) * srcSize,
          srcRow * srcSize,
          srcSize,
        );
      });
    }
    return { image, format, sources, gaps };
  }
}

function pickVariant(def: SheetDefinition, color: string | undefined): string | undefined {
  if (!def.variants) return undefined;
  if (color && def.variants.includes(color)) return color;
  if (def.recolors && color) return undefined;
  return color ?? def.variants[0];
}

/**
 * The generator's custom-animation table, copied exactly (G §2.3). Its object literal is plain
 * data, so it is evaluated without compiling the generator's TypeScript.
 */
function readCustomAnimations(root: string): Record<string, CustomAnimation> {
  const source = readFileSync(join(root, "sources/custom-animations.ts"), "utf8");
  const match = /const customAnimations[^=]*=\s*(\{[\s\S]*?\n\});/.exec(source);
  if (!match) throw new Error("customAnimations not found in custom-animations.ts");
  return new Function(`return (${match[1]});`)() as Record<string, CustomAnimation>;
}
