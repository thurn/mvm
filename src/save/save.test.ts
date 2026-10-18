import { describe, expect, test } from "vitest";
import {
  createRegistry,
  load,
  serialize,
  type SaveDocument,
  type SectionDefinition,
} from "./registry";
import { withDefaults } from "./normalize";

interface ToyV3 {
  name: string;
  level: number;
  tags: string[];
}

/** A toy section: v1 had `title`, v2 renamed it `name`, v3 added `tags`. */
function toySection(): SectionDefinition<ToyV3> {
  return {
    name: "account",
    schemaVersion: 3,
    migrations: {
      1: (raw) => {
        const { title, ...rest } = raw as { title: string };
        return { ...rest, name: title };
      },
      2: (raw) => ({ ...(raw as object), tags: [] }),
    },
    normalize: (raw, report) =>
      withDefaults(raw, { name: "", level: 1, tags: [] as string[] }, report),
    validate: (data) => (data.level < 1 ? ["level must be at least 1"] : []),
  };
}

function roundSection(): SectionDefinition<{ tick: number }> {
  return {
    name: "round",
    schemaVersion: 1,
    migrations: {},
    normalize: (raw, report) => withDefaults(raw, { tick: 0 }, report),
    validate: (data) => (Number.isInteger(data.tick) ? [] : ["tick must be an integer"]),
  };
}

function doc(
  account: unknown,
  round: unknown = null,
  versions = { account: 3, round: 1 },
): SaveDocument {
  return {
    format: 1,
    savedAt: "2026-10-18T00:00:00.000Z",
    build: "test",
    account: { schemaVersion: versions.account, data: account },
    round: round === null ? null : { schemaVersion: versions.round, data: round },
  };
}

describe("the save document", () => {
  const registry = createRegistry([toySection(), roundSection()]);

  test("round-trips through serialization unchanged", () => {
    const original = doc({ name: "Ada", level: 4, tags: ["x"] }, { tick: 1800 });
    const result = load(serialize(original), registry);
    expect(result.account).toEqual({
      ok: true,
      data: { name: "Ada", level: 4, tags: ["x"] },
      migratedFrom: null,
    });
    expect(result.round).toEqual({ ok: true, data: { tick: 1800 }, migratedFrom: null });
    expect(JSON.parse(serialize(original))).toEqual(original);
  });

  test("migrates a v1 section through v2 to v3", () => {
    const result = load(doc({ title: "Old", level: 2 }, null, { account: 1, round: 1 }), registry);
    expect(result.account).toEqual({
      ok: true,
      data: { name: "Old", level: 2, tags: [] },
      migratedFrom: 1,
    });
    expect(result.round).toEqual({ ok: true, data: null, migratedFrom: null });
  });

  test("normalize fills a missing field with its default and drops an unknown one with a log line", () => {
    const log: string[] = [];
    const result = load(doc({ name: "Ada", mystery: 7 }), registry, (line) => log.push(line));
    expect(result.account).toMatchObject({ ok: true, data: { name: "Ada", level: 1, tags: [] } });
    expect(log.some((l) => l.includes("mystery") && l.includes("dropped"))).toBe(true);
    expect(log.some((l) => l.includes("level") && l.includes("default"))).toBe(true);
  });

  test("a corrupt round section loads the account and rejects the round with its reason", () => {
    const result = load(doc({ name: "Ada", level: 3, tags: [] }, { tick: 1.5 }), registry);
    expect(result.account.ok).toBe(true);
    expect(result.round).toEqual({ ok: false, reason: "invalid: tick must be an integer" });
  });

  test("each section fails on its own: unknown versions, newer versions and bad JSON", () => {
    expect(load(doc({ name: "A" }, null, { account: 9, round: 1 }), registry).account).toEqual({
      ok: false,
      reason: "schemaVersion 9 is newer than this build's 3",
    });
    expect(load("{not json", registry).account).toMatchObject({
      ok: false,
      reason: expect.stringContaining("parse"),
    });
    expect(load({ format: 2 }, registry).account).toMatchObject({
      ok: false,
      reason: expect.stringContaining("format"),
    });
  });
});
