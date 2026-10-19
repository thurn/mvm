import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AccountState } from "../../account/state";
import type { AccountStore } from "../../account/store";
import { audioEngine } from "../../audio";
import type { Sound } from "../../audio/engine";
import { mods } from "../../data";
import type { ItemInstance } from "../../heroes/model/item";
import type { Card } from "../../heroes/model/hero";
import { craft, ITEM_ORBS, orbRefusal, type CraftRefusal, type ItemOrb } from "../../loot/craft";
import { craftHero, HERO_ORBS, jewellerRefusal } from "../../loot/craft/heroes";
import { affixRank } from "../../loot/filter";
import { drawOrb } from "../cards/orbs";
import { CRAFT_TUNING as C } from "../../tuning/juice";
import { useAccount } from "../account";
import { affixLines } from "../cards/affixes";
import { HeroCard, skillName, socketColor } from "../cards/HeroCard";
import { ItemCard } from "../cards/ItemCard";
import { RARITY_COLOR } from "../cards/parts";
import { Burst, Flash, TierPackage } from "../fx";
import { MENU } from "../title/layout";

/** An orb the tab can hold: the five item orbs and the Lesser Jeweller's Orb, which targets heroes. */
type Orb = ItemOrb | "jeweller";

const ORB_NAMES: Readonly<Record<Orb, string>> = {
  transmutation: "Orb of Transmutation",
  augmentation: "Orb of Augmentation",
  regal: "Regal Orb",
  exalted: "Exalted Orb",
  alchemy: "Orb of Alchemy",
  jeweller: "Lesser Jeweller's Orb",
};

const CURRENCY_OF: Readonly<Record<Orb, string>> = { ...ITEM_ORBS, jeweller: HERO_ORBS.lesser };
const ORBS = Object.keys(CURRENCY_OF) as Orb[];
const isItemOrb = (orb: Orb): orb is ItemOrb => orb !== "jeweller";

/** The Jeweller's teal (H §6.3). */
const TEAL = "#1BA29B";

const REFUSAL_TEXT: Readonly<Record<CraftRefusal, string>> = {
  corrupted: "corrupted items can't be changed",
  "wrong-rarity": "it can't go on that rarity",
  full: "that item has no room for another mod",
  "no-legal-mod": "no mod can roll there",
  "no-orb": "you have none",
  "unknown-item": "that item is gone",
};

const HERO_REFUSAL_TEXT = {
  full: "that hero has every socket a Lesser Jeweller's Orb can open",
  "no-legal-support": "no support fits that hero",
  "no-orb": "you have none",
  "unknown-hero": "that hero is gone",
} as const;

/** Raises the rarity (the frame sweeps, the drop stinger plays) or adds a mod (the line highlights, a ping). */
const RAISES: ReadonlySet<Orb> = new Set(["transmutation", "regal", "alchemy"]);

const play = (id: Sound) => audioEngine()?.play(id);

interface Reveal {
  key: number;
  /** The item or hero crafted. */
  targetId: string;
  orb: Orb;
  phase: "slam" | "result";
  rarity?: ItemInstance["rarity"];
  /** Display lines of the mods or support the craft added. */
  lines?: string[];
  /** A new mod at the family's best tier (H §9.2's jackpot). */
  jackpot?: boolean;
  /** The support a Jeweller's Orb socketed: its socket opens on the card. */
  socket?: string;
}

const STYLE = `@keyframes mvm-craft-slam { from { transform: scale(${C.slamScale}); opacity: 1; } to { transform: scale(0); opacity: 0.6; } }
@keyframes mvm-craft-pulse { 50% { box-shadow: 0 0 10px 2px #E0C060; } }
@keyframes mvm-craft-sweep { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes mvm-craft-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes mvm-craft-highlight { from { background: rgba(224, 192, 96, 0.35); } to { background: transparent; } }
@keyframes mvm-craft-stamp { from { transform: scale(1.6) rotate(-8deg); opacity: 0; } to { transform: scale(1) rotate(-8deg); opacity: 1; } }
@keyframes mvm-craft-socket { 0% { transform: scale(0); } 50% { transform: scale(1.4); background: transparent; } 100% { transform: scale(1); } }`;

