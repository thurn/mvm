import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { handleLogRequest } from "./log-sink";

describe("the log sink endpoint", () => {
  test("appends each line as one JSON object per line", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "mvm-logs-")), "nested", "play.jsonl");
    expect(
      (await handleLogRequest(file, "POST", JSON.stringify([{ event: "a", n: 1 }, { event: "b" }])))
        .status,
    ).toBe(204);
    expect((await handleLogRequest(file, "POST", JSON.stringify({ event: "c" }))).status).toBe(204);
    const lines = readFileSync(file, "utf8")
      .trimEnd()
      .split("\n")
      .map((l) => JSON.parse(l) as { event: string });
    expect(lines.map((l) => l.event)).toEqual(["a", "b", "c"]);
  });

  test("refuses anything that isn't JSON objects", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "mvm-logs-")), "play.jsonl");
    expect((await handleLogRequest(file, "POST", "{nope")).status).toBe(400);
    expect((await handleLogRequest(file, "POST", "[1, 2]")).status).toBe(400);
    expect((await handleLogRequest(file, "GET", "")).status).toBe(405);
  });
});
