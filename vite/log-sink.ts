import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Plugin } from "vite";

const isObject = (value: unknown) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** The log sink (P18, P23): POST /__mvm/log appends one JSON object, or a batch, as JSON lines. */
export async function handleLogRequest(
  file: string,
  method: string,
  body: string,
): Promise<{ status: number }> {
  if (method !== "POST") return { status: 405 };
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { status: 400 };
  }
  const lines = Array.isArray(parsed) ? parsed : [parsed];
  if (!lines.every(isObject)) return { status: 400 };
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
  return { status: 204 };
}

export function logSink(file: string): Plugin {
  return {
    name: "mvm-log-sink",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/__mvm/log")) return next();
        let body = "";
        req.on("data", (chunk: Buffer) => (body += chunk.toString("utf8")));
        req.on("end", () => {
          void handleLogRequest(file, req.method ?? "GET", body).then((result) => {
            res.statusCode = result.status;
            res.end();
          });
        });
      });
    },
  };
}
