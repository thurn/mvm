import { currencies } from "../../data";

/** One currency orb (H §4.3): base colour, glyph, silhouette and an optional feature. */
interface OrbRecipe {
  color: string;
  glyph:
    | "swirl"
    | "plus"
    | "crown"
    | "rays"
    | "spiral"
    | "liquid"
    | "ring"
    | "star"
    | "eye"
    | "dots"
    | "facets";
  glyphColor: string;
  shape?: "disc" | "prism" | "shard";
  /** Disc diameter in px (Jeweller's step 20 / 24 / 28). */
  size?: number;
  dots?: number;
  rim?: string;
  halo?: string;
  irregular?: boolean;
}

const BLUE = "#4A7BD8";
const GOLD = "#E8C15A";

/** The M1 currencies' recipes, by PoE2 id suffix (H §4.3). */
const ORB_RECIPES: Readonly<Record<string, OrbRecipe>> = {
  CurrencyUpgradeToMagic: { color: BLUE, glyph: "swirl", glyphColor: "#FFFFFF" },
  CurrencyAddModToMagic: { color: BLUE, glyph: "plus", glyphColor: "#FFFFFF" },
  CurrencyUpgradeMagicToRare: { color: "#2A3FA0", glyph: "crown", glyphColor: GOLD, rim: GOLD },
  CurrencyAddModToRare: { color: "#D8D8E8", glyph: "rays", glyphColor: GOLD, rim: GOLD },
  CurrencyRerollRare: { color: "#D9A53A", glyph: "spiral", glyphColor: "#C02020", irregular: true },
  CurrencyUpgradeToRare: { color: GOLD, glyph: "liquid", glyphColor: "#FFFFFF" },
  CurrencyRemoveMod: { color: "#3A3A48", glyph: "ring", glyphColor: "#C8C8D8" },
  CurrencyModValues: { color: "#FFF2C0", glyph: "star", glyphColor: "#FFFFFF", halo: "#FFD24A" },
  CurrencyCorrupt: { color: "#A01818", glyph: "eye", glyphColor: "#000000" },
  CurrencyAddSkillGemSocket3: {
    color: "#1BA29B",
    glyph: "dots",
    glyphColor: "#FFFFFF",
    dots: 1,
    size: 20,
  },
  CurrencyAddSkillGemSocket4: {
    color: "#1BA29B",
    glyph: "dots",
    glyphColor: "#FFFFFF",
    dots: 2,
    size: 24,
  },
  CurrencyAddSkillGemSocket5: {
    color: "#1BA29B",
    glyph: "dots",
    glyphColor: "#FFFFFF",
    dots: 3,
    size: 28,
  },
  CurrencyGemQuality: { color: "#C8F0FF", glyph: "facets", glyphColor: "#4A90B0", shape: "prism" },
  CurrencyUpgradeToMagicShard: {
    color: BLUE,
    glyph: "swirl",
    glyphColor: "#FFFFFF",
    shape: "shard",
  },
  CurrencyUpgradeMagicToRareShard: {
    color: "#2A3FA0",
    glyph: "crown",
    glyphColor: GOLD,
    shape: "shard",
  },
};

const ORB_SIZE = 32;

const suffix = (currencyId: string) => currencyId.split("/").pop() ?? currencyId;

