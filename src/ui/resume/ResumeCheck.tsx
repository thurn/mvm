import { useEffect, useState } from "react";
import { beginLevel, newAccount, resumeFromDocument, saveDocument } from "../../account/lifecycle";
import { LEVEL_1 } from "../../monsters/levels/level-1";
import { hashState } from "../../sim/hash";
import { step } from "../../sim/kernel";
import { POLICIES } from "../../sim/policies/policies";

const KEY = "mvm-resume-check";
const SAVE_AT = 1800;
const COMPARE_AT = 3600;

interface Pending {
  doc: ReturnType<typeof saveDocument>;
  expected: string;
}

interface CheckResult {
  ok: boolean;
  loadedTick: number;
  savedTick: number;
}

/** The second visit: load the saved round, play on, compare with the straight run. */
function verify(): CheckResult | null {
  const pending = sessionStorage.getItem(KEY);
  if (!pending) return null;
  sessionStorage.removeItem(KEY);
  const check = JSON.parse(pending) as Pending;
  const resumed = resumeFromDocument(check.doc);
  const round = resumed.round!;
  const loadedTick = round.tick;
  const policy = POLICIES.pvzOpener!;
  while (round.tick < COMPARE_AT) step(round, policy(round));
  const ok =
    resumed.roundRejected === null && loadedTick === SAVE_AT && hashState(round) === check.expected;
  return { ok, loadedTick, savedTick: SAVE_AT };
}

/**
 * `?scene=resume` (1.32): plays a round to tick 1,800, saves it, reloads the
 * page, loads the save, plays on to 3,600 and compares the hash with a
 * straight run. The result lands on `window.__mvm.resumeCheck`.
 */
export function ResumeCheck() {
  const [result] = useState(verify);
  useEffect(() => {
    if (result) {
      (window as unknown as { __mvm?: Record<string, unknown> }).__mvm!.resumeCheck = result;
      return;
    }
    const policy = POLICIES.pvzOpener!;
    const account = newAccount("ranger");
    const straight = beginLevel(structuredClone(account), LEVEL_1, 7);
    const saved = beginLevel(account, LEVEL_1, 7);
    while (straight.tick < COMPARE_AT) step(straight, policy(straight));
    while (saved.tick < SAVE_AT) step(saved, policy(saved));
    const check: Pending = {
      doc: saveDocument(account, saved, "resume-check", new Date().toISOString()),
      expected: hashState(straight),
    };
    sessionStorage.setItem(KEY, JSON.stringify(check));
    window.location.reload();
  }, [result]);
  return (
    <p data-testid="resume-check">
      {result
        ? result.ok
          ? "resume check: ok"
          : `resume check: failed (loaded at ${result.loadedTick})`
        : "saving and reloading…"}
    </p>
  );
}
