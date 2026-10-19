import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  applyStep,
  beginLevel,
  finishLevel,
  newAccount,
  type LevelSummary,
  resumeFromDocument,
  saveDocument,
  type Resumed,
  furthestLevel,
  isUnlocked,
} from "../account/lifecycle";
import type { AccountState } from "../account/state";
import {
  createIndexedDbRing,
  createLogger,
  createMemoryRing,
  sendToSink,
  type Logger,
} from "../dev/log";
import { createMirrorClient } from "../save/mirror-client";
import { createIndexedDbStore, createMemoryStore, latestOf, type SaveStore } from "../save/storage";
import type { SimEvent } from "../sim/events";
import { createIntentQueue, enqueue, type Intent } from "../sim/intents";
import { POLICIES } from "../sim/policies/policies";
import type { RoundState } from "../sim/state";
import { STEPS_PER_SECOND } from "../sim/time";
import { HUD_BOTTOM, HUD_TOP } from "../ui/hud/Hud";
import { createRoundStore } from "../ui/hud/round-store";
import { RestartBanner } from "../ui/resume/Banner";
import { ResumeHud } from "../ui/resume/ResumeHud";
import { Campaign } from "../ui/title/Campaign";
import { CAMPAIGN } from "../monsters/levels/grassland";
import { Credits } from "../ui/title/Credits";
import { FocusSelect } from "../ui/title/FocusSelect";
import { TitleScreen } from "../ui/title/TitleScreen";
import { route, type RouteAction, type Screen } from "./router";
import { acceptsIntent, bootDecision, countdownAt } from "./boot";
import { Board, useBoardScale, type BoardSource } from "./Board";
import { DevMenu } from "../ui/dev/DevMenu";
import { forgetSettings } from "../juice/core/settings";
import { Hideout } from "../ui/hideout/Hideout";
import { rollUnrolled } from "../account/stash";
import { createAccountStore } from "../account/store";
import { LevelEnd, xpSnapshot, type XpSnapshot } from "../ui/level-end/LevelEnd";

const BUILD = import.meta.env.DEV ? "dev" : "build";
/** How long the board stays up after a level ends, so its banner and stinger play. */
const LEVEL_END_HOLD_MS = 1500;

interface Services {
  store: SaveStore;
  mirror: ReturnType<typeof createMirrorClient>;
  logger: Logger;
  /** True from the dev QA reset until a new account starts, so a frame of the old game can't re-save it. */
  halted(): boolean;
}

/** The dev QA reset (mason hv-7ic2.106): forgets the local saves, the log ring and the mirror. */
async function forgetSaves(services: Omit<Services, "halted">): Promise<void> {
  await Promise.all([services.store.clear(), services.logger.clear(), services.mirror.clear()]);
}

interface Playing {
  account: AccountState;
  round: RoundState;
  /** Wall time the resume countdown started, or null when there is none. */
  countdownStartedAt: number | null;
  /** XP when this session entered the level, for the summary's bars. */
  before: XpSnapshot;
  banner: string | null;
}

/** Menu screens that need an account; the router only reaches them with one. */
type AccountScreen = "campaign" | "levelEnd" | "hideout";

type MenuPhase =
  | { kind: "menu"; screen: Exclude<Screen, "level" | AccountScreen>; account: AccountState | null }
  | { kind: "menu"; screen: "campaign" | "hideout"; account: AccountState }
  | {
      kind: "menu";
      screen: "levelEnd";
      account: AccountState;
      /** The last level's summary; none after a reload with a hero pick pending. */
      summary?: LevelSummary;
      before?: XpSnapshot;
    };

type Phase = { kind: "loading" } | MenuPhase | ({ kind: "playing" } & Playing);

/** A menu phase for a screen, checking at the transition that account screens have an account. */
function menuPhase(screen: Exclude<Screen, "level">, account: AccountState | null): MenuPhase {
  if (screen === "title" || screen === "focus" || screen === "credits")
    return { kind: "menu", screen, account };
  if (!account) throw new Error(`the ${screen} screen needs an account`);
  return { kind: "menu", screen, account };
}

function persist(services: Services, account: AccountState, round: RoundState | null): void {
  if (services.halted()) return;
  const doc = saveDocument(account, round, BUILD, new Date().toISOString());
  void services.store.write(doc);
  void services.mirror.post(doc);
  services.logger.log("save", {
    tick: round?.tick ?? null,
    gold: account.gold,
    xp: account.player.xp,
  });
  void services.logger.flush();
}

/** The events worth a log line (P23), with IDs and full rolls, never names. */
function logEvents(logger: Logger, round: RoundState, events: readonly SimEvent[]): void {
  for (const event of events) {
    if (event.type === "drop")
      logger.log("drop", {
        tick: round.tick,
        dropId: event.dropId,
        monsterId: event.monsterId,
        drop: event.drop,
      });
    else if (
      event.type === "placed" ||
      event.type === "leak" ||
      event.type === "waveStart" ||
      event.type === "levelEnd"
    ) {
      logger.log(event.type, { tick: round.tick, ...event });
    }
  }
}