/** Lightens (+) or darkens (−) a hex colour by `amount` (−1…1). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (c: number) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))
      .toString(16)
      .padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

function body(ctx: CanvasRenderingContext2D, r: OrbRecipe, cx: number, cy: number, radius: number) {
  ctx.beginPath();
  if (r.shape === "prism") {
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx + radius, cy + radius * 0.8);
    ctx.lineTo(cx - radius, cy + radius * 0.8);
    ctx.closePath();
  } else if (r.shape === "shard") {
    const points: [number, number][] = [
      [0, -1],
      [0.6, -0.3],
      [0.8, 0.5],
      [0.1, 1],
      [-0.7, 0.6],
      [-0.5, -0.5],
    ];
    points.forEach(([px, py], i) =>
      i === 0
        ? ctx.moveTo(cx + px * radius, cy + py * radius)
        : ctx.lineTo(cx + px * radius, cy + py * radius),
    );
    ctx.closePath();
  } else if (r.irregular) {
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = radius * (i % 2 ? 0.93 : 1);
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
  } else ctx.arc(cx, cy, radius, 0, Math.PI * 2);
}

function glyph(ctx: CanvasRenderingContext2D, r: OrbRecipe, cx: number, cy: number) {
  ctx.fillStyle = r.glyphColor;
  ctx.strokeStyle = r.glyphColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  switch (r.glyph) {
    case "plus":
      ctx.fillRect(cx - 5, cy - 1, 10, 2);
      ctx.fillRect(cx - 1, cy - 5, 2, 10);
      return;
    case "swirl":
    case "spiral":
      for (let i = 0; i <= 20; i++) {
        const a = i * 0.55;
        const rr = 1 + i * 0.25;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.stroke();
      return;
    case "crown":
      ctx.moveTo(cx - 6, cy + 3);
      ctx.lineTo(cx - 6, cy - 3);
      ctx.lineTo(cx - 3, cy);
      ctx.lineTo(cx, cy - 5);
      ctx.lineTo(cx + 3, cy);
      ctx.lineTo(cx + 6, cy - 3);
      ctx.lineTo(cx + 6, cy + 3);
      ctx.closePath();
      ctx.fill();
      return;
    case "rays":
    case "star":
      for (let i = 0; i < (r.glyph === "star" ? 8 : 6); i++) {
        const a = (i / (r.glyph === "star" ? 8 : 6)) * Math.PI * 2;
        const len = r.glyph === "star" && i % 2 ? 3 : 6;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      }
      ctx.stroke();
      return;
    case "liquid":
      ctx.moveTo(cx - 6, cy + 1);
      for (let x = -6; x <= 6; x += 2) ctx.lineTo(cx + x, cy + 1 + (x % 4 === 0 ? -2 : 1));
      ctx.stroke();
      return;
    case "ring":
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.stroke();
      return;
    case "eye":
      ctx.ellipse(cx, cy, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#C02020";
      ctx.fillRect(cx - 1, cy - 2, 2, 4);
      return;
    case "dots": {
      const n = r.dots ?? 1;
      for (let i = 0; i < n; i++) ctx.fillRect(cx - (n - 1) * 3 + i * 6 - 1.5, cy - 1.5, 3, 3);
      return;
    }
    case "facets":
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx, cy + 4);
      ctx.moveTo(cx - 5, cy + 4);
      ctx.lineTo(cx, cy - 1);
      ctx.lineTo(cx + 5, cy + 4);
      ctx.stroke();
      return;
  }
}

/** Draws one currency orb into a 32×32 cell at (x, y) (H §4.3 recipe). */
export function drawOrb(
  ctx: CanvasRenderingContext2D,
  currencyId: string,
  x: number,
  y: number,
): void {
  const r = ORB_RECIPES[suffix(currencyId)];
  if (!r) throw new Error(`no orb recipe for ${currencyId}`);
  const cx = x + ORB_SIZE / 2;
  const cy = y + ORB_SIZE / 2;
  const radius = (r.size ?? 24) / 2;
  if (r.halo) {
    ctx.fillStyle = r.halo;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 1 px dark outline, then 4-step cel shading: dark rim, base, light, specular.
  ctx.fillStyle = "#101014";
  body(ctx, r, cx, cy, radius + 1);
  ctx.fill();
  ctx.fillStyle = r.rim ?? shade(r.color, -0.45);
  body(ctx, r, cx, cy, radius);
  ctx.fill();
  ctx.fillStyle = r.color;
  body(ctx, r, cx - 0.5, cy - 0.5, radius - 2);
  ctx.fill();
  ctx.fillStyle = shade(r.color, 0.35);
  ctx.beginPath();
  ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(Math.round(cx - radius * 0.55), Math.round(cy - radius * 0.6), 3, 3);
  glyph(ctx, r, cx, cy);
}

/** Every M1 currency's orb drawn once into a sheet, with each cell's position (H §4.3). */
export function buildOrbAtlas(
  createCanvas: (w: number, h: number) => HTMLCanvasElement | null = (w, h) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  },
): { canvas: HTMLCanvasElement | null; cells: Map<string, { x: number; y: number }> } {
  const ids = currencies()
    .map((c) => c.id as string)
    .filter((cid) => ORB_RECIPES[suffix(cid)]);
  const cells = new Map(ids.map((cid, i) => [cid, { x: i * ORB_SIZE, y: 0 }] as const));
  const canvas = createCanvas(ids.length * ORB_SIZE, ORB_SIZE);
  const ctx = canvas?.getContext("2d");
  if (canvas && ctx) for (const [cid, cell] of cells) drawOrb(ctx, cid, cell.x, cell.y);
  return { canvas: ctx ? canvas : null, cells };
}
