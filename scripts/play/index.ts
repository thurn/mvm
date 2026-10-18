/**
 * `npm run play` (P18): keeps `<repo>/.play/` detached at `staging`, serves
 * it on port 5180 with the save mirror at `<repo>/.saves/` and the log sink
 * at `<repo>/logs/play.jsonl`, and follows `staging` every 15 s.
 *
 * Options for testing it without touching the operator's copy: `--port`,
 * `--dir`, `--saves`, `--log`, `--interval <s>` and `--ref <git ref>`
 * (watch a ref instead of Tollgate's `staging`).
 */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { planUpdate, type Snapshot } from "./decide";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const run = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const root = dirname(
  run("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], process.cwd()),
);
const port = Number(arg("port") ?? 5180);
const dir = resolve(arg("dir") ?? join(root, ".play"));
const saves = resolve(arg("saves") ?? join(root, ".saves"));
const logFile = resolve(arg("log") ?? join(root, "logs/play.jsonl"));
const intervalSeconds = Number(arg("interval") ?? 15);
const ref = arg("ref");

/** The commit to serve: Tollgate's staging, or a ref under test. */
function stagingOid(): string {
  if (ref) return run("git", ["rev-parse", ref], root);
  const status = JSON.parse(run("tg", ["--no-launch", "status", "--json"], root)) as {
    state: { staging_oid: { bytes: string } };
  };
  return status.state.staging_oid.bytes;
}

function snapshot(oid: string): Snapshot {
  const object = (path: string) => {
    try {
      return run("git", ["rev-parse", `${oid}:${path}`], root);
    } catch {
      return null;
    }
  };
  return { oid, lock: object("package-lock.json") ?? "", assets: object("scripts/assets") };
}

let vite: ChildProcess | null = null;
let stopping = false;

function startVite(): void {
  const previous = vite;
  vite = null;
  previous?.kill();
  mkdirSync(saves, { recursive: true });
  const child = spawn("npx", ["vite", "--port", String(port), "--strictPort"], {
    cwd: dir,
    stdio: "inherit",
    env: { ...process.env, MVM_SAVES_DIR: saves, MVM_LOG_FILE: logFile },
  });
  vite = child;
  // A crashed Vite (or a port already in use) is reported and retried, never left silent.
  child.on("exit", (code) => {
    if (stopping || vite !== child) return;
    console.error(`[play] Vite exited (code ${code}); restarting in 5 s. Is port ${port} free?`);
    vite = null;
    setTimeout(() => !stopping && !vite && startVite(), 5000);
  });
}

let current: Snapshot | null = null;

function update(): void {
  let next: Snapshot;
  try {
    next = snapshot(stagingOid());
  } catch (error) {
    console.error(
      `[play] could not read staging: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  const plan = planUpdate(current, next);
  if (!plan.checkout) return;
  if (!existsSync(dir)) run("git", ["worktree", "add", "--detach", dir, next.oid], root);
  else run("git", ["checkout", "--detach", "--force", next.oid], dir);
  if (plan.install) {
    console.log("[play] installing dependencies…");
    run("npm", ["install", "--no-audit", "--no-fund"], dir);
  }
  if (plan.assets) {
    console.log("[play] baking assets…");
    run("npm", ["run", "--if-present", "assets"], dir);
  }
  // A dependency change needs a fresh Vite; source changes reload the page through Vite's watcher.
  if (!vite || plan.install) startVite();
  current = next;
  console.log(
    `[play] Mercs vs. Monsters at http://localhost:${port} (staging ${next.oid.slice(0, 7)})`,
  );
}

update();
setInterval(update, intervalSeconds * 1000);
process.on("SIGINT", () => {
  stopping = true;
  vite?.kill();
  process.exit(0);
});
