/**
 * `npm run import:poe2`: fetches the PoE2 RePoE export at the pinned commit
 * into `.cache/repoe/` and writes the trimmed `data/` files (P19).
 * `npm run import:poe2 -- --check` re-imports into a temp directory and
 * fails if the result differs from the committed `data/`.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { trim, type DataFiles, type IdLists, type RepoeSource } from "./trim";

const root = resolve(import.meta.dirname, "../..");
const here = join(root, "scripts/import-poe2");
const cacheDir = join(root, ".cache/repoe");
const dataDir = join(root, "data");

interface Pin {
  repository: string;
  commit: string;
  maxItemLevel: number;
  maxGemLevel: number;
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const git = (...args: string[]) =>
  execFileSync("git", ["-C", cacheDir, ...args], { encoding: "utf8" }).trim();

/** Ensures `.cache/repoe` holds the pinned commit, fetching only that commit. */
function fetchPinned(pin: Pin): void {
  if (existsSync(join(cacheDir, ".git")) && git("rev-parse", "HEAD") === pin.commit) return;
  mkdirSync(cacheDir, { recursive: true });
  if (!existsSync(join(cacheDir, ".git"))) {
    git("init", "--quiet");
    git("remote", "add", "origin", pin.repository);
  }
  console.log(`Fetching ${pin.repository} at ${pin.commit}…`);
  git("fetch", "--quiet", "--depth", "1", "origin", pin.commit);
  git("checkout", "--quiet", "--force", "FETCH_HEAD");
}

function loadIds(): IdLists {
  const ids = (name: string) => readJson(join(here, "ids", `${name}.json`));
  return {
    heroes: ids("heroes") as string[],
    spells: ids("spells") as string[],
    supports: ids("supports") as string[],
    bases: ids("bases") as string[],
    mods: ids("mods") as string[],
    modTypes: ids("mod-types") as string[],
    uniques: ids("uniques") as IdLists["uniques"],
    currency: ids("currency") as string[],
  };
}

function loadSource(): RepoeSource {
  const file = (name: string) => readJson(join(cacheDir, "data", `${name}.json`));
  return {
    skillGems: file("skill_gems"),
    skills: file("skills"),
    baseItems: file("base_items"),
    mods: file("mods"),
    uniques: file("uniques"),
    defaultMonsterStats: file("default_monster_stats"),
  };
}

function write(files: DataFiles, dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), `${JSON.stringify(contents, null, 1)}\n`);
  }
}

function main(): void {
  const check = process.argv.includes("--check");
  const pin = readJson(join(here, "pin.json")) as Pin;
  fetchPinned(pin);
  const files = trim(loadSource(), loadIds(), pin);
  if (!check) {
    write(files, dataDir);
    console.log(`Wrote ${Object.keys(files).length} files to data/ from ${pin.commit}.`);
    return;
  }
  const temp = mkdtempSync(join(tmpdir(), "mvm-import-"));
  write(files, temp);
  const names = new Set([...readdirSync(temp), ...readdirSync(dataDir)]);
  const differing = [...names].filter((name) => {
    const a = join(temp, name);
    const b = join(dataDir, name);
    return !existsSync(a) || !existsSync(b) || readFileSync(a, "utf8") !== readFileSync(b, "utf8");
  });
  if (differing.length > 0) {
    console.error(`data/ differs from a fresh import: ${differing.join(", ")}`);
    process.exit(1);
  }
  console.log("data/ matches a fresh import.");
}

main();
