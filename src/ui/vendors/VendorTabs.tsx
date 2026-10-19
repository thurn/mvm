import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { furthestLevel } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import type { AccountStore } from "../../account/store";
import {
  buyBack,
  buyOffer,
  gambleHero,
  gambleItem,
  sellHero,
  sellItem,
  type HeroGamble,
} from "../../account/vendors";
import { audioEngine } from "../../audio";
import type { Sound } from "../../audio/engine";
import { baseItems } from "../../data";
import type { BaseItemId } from "../../data/types";
import type { HeroInstance, OwnedHeroId } from "../../heroes/model/hero";
import type { ItemId, ItemInstance } from "../../heroes/model/item";
import {
  heroBuyPrice,
  heroGamblePrice,
  heroSellPrice,
  itemBuyPrice,
  itemGamblePrice,
  itemSellPrice,
} from "../../loot/prices";
import { VENDOR_FEEDBACK as F } from "../../tuning/juice";
import { VENDOR_TUNING } from "../../tuning/economy";
import { useAccount } from "../account";
import { HeroCard, skillName } from "../cards/HeroCard";
import { ItemCard, itemName } from "../cards/ItemCard";
import { RARITY_COLOR } from "../cards/parts";
import { Burst, CoinPour, Glow, TierPackage } from "../fx";
import { MENU } from "../title/layout";

/**
 * The Armorer, Recruiter and Gamble tabs (GDD §15) on E §5.2–§5.3's rules,
 * with H §9.3's feedback: a buy pours coins on the coin ladder and flies the
 * card to the Stash tab, a sale clinks once per 100 gold, and a gamble's
 * face-down card shakes, then flips to reveal with its rarity stinger.
 */

/** The coin ladder's pentatonic steps (H §3.4–§3.5). */
const PENTATONIC = [0, 2, 4, 7, 9, 12];

const play = (id: Sound, semitones = 0) => audioEngine()?.play(id, { semitones });

