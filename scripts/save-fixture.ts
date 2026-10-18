/**
 * `npm run save:fixture -- <section> [--from .saves/latest.json]`: writes the
 * current version's golden fixture for a section from a dev-built document
 * (P15). It refuses to overwrite an existing fixture.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createRegistry,
  load,
  SAVE_SECTIONS,
  type SaveDocument,
  type SectionName,
} from "../src/save/registry";

const root = resolve(import.meta.dirname, "..");
const section = process.argv[2] as SectionName | undefined;
const fromIndex = process.argv.indexOf("--from");
const from = fromIndex >= 0 ? process.argv[fromIndex + 1]! : join(root, ".saves/latest.json");
const registry = createRegistry(SAVE_SECTIONS);
const definition = section ? registry.sections.get(section) : undefined;
if (!section || !definition) {
  console.error(
    `usage: npm run save:fixture -- <${[...registry.sections.keys()].join("|") || "no sections registered"}>`,
  );
  process.exit(1);
}
const doc = JSON.parse(readFileSync(from, "utf8")) as SaveDocument;
const result = load(doc, registry, (line) => console.log(line));
const loaded = result[section];
if (!loaded.ok || loaded.data === null) {
  console.error(
    `the ${section} section of ${from} does not load: ${loaded.ok ? "absent" : loaded.reason}`,
  );
  process.exit(1);
}
const out = join(root, "src/save/fixtures", section, `v${definition.schemaVersion}.json`);
if (existsSync(out)) {
  console.error(`${out} exists; fixtures are never overwritten`);
  process.exit(1);
}
mkdirSync(join(root, "src/save/fixtures", section), { recursive: true });
writeFileSync(
  out,
  `${JSON.stringify({ schemaVersion: definition.schemaVersion, data: loaded.data }, null, 1)}\n`,
);
console.log(`wrote ${out}`);