function OrbIcon({ orb, size = 32 }: { orb: Orb; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawOrb(ctx, CURRENCY_OF[orb], 0, 0);
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

/** Every hero the account holds, as cards: the stash, then the roster (where the Jeweller's Orb also works). */
function craftableHeroes(account: AccountState): { card: Card; where: string }[] {
  const roster = [...account.roster.slots, account.roster.spell].flatMap((card, i) =>
    card ? [{ card, where: i < account.roster.slots.length ? `slot ${i + 1}` : "spell" }] : [],
  );
  return [
    ...account.stash.heroes.map((hero) => ({
      card: { hero, weapon: null, armour: null, accessory: null },
      where: "stash",
    })),
    ...roster,
  ];
}

/**
 * The Craft tab (GDD §15, Appendix H §9.2): pick up an orb by click or drag,
 * valid targets pulse and invalid ones dim; dropping it slams the orb into
 * the item or hero, holds a suspense beat, then reveals the result: a rarity
 * sweep with typed-in lines and the drop stinger, an added line that stays
 * highlighted with a ping, or (the Jeweller's Orb) a socket opening on the
 * hero card with a teal burst. A new top-tier mod earns the T1 stamp.
 */
export function CraftTab({ store }: { store: AccountStore }) {
  const account = useAccount(store);
  const [held, setHeld] = useState<Orb | null>(null);
  const [status, setStatus] = useState("");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const keys = useRef(0);

  const count = (orb: Orb) => account.currency[CURRENCY_OF[orb]] ?? 0;

  /** The slam and the suspense pause, then `resolve` crafts and returns the result to reveal (H §9.2). */
  function slam(orb: Orb, targetId: string, resolve: () => Omit<Reveal, "key" | "phase"> | null) {
    const key = ++keys.current;
    setStatus("");
    setHeld(null);
    setReveal({ key, targetId, orb, phase: "slam" });
    window.setTimeout(() => {
      const result = resolve();
      if (!result) return setReveal(null);
      setReveal({ ...result, key, phase: "result" });
    }, C.slamMs + C.pauseMs);
  }

  function applyToItem(orb: ItemOrb, item: ItemInstance) {
    const refusal = orbRefusal(item, orb);
    if (refusal) {
      play("ui_deny");
      return setStatus(`The ${ORB_NAMES[orb]} can't apply: ${REFUSAL_TEXT[refusal]}.`);
    }
    const before = new Set(item.mods.map((m) => m.modId as string));
    slam(orb, item.id, () => {
      const result = store.update((a) => {
        const r = craft(a, orb, item.id);
        return r.ok ? r : false;
      });
      if (!result) {
        setStatus(`The ${ORB_NAMES[orb]} found nothing to roll.`);
        return null;
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
      play(
        RAISES.has(orb)
          ? result.item.rarity === "rare"
            ? "drop_rare"
            : "drop_magic"
          : "drop_currency",
      );
      if (jackpot) play("ui_stamp");
      return { targetId: item.id, orb, rarity: result.item.rarity, lines, jackpot };
    });
  }

  function applyToHero(card: Card) {
    const refusal = jewellerRefusal(card.hero, "lesser");
    if (refusal) {
      play("ui_deny");
      return setStatus(`The ${ORB_NAMES.jeweller} can't apply: ${HERO_REFUSAL_TEXT[refusal]}.`);
    }
    slam("jeweller", card.hero.id, () => {
      let reason: keyof typeof HERO_REFUSAL_TEXT | null = null;
      const result = store.update((a) => {
        const r = craftHero(a, "lesser", card.hero.id);
        if (!r.ok) reason = r.reason;
        return r.ok ? r : false;
      });
      if (!result) {
        play("ui_deny");
        setStatus(
          `The ${ORB_NAMES.jeweller} can't apply: ${HERO_REFUSAL_TEXT[reason ?? "no-legal-support"]}.`,
        );
        return null;
      }
      const socket = result.hero.supports[result.hero.supports.length - 1]!;
      // The gem-click as the socket opens, then the hero stinger (H §9.2).
      play("ui_click");
      play("drop_hero");
      return {
        targetId: card.hero.id,
        orb: "jeweller",
        rarity: result.hero.rarity,
        lines: [skillName(socket)],
        socket,
      };
    });
  }

  function apply(orb: Orb, target: { item: ItemInstance } | { card: Card }) {
    if (count(orb) < 1) return setStatus(`You have no ${ORB_NAMES[orb]}.`);
    if ("item" in target) {
      if (!isItemOrb(orb)) {
        play("ui_deny");
        return setStatus(`The ${ORB_NAMES[orb]} goes on a hero, not an item.`);
      }
      return applyToItem(orb, target.item);
    }
    if (isItemOrb(orb)) {
      play("ui_deny");
      return setStatus(`The ${ORB_NAMES[orb]} goes on an item, not a hero.`);
    }
    applyToHero(target.card);
  }

  const items = craftableItems(account);
  const heroes = craftableHeroes(account);
  const itemTarget = (item: ItemInstance) =>
    held === null
      ? undefined
      : isItemOrb(held) && orbRefusal(item, held) === null
        ? "valid"
        : "invalid";
  const heroTarget = (card: Card) =>
    held === null
      ? undefined
      : held === "jeweller" && jewellerRefusal(card.hero, "lesser") === null
        ? "valid"
        : "invalid";

  return (
    <TierPackage tier={4} fired={reveal?.phase === "result" && reveal.jackpot === true}>
      <section
        data-testid="craft-tab"
        style={{ padding: 10, background: MENU.panel, borderRadius: 6 }}
      >
        <style>{STYLE}</style>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {ORBS.map((orb) => (
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
            (held
              ? `Holding the ${ORB_NAMES[held]}: drop it on ${held === "jeweller" ? "a hero" : "an item"}.`
              : "Pick up an orb.")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
          {items.map(({ item, where }) => (
            <CraftTarget
              key={item.id}
              testId={`craft-item-${item.id}`}
              state={itemTarget(item)}
              held={held}
              onApply={(orb) => apply(orb, { item })}
            >
              <ItemCard item={item} />
              <div style={{ fontSize: 11, color: MENU.dim }}>{where}</div>
              <RevealLayer reveal={reveal?.targetId === item.id ? reveal : null} />
            </CraftTarget>
          ))}
        </div>
        <h3 style={{ color: MENU.dim, fontSize: 13, margin: "12px 0 6px" }}>Heroes</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
          {heroes.map(({ card, where }) => (
            <CraftTarget
              key={card.hero.id}
              testId={`craft-hero-${card.hero.id}`}
              state={heroTarget(card)}
              held={held}
              onApply={(orb) => apply(orb, { card })}
            >
              <HeroCard card={card} />
              <div style={{ fontSize: 11, color: MENU.dim }}>{where}</div>
              <RevealLayer reveal={reveal?.targetId === card.hero.id ? reveal : null} />
            </CraftTarget>
          ))}
        </div>
      </section>
    </TierPackage>
  );
}

/** A drop target: pulses when valid, dims when not, and takes the held orb by click or drop. */
function CraftTarget({
  testId,
  state,
  held,
  onApply,
  children,
}: {
  testId: string;
  state: "valid" | "invalid" | undefined;
  held: Orb | null;
  onApply(orb: Orb): void;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      data-target={state}
      style={{
        position: "relative",
        borderRadius: 6,
        opacity: state === "invalid" ? 0.35 : 1,
        animation: state === "valid" ? "mvm-craft-pulse 900ms ease-in-out infinite" : undefined,
        cursor: held ? "pointer" : "default",
      }}
      onClick={() => held && onApply(held)}
      onDragOver={(e) => {
        if (state === "valid") e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const orb = (e.dataTransfer.getData("text/plain") || held) as Orb | null;
        if (orb && orb in CURRENCY_OF) onApply(orb);
      }}
    >
      {children}
    </div>
  );
}

/** The slam over a target, then its result: sweep, burst, typed lines, a socket opening, the T1 stamp. */
function RevealLayer({ reveal }: { reveal: Reveal | null }) {
  if (reveal?.phase === "slam")
    return (
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
          <OrbIcon orb={reveal.orb} />
        </div>
        <Flash alpha={C.flashAlpha} ms={C.slamMs + C.pauseMs} />
      </>
    );
  if (reveal?.phase !== "result") return null;
  const color = reveal.socket ? TEAL : RARITY_COLOR[reveal.rarity ?? "normal"];
  return (
    <div key={reveal.key}>
      {RAISES.has(reveal.orb) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 6,
            pointerEvents: "none",
            boxShadow: `inset 0 0 0 2px ${color}`,
            animation: `mvm-craft-sweep ${C.sweepMs}ms ease-out forwards`,
          }}
        />
      )}
      <Burst count={C.burstParticles} color={color} ms={C.burstMs} distance={60} />
      <div data-testid="craft-lines" style={{ fontSize: 12, color: "#8888FF", marginTop: 4 }}>
        {(reveal.lines ?? []).map((line, i) => (
          <div
            key={`${i}-${line}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              clipPath: reveal.socket ? undefined : "inset(0 100% 0 0)",
              animation: reveal.socket
                ? `mvm-craft-highlight ${C.highlightMs}ms ease-out`
                : `mvm-craft-type ${C.lineMs * 4}ms steps(12) ${i * C.lineMs}ms forwards${
                    RAISES.has(reveal.orb)
                      ? ""
                      : `, mvm-craft-highlight ${C.highlightMs}ms ease-out`
                  }`,
            }}
          >
            {reveal.socket && (
              <span
                data-testid="socket-open"
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  border: `2px solid ${TEAL}`,
                  background: socketColor(reveal.socket),
                  animation: `mvm-craft-socket ${C.socketMs}ms ease-out`,
                }}
              />
            )}
            + {line}
          </div>
        ))}
      </div>
      {reveal.jackpot && (
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
  );
}
