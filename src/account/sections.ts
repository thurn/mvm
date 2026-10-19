import { withDefaults } from "../save/normalize";
import type { SectionDefinition } from "../save/registry";
import { createRound, type RoundState } from "../sim/state";
import { ACCOUNT_TUNING } from "../tuning/progression";
import type { AccountState } from "./state";

/** An account with nothing in it: the defaults normalize fills from (P15). */
export function emptyAccount(): AccountState {
  return {
    focus: null,
    roster: {
      slots: Array.from({ length: ACCOUNT_TUNING.rosterSlots }, () => null),
      unlocked: ACCOUNT_TUNING.startingUnlockedSlots,
      spell: null,
    },
    stash: { items: [], heroes: [], unrolled: [] },
    gold: 0,
    currency: {},
    player: { level: 1, xp: 0 },
    firstClears: [],
    pendingChoices: [],
    activeRun: null,
    nextSeed: 1,
    lootFilter: "showAll",
    vendorStock: null,
    buyback: [],
    vendorSeed: 1,
  };
}

const isObject = (value: unknown) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** The `account` save section, version 1 (P13). */
export const ACCOUNT_SECTION: SectionDefinition<AccountState> = {
  name: "account",
  schemaVersion: 1,
  migrations: {},
  normalize(raw, report) {
    const account = withDefaults(raw, emptyAccount(), report);
    account.roster = withDefaults(account.roster, emptyAccount().roster, (line) =>
      report(`roster: ${line}`),
    );
    account.stash = withDefaults(account.stash, emptyAccount().stash, (line) =>
      report(`stash: ${line}`),
    );
    account.player = withDefaults(account.player, emptyAccount().player, (line) =>
      report(`player: ${line}`),
    );
    return account;
  },
  validate(account) {
    const problems: string[] = [];
    if (
      !Array.isArray(account.roster.slots) ||
      account.roster.slots.length !== ACCOUNT_TUNING.rosterSlots
    ) {
      problems.push(`roster must have ${ACCOUNT_TUNING.rosterSlots} slots`);
    }
    if (!Number.isFinite(account.gold) || account.gold < 0)
      problems.push("gold must be a non-negative number");
    if (!isObject(account.currency)) problems.push("currency must be an object");
    if (!Array.isArray(account.buyback)) problems.push("buyback must be a list");
    if (!Number.isInteger(account.player.level) || account.player.level < 1)
      problems.push("player level must be ≥ 1");
    for (const key of ["items", "heroes", "unrolled"] as const) {
      if (!Array.isArray(account.stash[key])) problems.push(`stash.${key} must be a list`);
    }
    return problems;
  },
};

/** The `round` save section, version 1: the whole RoundState (P14). */
export const ROUND_SECTION: SectionDefinition<RoundState> = {
  name: "round",
  schemaVersion: 1,
  migrations: {},
  normalize: (raw, report) =>
    withDefaults(raw, createRound({ seed: 0, lanes: [], mana: 0 }), report),
  validate(round) {
    const problems: string[] = [];
    if (!Number.isInteger(round.tick) || round.tick < 0)
      problems.push("tick must be a non-negative integer");
    for (const key of [
      "lanes",
      "heroes",
      "monsters",
      "projectiles",
      "spells",
      "roster",
      "orbs",
      "earned",
    ] as const) {
      if (!Array.isArray(round[key])) problems.push(`${key} must be a list`);
    }
    if (!isObject(round.rng)) problems.push("rng must hold the streams");
    return problems;
  },
};
