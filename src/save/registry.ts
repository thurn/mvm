/**
 * The save document (P13) and its section registry (P15). The save layer
 * knows sections, not game types: 1.19 registers the account and round.
 */
export type SectionName = "account" | "round";

interface Section<T = unknown> {
  schemaVersion: number;
  data: T;
}

export interface SaveDocument {
  format: 1;
  /** ISO time, for logs and picking the newer of two copies. */
  savedAt: string;
  /** Git short OID, for logs. */
  build: string;
  account: Section;
  round: Section | null;
}

export interface SectionDefinition<T = unknown> {
  name: SectionName;
  schemaVersion: number;
  /** One pure migration per old version: `migrations[n]` takes version n's data to n + 1. */
  migrations: Readonly<Record<number, (raw: unknown) => unknown>>;
  /** Fills missing fields with defaults and drops unknown ones, reporting each. */
  normalize(raw: unknown, report: (line: string) => void): T;
  /** Problems with normalised data; empty when valid. */
  validate(data: T): string[];
}

export interface Registry {
  sections: ReadonlyMap<SectionName, SectionDefinition>;
}

type SectionResult<T = unknown> =
  { ok: true; data: T | null; migratedFrom: number | null } | { ok: false; reason: string };

export interface LoadResult {
  account: SectionResult;
  round: SectionResult;
}

/** The game's sections. 1.19 adds the account and round here. */
export const SAVE_SECTIONS: SectionDefinition[] = [];

export function createRegistry(sections: readonly SectionDefinition[]): Registry {
  return { sections: new Map(sections.map((s) => [s.name, s])) };
}

export function serialize(doc: SaveDocument): string {
  return JSON.stringify(doc);
}

type Log = (line: string) => void;

function loadSection(name: SectionName, raw: unknown, registry: Registry, log: Log): SectionResult {
  const definition = registry.sections.get(name);
  if (!definition) return { ok: false, reason: `no section definition for ${name}` };
  if (raw === null || raw === undefined) {
    return name === "round"
      ? { ok: true, data: null, migratedFrom: null }
      : { ok: false, reason: "missing" };
  }
  const section = raw as Partial<Section>;
  const version = section.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: `bad schemaVersion ${String(version)}` };
  }
  if (version > definition.schemaVersion) {
    return {
      ok: false,
      reason: `schemaVersion ${version} is newer than this build's ${definition.schemaVersion}`,
    };
  }
  let data = section.data;
  try {
    for (let v = version; v < definition.schemaVersion; v++) {
      const migrate = definition.migrations[v];
      if (!migrate) return { ok: false, reason: `no migration from version ${v}` };
      data = migrate(data);
      log(`[save] ${name}: migrated v${v} to v${v + 1}`);
    }
    const normalized = definition.normalize(data, (line) => log(`[save] ${name}: ${line}`));
    const problems = definition.validate(normalized as never);
    if (problems.length > 0) return { ok: false, reason: `invalid: ${problems.join("; ")}` };
    return {
      ok: true,
      data: normalized,
      migratedFrom: version < definition.schemaVersion ? version : null,
    };
  } catch (error) {
    return {
      ok: false,
      reason: `failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Loads a save document (P13, P15): each section parses, migrates up to the
 * current version, normalises and validates on its own, so a broken round
 * never costs the account. Results carry the reason for any rejection.
 */
export function load(raw: unknown, registry: Registry, log: Log = () => {}): LoadResult {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const reason = `parse error: ${error instanceof Error ? error.message : String(error)}`;
      log(`[save] rejected: ${reason}`);
      return { account: { ok: false, reason }, round: { ok: false, reason } };
    }
  }
  const doc = parsed as Partial<SaveDocument> | null;
  if (!doc || doc.format !== 1) {
    const reason = `unknown format ${String(doc?.format)}`;
    log(`[save] rejected: ${reason}`);
    return { account: { ok: false, reason }, round: { ok: false, reason } };
  }
  const result = {
    account: loadSection("account", doc.account, registry, log),
    round: loadSection("round", doc.round, registry, log),
  };
  for (const [name, section] of Object.entries(result)) {
    log(section.ok ? `[save] ${name}: loaded` : `[save] ${name}: rejected, ${section.reason}`);
  }
  return result;
}
