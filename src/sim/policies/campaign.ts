import { applyStep, beginLevel, finishLevel, newAccount } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import {
  assignHero,
  chooseHero,
  equip,
  equipRefusal,
  isSpell,
  rollUnrolled,
} from "../../account/stash";
import { isUpgrade } from "../../account/upgrades";
import { catalogEntry } from "../../heroes/model/catalog";
import type { HeroInstance } from "../../heroes/model/hero";
import { itemSlot } from "../../heroes/model/item";
import { CAMPAIGN } from "../../monsters/levels/grassland";
import { step } from "../kernel";
import { STEPS_PER_SECOND } from "../time";
import { POLICIES } from "./policies";

/** Clock costs outside rounds (E §7): picking a focus, and the hideout between rounds. */
const CAMPAIGN_CLOCK = { focusSeconds: 30, betweenRoundsSeconds: 90 } as const;

interface LevelRun {
  levelId: string;
  attempt: number;
  won: boolean;
  /** Seconds in the round. */
  seconds: number;
  kills: number;
  leaks: number;
  /** Seconds from the boss's arrival to its death, when it died. */
  bossSeconds: number | null;
  /** Campaign clock when the round started. */
  startedAt: number;
}

export interface CampaignResult {
  runs: LevelRun[];
  /** Campaign clock seconds of E §7's beats; null when not reached. */
  beats: {
    craftOrbsAt: number | null;
    jewellerAt: number | null;
    level4At: number | null;
    millerAt: number | null;
    millerDefeatedAt: number | null;
  };
  finished: boolean;
  clock: number;
}

type PlayRole = "acolyte" | "ranged" | "melee";

function playRole(hero: HeroInstance): PlayRole {
  const r = catalogEntry(hero.skillId).role;
  return r === "acolyte" ? "acolyte" : r === "striker" || r === "wall" ? "melee" : "ranged";
}

/** What a sensible roster wants next (plan 2.25): two acolytes, then shooters over melee, two to one. */
function need(account: AccountState, hero: HeroInstance): number {
  const roster = account.roster.slots.flatMap((c) => (c ? [playRole(c.hero)] : []));
  const have = (r: PlayRole) => roster.filter((x) => x === r).length;
  const r = playRole(hero);
  if (r === "acolyte") return have("acolyte") < 2 ? 3 : 0;
  if (r === "ranged") return have("ranged") <= 2 * have("melee") ? 2 : 1;
  return have("melee") * 2 < have("ranged") ? 2 : 1;
}

const better = (account: AccountState) => (a: HeroInstance, b: HeroInstance) =>
  need(account, b) - need(account, a) || b.level - a.level || a.id.localeCompare(b.id);

/**
 * The hideout between rounds, played sensibly: roll new heroes, take the
 * offer the roster most needs, fill empty slots the same way, equip what helps.
 */
function tidyHideout(account: AccountState): void {
  rollUnrolled(account);
  for (const choice of [...account.pendingChoices])
    chooseHero(account, choice.levelId, [...choice.options].sort(better(account))[0]!.id);
  for (let slot = 0; slot < account.roster.unlocked; slot++) {
    if (account.roster.slots[slot]) continue;
    const best = account.stash.heroes
      .filter((h) => !isSpell(h) && need(account, h) > 0)
      .sort(better(account))[0];
    if (best) assignHero(account, best.id, slot);
  }
  for (const item of [...account.stash.items]) {
    const part = itemSlot(item);
    for (let slot = 0; slot < account.roster.unlocked; slot++) {
      const card = account.roster.slots[slot];
      if (!card || equipRefusal(account, item, slot, part) !== null) continue;
      if (card[part] && !isUpgrade(account, item)) continue;
      equip(account, item.id, slot, part);
      break;
    }
  }
}

/**
 * Plays the Grassland campaign headless from a new account (plan 2.25): each
 * level in order with the campaign policy, up to `maxAttempts` tries, the
 * hideout tidied between rounds, and E §7's clock beats recorded.
 */