/** `count` coins up the ladder, `F.coinStaggerMs` apart. */
function coins(count: number) {
  for (let i = 0; i < count; i++)
    window.setTimeout(() => play("coin", PENTATONIC[i % PENTATONIC.length]), i * F.coinStaggerMs);
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const asCard = (hero: HeroInstance) => ({ hero, weapon: null, armour: null, accessory: null });

/** A card that flies from where it was bought to the Stash tab, shrinking and fading. */
interface Flight {
  key: number;
  from: DOMRect;
  dx: number;
  dy: number;
  content: ReactNode;
}

const STYLE = `@keyframes mvm-vendor-fly { from { transform: translate(0, 0) scale(1); opacity: 1; } to { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; } }
@keyframes mvm-vendor-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(var(--s)); } 75% { transform: translateX(calc(var(--s) * -1)); } }
@keyframes mvm-vendor-flip { from { transform: rotateY(90deg); } to { transform: rotateY(0); } }`;

/** Status, refusals, coin pours and flights, shared by the three tabs. */
function useFeedback(store: AccountStore) {
  const [status, setStatus] = useState("");
  /** The coin pour stays where the bought card was, which the purchase just removed. */
  const [pour, setPour] = useState<{ key: number; rect: DOMRect; count: number } | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const keys = useRef(0);

  const deny = (reason: string) => {
    play("ui_deny");
    setStatus(reason);
  };

  /** Buys through `action`: on success, the coin pour over the card and its flight to the stash. */
  const buy = (
    name: string,
    price: number,
    from: HTMLElement | null,
    content: ReactNode,
    action: (account: AccountState) => boolean,
  ) => {
    if (store.get().gold < price) return deny(`Not enough gold: ${name} costs ${price}.`);
    if (!store.update(action)) return deny(`${name} is no longer for sale.`);
    const key = ++keys.current;
    const count = clamp(Math.ceil(price / F.goldPerCoin), F.minCoins, F.maxCoins);
    setStatus(`Bought ${name} for ${price} gold.`);
    coins(count);
    const rect = from?.getBoundingClientRect() ?? new DOMRect();
    setPour({ key, rect, count });
    window.setTimeout(
      () => setPour((p) => (p?.key === key ? null : p)),
      F.pourMs + count * F.coinStaggerMs,
    );
    const to = document.querySelector('[data-tab="stash"]')?.getBoundingClientRect();
    setFlight({
      key,
      from: rect,
      dx: to ? to.left + to.width / 2 - (rect.left + rect.width / 2) : -rect.left,
      dy: to ? to.top + to.height / 2 - (rect.top + rect.height / 2) : -rect.top,
      content,
    });
    window.setTimeout(() => setFlight((f) => (f?.key === key ? null : f)), F.flyMs);
  };

  /** Sells through `action`, one clink per 100 gold earned. */
  const sell = (name: string, price: number, action: (account: AccountState) => boolean) => {
    if (!store.update(action)) return deny(`${name} can't be sold.`);
    coins(clamp(Math.floor(price / F.goldPerClink), 1, F.maxClinks));
    setStatus(`Sold ${name} for ${price} gold.`);
  };

  const overlays = (
    <>
      <style>{STYLE}</style>
      {pour && (
        <div
          key={`pour-${pour.key}`}
          style={{
            position: "fixed",
            left: pour.rect.left,
            top: pour.rect.top,
            width: pour.rect.width,
            height: pour.rect.height,
            pointerEvents: "none",
            zIndex: 21,
          }}
        >
          <CoinPour count={pour.count} ms={F.pourMs} distance={F.pourDistance} />
        </div>
      )}
      {flight && (
        <div
          key={flight.key}
          data-testid="vendor-flight"
          style={
            {
              position: "fixed",
              left: flight.from.left,
              top: flight.from.top,
              width: flight.from.width,
              pointerEvents: "none",
              zIndex: 20,
              "--dx": `${flight.dx}px`,
              "--dy": `${flight.dy}px`,
              animation: `mvm-vendor-fly ${F.flyMs}ms ease-in forwards`,
            } as CSSProperties
          }
        >
          {flight.content}
        </div>
      )}
    </>
  );

  return { status, setStatus, deny, buy, sell, overlays };
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section
      data-testid="vendor-tab"
      style={{ padding: 10, background: MENU.panel, borderRadius: 6, flex: 1 }}
    >
      {children}
    </section>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 style={{ color: MENU.dim, fontSize: 13, margin: "12px 0 6px" }}>{children}</h3>;
}

function Status({ text }: { text: string }) {
  return (
    <div data-testid="vendor-status" style={{ minHeight: 18, color: "#E0A048", fontSize: 13 }}>
      {text}
    </div>
  );
}

/** A price button: gold when affordable, red when not (a click still says why). */
function PriceButton({
  testId,
  label,
  price,
  gold,
  onClick,
}: {
  testId: string;
  label: string;
  price: number;
  gold: number;
  onClick(e: MouseEvent<HTMLButtonElement>): void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      style={{
        marginTop: 4,
        padding: "3px 8px",
        background: "#1a1c20",
        border: `1px solid ${MENU.edge}`,
        borderRadius: 4,
        color: gold >= price ? MENU.gold : "#E04848",
        cursor: "pointer",
      }}
    >
      {label} · {price} gold
    </button>
  );
}

const Grid = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
    {children}
  </div>
);

