import type { SaveDocument } from "./registry";
import type { MirrorClient } from "./mirror-client";

/** How many documents the store keeps for recovery (P13). */
const HISTORY_LIMIT = 20;

/** Where save documents live: the newest 20, plus named checkpoints. */
export interface SaveStore {
  /** Writes a whole document, both sections at once. */
  write(doc: SaveDocument): Promise<void>;
  latest(): Promise<SaveDocument | null>;
  /** Oldest first. */
  history(): Promise<SaveDocument[]>;
  checkpoint(name: string, doc: SaveDocument): Promise<void>;
  readCheckpoint(name: string): Promise<SaveDocument | null>;
}

export function createMemoryStore(): SaveStore {
  const documents: SaveDocument[] = [];
  const checkpoints = new Map<string, SaveDocument>();
  return {
    async write(doc) {
      documents.push(structuredClone(doc));
      documents.splice(0, Math.max(0, documents.length - HISTORY_LIMIT));
    },
    latest: async () => structuredClone(documents.at(-1) ?? null),
    history: async () => structuredClone(documents),
    async checkpoint(name, doc) {
      checkpoints.set(name, structuredClone(doc));
    },
    readCheckpoint: async (name) => structuredClone(checkpoints.get(name) ?? null),
  };
}

const DOCUMENTS = "documents";
const CHECKPOINTS = "checkpoints";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * An IndexedDB store. Each write is one transaction that adds the document
 * and prunes the history, so a document is either fully saved or not at all.
 */
export function createIndexedDbStore(name = "mvm-saves"): SaveStore {
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DOCUMENTS, { autoIncrement: true });
      req.result.createObjectStore(CHECKPOINTS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const all = async (): Promise<SaveDocument[]> => {
    const db = await opening;
    return request(
      db.transaction(DOCUMENTS).objectStore(DOCUMENTS).getAll() as IDBRequest<SaveDocument[]>,
    );
  };
  return {
    async write(doc) {
      const db = await opening;
      const tx = db.transaction(DOCUMENTS, "readwrite");
      const store = tx.objectStore(DOCUMENTS);
      store.add(doc);
      const keys = await request(store.getAllKeys());
      for (const key of keys.slice(0, Math.max(0, keys.length - HISTORY_LIMIT))) store.delete(key);
      await done(tx);
    },
    latest: async () => (await all()).at(-1) ?? null,
    history: all,
    async checkpoint(checkpoint, doc) {
      const db = await opening;
      const tx = db.transaction(CHECKPOINTS, "readwrite");
      tx.objectStore(CHECKPOINTS).put(doc, checkpoint);
      await done(tx);
    },
    async readCheckpoint(checkpoint) {
      const db = await opening;
      const found = await request(
        db.transaction(CHECKPOINTS).objectStore(CHECKPOINTS).get(checkpoint),
      );
      return (found as SaveDocument | undefined) ?? null;
    },
  };
}

/** The newer of the local store's latest document and the mirror's (P18): the mirror refills an empty or older store. */
export async function latestOf(
  store: SaveStore,
  mirror: MirrorClient,
): Promise<SaveDocument | null> {
  const local = await store.latest();
  const remote = await mirror.get();
  if (!remote) return local;
  if (!local || remote.savedAt > local.savedAt) return remote;
  return local;
}
