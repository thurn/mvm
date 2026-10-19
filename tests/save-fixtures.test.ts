import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { resumeFromDocument } from "../src/account/lifecycle";
import { step } from "../src/sim/kernel";
import type { RoundState } from "../src/sim/state";
import {
  createRegistry,
  load,
  SAVE_SECTIONS,
  type SaveDocument,
  type SectionName,
} from "../src/save/registry";

const root = join(import.meta.dirname, "../src/save/fixtures");

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith(".json") ? [path] : [];
  });
}

const fixtures = files(root).map((path) => [path.slice(root.length + 1), path] as const);
const registry = createRegistry(SAVE_SECTIONS);

/** Wraps a single-section fixture in a document; milestone fixtures are whole documents already. */
function asDocument(relative: string, raw: unknown): SaveDocument {
  if (relative.startsWith("milestones/")) return raw as SaveDocument;
  const section = relative.split("/")[0] as SectionName;
  const base: SaveDocument = {
    format: 1,
    savedAt: "",
    build: "fixture",
    account: raw as SaveDocument["account"],
    round: null,
  };
  return section === "round"
    ? { ...base, account: { schemaVersion: 0, data: null }, round: raw as SaveDocument["round"] }
    : base;
}

test.each(fixtures)(
  "golden fixture %s loads through the current registry (P15)",
  (relative, path) => {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    const section = relative.startsWith("milestones/")
      ? null
      : (relative.split("/")[0] as SectionName);
    const result = load(asDocument(relative, raw), registry);
    if (section !== "round") expect(result.account).toMatchObject({ ok: true });
    if (section !== "account") {
      expect(result.round).toMatchObject({ ok: true });
      // A loaded round must keep playing (P15): 600 ticks without throwing.
      const round = (result.round as { data: RoundState | null }).data;
      if (round) for (let i = 0; i < 600 && round.result === null; i++) step(round, []);
    }
  },
);

test("every fixture directory names a registered section or milestones", () => {
  for (const [relative] of fixtures) {
    const dir = relative.split("/")[0]!;
    expect(dir === "milestones" || registry.sections.has(dir as SectionName), relative).toBe(true);
  }
});

/** C §C.3.8: the M1 save's hero-only resistance rolls are dropped on load, and nothing else changes. */
test("the M1 milestone resumes, losing only its hero-only resistance rolls (hv-7ic2.87)", () => {
  const raw = JSON.parse(readFileSync(join(root, "milestones/m1.json"), "utf8")) as SaveDocument;
  const log: string[] = [];
  resumeFromDocument(raw, (line) => log.push(line));
  const reconciled = log.filter((line) => line.startsWith("[reconcile]"));
  expect(reconciled).toHaveLength(3);
  for (const line of reconciled)
    expect(line).toMatch(/unknown mod (Cold|Lightning)Resist1 dropped$/);
});
