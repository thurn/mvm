import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LevelSummary } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import { levelForXp, xpForLevel } from "../../account/xp";
import { audioEngine } from "../../audio";
import { currencies } from "../../data";
import type { Card, HeroInstance, OwnedHeroId } from "../../heroes/model/hero";
import { sharedSettings } from "../../juice/core/settings";
import { flashAlpha } from "../../juice/tiers/screen";
import { LEVEL_END_TUNING as T } from "../../tuning/juice";
import { ACCOUNT_TUNING } from "../../tuning/progression";
import { HeroCard, skillName } from "../cards/HeroCard";
import { ItemCard } from "../cards/ItemCard";
import { Panel, RARITY_COLOR } from "../cards/parts";
import { MenuButton, MenuScreen, MENU } from "../title/layout";
import { chooseHero } from "../../account/stash";
import type { AccountStore } from "../../account/store";
import { useAccount } from "../account";
import { dropRarity, sortDrops, type CardDrop } from "./sort";
import { fillProgress, revealTimes } from "./timeline";

/** Player and roster-hero XP when the level began, so the bars can fill from there. */
export interface XpSnapshot {
  player: { level: number; xp: number };
  heroes: Record<string, { level: number; xp: number }>;
}

export function xpSnapshot(account: AccountState): XpSnapshot {
  const heroes: XpSnapshot["heroes"] = {};
  for (const card of account.roster.slots)
    if (card) heroes[card.hero.id] = { level: card.hero.level, xp: card.hero.xp };
  return { player: { ...account.player }, heroes };
}