/** The buyback list (E §5.3): the last ten things sold, at their sell price. */
function Buyback({
  account,
  feedback,
}: {
  account: AccountState;
  feedback: ReturnType<typeof useFeedback>;
}) {
  if (account.buyback.length === 0) return null;
  return (
    <>
      <Heading>Buyback</Heading>
      <Grid>
        {account.buyback.map((sold, i) => {
          const name =
            sold.kind === "item" ? itemName(sold.item).name : skillName(sold.hero.skillId);
          const id = sold.kind === "item" ? sold.item.id : sold.hero.id;
          return (
            <div key={`${id}-${i}`} style={{ position: "relative", fontSize: 12 }}>
              <div
                style={{
                  color: RARITY_COLOR[sold.kind === "item" ? sold.item.rarity : sold.hero.rarity],
                }}
              >
                {name}
              </div>
              <PriceButton
                testId={`buyback-${i}`}
                label="Buy back"
                price={sold.price}
                gold={account.gold}
                onClick={(e) =>
                  feedback.buy(
                    name,
                    sold.price,
                    e.currentTarget.parentElement,
                    <div style={{ color: MENU.text }}>{name}</div>,
                    (a) => buyBack(a, i),
                  )
                }
              />
            </div>
          );
        })}
      </Grid>
    </>
  );
}

/** The Armorer (E §5.3): ten offers, the stash's items to sell, and buyback. */
export function ArmorerTab({ store }: { store: AccountStore }) {
  const account = useAccount(store);
  const feedback = useFeedback(store);
  const offers = account.vendorStock?.armorer ?? [];
  const offer = (item: ItemInstance) => {
    const price = itemBuyPrice(item);
    return (
      <div key={item.id} data-testid={`offer-${item.id}`} style={{ position: "relative" }}>
        <ItemCard item={item} />
        <PriceButton
          testId={`buy-${item.id}`}
          label="Buy"
          price={price}
          gold={account.gold}
          onClick={(e) =>
            feedback.buy(
              itemName(item).name,
              price,
              e.currentTarget.parentElement,
              <ItemCard item={item} />,
              (a) => buyOffer(a, item.id),
            )
          }
        />
      </div>
    );
  };
  return (
    <Panel>
      {feedback.overlays}
      <Status text={feedback.status} />
      <Grid>
        {offers.length === 0 ? (
          <p style={{ color: MENU.dim }}>Sold out until the next level.</p>
        ) : (
          offers.map(offer)
        )}
      </Grid>
      <SellList
        title="Sell items"
        things={account.stash.items.map((item) => ({
          id: item.id,
          testId: `sell-item-${item.id}`,
          name: itemName(item).name,
          rarity: item.rarity,
          price: itemSellPrice(item),
          sell: (a: AccountState) => sellItem(a, item.id as ItemId),
        }))}
        feedback={feedback}
      />
      <Buyback account={account} feedback={feedback} />
    </Panel>
  );
}

/** The Recruiter (E §5.3): six heroes and two spells, the stash's heroes to sell, and buyback. */
export function RecruiterTab({ store }: { store: AccountStore }) {
  const account = useAccount(store);
  const feedback = useFeedback(store);
  const stock = account.vendorStock;
  const offer = (hero: HeroInstance) => {
    const price = heroBuyPrice(hero);
    return (
      <div key={hero.id} data-testid={`offer-${hero.id}`} style={{ position: "relative" }}>
        <HeroCard card={asCard(hero)} />
        <PriceButton
          testId={`buy-${hero.id}`}
          label="Hire"
          price={price}
          gold={account.gold}
          onClick={(e) =>
            feedback.buy(
              skillName(hero.skillId),
              price,
              e.currentTarget.parentElement,
              <HeroCard card={asCard(hero)} />,
              (a) => buyOffer(a, hero.id),
            )
          }
        />
      </div>
    );
  };
  return (
    <Panel>
      {feedback.overlays}
      <Status text={feedback.status} />
      <Grid>{(stock?.recruiter ?? []).map(offer)}</Grid>
      <Heading>Spells</Heading>
      <Grid>{(stock?.spells ?? []).map(offer)}</Grid>
      <SellList
        title="Sell heroes"
        things={account.stash.heroes.map((hero) => ({
          id: hero.id,
          testId: `sell-hero-${hero.id}`,
          name: skillName(hero.skillId),
          rarity: hero.rarity,
          price: heroSellPrice(hero),
          sell: (a: AccountState) => sellHero(a, hero.id as OwnedHeroId),
        }))}
        feedback={feedback}
      />
      <Buyback account={account} feedback={feedback} />
    </Panel>
  );
}