export function runCampaign(options: {
  focus: string;
  seed: number;
  maxAttempts?: number;
  maxSeconds?: number;
}): CampaignResult {
  const account = newAccount(options.focus);
  account.nextSeed = options.seed * 1000;
  const policy = POLICIES.campaign!;
  const result: CampaignResult = {
    runs: [],
    beats: {
      craftOrbsAt: null,
      jewellerAt: null,
      level4At: null,
      millerAt: null,
      millerDefeatedAt: null,
    },
    finished: false,
    clock: CAMPAIGN_CLOCK.focusSeconds,
  };
  for (const level of CAMPAIGN) {
    let won = false;
    for (let attempt = 1; attempt <= (options.maxAttempts ?? 3) && !won; attempt++) {
      if (level.id === "level-4" && result.beats.level4At === null)
        result.beats.level4At = result.clock;
      const round = beginLevel(account, level);
      const run: LevelRun = {
        levelId: level.id,
        attempt,
        won: false,
        seconds: 0,
        kills: 0,
        leaks: 0,
        bossSeconds: null,
        startedAt: result.clock,
      };
      let bossAt: number | null = null;
      const maxTicks = (options.maxSeconds ?? 900) * STEPS_PER_SECOND;
      while (round.result === null && round.tick < maxTicks) {
        const events = step(round, policy(round));
        applyStep(account, round, events);
        const seconds = round.tick / STEPS_PER_SECOND;
        for (const e of events) {
          if (e.type === "kill" && e.rarity !== null) run.kills++;
          if (e.type === "leak") run.leaks++;
          if (e.type === "bossSpawned") {
            bossAt = seconds;
            result.beats.millerAt ??= result.clock + seconds;
          }
          if (e.type === "kill" && e.rarity === "unique" && bossAt !== null) {
            run.bossSeconds = seconds - bossAt;
            result.beats.millerDefeatedAt ??= result.clock + seconds;
          }
        }
      }
      run.seconds = round.tick / STEPS_PER_SECOND;
      run.won = round.result === "won";
      won = run.won;
      finishLevel(account, round);
      result.clock += run.seconds;
      result.runs.push(run);
      if (won && level.id === "level-2") result.beats.craftOrbsAt ??= result.clock;
      if (won && level.id === "level-3") result.beats.jewellerAt ??= result.clock;
      tidyHideout(account);
      result.clock += CAMPAIGN_CLOCK.betweenRoundsSeconds;
    }
    if (!won) return result;
  }
  result.finished = true;
  return result;
}

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? null : sorted[Math.floor(sorted.length / 2)]!;
};

/** The summary the calibration tests and report read: per-level medians and clock beats (plan 2.25). */
export function summarizeCampaigns(results: readonly CampaignResult[]) {
  const levels = [...new Set(results.flatMap((r) => r.runs.map((x) => x.levelId)))];
  return {
    campaigns: results.length,
    finished: results.filter((r) => r.finished).length,
    levels: levels.map((levelId) => {
      const runs = results.flatMap((r) => r.runs.filter((x) => x.levelId === levelId));
      const first = results.map((r) => r.runs.find((x) => x.levelId === levelId)).filter(Boolean);
      return {
        levelId,
        firstTryWins: first.filter((x) => x!.won).length,
        firstTries: first.length,
        medianSeconds: median(runs.filter((x) => x.won).map((x) => x.seconds)),
        medianKillsPerMinute: median(runs.map((x) => x.kills / (x.seconds / 60))),
        bossSeconds: runs.flatMap((x) => (x.bossSeconds === null ? [] : [x.bossSeconds])),
      };
    }),
    beats: {
      craftOrbsAt: median(results.flatMap((r) => r.beats.craftOrbsAt ?? [])),
      jewellerAt: median(results.flatMap((r) => r.beats.jewellerAt ?? [])),
      level4At: median(results.flatMap((r) => r.beats.level4At ?? [])),
      millerAt: median(results.flatMap((r) => r.beats.millerAt ?? [])),
      millerDefeatedAt: median(results.flatMap((r) => r.beats.millerDefeatedAt ?? [])),
    },
  };
}