const TEAL = "#3fd6c4";
const STYLE = `@keyframes mvm-end-slide { from { transform: translateY(60px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes mvm-end-flip { from { transform: rotateY(90deg); } to { transform: none; } }
@keyframes mvm-end-stamp { from { transform: rotate(-12deg) scale(${T.stampScale}); opacity: 0; } to { transform: rotate(-12deg) scale(1); opacity: 1; } }
@keyframes mvm-end-burst { from { transform: rotate(var(--a)) translateX(0); opacity: 1; } to { transform: rotate(var(--a)) translateX(46px); opacity: 0; } }
@keyframes mvm-end-flash { to { opacity: 0; } }`;
const OUT_BACK = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/** Milliseconds since mount, on animation frames. */
function useElapsed(): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame = requestAnimationFrame(function tick() {
      setElapsed(performance.now() - start);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return elapsed;
}

/** Plays each sound once, the first frame its time has passed. */
function useCues(elapsed: number, cues: readonly { at: number; key: string; play(): void }[]) {
  const fired = useRef(new Set<string>());
  useEffect(() => {
    for (const cue of cues)
      if (cue.at <= elapsed && !fired.current.has(cue.key)) {
        fired.current.add(cue.key);
        cue.play();
      }
  });
}

const play = (id: string, gainDb = 0) => audioEngine()?.play(id, { gainDb });

function Burst({ count }: { count: number }) {
  return (
    <span style={{ position: "absolute", left: "50%", top: "50%", pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          data-testid="burst-particle"
          style={
            {
              position: "absolute",
              width: 4,
              height: 4,
              background: TEAL,
              "--a": `${(360 / count) * i}deg`,
              animation: `mvm-end-burst ${T.burstMs}ms ease-out forwards`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** One XP bar: the level reached so far and the fill within it; a level-up bursts once. */
function XpBar({
  label,
  from,
  to,
  progress,
  particles,
}: {
  label: string;
  from: number;
  to: number;
  progress: number;
  /** The level-up burst's particle count, already scaled by the juice setting. */
  particles: number;
}) {
  const xp = from + (to - from) * progress;
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const fill = next > start ? (xp - start) / (next - start) : 1;
  const leveled = level > levelForXp(from);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
      <span style={{ width: 150, textAlign: "right", color: MENU.dim, fontSize: 13 }}>{label}</span>
      <span
        style={{
          position: "relative",
          width: 28,
          color: leveled ? TEAL : MENU.text,
          fontWeight: 700,
        }}
      >
        {level}
        {leveled && particles > 0 && <Burst count={particles} />}
      </span>
      <span
        style={{ width: 220, height: 8, background: "#0c0e12", border: `1px solid ${MENU.edge}` }}
      >
        <span
          style={{ display: "block", height: "100%", width: `${fill * 100}%`, background: TEAL }}
        />
      </span>
    </div>
  );
}

function LootCard({ drop, upgrade, shown }: { drop: CardDrop; upgrade: boolean; shown: boolean }) {
  const rarity = dropRarity(drop);
  return (
    <div
      style={{
        position: "relative",
        visibility: shown ? "visible" : "hidden",
        animation: shown ? "mvm-end-flip 160ms ease-out" : undefined,
        textAlign: "left",
      }}
    >
      {drop.kind === "item" ? (
        <ItemCard item={drop.item} upgrade={upgrade} />
      ) : (
        <Panel rarity={rarity} width={140}>
          <div style={{ color: RARITY_COLOR[rarity], fontSize: 13 }}>
            {rarity[0]!.toUpperCase() + rarity.slice(1)} {drop.kind}
          </div>
          <div>Item level {drop.itemLevel}</div>
        </Panel>
      )}
      {upgrade && shown && (
        <span
          style={{
            // Hung over the top-right corner, clear of the centred name and the affix lines.
            position: "absolute",
            top: -10,
            right: -8,
            zIndex: 1,
            background: "rgba(8, 8, 10, 0.94)",
            padding: "1px 6px",
            border: "2px solid #40D040",
            color: "#40D040",
            font: "700 13px monospace",
            animation: `mvm-end-stamp ${T.stampMs}ms ease-in forwards`,
          }}
        >
          UPGRADE
        </span>
      )}
    </div>
  );
}

function asCard(hero: HeroInstance): Card {
  return { hero, weapon: null, armour: null, accessory: null };
}

/**
 * The level-end summary (GDD §15, H §3.10): the result, loot flipping in
 * by ascending rarity with Upgrade stamps, XP bars filling, then the first
 * clear's reward and any pending choose-1-of-3. With no summary (a reload
 * before the pick) it shows only the pending choice.
 */
export function LevelEnd({
  store,
  summary,
  before,
  onReplay,
  onHideout,
}: {
  /** The account; the pick changes and saves it through the store. */
  store: AccountStore;
  summary: LevelSummary | null;
  before: XpSnapshot | null;
  onReplay(): void;
  onHideout(): void;
}) {
  const account = useAccount(store);
  const elapsed = useElapsed();
  const settingsStore = sharedSettings();
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.get);
  // The juice A/B and accessibility settings scale the particles and the flash (H §1.1, §14).
  const particles = Math.round(T.burstParticles * Math.min(1, settings.juice));
  const flash = flashAlpha(T.flashAlpha, settings);
  const loot = sortDrops(summary?.drops ?? []);
  const choice = account.pendingChoices[0];
  // A reload before the pick has no summary; the pending choice names the level, kept past the pick.
  const [rewardLevel] = useState(() =>
    summary ? (summary.firstClear ? account.firstClears.at(-1) : undefined) : choice?.levelId,
  );
  const reward =
    ACCOUNT_TUNING.firstClearRewards[rewardLevel as keyof typeof ACCOUNT_TUNING.firstClearRewards];
  const times = revealTimes(loot.cards.length, summary === null || summary.firstClear);
  const progress = before ? fillProgress(elapsed, times) : 1;
  const firstClearShown = times.firstClear !== null && elapsed >= times.firstClear;
  const cards = account.roster.slots.flatMap((c) => (c ? [c] : []));

  const cues = loot.cards.flatMap(({ drop, upgrade }, i) => [
    {
      at: times.cards[i]!,
      key: `card-${i}`,
      play: () =>
        play(drop.kind === "item" ? `drop_${drop.item.rarity}` : `drop_${drop.kind}`, T.stingerDb),
    },
    ...(upgrade
      ? [{ at: times.cards[i]! + T.stampMs, key: `stamp-${i}`, play: () => play("ui_stamp") }]
      : []),
  ]);
  if (before && summary && summary.xpGained > 0) {
    for (let t = times.xpStart; t < times.xpEnd; t += T.tickMs)
      cues.push({ at: t, key: `tick-${t}`, play: () => play("ui_tick") });
    const bars = [
      [before.player.xp, account.player.xp],
      ...cards.map((c) => [before.heroes[c.hero.id]?.xp ?? c.hero.xp, c.hero.xp]),
    ] as [number, number][];
    // The jingle plays when the first bar crosses into a new level.
    const crossings = bars.flatMap(([from, to]) =>
      levelForXp(to) > levelForXp(from)
        ? [times.xpStart + ((xpForLevel(levelForXp(from) + 1) - from) / (to - from)) * T.xpFillMs]
        : [],
    );
    if (crossings.length > 0)
      cues.push({ at: Math.min(...crossings), key: "level-up", play: () => play("level_up") });
  }
  if (times.firstClear !== null)
    cues.push({
      at: times.firstClear,
      key: "first-clear",
      play: () => {
        play("drop_hero");
        // T4's music duck (H §2): the reveal sits over the hideout theme.
        audioEngine()?.duck("music", -4, 1);
      },
    });
  useCues(elapsed, cues);

  const pick = (heroId: OwnedHeroId) => {
    if (choice && store.update((a) => chooseHero(a, choice.levelId, heroId))) play("ui_click");
  };

  const currencyNames = new Map(currencies().map((c) => [c.id as string, c.name]));
  const won = summary?.result === "won";
  const title = summary === null ? "First-clear reward" : won ? "Victory" : "Defeat";
  return (
    <MenuScreen music="hideout">
      <style>{STYLE}</style>
      {firstClearShown && flash > 0 && (
        <div
          data-testid="first-clear-flash"
          data-alpha={flash}
          style={{
            opacity: flash,
            position: "fixed",
            inset: 0,
            // Above the cards, which are positioned and later in the page.
            zIndex: 10,
            pointerEvents: "none",
            background: "radial-gradient(circle, #ffffff, rgba(255,209,102,0.5))",
            animation: "mvm-end-flash 400ms linear forwards",
          }}
        />
      )}
      <section
        data-testid="level-end"
        style={{
          maxWidth: 1100,
          padding: 20,
          background: MENU.panel,
          border: `1px solid ${MENU.edge}`,
          borderRadius: 8,
          animation: `mvm-end-slide ${T.slideMs}ms ${OUT_BACK}`,
        }}
      >
        <h1 style={{ margin: "0 0 4px", color: won || !summary ? MENU.gold : "#e04848" }}>
          {title}
        </h1>
        {summary && (
          <>
            <p style={{ margin: "0 0 12px", color: MENU.dim }}>
              {loot.cards.length === 0
                ? "No item drops"
                : `${loot.cards.length} ${loot.cards.length === 1 ? "drop" : "drops"}`}
              {loot.gold > 0 && ` · ${loot.gold} gold`}
              {Object.entries(loot.currency).map(
                ([id, n]) => ` · ${n}× ${currencyNames.get(id) ?? id}`,
              )}
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                alignItems: "flex-start",
                perspective: 600,
              }}
            >
              {loot.cards.map(({ drop, upgrade }, i) => (
                <LootCard
                  key={i}
                  drop={drop}
                  upgrade={upgrade}
                  shown={elapsed >= times.cards[i]!}
                />
              ))}
            </div>
            <div style={{ margin: "16px auto 0", width: "fit-content" }}>
              <div style={{ color: MENU.gold, fontWeight: 700 }}>+{summary.xpGained} XP</div>
              <XpBar
                label="Player"
                from={before?.player.xp ?? account.player.xp}
                to={account.player.xp}
                progress={progress}
                particles={particles}
              />
              {cards.map(({ hero }) => (
                <XpBar
                  key={hero.id}
                  label={skillName(hero.skillId)}
                  from={before?.heroes[hero.id]?.xp ?? hero.xp}
                  to={hero.xp}
                  progress={progress}
                  particles={particles}
                />
              ))}
            </div>
          </>
        )}
        {(firstClearShown || summary === null) && (
          <div style={{ marginTop: 18 }}>
            {reward && (
              <h2 style={{ margin: "0 0 8px", color: MENU.gold }}>
                Slot {reward.unlockSlot} unlocked
              </h2>
            )}
            {choice ? (
              <>
                <p style={{ margin: "0 0 8px" }}>Choose 1 of {choice.options.length} heroes</p>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    alignItems: "flex-start",
                  }}
                >
                  {choice.options.map((hero) => (
                    <button
                      key={hero.id}
                      type="button"
                      data-testid={`choose-${hero.id}`}
                      aria-label={`Choose ${skillName(hero.skillId)}`}
                      onClick={() => pick(hero.id)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <HeroCard card={asCard(hero)} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              account.stash.heroes.length > 0 &&
              summary?.firstClear !== false && (
                <p style={{ color: MENU.dim }}>
                  Your new hero and its starter weapon wait in the hideout stash.
                </p>
              )
            )}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <MenuButton primary disabled={choice !== undefined} onClick={onReplay}>
            Replay
          </MenuButton>
          <MenuButton disabled={choice !== undefined} onClick={onHideout}>
            Hideout
          </MenuButton>
        </div>
      </section>
    </MenuScreen>
  );
}
