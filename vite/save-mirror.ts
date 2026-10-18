import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

/** How many mirrored documents `.saves/history/` keeps. */
const HISTORY_LIMIT = 50;

function nextName(dir: string): string {
  const existing = existsSync(dir) ? readdirSync(dir).sort() : [];
  const last = existing.at(-1);
  const index = last ? Number.parseInt(last, 10) + 1 : 1;
  return `${String(index).padStart(8, "0")}.json`;
}

function prune(dir: string, keep: number): void {
  const files = readdirSync(dir).sort();
  for (const file of files.slice(0, Math.max(0, files.length - keep))) rmSync(join(dir, file));
}

/**
 * The save mirror (P18): POST /__mvm/save writes `latest.json` and a rolling
 * history; GET serves the latest back; POST /__mvm/save/rejected files a
 * document that failed to load.
 */
export async function handleSaveRequest(
  dir: string,
  method: string,
  url: string,
  body: string,
): Promise<{ status: number; body: string }> {
  const path = url.split("?")[0];
  if (method === "GET" && path === "/__mvm/save") {
    const latest = join(dir, "latest.json");
    return existsSync(latest)
      ? { status: 200, body: readFileSync(latest, "utf8") }
      : { status: 404, body: "" };
  }
  if (method !== "POST") return { status: 405, body: "" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { status: 400, body: "not JSON" };
  }
  const text = `${JSON.stringify(parsed, null, 1)}\n`;
  if (path === "/__mvm/save/rejected") {
    const rejected = join(dir, "rejected");
    mkdirSync(rejected, { recursive: true });
    writeFileSync(join(rejected, nextName(rejected)), text);
    return { status: 204, body: "" };
  }
  if (path !== "/__mvm/save") return { status: 404, body: "" };
  const history = join(dir, "history");
  mkdirSync(history, { recursive: true });
  writeFileSync(join(dir, "latest.json"), text);
  writeFileSync(join(history, nextName(history)), text);
  prune(history, HISTORY_LIMIT);
  return { status: 204, body: "" };
}

export function saveMirror(dir: string): Plugin {
  return {
    name: "mvm-save-mirror",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/__mvm/save")) return next();
        let body = "";
        req.on("data", (chunk: Buffer) => (body += chunk.toString("utf8")));
        req.on("end", () => {
          void handleSaveRequest(dir, req.method ?? "GET", req.url!, body).then((result) => {
            res.statusCode = result.status;
            if (result.status === 200) res.setHeader("content-type", "application/json");
            res.end(result.body);
          });
        });
      });
    },
  };
}