/** The stash's things with their sell prices (E §5.2: everything sells for 20%). */
function SellList({
  title,
  things,
  feedback,
}: {
  title: string;
  things: {
    id: string;
    testId: string;
    name: string;
    rarity: ItemInstance["rarity"];
    price: number;
    sell(account: AccountState): boolean;
  }[];
  feedback: ReturnType<typeof useFeedback>;
}) {
  return (
    <>
      <Heading>{title}</Heading>
      {things.length === 0 ? (
        <p style={{ color: MENU.dim, margin: 0 }}>Nothing in the stash to sell.</p>
      ) : (
        <Grid>
          {things.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={t.testId}
              onClick={() => feedback.sell(t.name, t.price, t.sell)}
              style={{
                padding: "3px 8px",
                background: "#0c0d10",
                border: `1px solid ${RARITY_COLOR[t.rarity]}`,
                borderRadius: 4,
                color: RARITY_COLOR[t.rarity],
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {t.name} · sell {t.price}
            </button>
          ))}
        </Grid>
      )}
    </>
  );
}

const ROLES = Object.keys(VENDOR_TUNING.gambleRoles) as (keyof typeof VENDOR_TUNING.gambleRoles)[];
const TAGS = ["physical", "fire", "cold", "lightning", "chaos"] as const;

function parsePick(value: string): HeroGamble {
  const [kind, name] = value.split(":") as [string, string];
  return kind === "role"
    ? { role: name as (typeof ROLES)[number] }
    : { tag: name as (typeof TAGS)[number] };
}

type Revealed = { kind: "item"; item: ItemInstance } | { kind: "hero"; hero: HeroInstance };

/** The gamble card (H §9.3): face down, it shakes, then flips to reveal with the rarity stinger. */
function GambleReveal({ revealed, phase }: { revealed: Revealed; phase: "shake" | "shown" }) {
  const rarity = revealed.kind === "item" ? revealed.item.rarity : revealed.hero.rarity;
  if (phase === "shake")
    return (
      <div
        data-testid="gamble-hidden"
        style={
          {
            width: 180,
            height: 120,
            display: "grid",
            placeItems: "center",
            background: "#0c0d10",
            border: `1px solid ${MENU.edge}`,
            borderRadius: 6,
            color: MENU.dim,
            fontSize: 32,
            "--s": `${F.shakePx}px`,
            animation: `mvm-vendor-shake 80ms linear infinite`,
          } as CSSProperties
        }
      >
        ?
      </div>
    );
  const big = rarity === "rare" || rarity === "unique";
  return (
    <TierPackage tier={4} fired={rarity === "unique"}>
      <div
        data-testid="gamble-reveal"
        data-rarity={rarity}
        style={{
          position: "relative",
          animation: `mvm-vendor-flip ${F.flipMs}ms ease-out`,
        }}
      >
        {revealed.kind === "item" ? (
          <ItemCard item={revealed.item} />
        ) : (
          <HeroCard card={asCard(revealed.hero)} />
        )}
        {big && (
          <>
            <Glow color={RARITY_COLOR[rarity]} ms={F.burstMs} />
            <Burst
              count={F.burstParticles}
              color={RARITY_COLOR[rarity]}
              ms={F.burstMs}
              distance={80}
            />
          </>
        )}
      </div>
    </TierPackage>
  );
}

const STINGER: Readonly<Record<ItemInstance["rarity"], Sound>> = {
  normal: "drop_normal",
  magic: "drop_magic",
  rare: "drop_rare",
  unique: "drop_unique",
};

/**
 * The Gamble tab (E §5.3, B §7.6): an item of a chosen base, or a hero of a
 * chosen role or damage tag, each at 1.5× the magic price. The outcome is
 * stored at once (P16); the shake and flip only present it.
 */
