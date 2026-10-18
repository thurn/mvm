import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../../audio";
import { baseItems } from "../../data";
import type { ItemInstance } from "../../heroes/model/item";
import { HIDEOUT_TUNING as T } from "../../tuning/juice";

/** The item-class sound for a drop on a card (H §4.5): metal, leather, cloth or a ring chime. */
export function equipSound(item: ItemInstance): string {
  const base = baseItems().find((b) => b.id === item.baseId);
  const cls = base?.itemClass ?? "";
  if (cls === "Ring" || cls === "Amulet" || cls === "Belt") return "ui_equip_ring";
  if (cls === "Body Armour") {
    const tags = base?.tags ?? [];
    // Strength hybrids (str_dex, str_int) clank like plate.
    if (tags.some((t) => t.startsWith("str_"))) return "ui_equip_metal";
    if (tags.includes("dex_armour")) return "ui_equip_leather";
    if (tags.includes("int_armour")) return "ui_equip_cloth";
  }
  return "ui_equip_metal";
}

export function playUi(id: string): void {
  audioEngine()?.play(id);
}

/** A number that rolls to each new value over `T.rollMs` (H §4.5). */
export function useRolled(value: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function tick() {
      const p = Math.min(1, (performance.now() - start) / T.rollMs);
      const next = origin + (value - origin) * (1 - (1 - p) ** 3);
      from.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}
