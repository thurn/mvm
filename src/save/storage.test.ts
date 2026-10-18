import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";
import type { SaveDocument } from "./registry";
import { createIndexedDbStore, createMemoryStore, latestOf, type SaveStore } from "./storage";
import { createMirrorClient } from "./mirror-client";

const doc = (
  n: number,
  savedAt = `2026-10-18T00:00:${String(n).padStart(2, "0")}.000Z`,
): SaveDocument => ({
  format: 1,
  savedAt,
  build: "test",
  account: { schemaVersion: 1, data: { n } },
  round: { schemaVersion: 1, data: { tick: n } },
});

describe.each([
  ["memory", () => createMemoryStore()],
  ["IndexedDB", () => createIndexedDbStore(`mvm-test-${Math.random()}`)],
])("the %s store", (_name, make: () => SaveStore) => {
  test("writes both sections as one document and reads the latest back", async () => {
    const store = make();
    expect(await store.latest()).toBeNull();
    await store.write(doc(1));
    await store.write(doc(2));
    expect(await store.latest()).toEqual(doc(2));
  });

  test("keeps the last 20 documents", async () => {
    const store = make();
    for (let i = 1; i <= 25; i++) await store.write(doc(i));
    const history = await store.history();
    expect(history).toHaveLength(20);
    expect(history[0]).toEqual(doc(6));
    expect(history.at(-1)).toEqual(doc(25));
  });

  test("keeps named checkpoints apart from the history", async () => {
    const store = make();
    await store.checkpoint("level-1-start", doc(3));
    for (let i = 1; i <= 25; i++) await store.write(doc(i));
    expect(await store.readCheckpoint("level-1-start")).toEqual(doc(3));
    expect(await store.readCheckpoint("missing")).toBeNull();
  });
});

describe("restoring from the mirror", () => {
  test("uses the mirror when the store is empty or older", async () => {
    let mirrored: SaveDocument | null = doc(5);
    const fetchFn = async (_url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "POST") mirrored = JSON.parse(init.body!) as SaveDocument;
      return { ok: mirrored !== null, status: mirrored ? 200 : 404, json: async () => mirrored };
    };
    const mirror = createMirrorClient(fetchFn);
    const store = createMemoryStore();
    expect(await latestOf(store, mirror)).toEqual(doc(5));
    await store.write(doc(4));
    expect(await latestOf(store, mirror)).toEqual(doc(5));
    await store.write(doc(9));
    expect(await latestOf(store, mirror)).toEqual(doc(9));
    await mirror.post(doc(10));
    expect(mirrored).toEqual(doc(10));
  });

  test("a failing mirror never blocks the local save", async () => {
    const mirror = createMirrorClient(async () => {
      throw new Error("offline");
    });
    const store = createMemoryStore();
    await store.write(doc(1));
    expect(await latestOf(store, mirror)).toEqual(doc(1));
    await expect(mirror.post(doc(2))).resolves.toBe(false);
  });
});