/**
 * The persisted game (P13–P14): boots from the newest save in IndexedDB or
 * the mirror into the title, a resumed round behind a 3-2-1 countdown, or a
 * restarted level with a banner; credits every step to the account; and
 * autosaves every second of sim time and when the page hides.
 */
export function Game() {
  const [services, setServices] = useState<Services | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const halt = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Environments without IndexedDB (tests) keep the game in memory.
      const memory = typeof indexedDB === "undefined";
      const store = memory ? createMemoryStore() : createIndexedDbStore();
      const mirror = createMirrorClient();
      const logger = createLogger({
        ring: memory ? createMemoryRing() : createIndexedDbRing(),
        ...(import.meta.env.DEV ? { send: sendToSink } : {}),
      });
      // ?reset=1 (or ?reset=settings) starts QA from nothing: no saves, no mirror, optionally default settings.
      const reset = import.meta.env.DEV
        ? new URLSearchParams(window.location.search).get("reset")
        : null;
      if (reset !== null) {
        await forgetSaves({ store, mirror, logger });
        if (reset === "settings") forgetSettings();
        const url = new URL(window.location.href);
        url.searchParams.delete("reset");
        window.history.replaceState(null, "", url);
      }
      const doc = await latestOf(store, mirror);
      let resumed: Resumed | null = null;
      if (doc) {
        resumed = resumeFromDocument(doc, (line) => logger.log("load", { line }));
        if (resumed.roundRejected) void mirror.reject(doc, { round: resumed.roundRejected });
      }
      if (cancelled) return;
      setServices({ store, mirror, logger, halted: () => halt.current });
      const decision = bootDecision(resumed);
      if (decision.kind === "title" || decision.kind === "pick" || !resumed?.round) {
        setPhase(
          menuPhase(decision.kind === "pick" ? "levelEnd" : "title", resumed?.account ?? null),
        );
      } else {
        logger.log("resume", { decision: decision.kind, tick: resumed.round.tick });
        setPhase({
          kind: "playing",
          account: resumed.account,
          round: resumed.round,
          countdownStartedAt: decision.kind === "resume" ? performance.now() : null,
          before: xpSnapshot(resumed.account),
          banner: decision.kind === "restart" ? decision.reason : null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const playing = phase.kind === "playing" ? phase : null;

  useEffect(() => {
    if (!playing || !services) return;
    const save = () => persist(services, playing.account, playing.round);
    const onVisibility = () => document.visibilityState === "hidden" && save();
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playing, services]);

  // The dev QA reset on window.__mvm: forget everything and land on a fresh title, from any screen.
  useEffect(() => {
    if (!import.meta.env.DEV || !services || !window.__mvm) return;
    window.__mvm.reset = async ({ settings = false } = {}) => {
      halt.current = true;
      await forgetSaves(services);
      if (settings) forgetSettings();
      setPhase(menuPhase("title", null));
    };
  }, [services]);

  // One store per account: screens and the dev menu change, save and re-render through it.
  const account = phase.kind === "menu" ? phase.account : (playing?.account ?? null);
  const round = playing?.round ?? null;
  const accountStore = useMemo(
    () =>
      account && services
        ? createAccountStore(account, (changed) => persist(services, changed, round))
        : null,
    [account, services, round],
  );

  /** The level last played, so the level end's Replay repeats it. */
  const [lastLevel, setLastLevel] = useState<string | null>(null);
  const queue = useMemo(() => createIntentQueue(), []);
  const scale = useBoardScale(HUD_TOP + HUD_BOTTOM);
  const store = useMemo(() => (playing ? createRoundStore(playing.round) : null), [playing]);

  const source = useMemo<BoardSource | null>(() => {
    if (!playing || !services) return null;
    const autoplay = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get("autoplay")
      : null;
    const policy = autoplay ? POLICIES[autoplay] : undefined;
    let finished = false;
    return {
      name: "game",
      create: () => playing.round,
      ...(policy ? { intents: policy } : {}),
      onStep(round, events) {
        applyStep(playing.account, round, events);
        logEvents(services.logger, round, events);
        if (round.tick % STEPS_PER_SECOND === 0) persist(services, playing.account, round);
        if (round.result !== null && !finished) {
          finished = true;
          // Replay repeats this level, resumed from a save or not.
          const finishedLevel = round.waves?.plan.levelId;
          if (finishedLevel) setLastLevel(finishedLevel);
          const summary = finishLevel(playing.account, round);
          services.logger.log("levelResult", {
            levelId: round.waves?.plan.levelId ?? "",
            result: summary.result,
            xp: summary.xpGained,
            drops: summary.drops.length,
          });
          persist(services, playing.account, null);
          // The level-end banner and stinger play on the board first, then the level-end screen.
          setTimeout(
            () =>
              setPhase({
                kind: "menu",
                screen: "levelEnd",
                account: playing.account,
                summary,
                before: playing.before,
              }),
            LEVEL_END_HOLD_MS,
          );
        }
      },
    };
  }, [playing, services]);

  const play = (account: AccountState | null, levelId?: string) => {
    if (!services) return;
    const owner = account ?? newAccount("warrior");
    halt.current = false;
    // A level the map picked, if unlocked; else the furthest unlocked level (D §6.3).
    const picked = CAMPAIGN.find((l) => l.id === levelId);
    const level = picked && isUnlocked(owner, picked) ? picked : furthestLevel(owner);
    const round = beginLevel(owner, level);
    services.logger.log("levelStart", { levelId: level.id, wavePlan: round.waves?.plan });
    setPhase({
      kind: "playing",
      account: owner,
      round,
      countdownStartedAt: null,
      banner: null,
      before: xpSnapshot(owner),
    });
  };

  /** Follows the router from a menu screen (1.34); "level" starts the level. */
  const go = (action: RouteAction, levelId?: string) => {
    if (phase.kind !== "menu") return;
    const next = route(phase.screen, action, {
      hasAccount: phase.account !== null,
      hasRound: false,
    });
    // Replay repeats the level just played; the hideout plays the furthest.
    if (next === "level")
      play(phase.account, levelId ?? (action === "replay" ? (lastLevel ?? undefined) : undefined));
    else {
      // Hero and spell drops wait unrolled in the stash until the hideout opens (1.18).
      if (next === "hideout") accountStore?.update((a) => rollUnrolled(a) > 0);
      setPhase(menuPhase(next, phase.account));
    }
  };

  // The dev menu (GDD §15), in dev builds only; backquote opens it.
  const devMenu = import.meta.env.DEV ? (
    <DevMenu
      accountStore={accountStore}
      round={round}
      store={services?.store ?? null}
      logger={services?.logger ?? null}
    />
  ) : null;
  if (phase.kind === "loading") return <p>Loading…</p>;
  if (phase.kind === "menu") {
    const save = { hasAccount: phase.account !== null, hasRound: false };
    const screen = (): ReactElement => {
      switch (phase.screen) {
        case "title":
          return (
            <TitleScreen
              save={save}
              {...(phase.account?.focus
                ? {
                    continuing: `${phase.account.focus[0]!.toUpperCase()}${phase.account.focus.slice(1)}, level ${phase.account.player.level}`,
                  }
                : {})}
              onNewGame={() => go("newGame")}
              onContinue={() => go("continue")}
              onCredits={() => go("credits")}
            />
          );
        case "focus":
          return (
            <FocusSelect
              onBack={() => go("back")}
              onChoose={(focus) => {
                const account = newAccount(focus);
                halt.current = false;
                if (services) persist(services, account, null);
                setPhase(menuPhase("campaign", account));
              }}
            />
          );
        case "credits":
          return <Credits onBack={() => go("back")} />;
        case "campaign":
          return (
            <Campaign
              account={phase.account}
              onPlay={(levelId) => go("playLevel", levelId)}
              onHideout={() => go("hideout")}
            />
          );
        case "levelEnd":
          return accountStore ? (
            <LevelEnd
              store={accountStore}
              summary={phase.summary ?? null}
              before={phase.before ?? null}
              onReplay={() => go("replay")}
              onHideout={() => go("hideout")}
            />
          ) : (
            <p>Loading…</p>
          );
        case "hideout":
          return accountStore ? (
            <Hideout
              store={accountStore}
              onPlay={() => go("playLevel")}
              onMap={() => go("campaign")}
            />
          ) : (
            <p>Loading…</p>
          );
      }
    };
    return (
      <>
        {screen()}
        {devMenu}
      </>
    );
  }
  if (!source || !store || !playing) return <p>Loading…</p>;
  const countdownStartedAt = playing.countdownStartedAt;
  const send = (intent: Intent) => {
    if (acceptsIntent(countdownAt(countdownStartedAt, performance.now()), intent))
      enqueue(queue, intent);
  };
  return (
    <>
      {devMenu}
      {playing.banner && (
        <RestartBanner
          reason={playing.banner}
          onDismiss={() => setPhase({ ...playing, banner: null })}
        />
      )}
      <ResumeHud
        store={store}
        enqueue={send}
        scale={scale}
        countdownStartedAt={countdownStartedAt}
        onAbandon={() => enqueue(queue, { type: "abandon" })}
      >
        <Board
          scene={source}
          scale={scale}
          queue={queue}
          onFrame={store.notify}
          isPaused={() => countdownAt(countdownStartedAt, performance.now()) !== null}
        />
      </ResumeHud>
    </>
  );
}
