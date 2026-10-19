import type { RoundState } from "../../sim/state";
import { AILMENT_TUNING } from "../../tuning/combat";
import { BOSS_JUICE } from "../../tuning/juice";

const STYLE = `@keyframes mvm-boss-primed { 0%, 100% { background: #e8e8e8; } 50% { background: #ffffff; box-shadow: 0 0 6px #ffffff; } }`;

/**
 * The boss bar (H §7.5): name, life, and the heavy-stun bar under it. The
 * stun bar fills toward the stun; past Primed it flashes white, and during
 * the stun it reads STUNNED — the burst window.
 */
export function BossBar({ round, scale }: { round: RoundState; scale: number }) {
  const boss = round.monsters.find((m) => m.boss);
  if (!boss?.boss) return null;
  const names = BOSS_JUICE.names[boss.boss.bossId];
  const ailments = boss.actor.ailments;
  const life = Math.max(0, boss.actor.life) / boss.actor.maxLife;
  const stun = Math.min(1, ailments.heavyStunBuildup);
  const primed = stun >= AILMENT_TUNING.primedThreshold.boss - 1e-9;
  const stunned = ailments.heavyStunSeconds > 0;
  const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;
  const width = 300 * scale;
  return (
    <div
      data-testid="boss-bar"
      style={{
        position: "absolute",
        left: "50%",
        top: 6 * scale,
        width,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        font: `${11 * scale}px monospace`,
        color: "#e8e8e8",
        textAlign: "center",
      }}
    >
      <style>{STYLE}</style>
      <div
        style={{ color: BOSS_JUICE.nameCard.color, fontWeight: 700, textShadow: "0 1px 0 #000" }}
      >
        {names?.name ?? boss.boss.bossId}
        {stunned && <span style={{ color: "#ffffff", marginLeft: 8 }}>STUNNED</span>}
      </div>
      <div style={{ height: 8 * scale, background: "#3a0d0d", border: "1px solid #000" }}>
        <div
          data-testid="boss-life"
          style={{ width: pct(life), height: "100%", background: "#d23c3c" }}
        />
      </div>
      <div style={{ position: "relative", height: 4 * scale, marginTop: 2, background: "#222" }}>
        <div
          data-testid="boss-stun"
          data-primed={String(primed)}
          style={{
            width: pct(stunned ? 1 : stun),
            height: "100%",
            background: primed || stunned ? "#e8e8e8" : "#c8a040",
            animation: primed && !stunned ? "mvm-boss-primed 300ms linear infinite" : undefined,
          }}
        />
        {/* The Primed mark (D §7). */}
        <div
          style={{
            position: "absolute",
            left: pct(AILMENT_TUNING.primedThreshold.boss),
            top: -2,
            width: 1,
            height: 4 * scale + 4,
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  );
}
