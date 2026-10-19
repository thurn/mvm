import type { AccountStore } from "../../account/store";
import type { LootFilter } from "../../loot/filter";
import { useAccount } from "../account";
import { MENU } from "../title/layout";
import { playUi } from "./feedback";

/** C §C.7's presets, in order, with what each hides and what that becomes. */
const PRESETS: readonly { filter: LootFilter; name: string; hides: string }[] = [
  { filter: "showAll", name: "1. Show all", hides: "Every drop shows." },
  {
    filter: "hideNormal",
    name: "2. Hide normal",
    hides: "Normal items drop quietly and sell for gold at level end.",
  },
  {
    filter: "hideLowMagic",
    name: "3. Hide normal + low-tier magic",
    hides:
      "Also magic items whose every affix is below the top two tiers its item level allows; each becomes a Transmutation Shard.",
  },
];

/**
 * The Loot filter tab (GDD §11, C §C.7): three presets. Rares, uniques,
 * heroes and currency always show. A round locks the filter when it starts.
 */
export function LootFilterTab({ store }: { store: AccountStore }) {
  const account = useAccount(store);
  const choose = (filter: LootFilter) => {
    if (account.lootFilter === filter) return;
    store.update((a) => {
      a.lootFilter = filter;
    });
    playUi("ui_click");
  };
  return (
    <section
      data-testid="loot-filter-tab"
      role="radiogroup"
      aria-label="Loot filter"
      style={{ padding: 10, background: MENU.panel, borderRadius: 6, maxWidth: 560 }}
    >
      {PRESETS.map((p) => (
        <label
          key={p.filter}
          style={{
            display: "block",
            textAlign: "left",
            padding: "8px 10px",
            marginBottom: 6,
            border: `1px solid ${account.lootFilter === p.filter ? MENU.gold : MENU.edge}`,
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="loot-filter"
            data-testid={`filter-${p.filter}`}
            checked={account.lootFilter === p.filter}
            onChange={() => choose(p.filter)}
          />{" "}
          <span style={{ color: MENU.text }}>{p.name}</span>
          <div style={{ color: MENU.dim, fontSize: 12, marginLeft: 22 }}>{p.hides}</div>
        </label>
      ))}
      <p style={{ color: MENU.dim, fontSize: 12, margin: "8px 0 0" }}>
        Rares, uniques, heroes and currency always show. The filter applies from the next level you
        start.
      </p>
    </section>
  );
}
