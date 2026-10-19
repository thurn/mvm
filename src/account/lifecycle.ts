import { acquireItem } from "./stash";
import { mergeShards, SHARDS } from "../loot/craft/heroes";
import { itemSellPrice } from "../loot/prices";
import { chooseOneOfThree } from "../heroes/gen/generate";
import { starterCard } from "../heroes/model/starter";
import type { GemId } from "../data/types";
import type { LevelDefinition } from "../monsters/levels/types";
import { CAMPAIGN } from "../monsters/levels/grassland";
import { startLevel } from "../monsters/waves";
import { lockRoster } from "../sim/economy/roster";
import type { SimEvent } from "../sim/events";
import { streamRng } from "../sim/rng";
import { newInstanceId, type RoundState } from "../sim/state";
import { createRegistry, load, SAVE_SECTIONS, type SaveDocument } from "../save/registry";
import { FOCUSES } from "../sim/policies/focus";
import { catalogEntry } from "../heroes/model/catalog";
import { firstClearReward, PROGRESSION_TUNING } from "../tuning/progression";
import type { Drop } from "../loot/drops";
import { reconcileAccount } from "./reconcile";
import { heroOffer } from "./rewards";
import { emptyAccount } from "./sections";
import type { AccountState } from "./state";
import { isUpgrade } from "./upgrades";
import { killXp, levelForXp, xpForLevel } from "./xp";

type Log = (line: string) => void;

/** Every level the build knows, by ID. */
const LEVELS: Readonly<Record<string, LevelDefinition>> = Object.fromEntries(
  CAMPAIGN.map((level) => [level.id, level]),
);

/** Whether a level can be played: the first always, every other once the one before is cleared (D §6.3). */
export function isUnlocked(account: AccountState, level: LevelDefinition): boolean {
  const before = CAMPAIGN[CAMPAIGN.indexOf(level) - 1];
  return !before || account.firstClears.includes(before.id);
}

/** The furthest level the account can play: its next first clear, or the last level once all are cleared. */
export function furthestLevel(account: AccountState): LevelDefinition {
  return [...CAMPAIGN].reverse().find((level) => isUnlocked(account, level))!;
}

/** A new account for a focus: its Appendix B §4 kit at level 1 with the normal starter bases. */
export function newAccount(focus: string): AccountState {
  const kit = FOCUSES[focus];
  if (!kit) throw new Error(`unknown focus ${focus}`);
  const account = emptyAccount();
  account.focus = focus;
  let slot = 0;
  for (const skill of kit) {
    const card = starterCard(skill as GemId, 1, `${focus}-${slot}-${skill}`);
    if (catalogEntry(skill).role === "spell") account.roster.spell = card;
    else account.roster.slots[slot++] = card;
  }
  return account;
}

/** The active roster's cards: the unlocked slots, then the spell. */
function activeCards(account: AccountState) {
  return [
    ...account.roster.slots.slice(0, account.roster.unlocked).flatMap((c) => (c ? [c] : [])),
    ...(account.roster.spell ? [account.roster.spell] : []),
  ];
}

/** Starts a level: a fresh round with its wave plan, the roster locked in (1.19). */
export function beginLevel(
  account: AccountState,
  level: LevelDefinition,
  seed = account.nextSeed++,
): RoundState {
  const round = startLevel(level, seed);
  round.lootFilter = account.lootFilter;
  lockRoster(round, activeCards(account));
  account.activeRun = { levelId: level.id, xp: 0 };
  return round;
}

/** The highest area level unlocked (B §1.6's hero level cap reads it). */
function unlockedArea(account: AccountState): number {
  return furthestLevel(account).areaLevel;
}

function grantXp(account: AccountState, xp: number): void {
  account.player.xp += xp;
  account.player.level = levelForXp(account.player.xp);
  if (account.activeRun) account.activeRun.xp += xp;
  const cap = Math.min(
    PROGRESSION_TUNING.heroLevelCap,
    unlockedArea(account) + PROGRESSION_TUNING.heroCapOverArea,
  );
  for (const card of activeCards(account)) {
    // XP past the cap is discarded (Appendix E §6.2).
    card.hero.xp = Math.min(card.hero.xp + xp, xpForLevel(cap + 1) - 1);
    card.hero.level = Math.max(card.hero.level, levelForXp(card.hero.xp, cap));
  }
}

function credit(account: AccountState, drop: Drop): void {
  switch (drop.kind) {
    case "item":
      // A hidden drop converts at level end instead (C §C.7).
      if (!drop.hidden) acquireItem(account, drop.item);
      break;
    case "hero":
    case "spell":
      account.stash.unrolled.push(drop);
      break;
    case "currency":
      account.currency[drop.currencyId] = (account.currency[drop.currencyId] ?? 0) + 1;
      break;
    case "gold":
      account.gold += drop.amount;
      break;
  }
}

