import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AccountState } from "../../account/state";
import { currencies } from "../../data";
import type { Card } from "../../heroes/model/hero";
import type { ItemInstance, ItemSlot } from "../../heroes/model/item";
import { HIDEOUT_TUNING as T } from "../../tuning/juice";
import { HeroCard } from "../cards/HeroCard";
import { ItemCard, itemName } from "../cards/ItemCard";
import { drawOrb } from "../cards/orbs";
import { ELEMENT_COLOR, RARITY_COLOR } from "../cards/parts";
import { cardSummary } from "../cards/summary";
import { MENU, MenuButton, MenuScreen } from "../title/layout";
import { equipSound, playUi, useRolled } from "./feedback";
import {
  assignHero,
  benchHero,
  equip,
  equipRefusal,
  isSpell,
  moveCard,
  unequip,
  type RosterTarget,
} from "./model";
import { StashPanel } from "./StashPanel";

/** What is being dragged, and from where. */
export type Drag =
  | { kind: "item"; id: string; from: "stash" | { target: RosterTarget; part: ItemSlot } }
  | { kind: "hero"; id: string; from: "stash" | { target: RosterTarget } };

const PARTS: readonly ItemSlot[] = ["weapon", "armour", "accessory"];
const PART_LABEL = { weapon: "weapon", armour: "armour", accessory: "jewellery" } as const;
const OUT_BACK = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const STYLE = `@keyframes mvm-hideout-click { from { transform: scale(0.9); } to { transform: none; } }
@keyframes mvm-hideout-pulse { 50% { outline-color: rgba(255, 209, 102, 0.25); } }
@keyframes mvm-hideout-deny { 25% { transform: translateX(-3px); background: rgba(224,72,72,0.35); } 75% { transform: translateX(3px); background: rgba(224,72,72,0.35); } }
@keyframes mvm-hideout-delta { from { transform: none; opacity: 1; } to { transform: translateY(-22px); opacity: 0; } }
@keyframes mvm-hideout-flash { from { opacity: 0.9; } to { opacity: 0; } }
@keyframes mvm-hideout-burst { from { opacity: 0.8; transform: scale(0.6); } to { opacity: 0; transform: scale(1.4); } }`;

function dominant(mix: Partial<Record<string, number>>): string | null {
  return Object.entries(mix).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? null;
}

/** A pulse on drop (H §4.5): which zone clicked, or was refused, and when. */
interface Pulse {
  zone: string;
  kind: "click" | "deny";
  /** Bumps on every pulse, so a repeat on the same zone restarts its animation. */
  seq: number;
}

/** How a card reacted to a change (H §4.5): its stat deltas and any new element's colour. */
interface Reaction {
  target: RosterTarget;
  seq: number;
  deltas: { text: string; up: boolean }[];
  burst: string | null;
}

type Snapshot = { heroId: string; dps: number; ehp: number; element: string | null } | null;

function snapshot(card: Card | null): Snapshot {
  if (!card) return null;
  const summary = cardSummary(card);
  return {
    heroId: card.hero.id,
    dps: summary.dps,
    ehp: summary.ehp,
    element: dominant(summary.mix),
  };
}

/** The reaction from a card's before and after, or null when the hero changed or nothing did. */
function react(
  target: RosterTarget,
  seq: number,
  before: Snapshot,
  after: Snapshot,
): Reaction | null {
  if (!before || !after || before.heroId !== after.heroId) return null;
  const deltas: Reaction["deltas"] = [];
  const dDps = after.dps - before.dps;
  const dEhp = after.ehp - before.ehp;
  if (Math.abs(dDps) >= 0.05)
    deltas.push({ text: `${dDps > 0 ? "+" : ""}${dDps.toFixed(1)} DPS`, up: dDps > 0 });
  if (Math.abs(dEhp) >= 0.5)
    deltas.push({ text: `${dEhp > 0 ? "+" : ""}${Math.round(dEhp)} EHP`, up: dEhp > 0 });
  const changed = after.element !== before.element && after.element !== null;
  if (deltas.length === 0 && !changed) return null;
  return {
    target,
    seq,
    deltas,
    burst: changed ? ELEMENT_COLOR[after.element as keyof typeof ELEMENT_COLOR] : null,
  };
}

