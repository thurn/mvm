import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { CHANGES, CREDITS, LPC_LINE } from "../../src/assets/credits";
import { placeholderManifest } from "../../src/assets/manifest";
import { MUSIC } from "../../src/assets/music";
import { RECIPES } from "../../src/assets/recipes";
import { SHEET_FORMAT } from "../../src/assets/sheet-format";
import { SOUNDS } from "../../src/assets/sounds";
import { GRASSLAND_TILES } from "../../src/assets/tiles";
import { pack } from "./atlas";
import { authorListing } from "./credits";
import { bake, expandPattern } from "./bake";
import { blank, drawFrameCentred, readPng, recolor } from "./image";
import { UlpcLibrary } from "./ulpc";

// The library tests run only when `npm run test:assets` names the libraries: CI never touches
// them, and probing ~/Documents from a sandboxed runner can block on a privacy prompt.
const LPC = process.env.MVM_LPC_DIR ?? "";
const AUDIO = process.env.MVM_AUDIO_DIR ?? "";
const hasLibraries =
  LPC !== "" && AUDIO !== "" && existsSync(join(LPC, "ulpc-generator")) && existsSync(AUDIO);
const scratch = () => mkdtempSync(join(tmpdir(), "mvm-assets-"));

describe("placeholder manifest (P20)", () => {
  test("covers every recipe, tile, sound and music id", () => {
    const manifest = placeholderManifest();
    expect(manifest.placeholder).toBe(true);
    expect(Object.keys(manifest.sprites).sort()).toEqual(RECIPES.map((r) => r.id).sort());
    expect(Object.keys(manifest.tiles).sort()).toEqual(Object.keys(GRASSLAND_TILES).sort());
    expect(Object.keys(manifest.sounds).sort()).toEqual(Object.keys(SOUNDS).sort());
    expect(Object.keys(manifest.music).sort()).toEqual(Object.keys(MUSIC).sort());
  });

  test("a bake without the libraries writes it", async () => {
    const outDir = scratch();
    const result = await bake({
      lpcDir: join(outDir, "no-lpc"),
      audioDir: join(outDir, "no-audio"),
      outDir,
      codeFiles: [],
    });
    expect(result.warnings.slice(0, 2)).toEqual([
      expect.stringContaining("no LPC library"),
      expect.stringContaining("no audio library"),
    ]);
    expect(JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8"))).toEqual(
      placeholderManifest(),
    );
  });
});

describe("credits (G §8.2)", () => {
  test("every credited file names a licence or credit text", () => {
    expect(LPC_LINE).toContain("Liberated Pixel Cup");
    expect(CHANGES).toContain("composited");
    expect(CREDITS.length).toBeGreaterThan(0);
    for (const credit of CREDITS)
      expect(credit.licenses.length > 0 || Boolean(credit.text), credit.file).toBe(true);
  });
});

describe("image helpers", () => {
  test("recolour swaps a ramp within ±1 per channel and leaves other colours", () => {
    const image = blank(3, 1);
    image.data.set([10, 20, 30, 255, 11, 21, 31, 255, 99, 99, 99, 255]);
    const out = recolor(image, ["#0a141e"], ["#ff0000"]);
    expect([...out.data]).toEqual([255, 0, 0, 255, 255, 0, 0, 255, 99, 99, 99, 255]);
  });

  test("a 64 px frame is centred in a 128 px custom frame (G §2.3)", () => {
    const src = blank(64, 64);
    src.data.set([1, 2, 3, 255], 0);
    const dest = blank(128, 128);
    drawFrameCentred(dest, 0, 0, 128, src, 0, 0, 64);
    expect(dest.data[(32 * 128 + 32) * 4 + 3]).toBe(255);
  });

  test("packing never overlaps", () => {
    const sizes = [
      [128, 64],
      [576, 64],
      [1152, 128],
      [32, 32],
      [64, 96],
    ];
    const { placed } = pack(
      new Map(sizes.map(([w = 0, h = 0], i) => [`k${i}`, blank(w, h)])),
      1200,
    );
    const boxes = [...placed.values()];
    for (const a of boxes)
      for (const b of boxes)
        if (a !== b)
          expect(
            a.x + a.image.width <= b.x ||
              b.x + b.image.width <= a.x ||
              a.y + a.image.height <= b.y ||
              b.y + b.image.height <= a.y,
          ).toBe(true);
  });

  test("a # pattern expands to the numbered files in natural order", () => {
    const dir = scratch();
    for (const name of ["hit_2.ogg", "hit_10.ogg", "hit_1.ogg", "other.ogg"])
      writeFileSync(join(dir, name), "");
    expect(expandPattern(dir, "./hit_#.ogg")).toEqual([
      "./hit_1.ogg",
      "./hit_2.ogg",
      "./hit_10.ogg",
    ]);
  });
});