/**
 * The lifecycle hook (1.19): applies one step's events to the account in the
 * same step the sim credited them to `round.earned`: drops and kill XP. The
 * sim never sees the account.
 */
export function applyStep(
  account: AccountState,
  round: RoundState,
  events: readonly SimEvent[],
): void {
  const areaLevel = round.waves?.plan.areaLevel ?? 1;
  for (const event of events) {
    if (event.type === "drop") credit(account, event.drop);
    if (event.type === "kill" && event.rarity !== null)
      grantXp(account, killXp(areaLevel, event.rarity, account.player.level));
  }
}

export interface LevelSummary {
  result: "won" | "lost";
  xpGained: number;
  firstClear: boolean;
  drops: { drop: Drop; upgrade: boolean }[];
}

/**
 * Ends a level (1.19): keeps everything credited, grants a first clear's
 * reward (Level 1 unlocks slot 4 and offers 1 of 3 heroes), and flags
 * upgrades among the drops.
 */
export function finishLevel(account: AccountState, round: RoundState): LevelSummary {
  const levelId = round.waves?.plan.levelId ?? account.activeRun?.levelId ?? "";
  const result = round.result === "won" ? "won" : "lost";
  const firstClear = result === "won" && !account.firstClears.includes(levelId);
  if (firstClear) {
    account.firstClears.push(levelId);
    const reward = firstClearReward(levelId);
    if (reward?.unlockSlot)
      account.roster.unlocked = Math.max(account.roster.unlocked, reward.unlockSlot);
    for (const [currencyId, count] of Object.entries(reward?.currency ?? {}))
      account.currency[currencyId] = (account.currency[currencyId] ?? 0) + count;
    if (reward?.heroOffer) {
      const rng = streamRng(round.rng, "heroGen");
      const newId = () => newInstanceId<"OwnedHero">(round);
      const { rarity, level } = reward.heroOffer;
      account.pendingChoices.push({
        levelId,
        options:
          rarity === "normal"
            ? heroOffer(account, level, rng, newId)
            : chooseOneOfThree({
                kind: "hero",
                rarity,
                level,
                areaLevel: round.waves?.plan.areaLevel ?? 1,
                roster: activeCards(account).map((c) => c.hero.skillId),
                rng,
                newId,
              }),
      });
    }
  }
  // Hidden drops convert, won or lost (C §C.7): Normal into its sell value, low-tier Magic into a Transmutation Shard.
  for (const { drop } of round.earned) {
    if (drop.kind !== "item" || !drop.hidden) continue;
    if (drop.item.rarity === "normal") account.gold += itemSellPrice(drop.item);
    else account.currency[SHARDS.transmutation] = (account.currency[SHARDS.transmutation] ?? 0) + 1;
  }
  mergeShards(account);
  const xpGained = account.activeRun?.xp ?? 0;
  account.activeRun = null;
  return {
    result,
    xpGained,
    firstClear,
    drops: round.earned.map(({ drop }) => ({
      drop,
      upgrade: drop.kind === "item" && isUpgrade(account, drop.item),
    })),
  };
}

/** The save document for the account and the round in progress, if any (P13). `savedAt` is ISO wall time from the caller. */
export function saveDocument(
  account: AccountState,
  round: RoundState | null,
  build: string,
  savedAt: string,
): SaveDocument {
  return {
    format: 1,
    savedAt,
    build,
    account: { schemaVersion: 1, data: account },
    round: round && round.result === null ? { schemaVersion: 1, data: round } : null,
  };
}

export interface Resumed {
  account: AccountState;
  round: RoundState | null;
  /** Why the saved round was discarded, when it was (P14). */
  roundRejected: string | null;
}

/**
 * Loads a save (P13–P17): the account always, reconciled against the
 * current data; the round when it loads, else a fresh start of the level
 * it belonged to.
 */
export function resumeFromDocument(doc: SaveDocument | string, log: Log = () => {}): Resumed {
  const result = load(doc, createRegistry(SAVE_SECTIONS), log);
  if (!result.account.ok || !result.account.data) {
    throw new Error(
      `the account does not load: ${result.account.ok ? "missing" : result.account.reason}`,
    );
  }
  const account = reconcileAccount(result.account.data as AccountState, log);
  if (result.round.ok)
    return {
      account,
      round: (result.round.data as RoundState | null) ?? null,
      roundRejected: null,
    };
  log(
    `[save] round rejected (${result.round.reason}); restarting ${account.activeRun?.levelId ?? "no level"}`,
  );
  const level = account.activeRun ? LEVELS[account.activeRun.levelId] : undefined;
  return {
    account,
    round: level ? beginLevel(account, level) : null,
    roundRejected: result.round.reason,
  };
}