function ItemZone({
  zone,
  item,
  part,
  valid,
  pulse,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  zone: string;
  item: ItemInstance | null;
  part: ItemSlot;
  valid: boolean;
  pulse: Pulse | null;
  onDragStart(): void;
  onDragEnd(): void;
  onDrop(): void;
}) {
  const [hover, setHover] = useState(false);
  const denied = pulse?.zone === zone && pulse.kind === "deny";
  const clicked = pulse?.zone === zone && pulse.kind === "click";
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        data-testid={zone}
        data-denied={denied ? "true" : "false"}
        draggable={item !== null}
        onDragStart={(e) => {
          e.dataTransfer?.setData("text/plain", zone);
          setHover(false);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
        style={{
          height: 22,
          padding: "2px 6px",
          boxSizing: "border-box",
          border: `1px ${item ? "solid" : "dashed"} ${item ? RARITY_COLOR[item.rarity] : MENU.edge}`,
          outline: valid ? `2px solid ${MENU.gold}` : "none",
          animation: denied
            ? `mvm-hideout-deny ${T.denyMs}ms linear`
            : clicked
              ? `mvm-hideout-click ${T.clickMs}ms ${OUT_BACK}`
              : valid
                ? "mvm-hideout-pulse 900ms ease-in-out infinite"
                : undefined,
          background: "#0c0d10",
          color: item ? RARITY_COLOR[item.rarity] : MENU.dim,
          font: "11px/16px monospace",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: item ? "grab" : "default",
        }}
      >
        {item ? itemName(item).name : `— ${PART_LABEL[part]} —`}
      </div>
      {hover && item && (
        <div
          style={{
            position: "absolute",
            left: "100%",
            top: 0,
            marginLeft: 6,
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <ItemCard item={item} />
        </div>
      )}
    </div>
  );
}

/** Green or red deltas that rise off the card when its DPS or EHP changes (H §4.5). */
function Deltas({ deltas }: { deltas: Reaction["deltas"] }) {
  return (
    <div style={{ position: "absolute", top: -6, right: 4, zIndex: 5, pointerEvents: "none" }}>
      {deltas.map((d) => (
        <div
          key={d.text}
          data-testid="stat-delta"
          style={{
            color: d.up ? "#40D040" : "#E04848",
            font: "700 12px monospace",
            animation: `mvm-hideout-delta ${T.deltaMs}ms ease-out forwards`,
          }}
        >
          {d.text}
        </div>
      ))}
    </div>
  );
}

function RosterSlot({
  testId,
  label,
  card,
  locked,
  target,
  drag,
  pulse,
  reaction,
  validFor,
  setDrag,
  onDropSlot,
  onDropPart,
}: {
  testId: string;
  label: string;
  card: Card | null;
  locked: boolean;
  target: RosterTarget;
  drag: Drag | null;
  pulse: Pulse | null;
  /** This card's latest reaction to a change, if any. */
  reaction: Reaction | null;
  validFor(zone: "slot" | ItemSlot): boolean;
  setDrag(drag: Drag | null): void;
  onDropSlot(): void;
  onDropPart(part: ItemSlot): void;
}) {
  const summary = card ? cardSummary(card) : null;
  const dps = useRolled(summary?.dps ?? 0);
  const ehp = useRolled(summary?.ehp ?? 0);
  const slotValid = validFor("slot");
  const denied = pulse?.zone === testId && pulse.kind === "deny";
  const clicked = pulse?.zone === testId && pulse.kind === "click";
  const lifted = drag?.kind === "hero" && drag.from !== "stash" && drag.from.target === target;
  return (
    <div
      data-testid={testId}
      data-locked={locked ? "true" : "false"}
      data-denied={denied ? "true" : "false"}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropSlot();
      }}
      style={{
        position: "relative",
        width: 208,
        minHeight: 120,
        padding: 6,
        boxSizing: "border-box",
        background: locked ? "#15171c" : MENU.panel,
        border: `1px solid ${MENU.edge}`,
        borderRadius: 6,
        outline: slotValid ? `2px solid ${MENU.gold}` : "none",
        animation: denied
          ? `mvm-hideout-deny ${T.denyMs}ms linear`
          : clicked
            ? `mvm-hideout-click ${T.clickMs}ms ${OUT_BACK}`
            : slotValid
              ? "mvm-hideout-pulse 900ms ease-in-out infinite"
              : undefined,
      }}
    >
      <div style={{ color: MENU.dim, fontSize: 11, marginBottom: 4 }}>{label}</div>
      {locked ? (
        <div style={{ color: MENU.dim, padding: "28px 0", textAlign: "center" }}>🔒 Locked</div>
      ) : card ? (
        <>
          <div
            data-testid={target === "spell" ? "roster-hero-spell" : `roster-hero-${target}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer?.setData("text/plain", card.hero.id);
              setDrag({ kind: "hero", id: card.hero.id, from: { target } });
            }}
            onDragEnd={() => setDrag(null)}
            style={{
              position: "relative",
              cursor: "grab",
              transform: lifted ? `scale(${T.liftScale})` : "none",
              boxShadow: lifted ? "0 4px 4px rgba(0,0,0,0.6)" : "none",
            }}
          >
            <HeroCard card={card} shown={{ dps, ehp }} />
            {reaction && (
              <div
                key={`flash-${reaction.seq}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#ffffff",
                  pointerEvents: "none",
                  animation: `mvm-hideout-flash ${T.flashMs * 3}ms steps(2) forwards`,
                }}
              />
            )}
            {reaction?.burst && (
              <div
                key={`burst-${reaction.seq}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${reaction.burst}, transparent 70%)`,
                  pointerEvents: "none",
                  animation: `mvm-hideout-burst ${T.elementBurstMs}ms ease-out forwards`,
                }}
              />
            )}
            {reaction && <Deltas key={reaction.seq} deltas={reaction.deltas} />}
          </div>
          {!isSpell(card.hero) && (
            <div style={{ display: "grid", gap: 3, marginTop: 4 }}>
              {PARTS.map((part) => {
                const zone = `${target === "spell" ? "spell" : `slot-${target}`}-${part}`;
                return (
                  <ItemZone
                    key={part}
                    zone={zone}
                    item={card[part]}
                    part={part}
                    valid={validFor(part)}
                    pulse={pulse}
                    onDragStart={() =>
                      card[part] &&
                      setDrag({ kind: "item", id: card[part].id, from: { target, part } })
                    }
                    onDragEnd={() => setDrag(null)}
                    onDrop={() => onDropPart(part)}
                  />
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: MENU.dim, padding: "28px 0", textAlign: "center" }}>
          Drag a {target === "spell" ? "spell" : "hero"} here
        </div>
      )}
    </div>
  );
}

function Orb({ currencyId }: { currencyId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawOrb(ctx, currencyId, 0, 0);
  }, [currencyId]);
  return <canvas ref={ref} width={32} height={32} style={{ imageRendering: "pixelated" }} />;
}

