import { catalogEntry } from "../../heroes/model/catalog";
import { cardCost, rechargeSeconds } from "../../heroes/model/card";
import { heroDescription } from "../../heroes/model/descriptions";
import type { Card } from "../../heroes/model/hero";
import { skillName } from "./HeroCard";
import { Panel, RARITY_COLOR, Separator, TEXT } from "./parts";
import { cardSummary } from "./summary";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: TEXT.dim }}>{label}: </span>
      <span style={{ color: "#FFFFFF" }}>{value}</span>
    </div>
  );
}

/**
 * A hero or spell's tooltip, laid out like a PoE2 skill gem's (playtest
 * hv-7ic2.83): name, tag line, level, cost and recharge, what it does on
 * the board, its stat lines, then its supports.
 */
export function HeroTooltip({ card }: { card: Card }) {
  const { hero } = card;
  const entry = catalogEntry(hero.skillId);
  const spell = entry.role === "spell";
  const description = heroDescription(hero.skillId);
  const summary = cardSummary(card);
  const color = RARITY_COLOR[hero.rarity];
  return (
    <Panel rarity={hero.rarity} width={260} testId="hero-tooltip">
      <div style={{ color, fontWeight: 700, fontSize: 13 }}>{skillName(hero.skillId)}</div>
      <div style={{ color: TEXT.dim }}>{description.tags.join(", ")}</div>
      <Separator color={color} />
      <Line label="Level" value={String(hero.level)} />
      <Line label="Cost" value={`${cardCost(card)} mana`} />
      {spell ? (
        <Line label="Cooldown" value={`${entry.cooldownSeconds ?? 0} s`} />
      ) : (
        <Line label="Recharge" value={`${rechargeSeconds(hero.skillId).toFixed(1)} s`} />
      )}
      <Separator color={color} />
      <div style={{ color: "#D8C8A0", margin: "2px 0" }}>{description.text}</div>
      <Separator color={color} />
      <div style={{ color: TEXT.mod }}>
        <Line label="Range" value={description.range} />
        {summary.perHit > 0 && (
          <>
            <Line label="Damage per hit" value={summary.perHit.toFixed(1)} />
            <Line
              label={entry.role === "spellcaster" ? "Casts per second" : "Attacks per second"}
              value={summary.actionsPerSecond.toFixed(2)}
            />
            <Line label="DPS" value={summary.dps.toFixed(1)} />
          </>
        )}
        {!spell && <Line label="EHP" value={String(Math.round(summary.ehp))} />}
      </div>
      {hero.supports.length > 0 && (
        <>
          <Separator color={color} />
          {hero.supports.map((s) => (
            <div key={s} style={{ color: TEXT.mod }}>
              Supported by {skillName(s)}
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}
