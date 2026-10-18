import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  applyStep,
  beginLevel,
  finishLevel,
  newAccount,
  type LevelSummary,
  resumeFromDocument,
  saveDocument,
  type Resumed,
} from "../account/lifecycle";
import type { AccountState } from "../account/state";
import {
  createIndexedDbRing,
  createLogger,
  createMemoryRing,
  sendToSink,
  type Logger,
} from "../dev/log";
import { LEVEL_1 } from "../monsters/levels/level-1";
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
import { Credits } from "../ui/title/Credits";
import { FocusSelect } from "../ui/title/FocusSelect";
import { MenuScreen } from "../ui/title/layout";
import { TitleScreen } from "../ui/title/TitleScreen";
import { route, type RouteAction, type Screen } from "./router";
import { acceptsIntent, bootDecision, countdownAt } from "./boot";
import { Board, useBoardScale, type BoardSource } from "./Board";
import { DevMenu } from "../ui/dev/DevMenu";
import { Hideout } from "../ui/hideout/Hideout";
import { rollUnrolled } from "../account/stash";
import { LevelEnd, xpSnapshot, type XpSnapshot } from "../ui/level-end/LevelEnd";

const BUILD = import.meta.env.DEV ? "dev" : "build";
/** How long the board stays up after a level ends, so its banner and stinger play. */
const LEVEL_END_HOLD_MS = 1500;

interface Services {
  store: SaveStore;
  mirror: ReturnType<typeof createMirrorClient>;
  logger: Logger;
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

type Phase =
  | { kind: "loading" }
  | {
      kind: "menu";
      screen: Exclude<Screen, "level">;
      account: AccountState | null;
      /** The last level's summary; none after a reload with a hero pick pending. */
      summary?: LevelSummary;
      before?: XpSnapshot;
    }
  | ({ kind: "playing" } & Playing);

function persist(services: Services, account: AccountState, round: RoundState | null): void {
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
      const doc = await latestOf(store, mirror);
      let resumed: Resumed | null = null;
      if (doc) {
        resumed = resumeFromDocument(doc, (line) => logger.log("load", { line }));
        if (resumed.roundRejected) void mirror.reject(doc, { round: resumed.roundRejected });
      }
      if (cancelled) return;
      setServices({ store, mirror, logger });
      const decision = bootDecision(resumed);
      if (decision.kind === "title" || decision.kind === "pick" || !resumed?.round) {
        setPhase({
          kind: "menu",
          screen: decision.kind === "pick" ? "levelEnd" : "title",
          account: resumed?.account ?? null,
        });
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
          const summary = finishLevel(playing.account, round);
          services.logger.log("levelResult", {
            levelId: LEVEL_1.id,
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

  const play = (account: AccountState | null) => {
    if (!services) return;
    const owner = account ?? newAccount("warrior");
    const round = beginLevel(owner, LEVEL_1);
    services.logger.log("levelStart", { levelId: LEVEL_1.id, wavePlan: round.waves?.plan });
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
  const go = (action: RouteAction) => {
    if (phase.kind !== "menu") return;
    const next = route(phase.screen, action, {
      hasAccount: phase.account !== null,
      hasRound: false,
    });
    if (next === "level") play(phase.account);
    else {
      // Hero and spell drops wait unrolled in the stash until the hideout opens (1.18).
      if (next === "hideout" && phase.account && rollUnrolled(phase.account) > 0 && services)
        persist(services, phase.account, null);
      setPhase({ ...phase, screen: next });
    }
  };

  // The dev menu (GDD §15), in dev builds only; backquote opens it.
  const devAccount = phase.kind === "menu" ? phase.account : (playing?.account ?? null);
  const devMenu = import.meta.env.DEV ? (
    <DevMenu
      account={devAccount}
      round={playing?.round ?? null}
      store={services?.store ?? null}
      logger={services?.logger ?? null}
      save={() => services && devAccount && persist(services, devAccount, playing?.round ?? null)}
    />
  ) : null;
  if (phase.kind === "loading") return <p>Loading…</p>;
  if (phase.kind === "menu") {
    const save = { hasAccount: phase.account !== null, hasRound: false };
    const screens: Record<Exclude<Screen, "level">, ReactElement> = {
      title: (
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
      ),
      focus: (
        <FocusSelect
          onBack={() => go("back")}
          onChoose={(focus) => {
            const account = newAccount(focus);
            if (services) persist(services, account, null);
            setPhase({ kind: "menu", screen: "campaign", account });
          }}
        />
      ),
      campaign: (
        <Campaign
          cleared={phase.account?.firstClears.includes(LEVEL_1.id) ?? false}
          onPlay={() => go("playLevel")}
          onHideout={() => go("hideout")}
        />
      ),
      credits: <Credits onBack={() => go("back")} />,
      levelEnd: phase.account ? (
        <LevelEnd
          account={phase.account}
          summary={phase.summary ?? null}
          before={phase.before ?? null}
          onSave={() => services && phase.account && persist(services, phase.account, null)}
          onReplay={() => go("replay")}
          onHideout={() => go("hideout")}
        />
      ) : (
        <MenuScreen music="hideout">No level to summarise.</MenuScreen>
      ),
      hideout: phase.account ? (
        <Hideout
          account={phase.account}
          onSave={() => services && phase.account && persist(services, phase.account, null)}
          onPlay={() => go("playLevel")}
        />
      ) : (
        <MenuScreen music="hideout">No account yet.</MenuScreen>
      ),
    };
    return (
      <>
        {screens[phase.screen]}
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
