import { useEffect, useState, useSyncExternalStore } from "react";
import { saveDocument } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import { audioEngine } from "../../audio";
import { baseItems, currencies } from "../../data";
import type { Logger } from "../../dev/log";
import { sharedSettings } from "../../juice/core/settings";
import type { SaveDocument } from "../../save/registry";
import type { SaveStore } from "../../save/storage";
import type { RoundState } from "../../sim/state";
import { createStreams, streamRng } from "../../sim/rng";
import {
  grantCurrency,
  grantGold,
  grantHero,
  grantItem,
  setPlayerLevel,
  skipToLevelEnd,
} from "./grants";
import { applyKnob, KNOBS } from "./knobs";

/** The golden fixtures (P15), bundled for "load a fixture" in dev builds only. */
const FIXTURES = import.meta.glob<{ schemaVersion: number; data: unknown }>(
  "../../save/fixtures/*/*.json",
  { eager: true, import: "default" },
);

interface DevMenuProps {
  account: AccountState | null;
  round: RoundState | null;
  store: SaveStore | null;
  logger: Logger | null;
  /** Persists the account (and round) after a grant. */
  save(): void;
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const box = {
  border: "1px solid #444",
  padding: 6,
  marginBottom: 6,
} as const;

/**
 * The dev menu (GDD §15, H §14), toggled with the backquote key in dev
 * builds: grants, player level and level skip, every knob and overlay, save
 * tools and log export.
 */
export function DevMenu({ account, round, store, logger, save }: DevMenuProps) {
  const [open, setOpen] = useState(false);
  const settingsStore = sharedSettings();
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.get);
  const [grant, setGrant] = useState({
    kind: "item",
    level: 5,
    rarity: "magic",
    itemClass: "",
    currencyId: currencies()[0]?.id ?? "",
    amount: 100,
  });
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState<SaveDocument[]>([]);
  const [checkpoint, setCheckpoint] = useState("");
  const [rng] = useState(() => streamRng(createStreams(Date.now() % 2 ** 31), "loot"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "`" && setOpen((o) => !o);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open && store) void store.history().then(setHistory);
  }, [open, store]);
  // The audio and tier logs change without a settings change: refresh twice a second while open.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;
  const newId = () => `dev-${Date.now().toString(36)}-${Math.floor(rng() * 1e6)}`;
  const doGrant = () => {
    if (!account) return setStatus("no account yet: press Play first");
    if (grant.kind === "item")
      grantItem(
        account,
        {
          level: grant.level,
          rarity: grant.rarity as "normal",
          ...(grant.itemClass ? { itemClass: grant.itemClass } : {}),
        },
        rng,
        newId,
      );
    else if (grant.kind === "hero" || grant.kind === "spell")
      grantHero(
        account,
        { kind: grant.kind, level: grant.level, rarity: grant.rarity as "normal" },
        rng,
        newId,
      );
    else if (grant.kind === "currency") grantCurrency(account, grant.currencyId, grant.amount);
    else grantGold(account, grant.amount);
    save();
    setStatus(`granted ${grant.kind}`);
  };
  const restore = async (doc: SaveDocument | null, what: string) => {
    if (!store || !doc) return setStatus(`no ${what}`);
    await store.write({ ...doc, savedAt: new Date().toISOString() });
    location.reload();
  };
  const loadFixture = (path: string) => {
    const section = FIXTURES[path]!;
    const isRound = path.includes("/round/");
    const accountFixture = Object.entries(FIXTURES).find(([p]) => p.includes("/account/"))?.[1];
    void restore(
      {
        format: 1,
        savedAt: new Date().toISOString(),
        build: "dev",
        account: (isRound ? accountFixture : section) as SaveDocument["account"],
        round: (isRound ? section : null) as SaveDocument["round"],
      },
      "fixture",
    );
  };
  const classes = [...new Set(baseItems().map((b) => b.itemClass))].sort();
  const engineLog = settings.audioLog ? audioEngine()?.log : undefined;
  const tierLog = settings.tierLog ? (window.__mvm?.tierLog ?? []) : [];

  return (
    <div
      data-testid="dev-menu"
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        width: 340,
        maxHeight: "90vh",
        overflow: "auto",
        zIndex: 1000,
        background: "rgba(12, 14, 18, 0.96)",
        color: "#ddd",
        font: "11px monospace",
        padding: 8,
        border: "1px solid #666",
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <b>Dev menu</b> (` to close) {status && <span style={{ color: "#9f9" }}>· {status}</span>}
      </div>

      <div style={box}>
        <b>Grant</b>
        <div>
          <select
            aria-label="grant kind"
            value={grant.kind}
            onChange={(e) => setGrant({ ...grant, kind: e.target.value })}
          >
            {["item", "hero", "spell", "currency", "gold"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>{" "}
          {(grant.kind === "item" || grant.kind === "hero" || grant.kind === "spell") && (
            <>
              <input
                aria-label="grant level"
                type="number"
                min={1}
                max={32}
                value={grant.level}
                style={{ width: 40 }}
                onChange={(e) => setGrant({ ...grant, level: Number(e.target.value) })}
              />{" "}
              <select
                aria-label="grant rarity"
                value={grant.rarity}
                onChange={(e) => setGrant({ ...grant, rarity: e.target.value })}
              >
                {["normal", "magic", "rare", ...(grant.kind === "item" ? ["unique"] : [])].map(
                  (r) => (
                    <option key={r}>{r}</option>
                  ),
                )}
              </select>
            </>
          )}
          {grant.kind === "item" && (
            <select
              aria-label="grant class"
              value={grant.itemClass}
              onChange={(e) => setGrant({ ...grant, itemClass: e.target.value })}
            >
              <option value="">any class</option>
              {classes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
          {grant.kind === "currency" && (
            <select
              aria-label="grant currency"
              value={grant.currencyId}
              onChange={(e) => setGrant({ ...grant, currencyId: e.target.value })}
            >
              {currencies().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {(grant.kind === "currency" || grant.kind === "gold") && (
            <input
              aria-label="grant amount"
              type="number"
              value={grant.amount}
              style={{ width: 60 }}
              onChange={(e) => setGrant({ ...grant, amount: Number(e.target.value) })}
            />
          )}{" "}
          <button type="button" onClick={doGrant}>
            Grant
          </button>
        </div>
        {account && (
          <div style={{ color: "#999" }}>
            stash: {account.stash.items.length} items, {account.stash.heroes.length} heroes · gold{" "}
            {account.gold}
          </div>
        )}
      </div>

      <div style={box}>
        <b>Player and level</b>
        <div>
          level{" "}
          <input
            aria-label="player level"
            type="number"
            min={1}
            defaultValue={account?.player.level ?? 1}
            style={{ width: 40 }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !account) return;
              setPlayerLevel(account, Number((e.target as HTMLInputElement).value));
              save();
              setStatus(`player level ${account.player.level}`);
            }}
          />{" "}
          (Enter to set) · skip to end:{" "}
          {(["won", "lost"] as const).map((result) => (
            <button
              key={result}
              type="button"
              disabled={!round || round.result !== null}
              onClick={() => round && skipToLevelEnd(round, result)}
            >
              {result}
            </button>
          ))}
        </div>
      </div>

      <div style={box}>
        <b>Knobs</b>
        {KNOBS.map((knob) => {
          const value = knob.read(settings);
          return (
            <label
              key={knob.key}
              style={{ display: "flex", justifyContent: "space-between", gap: 6 }}
            >
              <span>{knob.label}</span>
              {knob.kind === "toggle" ? (
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => applyKnob(settingsStore, knob.key, e.target.checked)}
                />
              ) : knob.kind === "select" ? (
                <select
                  value={String(value)}
                  onChange={(e) => applyKnob(settingsStore, knob.key, e.target.value)}
                >
                  {knob.options!.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <span>
                  <input
                    type="range"
                    min={knob.min}
                    max={knob.max}
                    step={knob.step}
                    value={Number(value)}
                    onChange={(e) => applyKnob(settingsStore, knob.key, Number(e.target.value))}
                  />{" "}
                  {Number(value).toFixed(2)}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {(engineLog || tierLog.length > 0) && (
        <div style={box}>
          {engineLog && (
            <div data-testid="audio-log-overlay">
              <b>audioLog</b>: {engineLog.played.slice(-20).join(", ")}
              {engineLog.dropped.length > 0 && <div>dropped: {engineLog.dropped.join(", ")}</div>}
            </div>
          )}
          {tierLog.length > 0 && (
            <div data-testid="tier-log-overlay">
              <b>tierLog</b>:{" "}
              {(tierLog as { event: string; tier: number }[])
                .slice(-10)
                .map((t) => `${t.event} T${t.tier}`)
                .join(", ")}
            </div>
          )}
        </div>
      )}

      <div style={box}>
        <b>Save tools</b>
        <div>
          <button
            type="button"
            disabled={!account}
            onClick={() =>
              account &&
              download(
                `mvm-save-${Date.now()}.json`,
                JSON.stringify(
                  saveDocument(account, round, "dev", new Date().toISOString()),
                  null,
                  2,
                ),
                "application/json",
              )
            }
          >
            Export document
          </button>{" "}
          <label>
            Import{" "}
            <input
              aria-label="import document"
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await restore(JSON.parse(await file.text()) as SaveDocument, "import");
              }}
            />
          </label>
        </div>
        <div>
          Restore one of the last {history.length}:{" "}
          <select
            aria-label="restore history"
            defaultValue=""
            onChange={(e) => void restore(history[Number(e.target.value)] ?? null, "save")}
          >
            <option value="" disabled>
              pick a save
            </option>
            {history.map((doc, i) => (
              <option key={`${doc.savedAt}-${i}`} value={i}>
                {doc.savedAt}
              </option>
            ))}
          </select>
        </div>
        <div>
          Checkpoint{" "}
          <input
            aria-label="checkpoint name"
            value={checkpoint}
            onChange={(e) => setCheckpoint(e.target.value)}
            style={{ width: 90 }}
          />{" "}
          <button
            type="button"
            onClick={async () =>
              store &&
              void restore(await store.readCheckpoint(checkpoint), `checkpoint ${checkpoint}`)
            }
          >
            Restore
          </button>
        </div>
        <div>
          Golden fixture:{" "}
          {Object.keys(FIXTURES).map((path) => (
            <button key={path} type="button" onClick={() => loadFixture(path)}>
              {path.split("/fixtures/")[1]}
            </button>
          ))}
        </div>
        <div>
          <button
            type="button"
            disabled={!logger}
            onClick={async () =>
              logger &&
              download(
                `mvm-log-${Date.now()}.jsonl`,
                await logger.exportJsonl(),
                "application/x-ndjson",
              )
            }
          >
            Export logs (JSONL)
          </button>
        </div>
      </div>
    </div>
  );
}
