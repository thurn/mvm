import { useMemo } from "react";
import { newAccount } from "../../account/lifecycle";
import { HeroCard } from "../cards/HeroCard";
import { MenuButton, MenuScreen, MENU } from "./layout";

/** GDD §12's three focuses, with their fantasy line. */
const FOCUSES = [
  { id: "warrior", name: "Warrior", fantasy: "Walls, armour, slams and stun" },
  { id: "ranger", name: "Ranger", fantasy: "Bows and spears, projectiles, evasion and crit" },
  { id: "sorceress", name: "Sorceress", fantasy: "Elemental spells, energy shield and ailments" },
] as const;

/** Focus select (GDD §15): three focus cards with their starter kits, shown with 1.31's cards. */
export function FocusSelect({
  onChoose,
  onBack,
}: {
  onChoose(focus: string): void;
  onBack(): void;
}) {
  const kits = useMemo(
    () =>
      FOCUSES.map((focus) => {
        const account = newAccount(focus.id);
        const cards = [
          ...account.roster.slots.flatMap((c) => (c ? [c] : [])),
          ...(account.roster.spell ? [account.roster.spell] : []),
        ];
        return { ...focus, cards };
      }),
    [],
  );
  return (
    <MenuScreen music="title">
      <h2 style={{ margin: "0 0 16px" }}>Choose your focus</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {kits.map((kit) => (
          <section
            key={kit.id}
            data-testid={`focus-${kit.id}`}
            style={{
              background: MENU.panel,
              border: `1px solid ${MENU.edge}`,
              borderRadius: 8,
              padding: 12,
              width: 330,
              // A column, so every Choose button sits on the same baseline.
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: "0 0 2px" }}>{kit.name}</h3>
            <div style={{ color: MENU.dim, marginBottom: 10 }}>{kit.fantasy}</div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
                // zoom (unlike transform) shrinks the layout box, so three focuses fit side by side at 1280 px.
                zoom: 0.8,
              }}
            >
              {kit.cards.map((card) => (
                <HeroCard key={card.hero.id} card={card} />
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <MenuButton primary onClick={() => onChoose(kit.id)}>
              Choose {kit.name}
            </MenuButton>
          </section>
        ))}
      </div>
      <MenuButton onClick={onBack}>Back</MenuButton>
    </MenuScreen>
  );
}
