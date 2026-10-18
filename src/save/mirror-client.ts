import type { SaveDocument } from "./registry";

type FetchLike = (
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** The dev server's save mirror (P18). Every call degrades to "no mirror" instead of failing the save. */
export interface MirrorClient {
  get(): Promise<SaveDocument | null>;
  post(doc: SaveDocument): Promise<boolean>;
  /** Files a document that failed to load under `.saves/rejected/`, with its reasons. */
  reject(raw: unknown, reasons: Record<string, string>): Promise<boolean>;
}

export function createMirrorClient(
  fetchFn: FetchLike = (url, init) => fetch(url, init),
  base = "/__mvm/save",
): MirrorClient {
  const send = async (url: string, body: unknown) => {
    try {
      const response = await fetchFn(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      });
      return response.ok;
    } catch {
      return false;
    }
  };
  return {
    async get() {
      try {
        const response = await fetchFn(base);
        return response.ok && response.status !== 204
          ? ((await response.json()) as SaveDocument)
          : null;
      } catch {
        return null;
      }
    },
    post: (doc) => send(base, doc),
    reject: (raw, reasons) => send(`${base}/rejected`, { reasons, raw }),
  };
}
