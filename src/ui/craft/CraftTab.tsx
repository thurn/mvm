import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { AccountState } from "../../account/state";
import type { AccountStore } from "../../account/store";
import { audioEngine } from "../../audio";
import type { Sound } from "../../audio/engine";
import { mods } from "../../data";
import type { ItemInstance } from "../../heroes/model/item";
import { craft, ITEM_ORBS, orbRefusal, type CraftRefusal, type ItemOrb } from "../../loot/craft";
import { affixRank } from "../../loot/filter";
import { drawOrb } from "../cards/orbs";
import { CRAFT_TUNING as C } from "../../tuning/juice";
import { useAccount } from "../account";
import { affixLines } from "../cards/affixes";
import { ItemCard } from "../cards/ItemCard";
import { RARITY_COLOR } from "../cards/parts";
import { Burst, Flash, TierPackage } from "../fx";
import { MENU } from "../title/layout";

const ORB_NAMES: Readonly<Record<ItemOrb, string>> = {
  transmutation: "Orb of Transmutation",
  augmentation: "Orb of Augmentation",
  regal: "Regal Orb",
  exalted: "Exalted Orb",
  alchemy: "Orb of Alchemy",
};

const REFUSAL_TEXT: Readonly<Record<CraftRefusal, string>> = {
  corrupted: "corrupted items can't be changed",
  "wrong-rarity": "it can't go on that rarity",
  full: "that item has no room for another mod",
  "no-legal-mod": "no mod can roll there",
  "no-orb": "you have none",
  "unknown-item": "that item is gone",
};

/** Raises the rarity (the frame sweeps, the drop stinger plays) or adds a mod (the line highlights, a ping). */
const RAISES: ReadonlySet<ItemOrb> = new Set(["transmutation", "regal", "alchemy"]);

const play = (id: Sound) => audioEngine()?.play(id);

interface Reveal {
  key: number;
  itemId: string;
  orb: ItemOrb;
  phase: "slam" | "result";
  rarity?: ItemInstance["rarity"];
  /** Display lines of the mods the craft added. */
  lines?: string[];
  /** A new mod at the best tier its item level allows (H §9.2's jackpot). */
  jackpot?: boolean;
}

const STYLE = `@keyframes mvm-craft-slam { from { transform: scale(${C.slamScale}); opacity: 1; } to { transform: scale(0); opacity: 0.6; } }
@keyframes mvm-craft-pulse { 50% { box-shadow: 0 0 10px 2px #E0C060; } }
@keyframes mvm-craft-sweep { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes mvm-craft-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes mvm-craft-highlight { from { background: rgba(224, 192, 96, 0.35); } to { background: transparent; } }
@keyframes mvm-craft-stamp { from { transform: scale(1.6) rotate(-8deg); opacity: 0; } to { transform: scale(1) rotate(-8deg); opacity: 1; } }`;

function OrbIcon({ orb, size = 32 }: { orb: ItemOrb; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawOrb(ctx, ITEM_ORBS[orb], 0, 0);
  }, [orb]);
  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

/** Every item the account holds: the stash, then what the roster wears. */
function craftableItems(account: AccountState): { item: ItemInstance; where: string }[] {
  const worn = account.roster.slots.flatMap((card, i) =>
    card
      ? (["weapon", "armour", "accessory"] as const).flatMap((part) =>
          card[part] ? [{ item: card[part]!, where: `slot ${i + 1}` }] : [],
        )
      : [],
  );
  return [...account.stash.items.map((item) => ({ item, where: "stash" })), ...worn];
}

/**
 * The Craft tab (GDD §15, Appendix H §9.2): pick up an orb by click or drag,
 * valid targets pulse and invalid ones dim; dropping it slams the orb into
 * the item, holds a suspense beat, then reveals the result: a rarity sweep
 * with typed-in lines and the drop stinger, or an added line that stays
 * highlighted with a ping. A new top-tier mod earns the T1 stamp.
 */
