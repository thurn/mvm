import { heroGems, spellGems, supportGems } from "../../data";
import { catalogEntry } from "../../heroes/model/catalog";
import { cardCost, rechargeSeconds } from "../../heroes/model/card";
import type { Card } from "../../heroes/model/hero";
import { ELEMENT_COLOR, Panel, RARITY_COLOR, Separator, TEXT, UpgradeTag } from "./parts";
import { cardSummary } from "./summary";

const ATTRIBUTE_COLOR = {
  strength: "#C83030",
  dexterity: "#30B040",
  intelligence: "#3060D0",
} as const;
const CUSTOM_NAMES: Readonly<Record<string, string>> = {
  "MvM/Heroes/EzomyteAcolyte": "Ezomyte Acolyte",
};

function skillName(skillId: string): string {
  return (
    CUSTOM_NAMES[skillId] ??
    [...heroGems(), ...spellGems(), ...supportGems()].find((g) => g.id === skillId)?.name ??
    skillId
  );
}

/** A support socket's colour: the support's main attribute, as PoE gems are (H §5.1). */
function socketColor(supportId: string): string {
  const w = supportGems().find((s) => s.id === supportId)?.requirementWeights;
  if (!w) return "#888888";
  const top = (Object.keys(ATTRIBUTE_COLOR) as (keyof typeof ATTRIBUTE_COLOR)[]).sort(
    (a, b) => w[b] - w[a],
  )[0]!;
  return ATTRIBUTE_COLOR[top];
}

/** The hero or spell card (H §5.1): skill, level, rarity, sockets, cost, recharge, DPS and EHP. */
export function HeroCard({
  card,
  affordable = true,
  upgrade = false,
}: {
  card: Card;
  affordable?: boolean;
  upgrade?: boolean;
}) {
  const { hero } = card;
  const entry = catalogEntry(hero.skillId);
  const spell = entry.role === "spell";
  const color = RARITY_COLOR[hero.rarity];
  const summary = cardSummary(card);
  const mix = Object.entries(summary.mix) as [keyof typeof ELEMENT_COLOR, number][];
  const slots = Math.max(hero.supports.length, 0);
  return (
    <Panel rarity={hero.rarity} width={180} testId={`card-${hero.id}`}>
      {upgrade && <UpgradeTag />}
      <div
        style={{
          position: "absolute",
          top: 3,
          right: upgrade ? 18 : 5,
          color: affordable ? "#FFFFFF" : "#E04848",
          fontWeight: 700,
        }}
      >
        {cardCost(card)}
      </div>
      <div style={{ color, fontWeight: 700, padding: "0 30px" }}>
        {spell ? "Spell: " : ""}
        {skillName(hero.skillId)}
      </div>
      <div style={{ color: TEXT.dim, fontSize: 9 }}>
        {spell ? "Spell" : `${entry.role} · ${entry.weapon ?? "—"}`}
      </div>
      <div
        data-testid="sockets"
        style={{ display: "flex", gap: 3, justifyContent: "center", margin: "4px 0" }}
      >
        {Array.from({ length: Math.max(1, slots) }, (_, i) => {
          const support = hero.supports[i];
          return (
            <span
              key={i}
              title={support ? skillName(support) : "empty socket"}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                border: `1px solid ${support ? socketColor(support) : "#666"}`,
                background: support ? socketColor(support) : "transparent",
              }}
            />
          );
        })}
      </div>
      <Separator color={color} />
      {spell ? (
        <div>Cooldown {entry.cooldownSeconds ?? 0}s</div>
      ) : (
        <>
          <div data-testid="dps">DPS on this card: {summary.dps.toFixed(1)}</div>
          <div data-testid="ehp">EHP: {Math.round(summary.ehp)}</div>
          <div style={{ color: TEXT.dim }}>
            Recharge {rechargeSeconds(hero.skillId).toFixed(1)}s
          </div>
        </>
      )}
      {hero.supports.map((s) => (
        <div key={s} style={{ color: TEXT.dim, fontSize: 9 }}>
          {skillName(s)}
        </div>
      ))}
      <div style={{ textAlign: "left", color: TEXT.dim, fontSize: 9, marginTop: 4 }}>
        Lv {hero.level}
      </div>
      {/* The element strip along the bottom edge: the hero's damage mix after conversion (H §5.1). */}
      <div
        data-testid="element-strip"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", height: 2 }}
      >
        {mix.map(([type, share]) => (
          <span key={type} style={{ flex: share, background: ELEMENT_COLOR[type] }} />
        ))}
      </div>
    </Panel>
  );
}
