import { baseItems, mods } from "../../data";
import { uniques } from "../../data/uniques";
import type { ItemInstance } from "../../heroes/model/item";
import { affixHeader, affixLines } from "./affixes";
import { ELEMENT_COLOR, Panel, RARITY_COLOR, Separator, TEXT, UpgradeTag } from "./parts";

const RARE_FIRST = [
  "Grim",
  "Hate",
  "Storm",
  "Dusk",
  "Rune",
  "Gale",
  "Brood",
  "Bone",
  "Ash",
  "Dread",
];
const RARE_SECOND = [
  "Bite",
  "Ward",
  "Song",
  "Coil",
  "Veil",
  "Fang",
  "Mark",
  "Spire",
  "Wound",
  "Thirst",
];

function hash(text: string): number {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** An item's display name: unique name, a rare's two words, or a magic's prefix + base + suffix. */
export function itemName(item: ItemInstance): { name: string; base: string | null } {
  const base = baseItems().find((b) => b.id === item.baseId)?.name ?? "Item";
  if (item.rarity === "unique")
    return { name: uniques().find((u) => u.id === item.uniqueId)?.name ?? base, base };
  if (item.rarity === "rare") {
    const h = hash(item.id);
    return {
      name: `${RARE_FIRST[h % RARE_FIRST.length]} ${RARE_SECOND[(h >> 4) % RARE_SECOND.length]}`,
      base,
    };
  }
  if (item.rarity === "magic") {
    const data = item.mods.map((m) => mods().find((d) => d.id === m.modId)).filter(Boolean);
    const prefix = data.find((d) => d!.generationType === "prefix")?.name;
    const suffix = data.find((d) => d!.generationType === "suffix")?.name;
    return { name: [prefix, base, suffix].filter(Boolean).join(" "), base: null };
  }
  return { name: base, base: null };
}

/** The element badge colour: dominant added damage (weapons) or highest resistance (others) (H §4.1). */
function elementBadge(item: ItemInstance): string | null {
  const totals: Record<string, number> = {};
  for (const m of item.mods) {
    const data = mods().find((d) => d.id === m.modId);
    data?.stats.forEach((s, i) => {
      const added = /added_(fire|cold|lightning|physical|chaos)_damage/.exec(s.id);
      const resist = /base_(fire|cold|lightning|chaos)_damage_resistance/.exec(s.id);
      const key = (added ?? resist)?.[1];
      if (key) totals[key] = (totals[key] ?? 0) + (m.values[i] ?? 0);
    });
  }
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return top ? ELEMENT_COLOR[top[0] as keyof typeof ELEMENT_COLOR] : null;
}

/** The item card and tooltip (H §4.1, §4.4; Appendix C text). Alt shows tiers and ranges. */
export function ItemCard({
  item,
  alt = false,
  upgrade = false,
}: {
  item: ItemInstance;
  alt?: boolean;
  upgrade?: boolean;
}) {
  const { name, base } = itemName(item);
  const color = RARITY_COLOR[item.rarity];
  const baseData = baseItems().find((b) => b.id === item.baseId);
  const badge = elementBadge(item);
  const implicitLines = (item.implicits ?? []).flatMap((imp) => {
    const stats = baseData?.implicits.find((i) => i.id === imp.modId)?.stats ?? [];
    return affixLines(stats, imp.values, alt);
  });
  const unique =
    item.rarity === "unique" ? uniques().find((u) => u.id === item.uniqueId) : undefined;
  const hasAffixes = unique ? unique.mods.length > 0 : item.mods.length > 0;
  return (
    <Panel rarity={item.rarity} testId={`item-${item.id}`}>
      {upgrade && <UpgradeTag />}
      {badge && (
        <span
          data-testid="element-badge"
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            width: 6,
            height: 6,
            background: badge,
            transform: "rotate(45deg)",
          }}
        />
      )}
      <div style={{ color, fontWeight: 700 }}>{name}</div>
      {base && <div style={{ color }}>{base}</div>}
      {/* Separators only between sections that have lines (H §4.4). */}
      {(implicitLines.length > 0 || hasAffixes) && <Separator color={color} />}
      {implicitLines.map((line) => (
        <div key={`i-${line}`} style={{ color: TEXT.implicit }}>
          {line}
        </div>
      ))}
      {implicitLines.length > 0 && hasAffixes && <Separator color={color} />}
      {unique
        ? unique.mods
            .flatMap((m) =>
              affixLines(
                m.stats,
                m.stats.map((s) => s.max),
                alt,
              ),
            )
            .map((line) => (
              <div key={line} style={{ color: TEXT.mod }}>
                {line}
              </div>
            ))
        : item.mods.map((m) => {
            const data = mods().find((d) => d.id === m.modId);
            if (!data) return null;
            return (
              <div key={m.modId}>
                {alt && <div style={{ color: TEXT.dim, fontSize: 9 }}>{affixHeader(data)}</div>}
                {affixLines(data.stats, m.values, alt).map((line) => (
                  <div key={line} style={{ color: TEXT.mod }}>
                    {line}
                  </div>
                ))}
              </div>
            );
          })}
      {/* Item level, bottom-left, in the flow so it never overlaps a line (H §4.1). */}
      <div style={{ textAlign: "left", color: TEXT.dim, fontSize: 9, marginTop: 2 }}>
        {item.itemLevel}
      </div>
    </Panel>
  );
}
