import { useEffect, useMemo, useState } from "react";
import { Board } from "../../app/Board";
import { audioEngine } from "../../audio";
import { baseItems, currencies } from "../../data";
import { uniques } from "../../data/uniques";
import type { BaseItemId } from "../../data/types";
import { findScene } from "../../dev/scenes";
import type { Drop } from "../../loot/drops";
import type { SimEvent } from "../../sim/events";
import { createSettings } from "../core/settings";

let next = 0;

/** One synthetic drop of each class, as a kill would roll them. */
function sampleDrops(): Record<string, Drop> {
  const base = baseItems()[0]!;
  const unique = uniques()[0];
  const currency = (suffix: string) => ({
    kind: "currency" as const,
    currencyId: currencies().find((c) => c.id.endsWith(suffix))!.id,
  });
  const item = (rarity: "normal" | "magic" | "rare" | "unique"): Drop => ({
    kind: "item",
    item: {
      id: `dev-item-${next++}`,
      baseId: (rarity === "unique" && unique ? unique.baseId : base.id) as BaseItemId,
      rarity,
      itemLevel: 1,
      quality: 0,
      mods: [],
      ...(rarity === "unique" && unique ? { uniqueId: unique.id } : {}),
    },
  });
  return {
    normal: item("normal"),
    magic: item("magic"),
    rare: item("rare"),
    unique: item("unique"),
    "currency low": currency("CurrencyUpgradeToMagic"),
    "currency mid": currency("CurrencyRerollRare"),
    "currency top": currency("CurrencyModValues"),
    hero: { kind: "hero", rarity: "magic", itemLevel: 1 },
    spell: { kind: "spell", rarity: "magic", itemLevel: 1 },
  };
}

function fire(drops: Drop[], lane: number, x: number) {
  const events: SimEvent[] = drops.map((drop) => ({
    type: "drop",
    dropId: `dev-drop-${next++}`,
    monsterId: "dev-monster" as never,
    lane,
    x,
    drop,
  }));
  window.__mvm?.fireEvents?.(events);
}

/** `?scene=loot-shower`: every drop class on demand, and a mixed shower every 6 s (1.27). */
export function LootShowerPage() {
  const scene = useMemo(() => findScene("empty-board")!, []);
  const [store] = useState(() => createSettings());
  const [showAll, setShowAll] = useState(store.get().showAllLoot);
  useEffect(() => {
    const timer = setInterval(() => {
      const all = Object.values(sampleDrops());
      fire(all.slice(0, 4), 1, 4);
      fire(all.slice(4), 3, 6);
    }, 6000);
    return () => clearInterval(timer);
  }, []);
  const samples = sampleDrops();
  return (
    <div>
      <div
        style={{ display: "flex", gap: 6, justifyContent: "center", padding: 6, flexWrap: "wrap" }}
      >
        {Object.keys(samples).map((name, i) => (
          <button
            key={name}
            onClick={() => {
              void audioEngine()?.unlock();
              fire([sampleDrops()[name]!], i % 5, 2 + (i % 7));
            }}
          >
            {name}
          </button>
        ))}
        <label style={{ color: "#ddd" }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => {
              setShowAll(e.target.checked);
              store.set({ showAllLoot: e.target.checked });
            }}
          />{" "}
          Show all
        </label>
      </div>
      <Board scene={scene} />
    </div>
  );
}