export function CraftTab({ store }: { store: AccountStore }) {
  const account = useAccount(store);
  const [held, setHeld] = useState<ItemOrb | null>(null);
  const [status, setStatus] = useState("");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const keys = useRef(0);

  const count = (orb: ItemOrb) => account.currency[ITEM_ORBS[orb]] ?? 0;

  function apply(orb: ItemOrb, item: ItemInstance) {
    if (count(orb) < 1) return setStatus(`You have no ${ORB_NAMES[orb]}.`);
    const refusal = orbRefusal(item, orb);
    if (refusal) {
      play("ui_deny");
      return setStatus(`The ${ORB_NAMES[orb]} can't apply: ${REFUSAL_TEXT[refusal]}.`);
    }
    const key = ++keys.current;
    const before = new Set(item.mods.map((m) => m.modId as string));
    setStatus("");
    setHeld(null);
    setReveal({ key, itemId: item.id, orb, phase: "slam" });
    // The slam, then the suspense pause, then the result (H §9.2).
    window.setTimeout(() => {
      const result = store.update((a) => {
        const r = craft(a, orb, item.id);
        return r.ok ? r : false;
      });
      if (!result) {
        setReveal(null);
        return setStatus(`The ${ORB_NAMES[orb]} found nothing to roll.`);
      }
      const added = result.item.mods.filter((m) => !before.has(m.modId));
      const catalog = mods();
      const lines = added.flatMap((m) => {
        const mod = catalog.find((d) => d.id === m.modId);
        return mod ? affixLines(mod.stats, m.values, false) : [];
      });
      const jackpot = added.some((m) => {
        const mod = catalog.find((d) => d.id === m.modId);
        // T1 is the family's best tier anywhere, not just the best this item level allows.
        return mod !== undefined && affixRank(mod, Number.POSITIVE_INFINITY) === 1;
      });
      setReveal({
        key,
        itemId: item.id,
        orb,
        phase: "result",
        rarity: result.item.rarity,
        lines,
        jackpot,
      });
      play(
        RAISES.has(orb)
          ? result.item.rarity === "rare"
            ? "drop_rare"
            : "drop_magic"
          : "drop_currency",
      );
      if (jackpot) play("ui_stamp");
    }, C.slamMs + C.pauseMs);
  }

  const items = craftableItems(account);
  const target = (item: ItemInstance) =>
    held === null ? undefined : orbRefusal(item, held) === null ? "valid" : "invalid";

  return (
    <TierPackage tier={4} fired={reveal?.phase === "result" && reveal.jackpot === true}>
      <section
        data-testid="craft-tab"
        style={{ padding: 10, background: MENU.panel, borderRadius: 6 }}
      >
        <style>{STYLE}</style>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {(Object.keys(ITEM_ORBS) as ItemOrb[]).map((orb) => (
            <button
              key={orb}
              type="button"
              data-testid={`orb-${orb}`}
              title={ORB_NAMES[orb]}
              draggable={count(orb) > 0}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", orb);
                setHeld(orb);
              }}
              onDragEnd={() => setHeld(null)}
              onClick={() => {
                if (count(orb) < 1) return setStatus(`You have no ${ORB_NAMES[orb]}.`);
                setHeld(held === orb ? null : orb);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                background: held === orb ? "#2c313b" : "#1a1c20",
                border: `1px solid ${held === orb ? MENU.gold : MENU.edge}`,
                borderRadius: 4,
                color: count(orb) > 0 ? MENU.text : "#555a63",
                cursor: count(orb) > 0 ? "grab" : "default",
              }}
            >
              <OrbIcon orb={orb} size={24} />
              <span>×{count(orb)}</span>
            </button>
          ))}
        </div>
        <div data-testid="craft-status" style={{ minHeight: 18, color: "#E0A048", fontSize: 13 }}>
          {status ||
            (held ? `Holding the ${ORB_NAMES[held]}: drop it on an item.` : "Pick up an orb.")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
          {items.map(({ item, where }) => {
            const t = target(item);
            const active = reveal?.itemId === item.id ? reveal : null;
            const style: CSSProperties = {
              position: "relative",
              borderRadius: 6,
              opacity: t === "invalid" ? 0.35 : 1,
              animation: t === "valid" ? "mvm-craft-pulse 900ms ease-in-out infinite" : undefined,
              cursor: held ? "pointer" : "default",
            };
            return (
              <div
                key={item.id}
                data-testid={`craft-item-${item.id}`}
                data-target={t}
                style={style}
                onClick={() => held && apply(held, item)}
                onDragOver={(e) => {
                  if (held && orbRefusal(item, held) === null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const orb = (e.dataTransfer.getData("text/plain") || held) as ItemOrb | null;
                  if (orb && orb in ITEM_ORBS) apply(orb, item);
                }}
              >
                <ItemCard item={item} />
                <div style={{ fontSize: 11, color: MENU.dim }}>{where}</div>
                {active?.phase === "slam" && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 30,
                        marginLeft: -16,
                        animation: `mvm-craft-slam ${C.slamMs}ms ease-in forwards`,
                      }}
                    >
                      <OrbIcon orb={active.orb} />
                    </div>
                    <Flash alpha={C.flashAlpha} ms={C.slamMs + C.pauseMs} />
                  </>
                )}
                {active?.phase === "result" && (
                  <div key={active.key}>
                    {RAISES.has(active.orb) && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 6,
                          pointerEvents: "none",
                          boxShadow: `inset 0 0 0 2px ${RARITY_COLOR[active.rarity ?? "normal"]}`,
                          animation: `mvm-craft-sweep ${C.sweepMs}ms ease-out forwards`,
                        }}
                      />
                    )}
                    <Burst
                      count={C.burstParticles}
                      color={RARITY_COLOR[active.rarity ?? "normal"]}
                      ms={C.burstMs}
                      distance={60}
                    />
                    <div
                      data-testid="craft-lines"
                      style={{ fontSize: 12, color: "#8888FF", marginTop: 4 }}
                    >
                      {(active.lines ?? []).map((line, i) => (
                        <div
                          key={line}
                          style={{
                            clipPath: "inset(0 100% 0 0)",
                            animation: `mvm-craft-type ${C.lineMs * 4}ms steps(12) ${i * C.lineMs}ms forwards${
                              RAISES.has(active.orb)
                                ? ""
                                : `, mvm-craft-highlight ${C.highlightMs}ms ease-out`
                            }`,
                          }}
                        >
                          + {line}
                        </div>
                      ))}
                    </div>
                    {active.jackpot && (
                      <div
                        data-testid="craft-jackpot"
                        style={{
                          position: "absolute",
                          right: 6,
                          top: 6,
                          padding: "2px 6px",
                          color: "#1a1408",
                          background: "#E0C060",
                          fontWeight: 700,
                          borderRadius: 3,
                          animation: "mvm-craft-stamp 100ms ease-out forwards",
                        }}
                      >
                        T1!
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </TierPackage>
  );
}
