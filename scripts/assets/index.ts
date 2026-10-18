import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { bake } from "./bake";

// `npm run assets` (decision P20): bakes public/assets/ from ~/Documents/lpc and
// ~/Documents/game-audio, or writes a placeholder manifest without them.
const home = homedir();
const codeFiles = [
  ...readdirSync("scripts/assets")
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join("scripts/assets", name)),
  ...readdirSync("src/assets", { recursive: true, encoding: "utf8" })
    .filter((name) => name.endsWith(".ts") && name !== "credits.ts")
    .map((name) => join("src/assets", name)),
];
const result = await bake({
  lpcDir: process.env.MVM_LPC_DIR ?? join(home, "Documents/lpc"),
  audioDir: process.env.MVM_AUDIO_DIR ?? join(home, "Documents/game-audio"),
  outDir: "public/assets",
  creditsFile: "src/assets/credits.ts",
  codeFiles,
});
for (const warning of result.warnings) console.warn(`assets: ${warning}`);
console.log(
  result.skipped
    ? "assets: inputs unchanged, nothing to bake"
    : `assets: wrote public/assets/manifest.json${result.manifest.placeholder ? " (placeholders)" : ""}`,
);
