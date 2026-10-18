import { useEffect, useRef, useState } from "react";
import { currencies } from "../../data";
import { generateHero, generateSpell } from "../../heroes/gen/generate";
import { starterCard } from "../../heroes/model/starter";
import { STARTER_HEROES } from "../../heroes/model/catalog";
import { generateGear } from "../../loot/items";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { HeroCard } from "./HeroCard";
import { ItemCard } from "./ItemCard";
import { buildOrbAtlas } from "./orbs";
import { useAltKey } from "./parts";

/** `?scene=cards`: one of every M1 card kind, for the visual review (1.31). Hold Alt for tiers. */
export function CardsSheet() {
  const alt = useAltKey();
  const orbs = useRef<HTMLDivElement>(null);
  const [rng] = useState(() => streamRng(createStreams(31), "loot"));
  const [items] = useState(() => {
    let n = 0;
    const newId = () => id<"Item">(`sheet-${n++}`);
    const classes = ["Bow", "Body Armour", "Ring"];
    return [
      ...classes.flatMap((itemClass) =>
        (["normal", "magic", "rare"] as const).map((rarity) =>
          generateGear({ ilvl: 10, rarity, itemClass, newId }, rng),
        ),
      ),
      generateGear({ ilvl: 10, rarity: "unique", newId }, rng),
    ];
  });
  const [heroes] = useState(() => [
    ...STARTER_HEROES.slice(0, 3).map((skill) => starterCard(id<"Gem">(skill), 5)),
    ...[0, 6].map((bonus, i) => ({
      hero: generateHero({
        areaLevel: 8,
        highestUnlocked: 8,
        rarityBonus: bonus,
        roster: [],
        rng,
        id: id<"OwnedHero">(`gen-${i}`),
      }),
      weapon: null,
      armour: null,
      accessory: null,
    })),
    {
      hero: generateSpell({
        areaLevel: 5,
        highestUnlocked: 5,
        rarityBonus: 1,
        rng,
        id: id<"OwnedHero">("spell-0"),
      }),
      weapon: null,
      armour: null,
      accessory: null,
    },
  ]);
  useEffect(() => {
    const { canvas } = buildOrbAtlas();
    if (canvas && orbs.current) {
      canvas.style.imageRendering = "pixelated";
      canvas.style.width = `${canvas.width * 2}px`;
      orbs.current.replaceChildren(canvas);
    }
  }, []);
  return (
    <div style={{ padding: 12, color: "#ddd", font: "12px monospace" }}>
      <div>Hold Alt for tiers and ranges {alt ? "(Alt held)" : ""}</div>
      <h3>Items</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
        {items.map((item, i) => (
          <ItemCard key={item.id} item={item} alt={alt} upgrade={i === 2} />
        ))}
      </div>
      <h3>Heroes and spells</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
        {heroes.map((card, i) => (
          <HeroCard key={card.hero.id} card={card} affordable={i !== 1} upgrade={i === 0} />
        ))}
      </div>
      <h3>Currency ({currencies().length})</h3>
      <div ref={orbs} data-testid="orb-atlas" />
      <div style={{ display: "flex", flexWrap: "wrap", fontSize: 9 }}>
        {currencies().map((c) => (
          <span key={c.id} style={{ width: 64, textAlign: "center" }}>
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
