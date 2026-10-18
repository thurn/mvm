/**
 * `npm run sim -- --level 1 --focus ranger --policy pvzOpener --runs 20`:
 * plays rounds headless and prints the summary (GDD §17). `--focus all`
 * and `--policy all` sweep every option; `--report <path>` also writes the
 * markdown table.
 */
import { writeFileSync } from "node:fs";
import { LEVEL_1 } from "../../src/monsters/levels/level-1";
import { FOCUSES } from "../../src/sim/policies/focus";
import { runRound } from "../../src/sim/policies/headless";
import { POLICIES } from "../../src/sim/policies/policies";
import { formatReports, summarize } from "../../src/sim/policies/report";

const LEVELS = { "1": LEVEL_1 } as const;

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const level = LEVELS[arg("level", "1") as keyof typeof LEVELS];
if (!level) throw new Error(`unknown level ${arg("level", "1")}`);
const runs = Number(arg("runs", "20"));
const focusArg = arg("focus", "all");
const policyArg = arg("policy", "all");
const focuses = focusArg === "all" ? Object.keys(FOCUSES) : [focusArg];
const policies = policyArg === "all" ? Object.keys(POLICIES) : [policyArg];

const reports = focuses.flatMap((focus) =>
  policies.map((policy) =>
    summarize(
      { level: level.id, focus, policy },
      Array.from({ length: runs }, (_, i) => runRound({ level, focus, policy, seed: i + 1 })),
    ),
  ),
);
const table = formatReports(reports);
console.log(table);
const reportPath = arg("report", "");
if (reportPath) writeFileSync(reportPath, `${table}\n`);