export function GambleTab({ store }: { store: AccountStore }) {
  const account = useAccount(store);
  const feedback = useFeedback(store);
  const level = furthestLevel(account).areaLevel;
  const bases = baseItems()
    .filter((b) => b.dropLevel <= level)
    .sort((a, b) => a.itemClass.localeCompare(b.itemClass) || a.name.localeCompare(b.name));
  const [baseId, setBaseId] = useState<string>(bases[0]?.id ?? "");
  const [pick, setPick] = useState(`role:${ROLES[0]}`);
  const [reveal, setReveal] = useState<{
    key: number;
    revealed: Revealed;
    phase: "shake" | "shown";
  } | null>(null);
  const keys = useRef(0);

  const show = (revealed: Revealed) => {
    const key = ++keys.current;
    feedback.setStatus("");
    setReveal({ key, revealed, phase: "shake" });
    window.setTimeout(() => {
      setReveal((r) => (r?.key === key ? { ...r, phase: "shown" } : r));
      const rarity = revealed.kind === "item" ? revealed.item.rarity : revealed.hero.rarity;
      play(STINGER[rarity]);
    }, F.shakeMs);
  };

  const gamble = (price: number, what: string, roll: (a: AccountState) => Revealed | null) => {
    if (account.gold < price) return feedback.deny(`Not enough gold: ${what} costs ${price}.`);
    const out: { revealed: Revealed | null } = { revealed: null };
    const ok = store.update((a) => {
      out.revealed = roll(a);
      return out.revealed !== null;
    });
    if (!ok || !out.revealed) return feedback.deny(`Nothing can be gambled for ${what} yet.`);
    coins(clamp(Math.ceil(price / F.goldPerCoin), F.minCoins, F.maxCoins));
    show(out.revealed);
  };

  const itemPrice = itemGamblePrice(level);
  const heroPrice = heroGamblePrice(level);
  const select: CSSProperties = {
    background: "#23272f",
    color: MENU.text,
    border: `1px solid ${MENU.edge}`,
  };
  return (
    <Panel>
      {feedback.overlays}
      <Status text={feedback.status} />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <Heading>Gamble an item</Heading>
          <label style={{ color: MENU.dim, fontSize: 12 }}>
            Base{" "}
            <select
              aria-label="Base"
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
              style={select}
            >
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.itemClass}: {b.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <PriceButton
              testId="gamble-item"
              label="Gamble"
              price={itemPrice}
              gold={account.gold}
              onClick={() =>
                gamble(itemPrice, "an item gamble", (a) => {
                  const item = gambleItem(a, baseId as BaseItemId);
                  return item && { kind: "item", item };
                })
              }
            />
          </div>
          <div style={{ color: MENU.dim, fontSize: 11, marginTop: 4 }}>
            Magic 75% · Rare 22% · Unique 3% where the base has one
          </div>
        </div>
        <div>
          <Heading>Gamble a hero</Heading>
          <label style={{ color: MENU.dim, fontSize: 12 }}>
            Hero pick{" "}
            <select
              aria-label="Hero pick"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              style={select}
            >
              {ROLES.map((r) => (
                <option key={r} value={`role:${r}`}>
                  Role: {r}
                </option>
              ))}
              {TAGS.map((t) => (
                <option key={t} value={`tag:${t}`}>
                  Damage: {t}
                </option>
              ))}
            </select>
          </label>
          <div>
            <PriceButton
              testId="gamble-hero"
              label="Gamble"
              price={heroPrice}
              gold={account.gold}
              onClick={() =>
                gamble(heroPrice, "a hero gamble", (a) => {
                  const hero = gambleHero(a, parsePick(pick));
                  return hero && { kind: "hero", hero };
                })
              }
            />
          </div>
          <div style={{ color: MENU.dim, fontSize: 11, marginTop: 4 }}>Magic 70% · Rare 30%</div>
        </div>
        <div style={{ perspective: 600 }}>
          {reveal && (
            <GambleReveal key={reveal.key} revealed={reveal.revealed} phase={reveal.phase} />
          )}
        </div>
      </div>
    </Panel>
  );
}