describe.skipIf(!hasLibraries)("with the libraries", () => {
  test("each recipe resolves to existing layer paths", async () => {
    const lib = await UlpcLibrary.open(join(LPC, "ulpc-generator"));
    for (const recipe of RECIPES)
      for (const [state, animation] of Object.entries(recipe.animations)) {
        const layers = lib.layers(recipe, animation.anim);
        expect(layers.length, `${recipe.id} ${state}`).toBeGreaterThan(0);
        // Layers without a `hurt` sheet drop out of the death row (G §2.6).
        if (state === "death") continue;
        for (const layer of layers) expect(lib.exists(layer.path), layer.path).toBe(true);
      }
  });

  test("every sound and music pick names existing files", () => {
    for (const [soundId, source] of Object.entries(SOUNDS))
      for (const pattern of [...source.variants, ...("layers" in source ? source.layers : [])]) {
        const lpc = pattern.startsWith("lpc/");
        const found = lpc ? expandPattern(LPC, pattern.slice(4)) : expandPattern(AUDIO, pattern);
        expect(found.length, `${soundId}: ${pattern}`).toBeGreaterThan(0);
      }
    for (const path of Object.values(MUSIC)) {
      const lpc = path.startsWith("lpc/");
      expect(existsSync(lpc ? join(LPC, path.slice(4)) : join(AUDIO, path)), path).toBe(true);
    }
  });

  test("tiles lie inside their source sheets", () => {
    for (const [tileId, tile] of Object.entries(GRASSLAND_TILES)) {
      const sheet = readPng(join(LPC, tile.file));
      for (const [x, y] of tile.frames) {
        expect(x + tile.width, tileId).toBeLessThanOrEqual(sheet.width);
        expect(y + tile.height, tileId).toBeLessThanOrEqual(sheet.height);
      }
    }
  });

  test("the frame manifest matches the G §2.1 sheet format, and a rerun skips", async () => {
    const outDir = scratch();
    const options = { lpcDir: LPC, audioDir: AUDIO, outDir, codeFiles: [] };
    const { manifest, skipped, warnings } = await bake(options);
    expect(skipped).toBe(false);
    expect(warnings.filter((w) => !w.includes("death"))).toEqual([]);
    const atlas = readPng(join(outDir, "atlas.png"));
    expect([atlas.width, atlas.height]).toEqual([manifest.atlas!.width, manifest.atlas!.height]);
    for (const recipe of RECIPES) {
      const animations = manifest.sprites[recipe.id]!.animations!;
      for (const [state, animation] of Object.entries(recipe.animations)) {
        const strip = animations[state as keyof typeof animations]!;
        const format = SHEET_FORMAT[animation.anim]!;
        expect([strip.frameSize, strip.frames], `${recipe.id} ${state}`).toEqual([
          format.frameSize,
          format.frames,
        ]);
        expect(strip.x + strip.frameSize * strip.frames).toBeLessThanOrEqual(atlas.width);
        expect(strip.y + strip.frameSize).toBeLessThanOrEqual(atlas.height);
      }
    }
    expect((await bake(options)).skipped).toBe(true);
  }, 30_000);
});

describe("credit rules (1.39)", () => {
  test("an AUTHORS listing credits the person whose list names the file, not the whole file", () => {
    const text = [
      "Code authors",
      "============",
      "",
      "This program was written by the following people:",
      " - Someone Else",
      "",
      "Lanea Zimmerman",
      " - grass.png",
      " ",
      "Severin Ibarluzea",
      " - bump.ogg",
      " - shoot.ogg",
    ].join("\n");
    expect(authorListing(text, "shoot.ogg")).toBe("Severin Ibarluzea");
    expect(authorListing(text, "grass.png")).toBe("Lanea Zimmerman");
    expect(authorListing(text, "missing.ogg")).toBeNull();
  });

  test("no committed credit is a raw multi-section dump", () => {
    for (const credit of CREDITS) expect(credit.text ?? "").not.toMatch(/={4,}/);
  });
});