function CurrencyTab({ account }: { account: AccountState }) {
  const owned = currencies().filter((c) => (account.currency[c.id] ?? 0) > 0);
  return (
    <section style={{ padding: 10, background: MENU.panel, borderRadius: 6, minWidth: 420 }}>
      <div style={{ color: MENU.gold, marginBottom: 8 }}>Gold: {account.gold}</div>
      {owned.length === 0 ? (
        <p style={{ color: MENU.dim }}>No orbs yet. Crafting arrives in M2.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {owned.map((c) => (
            <div
              key={c.id}
              data-testid={`currency-${c.id}`}
              style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
            >
              <Orb currencyId={c.id} />
              <span>{c.name}</span>
              <span style={{ marginLeft: "auto", color: MENU.gold }}>
                ×{account.currency[c.id]}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type Tab = "roster" | "stash" | "currency";

function TabButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "6px 14px",
        background: active ? "#2c313b" : "#1a1c20",
        color: disabled ? "#555a63" : MENU.text,
        border: `1px solid ${active ? MENU.gold : MENU.edge}`,
        borderRadius: 4,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/**
 * The M1 hideout (GDD §15): the roster with drag-to-equip under the weapon
 * lock, the stash with filters and sorts, currency counts, and the M2 tabs
 * shown disabled. Every change autosaves.
 */
export function Hideout({
  account,
  onSave,
  onPlay,
}: {
  account: AccountState;
  onSave(): void;
  onPlay(): void;
}) {
  const [tab, setTab] = useState<Tab>("roster");
  const [drag, setDrag] = useState<Drag | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [, setVersion] = useState(0);

  const cardAt = (target: RosterTarget) =>
    target === "spell" ? account.roster.spell : (account.roster.slots[target] ?? null);
  /** Runs a change, then saves, sounds and pulses the zone, and lets the card react. */
  const change = (
    zone: string,
    sound: string,
    target: RosterTarget | null,
    action: () => boolean,
  ) => {
    const before = target === null ? null : snapshot(cardAt(target));
    if (!action()) return false;
    const seq = (pulse?.seq ?? 0) + 1;
    onSave();
    playUi(sound);
    setPulse({ zone, kind: "click", seq });
    setStatus(null);
    if (target !== null) setReaction(react(target, seq, before, snapshot(cardAt(target))));
    setVersion((v) => v + 1);
    return true;
  };
  const refuse = (zone: string, reason: string) => {
    playUi("ui_deny");
    setPulse({ zone, kind: "deny", seq: (pulse?.seq ?? 0) + 1 });
    setStatus(reason);
  };
  const stashItem = (id: string) => account.stash.items.find((i) => i.id === id);
  const cardItem = (target: RosterTarget, part: ItemSlot) =>
    (target === "spell" ? account.roster.spell : account.roster.slots[target])?.[part] ?? null;

  const dropOnPart = (target: RosterTarget, part: ItemSlot) => {
    const zone = `${target === "spell" ? "spell" : `slot-${target}`}-${part}`;
    if (!drag || drag.kind !== "item") return;
    const item =
      drag.from === "stash" ? stashItem(drag.id) : cardItem(drag.from.target, drag.from.part);
    if (!item) return;
    const reason = equipRefusal(account, item, target, part);
    if (reason) return refuse(zone, `Can't equip ${itemName(item).name}: ${reason}.`);
    const from = drag.from;
    change(zone, equipSound(item), target, () => {
      if (from !== "stash") unequip(account, from.target, from.part);
      return equip(account, item.id, target, part);
    });
  };
  const dropOnSlot = (target: RosterTarget) => {
    const zone = target === "spell" ? "roster-spell" : `roster-slot-${target}`;
    if (!drag || drag.kind !== "hero") return;
    if (drag.from === "stash") {
      if (!change(zone, "ui_click", null, () => assignHero(account, drag.id, target)))
        refuse(
          zone,
          target !== "spell" && target >= account.roster.unlocked
            ? "That slot is locked."
            : "Heroes go in card slots; spells go in the spell slot.",
        );
    } else if (drag.from.target !== target) {
      const from = drag.from.target;
      if (!change(zone, "ui_click", null, () => moveCard(account, from, target)))
        refuse(zone, "That slot is locked.");
    }
  };
  const dropOnStash = () => {
    if (!drag || drag.from === "stash") return;
    if (drag.kind === "item") {
      const { target, part } = drag.from;
      change("stash-drop", "ui_click", target, () => unequip(account, target, part));
    } else {
      const { target } = drag.from;
      if (!change("stash-drop", "ui_click", null, () => benchHero(account, target)))
        refuse("stash-drop", "The roster needs at least one hero.");
    }
  };

  const validFor = (target: RosterTarget) => (zone: "slot" | ItemSlot) => {
    if (!drag) return false;
    if (zone === "slot") {
      if (drag.kind !== "hero") return false;
      const locked = target !== "spell" && target >= account.roster.unlocked;
      if (locked) return false;
      if (drag.from !== "stash")
        return drag.from.target !== target && target !== "spell" && drag.from.target !== "spell";
      const hero = account.stash.heroes.find((h) => h.id === drag.id);
      return hero !== undefined && (target === "spell") === isSpell(hero);
    }
    if (drag.kind !== "item") return false;
    const item =
      drag.from === "stash" ? stashItem(drag.id) : cardItem(drag.from.target, drag.from.part);
    return (
      item !== null && item !== undefined && equipRefusal(account, item, target, zone) === null
    );
  };

  const slot = (target: RosterTarget, label: string) => {
    const locked = target !== "spell" && target >= account.roster.unlocked;
    const card = cardAt(target);
    return (
      <RosterSlot
        key={String(target)}
        testId={target === "spell" ? "roster-spell" : `roster-slot-${target}`}
        label={label}
        card={card}
        locked={locked}
        target={target}
        drag={drag}
        pulse={pulse}
        reaction={reaction?.target === target ? reaction : null}
        validFor={validFor(target)}
        setDrag={setDrag}
        onDropSlot={() => dropOnSlot(target)}
        onDropPart={(part) => dropOnPart(target, part)}
      />
    );
  };

  return (
    <MenuScreen music="hideout">
      <style>{STYLE}</style>
      <div style={{ textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Hideout</h2>
          <span style={{ color: MENU.dim }}>
            Level {account.player.level} · {account.gold} gold
          </span>
          <span style={{ marginLeft: "auto" }}>
            <MenuButton primary onClick={onPlay}>
              Play Level 1
            </MenuButton>
          </span>
        </div>
        <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <TabButton active={tab === "roster"} onClick={() => setTab("roster")}>
            Roster
          </TabButton>
          <TabButton active={tab === "stash"} onClick={() => setTab("stash")}>
            Stash
          </TabButton>
          <TabButton active={tab === "currency"} onClick={() => setTab("currency")}>
            Currency
          </TabButton>
          {["Craft", "Vendors", "Tree"].map((name) => (
            <TabButton key={name} disabled>
              {name} <span style={{ fontSize: 10 }}>M2</span>
            </TabButton>
          ))}
        </div>
        <div data-testid="hideout-status" style={{ minHeight: 18, color: "#E0A048", fontSize: 13 }}>
          {status}
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {tab === "roster" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 208px)", gap: 8 }}>
              {account.roster.slots.map((_, i) => slot(i, `Slot ${i + 1}`))}
              {slot("spell", "Spell")}
            </div>
          )}
          {tab === "currency" ? (
            <CurrencyTab account={account} />
          ) : (
            <StashPanel
              account={account}
              drag={drag}
              setDrag={setDrag}
              onDropHere={dropOnStash}
              columns={tab === "stash" ? 6 : 2}
            />
          )}
        </div>
      </div>
    </MenuScreen>
  );
}
