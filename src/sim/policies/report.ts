import { MANA_SAMPLES, type RoundMetrics } from "./headless";

/** The headless simulator's summary of N rounds (GDD §17). */
export interface SimReport {
  level: string;
  focus: string;
  policy: string;
  runs: number;
  winRate: number;
  meanLevelSeconds: number;
  killsPerMinute: number;
  leaksPerRun: number;
  /** Share of rounds with a gear drop by 60 s into the level (E §7 "~1:30"), and the median time of the first one. */
  firstGearDrop: { share: number; medianSeconds: number | null };
  manaCurve: { seconds: number; mean: number }[];
  dropsPerRun: RoundMetrics["drops"];
}

const mean = (xs: readonly number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Appendix E §7 counts from the session start; Level 1 begins about 30 s in, so ~1:30 is ~60 s into the level. */
const FIRST_GEAR_DROP_TARGET_SECONDS = 60;

export function summarize(
  meta: { level: string; focus: string; policy: string },
  runs: readonly RoundMetrics[],
): SimReport {
  const firstDrops = runs.flatMap((r) =>
    r.firstGearDropSeconds === null ? [] : [r.firstGearDropSeconds],
  );
  const totalMinutes = runs.reduce((sum, r) => sum + r.levelSeconds, 0) / 60;
  const dropKeys = Object.keys(runs[0]?.drops ?? {}) as (keyof RoundMetrics["drops"])[];
  return {
    ...meta,
    runs: runs.length,
    winRate: mean(runs.map((r) => (r.won ? 1 : 0))),
    meanLevelSeconds: mean(runs.map((r) => r.levelSeconds)),
    killsPerMinute: totalMinutes > 0 ? runs.reduce((sum, r) => sum + r.kills, 0) / totalMinutes : 0,
    leaksPerRun: mean(runs.map((r) => r.leaks)),
    firstGearDrop: {
      share: mean(
        runs.map((r) =>
          r.firstGearDropSeconds !== null &&
          r.firstGearDropSeconds <= FIRST_GEAR_DROP_TARGET_SECONDS
            ? 1
            : 0,
        ),
      ),
      medianSeconds: median(firstDrops),
    },
    manaCurve: MANA_SAMPLES.map((seconds) => ({
      seconds,
      mean: mean(runs.map((r) => r.mana[seconds] ?? 0)),
    })),
    dropsPerRun: Object.fromEntries(
      dropKeys.map((k) => [k, mean(runs.map((r) => r.drops[k]))]),
    ) as RoundMetrics["drops"],
  };
}

const fixed = (n: number, digits = 1) => n.toFixed(digits);

/** A markdown table row per report. */
export function formatReports(reports: readonly SimReport[]): string {
  const lines = [
    "| Focus | Policy | Runs | Win rate | Level length | Kills/min | Leaks/run | Gear by 1:30 | First gear (median) | Mana 0 / 7.5 / 15 / 25 / 60 s | Drops/run (N/M/R/U · hero/spell · currency · gold) |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of reports) {
    const d = r.dropsPerRun;
    lines.push(
      `| ${r.focus} | ${r.policy} | ${r.runs} | ${fixed(r.winRate * 100, 0)}% | ${fixed(r.meanLevelSeconds, 0)} s | ${fixed(r.killsPerMinute)} | ${fixed(r.leaksPerRun)} | ${fixed(r.firstGearDrop.share * 100, 0)}% | ${r.firstGearDrop.medianSeconds === null ? "—" : `${fixed(r.firstGearDrop.medianSeconds, 0)} s`} | ${r.manaCurve.map((p) => fixed(p.mean, 0)).join(" / ")} | ${[d.normal, d.magic, d.rare, d.unique].map((x) => fixed(x, 2)).join("/")} · ${fixed(d.hero, 2)}/${fixed(d.spell, 2)} · ${fixed(d.currency, 2)} · ${fixed(d.gold, 0)} |`,
    );
  }
  return lines.join("\n");
}
