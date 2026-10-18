/**
 * Structured logging (P23): JSON lines with IDs, never names. Every build
 * keeps the newest 5,000 lines in IndexedDB with JSONL export; dev servers
 * also batch them to the log sink (`logs/dev.jsonl`, or the play server's
 * `logs/play.jsonl`).
 */
export type LogLine = { t: string; event: string } & Record<string, unknown>;

export const LOG_RING_LIMIT = 5000;

/** Where log lines are kept: the newest LOG_RING_LIMIT, oldest first. */
export interface LogRing {
  append(lines: readonly LogLine[]): Promise<void>;
  all(): Promise<LogLine[]>;
  clear(): Promise<void>;
}

export function createMemoryRing(): LogRing {
  const lines: LogLine[] = [];
  return {
    async append(more) {
      lines.push(...more);
      lines.splice(0, Math.max(0, lines.length - LOG_RING_LIMIT));
    },
    all: async () => [...lines],
    async clear() {
      lines.length = 0;
    },
  };
}

const STORE = "lines";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createIndexedDbRing(name = "mvm-log"): LogRing {
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return {
    async append(lines) {
      const db = await opening;
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const line of lines) store.add(line);
      const keys = await request(store.getAllKeys());
      const excess = keys.length - LOG_RING_LIMIT;
      if (excess > 0) store.delete(IDBKeyRange.upperBound(keys[excess - 1]!));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async all() {
      const db = await opening;
      return request(db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<LogLine[]>);
    },
    async clear() {
      const db = await opening;
      await request(db.transaction(STORE, "readwrite").objectStore(STORE).clear());
    },
  };
}

export interface Logger {
  log(event: string, fields?: Record<string, unknown>): void;
  /** Writes pending lines to the ring and the sink. */
  flush(): Promise<void>;
  exportJsonl(): Promise<string>;
  /** Drops pending lines and empties the ring (the dev QA reset). */
  clear(): Promise<void>;
}

export interface LoggerOptions {
  ring: LogRing;
  /** Sends a batch to the log sink; failures are ignored, the ring keeps the lines. */
  send?: (lines: LogLine[]) => Promise<void>;
  now?: () => string;
}

export function createLogger({
  ring,
  send,
  now = () => new Date().toISOString(),
}: LoggerOptions): Logger {
  let pending: LogLine[] = [];
  return {
    log(event, fields = {}) {
      pending.push({ t: now(), event, ...fields });
    },
    async flush() {
      if (pending.length === 0) return;
      const batch = pending;
      pending = [];
      await ring.append(batch);
      try {
        await send?.(batch);
      } catch {
        // The sink is optional; the ring already holds the lines.
      }
    },
    async exportJsonl() {
      return (await ring.all()).map((line) => JSON.stringify(line)).join("\n") + "\n";
    },
    async clear() {
      pending = [];
      await ring.clear();
    },
  };
}

/** Posts a batch to the dev server's log sink. */
export async function sendToSink(lines: LogLine[]): Promise<void> {
  const response = await fetch("/__mvm/log", {
    method: "POST",
    body: JSON.stringify(lines),
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) throw new Error(`log sink ${response.status}`);
}
