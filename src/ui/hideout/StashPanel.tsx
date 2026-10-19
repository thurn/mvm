import { useState } from "react";
import type { AccountState } from "../../account/state";
import { HeroTooltip } from "../cards/HeroTooltip";
import { ItemCard, itemName } from "../cards/ItemCard";
import { skillName } from "../cards/HeroCard";
import { RARITY_COLOR } from "../cards/parts";
import { HoverTip } from "../fx";
import { MENU } from "../title/layout";
import { itemSlot } from "../../heroes/model/item";
import { isSpell } from "../../account/stash";
import { stashView, type StashEntry, type StashFilter } from "./model";
import { currencyName } from "./currency";
import { SHARDS } from "../../loot/craft/heroes";
import { SALVAGE_TUNING } from "../../tuning/loot";
import type { Drag } from "./Hideout";

const SLOT_LABEL = { weapon: "Weapon", armour: "Armour", accessory: "Jewellery" } as const;

function Tile({
  entry,
  lifted,
  onDragStart,
  onDragEnd,
}: {
  entry: StashEntry;
  lifted: boolean;
  onDragStart(): void;
  onDragEnd(): void;
}) {
  const [hover, setHover] = useState(false);
  const rarity = entry.kind === "item" ? entry.item.rarity : entry.hero.rarity;
  const testId =
    entry.kind === "item" ? `stash-item-${entry.item.id}` : `stash-hero-${entry.hero.id}`;
  const title = entry.kind === "item" ? itemName(entry.item).name : skillName(entry.hero.skillId);
  const sub =
    entry.kind === "item"
      ? `${SLOT_LABEL[itemSlot(entry.item)]} · ilvl ${entry.item.itemLevel}`
      : `${isSpell(entry.hero) ? "Spell" : "Hero"} · level ${entry.hero.level}`;
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        data-testid={testId}
        draggable
        onDragStart={(e) => {
          e.dataTransfer?.setData("text/plain", testId);
          setHover(false);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        style={{
          width: 150,
          height: 48,
          padding: "4px 6px",
          boxSizing: "border-box",
          background: "#0c0d10",
          border: `1px solid ${RARITY_COLOR[rarity]}`,
          font: "11px/1.3 monospace",
          textAlign: "left",
          cursor: "grab",
          position: "relative",
          transform: lifted ? "scale(1.1)" : "none",
          boxShadow: lifted ? "0 4px 4px rgba(0,0,0,0.6)" : "none",
          transition: "transform 80ms",
        }}
      >
        <div
          style={{
            color: RARITY_COLOR[rarity],
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        <div style={{ color: MENU.dim }}>{sub}</div>
        {entry.kind === "item" && entry.upgrade && (
          <span style={{ position: "absolute", top: 3, right: 5, color: "#40D040" }}>▲</span>
        )}
      </div>
      {hover && (
        <HoverTip placement="left">
          {entry.kind === "item" ? (
            <ItemCard item={entry.item} upgrade={entry.upgrade} />
          ) : (
            <HeroTooltip card={{ hero: entry.hero, weapon: null, armour: null, accessory: null }} />
          )}
        </HoverTip>
      )}
    </div>
  );
}

/** Salvage (C §C.5.6): a drop zone for stash tiles that names what the dragged tile would make. */
function SalvageZone({
  active,
  preview,
  onDrop,
}: {
  active: boolean;
  preview: string | null;
  onDrop(): void;
}) {
  return (
    <div
      data-testid="stash-salvage"
      onDragOver={(e) => active && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (active) onDrop();
      }}
      style={{
        padding: "6px 10px",
        minWidth: 120,
        border: `1px ${active ? "dashed" : "solid"} ${active ? "#1BA29B" : MENU.edge}`,
        borderRadius: 4,
        color: active ? MENU.text : MENU.dim,
        fontSize: 12,
      }}
    >
      Salvage{active && preview ? `: ${preview}` : ""}
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly [T, string][];
  onChange(value: T): void;
}) {
  return (
    <label style={{ color: MENU.dim, fontSize: 12 }}>
      {label}{" "}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{ background: "#23272f", color: MENU.text, border: `1px solid ${MENU.edge}` }}
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The stash (GDD §15): uniform cards, no Tetris, filtered and sorted. Tiles
 * drag onto roster cards or onto Salvage, which shows what they'd make and
 * the shard stacks filling toward their orbs; roster heroes and items drop
 * back here.
 */
export function StashPanel({
  account,
  drag,
  setDrag,
  onDropHere,
  onSalvage,
  salvagePreview,
  columns,
}: {
  account: AccountState;
  drag: Drag | null;
  setDrag(drag: Drag | null): void;
  onDropHere(): void;
  /** A stash tile dropped on Salvage (C §C.5.6). */
  onSalvage(): void;
  /** What the dragged tile would salvage into, shown on the Salvage zone. */
  salvagePreview: string | null;
  columns: number;
}) {
  const [filter, setFilter] = useState<StashFilter>({
    slot: "all",
    rarity: "all",
    upgradeOnly: false,
    sort: "newest",
  });
  const entries = stashView(account, filter);
  const accepts = drag !== null && drag.from !== "stash";
  return (
    <section
      data-testid="stash-drop"
      onDragOver={(e) => accepts && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (accepts) onDropHere();
      }}
      style={{
        padding: 10,
        background: MENU.panel,
        border: `1px ${accepts ? "dashed" : "solid"} ${accepts ? MENU.gold : MENU.edge}`,
        borderRadius: 6,
        minWidth: columns * 158,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <Select
          label="Slot"
          value={filter.slot}
          options={[
            ["all", "All"],
            ["weapon", "Weapons"],
            ["armour", "Armour"],
            ["accessory", "Jewellery"],
            ["hero", "Heroes"],
          ]}
          onChange={(slot) => setFilter({ ...filter, slot })}
        />
        <Select
          label="Rarity"
          value={filter.rarity}
          options={[
            ["all", "All"],
            ["normal", "Normal"],
            ["magic", "Magic"],
            ["rare", "Rare"],
            ["unique", "Unique"],
          ]}
          onChange={(rarity) => setFilter({ ...filter, rarity })}
        />
        <Select
          label="Sort"
          value={filter.sort}
          options={[
            ["newest", "Newest"],
            ["rarity", "Rarity"],
            ["level", "Level"],
          ]}
          onChange={(sort) => setFilter({ ...filter, sort })}
        />
        <label style={{ color: MENU.dim, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={filter.upgradeOnly}
            onChange={(e) => setFilter({ ...filter, upgradeOnly: e.target.checked })}
          />{" "}
          Upgrades
        </label>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <SalvageZone active={drag?.from === "stash"} preview={salvagePreview} onDrop={onSalvage} />
        {(Object.entries(SHARDS) as [keyof typeof SHARDS, string][]).map(([key, shard]) => (
          <span
            key={key}
            data-testid={`shard-${key}`}
            title={currencyName(shard)}
            style={{ color: MENU.dim, fontSize: 12 }}
          >
            {currencyName(shard)} {account.currency[shard] ?? 0}/{SALVAGE_TUNING.shardsPerOrb}
          </span>
        ))}
      </div>
      {entries.length === 0 ? (
        <p style={{ color: MENU.dim, margin: 0 }}>
          {account.stash.items.length + account.stash.heroes.length === 0
            ? "The stash is empty. Drops from levels land here."
            : "Nothing matches the filter."}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 150px)`, gap: 8 }}>
          {entries.map((entry) => {
            const key = entry.kind === "item" ? entry.item.id : entry.hero.id;
            return (
              <Tile
                key={key}
                entry={entry}
                lifted={drag?.id === key}
                onDragStart={() =>
                  setDrag(
                    entry.kind === "item"
                      ? { kind: "item", id: entry.item.id, from: "stash" }
                      : { kind: "hero", id: entry.hero.id, from: "stash" },
                  )
                }
                onDragEnd={() => setDrag(null)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
