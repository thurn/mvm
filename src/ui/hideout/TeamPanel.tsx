import { useState } from "react";
import type { AccountState } from "../../account/state";
import { TEAM_STAT_ORDER, teamStatText, type TeamStat } from "../../data/team";
import { teamSources } from "../../heroes/model/team";
import { itemName } from "../cards/ItemCard";
import { RARITY_COLOR } from "../cards/parts";
import { HoverTip } from "../fx";
import { MENU } from "../title/layout";

/**
 * The Team panel (GDD §15, A §2.1): every team stat the roster's items
 * carry, summed; hovering a line lists the items it comes from.
 */
export function TeamPanel({ account }: { account: AccountState }) {
  const [hovered, setHovered] = useState<TeamStat | null>(null);
  const roster = [...account.roster.slots, account.roster.spell].flatMap((c) => (c ? [c] : []));
  const sources = teamSources(roster);
  const stats = TEAM_STAT_ORDER.filter((stat) => sources[stat]?.length);
  return (
    <section
      data-testid="team-panel"
      style={{
        padding: 10,
        background: MENU.panel,
        borderRadius: 6,
        width: 208,
        textAlign: "left",
      }}
    >
      <div style={{ color: MENU.gold, marginBottom: 6 }}>Team</div>
      {stats.length === 0 ? (
        <p style={{ color: MENU.dim, fontSize: 12, margin: 0 }}>
          No team stats yet. Team affixes on any roster item count for every hero.
        </p>
      ) : (
        stats.map((stat) => {
          const list = sources[stat]!;
          const total = list.reduce((sum, s) => sum + s.value, 0);
          return (
            <div
              key={stat}
              data-testid={`team-line-${stat}`}
              onMouseEnter={() => setHovered(stat)}
              onMouseLeave={() => setHovered(null)}
              style={{ position: "relative", fontSize: 12, color: "#8888FF", padding: "2px 0" }}
            >
              {teamStatText(stat, total)}
              {hovered === stat && (
                <HoverTip placement="left">
                  <ul
                    data-testid="team-sources"
                    style={{
                      margin: 0,
                      padding: "6px 10px",
                      listStyle: "none",
                      fontSize: 12,
                      background: "#0c0d10",
                      border: `1px solid ${MENU.edge}`,
                      borderRadius: 4,
                      whiteSpace: "nowrap",
                      textAlign: "left",
                    }}
                  >
                    {list.map(({ item, value }, i) => (
                      <li key={`${item.id}-${i}`} style={{ color: RARITY_COLOR[item.rarity] }}>
                        {itemName(item).name}: {teamStatText(stat, value)}
                      </li>
                    ))}
                  </ul>
                </HoverTip>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}
