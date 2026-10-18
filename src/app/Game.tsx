import { useEffect, useMemo, useState } from "react";
import {
  applyStep,
  beginLevel,
  finishLevel,
  newAccount,
  resumeFromDocument,
  saveDocument,
} from "../account/lifecycle";
import type { AccountState } from "../account/state";
import { LEVEL_1 } from "../monsters/levels/level-1";
import { createMirrorClient } from "../save/mirror-client";
import { createIndexedDbStore, createMemoryStore, latestOf, type SaveStore } from "../save/storage";
import { POLICIES } from "../sim/policies/policies";
import type { RoundState } from "../sim/state";
import { STEPS_PER_SECOND } from "../sim/time";
import {
  createIndexedDbRing,
  createLogger,
  createMemoryRing,
  sendToSink,
  type Logger,
} from "../dev/log";
import type { SimEvent } from "../sim/events";
import { createIntentQueue, enqueue } from "../sim/intents";
import { HUD_BOTTOM, HUD_TOP, Hud } from "../ui/hud/Hud";
import { createRoundStore } from "../ui/hud/round-store";
import { Board, useBoardScale, type BoardSource } from "./Board";

const BUILD = import.meta.env.DEV ? "dev" : "build";

interface Session {
  account: AccountState;
  round: RoundState;
  store: SaveStore;
  mirror: ReturnType<typeof createMirrorClient>;
  logger: Logger;
}

function persist(session: Session): void {
  const doc = saveDocument(session.account, session.round, BUILD, new Date().toISOString());
  void session.store.write(doc);
  void session.mirror.post(doc);
  session.logger.log("save", {
    tick: session.round.tick,
    gold: session.account.gold,
    xp: session.account.player.xp,
  });
  void session.logger.flush();
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
 * The persisted game (P13–P14): loads the newest save from IndexedDB or the
 * mirror, resumes its round or starts Level 1, credits every step to the
 * account, and autosaves every second of sim time and when the page hides.
 * Focus select (1.34) replaces the default Warrior account.
 */
export function Game() {
  const [session, setSession] = useState<Session | null>(null);
  const [ended, setEnded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Environments without IndexedDB (tests) keep the game in memory.
      const store = typeof indexedDB === "undefined" ? createMemoryStore() : createIndexedDbStore();
      const mirror = createMirrorClient();
      const logger = createLogger({
        ring: typeof indexedDB === "undefined" ? createMemoryRing() : createIndexedDbRing(),
        ...(import.meta.env.DEV ? { send: sendToSink } : {}),
      });
      const doc = await latestOf(store, mirror);
      let account: AccountState;
      let round: RoundState | null = null;
      if (doc) {
        const resumed = resumeFromDocument(doc, (line) => logger.log("load", { line }));
        account = resumed.account;
        round = resumed.round;
        if (resumed.roundRejected) void mirror.reject(doc, { round: resumed.roundRejected });
      } else {
        account = newAccount("warrior");
      }
      if (!round) {
        round = beginLevel(account, LEVEL_1);
        logger.log("levelStart", { levelId: LEVEL_1.id, wavePlan: round.waves?.plan });
      }
      if (!cancelled) setSession({ account, round, store, mirror, logger });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const onHide = () => persist(session);
    const onVisibility = () => document.visibilityState === "hidden" && persist(session);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session]);

  const source = useMemo<BoardSource | null>(() => {
    if (!session) return null;
    const autoplay = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get("autoplay")
      : null;
    const policy = autoplay ? POLICIES[autoplay] : undefined;
    let finished = false;
    return {
      name: "game",
      create: () => session.round,
      ...(policy ? { intents: policy } : {}),
      onStep(round, events) {
        applyStep(session.account, round, events);
        logEvents(session.logger, round, events);
        if (round.tick % STEPS_PER_SECOND === 0) persist(session);
        if (round.result !== null && !finished) {
          finished = true;
          const summary = finishLevel(session.account, round);
          session.logger.log("levelResult", {
            levelId: LEVEL_1.id,
            result: summary.result,
            xp: summary.xpGained,
            drops: summary.drops.length,
          });
          persist(session);
          setEnded(
            `Level 1 ${summary.result}: ${summary.drops.length} drops, ${summary.xpGained} XP`,
          );
        }
      },
    };
  }, [session]);

  const scale = useBoardScale(HUD_TOP + HUD_BOTTOM);
  const queue = useMemo(() => createIntentQueue(), []);
  const store = useMemo(() => (session ? createRoundStore(session.round) : null), [session]);

  if (!source || !store) return <p>Loading…</p>;
  return (
    <>
      <Hud
        store={store}
        enqueue={(intent) => enqueue(queue, intent)}
        scale={scale}
        countdown={null}
      >
        <Board scene={source} scale={scale} queue={queue} onFrame={store.notify} />
      </Hud>
      {ended && <p style={{ textAlign: "center" }}>{ended}</p>}
    </>
  );
}
