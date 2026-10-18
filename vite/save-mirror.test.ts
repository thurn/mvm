import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { handleSaveRequest } from "./save-mirror";

describe("the save mirror endpoint", () => {
  test("writes latest.json plus a rolling history, and serves the latest back", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mvm-saves-"));
    expect(await handleSaveRequest(dir, "GET", "/__mvm/save", "")).toEqual({
      status: 404,
      body: "",
    });
    for (let i = 0; i < 55; i++) {
      const body = JSON.stringify({ format: 1, savedAt: `t${String(i).padStart(3, "0")}`, n: i });
      expect((await handleSaveRequest(dir, "POST", "/__mvm/save", body)).status).toBe(204);
    }
    const latest = await handleSaveRequest(dir, "GET", "/__mvm/save", "");
    expect(latest.status).toBe(200);
    expect(JSON.parse(latest.body).n).toBe(54);
    expect(JSON.parse(readFileSync(join(dir, "latest.json"), "utf8")).n).toBe(54);
    expect(readdirSync(join(dir, "history"))).toHaveLength(50);
  });

  test("files rejected documents apart, and refuses bad input", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mvm-saves-"));
    expect(
      (
        await handleSaveRequest(
          dir,
          "POST",
          "/__mvm/save/rejected",
          JSON.stringify({ reason: "x" }),
        )
      ).status,
    ).toBe(204);
    expect(readdirSync(join(dir, "rejected"))).toHaveLength(1);
    expect((await handleSaveRequest(dir, "POST", "/__mvm/save", "{not json")).status).toBe(400);
    expect((await handleSaveRequest(dir, "DELETE", "/__mvm/save", "")).status).toBe(405);
  });
});
