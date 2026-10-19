/**
 * `npm run sim -- --level 1 --focus ranger --policy pvzOpener --runs 20`:
 * plays rounds headless and prints the summary (GDD §17). `--focus all`
 * and `--policy all` sweep every option; `--report <path>` also writes the
 * markdown table.
 */
import { writeFileSync } from "node:fs";
import { CAMPAIGN } from "../../src/monsters/levels/grassland";
import { FOCUSES } from "../../src/sim/policies/focus";
import { runCampaign, summarizeCampaigns } from "../../src/sim/policies/campaign";
import { runRound } from "../../src/sim/policies/headless";
import { POLICIES } from "../../src/sim/policies/policies";
import { formatReports, summarize } from "../../src/sim/policies/report";

const LEVELS = Object.fromEntries(CAMPAIGN.map((l) => [String(l.index), l]));

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

// `--campaign`: plays the Grassland campaign from new accounts and prints its calibration summary (plan 2.25).
if (process.argv.includes("--campaign")) {
  const runs = Number(arg("runs", "4"));
  const focuses = arg("focus", "all") === "all" ? Object.keys(FOCUSES) : [arg("focus", "all")];
  const results = focuses.flatMap((focus) =>
    Array.from({ length: runs }, (_, i) => runCampaign({ focus, seed: i + 1 })),
  );
  const summary = summarizeCampaigns(results);
  const minutes = (s: number | null) => (s === null ? "–" : (s / 60).toFixed(1));
  const lines = [
    `Campaigns: ${summary.finished}/${summary.campaigns} finished Level 5.`,
    "",
    "| Level | First-try wins | Median length (s) | Median kills/min | Boss fight (s) |",
    "| --- | --- | --- | --- | --- |",
    ...summary.levels.map(
      (l) =>
        `| ${l.levelId} | ${l.firstTryWins}/${l.firstTries} | ${l.medianSeconds?.toFixed(0) ?? "–"} | ${l.medianKillsPerMinute?.toFixed(1) ?? "–"} | ${l.bossSeconds.map((s) => s.toFixed(0)).join(", ") || "–"} |`,
    ),
    "",
    "| Beat (E §7) | Median clock (min) |",
    "| --- | --- |",
    ...Object.entries(summary.beats).map(([beat, s]) => `| ${beat} | ${minutes(s)} |`),
  ];
  console.log(lines.join("\n"));
  const reportPath = arg("report", "");
  if (reportPath) writeFileSync(reportPath, `${lines.join("\n")}\n`);
  process.exit(0);
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
