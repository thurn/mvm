/**
 * Fills every field of `defaults` missing from `raw` and drops every field
 * `raw` has that `defaults` doesn't, reporting each (P15). Shallow: nested
 * objects normalise themselves.
 */
export function withDefaults<T extends object>(
  raw: unknown,
  defaults: T,
  report: (line: string) => void,
): T {
  const source =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    if (source[key] === undefined) {
      out[key] = structuredClone(fallback);
      report(`filled ${key} with its default`);
    } else {
      out[key] = source[key];
    }
  }
  for (const key of Object.keys(source)) {
    if (!(key in defaults)) report(`dropped unknown field ${key}`);
  }
  return out as T;
}
