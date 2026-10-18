import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";
import {
  createLogger,
  createIndexedDbRing,
  createMemoryRing,
  LOG_RING_LIMIT,
  type LogRing,
} from "./log";

describe.each([
  ["memory", () => createMemoryRing()],
  ["IndexedDB", () => createIndexedDbRing(`mvm-log-test-${Math.random()}`)],
])("the %s log ring", (_name, make: () => LogRing) => {
  test(`prunes at ${LOG_RING_LIMIT} lines, keeping the newest`, async () => {
    const ring = make();
    await ring.append(
      Array.from({ length: LOG_RING_LIMIT + 250 }, (_, i) => ({ t: String(i), event: "x", i })),
    );
    const lines = await ring.all();
    expect(lines).toHaveLength(LOG_RING_LIMIT);
    expect(lines[0]).toMatchObject({ i: 250 });
    expect(lines.at(-1)).toMatchObject({ i: LOG_RING_LIMIT + 249 });
  });
});

describe("the logger", () => {
  test("writes structured lines with IDs, exports JSONL, and batches them to the sink", async () => {
    const sent: unknown[][] = [];
    const ring = createMemoryRing();
    const logger = createLogger({
      ring,
      send: async (lines) => void sent.push(lines),
      now: () => "2026-10-18T00:00:00.000Z",
    });
    logger.log("drop", { dropId: "d1", rarity: "magic" });
    logger.log("leak", { monsterId: "m1", cost: 1 });
    await logger.flush();
    expect(sent).toEqual([
      [
        { t: "2026-10-18T00:00:00.000Z", event: "drop", dropId: "d1", rarity: "magic" },
        { t: "2026-10-18T00:00:00.000Z", event: "leak", monsterId: "m1", cost: 1 },
      ],
    ]);
    const jsonl = await logger.exportJsonl();
    expect(
      jsonl
        .trimEnd()
        .split("\n")
        .map((l) => JSON.parse(l) as { event: string })
        .map((l) => l.event),
    ).toEqual(["drop", "leak"]);
  });

  test("a failing sink never loses the local copy", async () => {
    const ring = createMemoryRing();
    const logger = createLogger({
      ring,
      send: async () => {
        throw new Error("offline");
      },
      now: () => "t",
    });
    logger.log("save", { bytes: 10 });
    await logger.flush();
    expect(await ring.all()).toHaveLength(1);
  });
});
