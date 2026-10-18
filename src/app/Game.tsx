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
import { Board, type BoardSource } from "./Board";

const BUILD = import.meta.env.DEV ? "dev" : "build";

interface Session {
  account: AccountState;
  round: RoundState;
  store: SaveStore;
  mirror: ReturnType<typeof createMirrorClient>;
}

function persist(session: Session): void {
  const doc = saveDocument(session.account, session.round, BUILD, new Date().toISOString());
  void session.store.write(doc);
  void session.mirror.post(doc);
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
      const doc = await latestOf(store, mirror);
      let account: AccountState;
      let round: RoundState | null = null;
      if (doc) {
        const resumed = resumeFromDocument(doc, (line) => console.info(line));
        account = resumed.account;
        round = resumed.round;
        if (resumed.roundRejected) void mirror.reject(doc, { round: resumed.roundRejected });
      } else {
        account = newAccount("warrior");
      }
      if (!round) round = beginLevel(account, LEVEL_1);
      if (!cancelled) setSession({ account, round, store, mirror });
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
        if (round.tick % STEPS_PER_SECOND === 0) persist(session);
        if (round.result !== null && !finished) {
          finished = true;
          const summary = finishLevel(session.account, round);
          persist(session);
          setEnded(
            `Level 1 ${summary.result}: ${summary.drops.length} drops, ${summary.xpGained} XP`,
          );
        }
      },
    };
  }, [session]);

  if (!source) return <p>Loading…</p>;
  return (
    <>
      <Board scene={source} />
      {ended && <p style={{ textAlign: "center" }}>{ended}</p>}
    </>
  );
}
