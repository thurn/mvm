import { catalogEntry } from "../../heroes/model/catalog";
import { laneGap, occupies } from "../targeting";
import { SIM_TUNING } from "../../tuning/sim";
import type { Intent } from "../intents";
import type { RoundState } from "../state";
import type { RosterSlot } from "../economy/roster";

/** A scripted player: the intents to send on this step. Deterministic in the round state. */
export type Policy = (state: RoundState) => Intent[];

type Role = "acolyte" | "melee" | "ranged" | "spell";

function role(slot: RosterSlot): Role {
  const r = catalogEntry(slot.card.hero.skillId).role;
  if (r === "acolyte") return "acolyte";
  if (r === "spell") return "spell";
  if (r === "striker" || r === "wall") return "melee";
  return "ranged";
}

const slotFor = (state: RoundState, r: Role) => state.roster.find((s) => role(s) === r);
const ready = (state: RoundState, slot: RosterSlot | undefined) =>
  slot !== undefined && slot.rechargeLeft <= 1e-9 && state.mana >= slot.cost;
const occupied = (state: RoundState, lane: number, column: number) =>
  state.heroes.some((h) => h.lane === lane && h.column === column);
const count = (state: RoundState, slot: RosterSlot | undefined) =>
  slot ? state.heroes.filter((h) => h.skillId === slot.card.hero.skillId).length : 0;

/** Lanes ordered by threat: most monsters first, then the middle lane. */
function lanesByThreat(state: RoundState): number[] {
  const middle = state.lanes[Math.floor(state.lanes.length / 2)]!;
  const threat = (lane: number) =>
    state.monsters.filter((m) => occupies(m, lane) && m.x <= SIM_TUNING.columns + 0.5).length;
  return [...state.lanes].sort(
    (a, b) => threat(b) - threat(a) || Math.abs(a - middle) - Math.abs(b - middle) || a - b,
  );
}

function place(
  state: RoundState,
  slot: RosterSlot,
  columns: readonly number[],
  lanes = lanesByThreat(state),
): Intent[] {
  for (const column of columns) {
    for (const lane of lanes) {
      if (!occupied(state, lane, column))
        return [{ type: "place", cardId: slot.cardId, lane, column }];
    }
  }
  return [];
}

/**
 * Casts the spell where it covers the most monsters on the lawn: a column, or
 * a 3×3 (grenade one tile right of its rest), once it would cover `minScore`.
 */
function castSpell(state: RoundState, slot: RosterSlot | undefined, minScore = 3): Intent[] {
  if (!ready(state, slot)) return [];
  const shapeIsColumn = slot!.card.hero.skillId.endsWith("Earthquake");
  const rollsLeft = slot!.card.hero.skillId.endsWith("ExplosiveGrenade");
  let best = { score: 0, lane: 0, column: 0 };
  for (const lane of state.lanes) {
    for (let column = 2; column <= SIM_TUNING.columns; column++) {
      const centre = rollsLeft ? column - 1 : column;
      const score = state.monsters.filter(
        (m) =>
          Math.abs(m.x - centre) <= (shapeIsColumn ? 0.5 : 1.5) &&
          (shapeIsColumn || laneGap(m, lane) <= 1),
      ).length;
      if (score > best.score) best = { score, lane, column };
    }
  }
  return best.score >= minScore
    ? [{ type: "cast", spellId: slot!.cardId, lane: best.lane, x: best.column }]
    : [];
}

/** Ranged heroes stand in column 2, then 3; melee at the front of a threatened lane, column 4. */
function rangedStep(state: RoundState, ranged: RosterSlot | undefined): Intent[] {
  if (!ready(state, ranged)) return [];
  return place(state, ranged!, [2, 3]);
}

function meleeStep(
  state: RoundState,
  melee: RosterSlot | undefined,
  onlyThreatened: boolean,
): Intent[] {
  if (!ready(state, melee)) return [];
  const threatened = lanesByThreat(state).filter(
    (lane) =>
      !state.heroes.some((h) => h.lane === lane && h.skillId === melee!.card.hero.skillId) &&
      (!onlyThreatened ||
        state.monsters.some((m) => m.lane === lane && m.x <= SIM_TUNING.columns + 0.5)),
  );
  return threatened.length > 0 ? place(state, melee!, [4], threatened) : [];
}

function acolyteStep(state: RoundState, acolyte: RosterSlot | undefined, target: number): Intent[] {
  if (count(state, acolyte) >= target || !ready(state, acolyte)) return [];
  return place(state, acolyte!, [1]);
}

/** PvZ's opener: three acolytes, then shooters in every lane, melee where the line is threatened, more acolytes when rich. */
const pvzOpener: Policy = (state) => {
  const spell = castSpell(state, slotFor(state, "spell"));
  const acolyte = slotFor(state, "acolyte");
  const ranged = slotFor(state, "ranged");
  if (count(state, acolyte) < 3) return [...spell, ...acolyteStep(state, acolyte, 3)];
  const steps =
    count(state, ranged) < state.lanes.length
      ? rangedStep(state, ranged)
      : meleeStep(state, slotFor(state, "melee"), true);
  if (steps.length > 0) return [...spell, ...steps];
  return [
    ...spell,
    ...(state.mana >= 200 ? acolyteStep(state, acolyte, state.lanes.length) : []),
    ...rangedStep(state, ranged),
  ];
};

/** Two acolytes, then nothing but shooters. */
const rangedHeavy: Policy = (state) => {
  const acolyte = slotFor(state, "acolyte");
  if (count(state, acolyte) < 2) return acolyteStep(state, acolyte, 2);
  return [
    ...castSpell(state, slotFor(state, "spell")),
    ...rangedStep(state, slotFor(state, "ranged")),
  ];
};

/** Two acolytes, a melee hero at the front of every lane, then shooters. */
const wallFirst: Policy = (state) => {
  const acolyte = slotFor(state, "acolyte");
  if (count(state, acolyte) < 2) return acolyteStep(state, acolyte, 2);
  const melee = slotFor(state, "melee");
  if (count(state, melee) < state.lanes.length) {
    const steps = meleeStep(state, melee, false);
    if (steps.length > 0 || !ready(state, melee))
      return [...castSpell(state, slotFor(state, "spell")), ...steps];
  }
  return [
    ...castSpell(state, slotFor(state, "spell")),
    ...rangedStep(state, slotFor(state, "ranged")),
  ];
};

/** Seconds before the spell is ready when the spellcaster starts banking mana for it. */
const BANK_SECONDS = 8;

/**
 * The PvZ opener, but it banks mana for the spell once its acolytes are down
 * and casts at the first monster in reach (mason hv-7ic2.110): the opener
 * alone spends mana as it arrives and almost never casts in Level 1, so this
 * is the policy that exercises spells in autoplay QA and tests.
 */
const spellcaster: Policy = (state) => {
  const spellSlot = slotFor(state, "spell");
  const cast = castSpell(state, spellSlot, 1);
  if (cast.length > 0) return cast;
  const acolyte = slotFor(state, "acolyte");
  if (count(state, acolyte) < 3) return acolyteStep(state, acolyte, 3);
  const banking =
    spellSlot !== undefined &&
    spellSlot.rechargeLeft <= BANK_SECONDS &&
    state.mana < spellSlot.cost &&
    state.monsters.length > 0;
  return banking ? [] : pvzOpener(state).filter((intent) => intent.type !== "cast");
};

export const POLICIES: Readonly<Record<string, Policy>> = {
  pvzOpener,
  rangedHeavy,
  wallFirst,
  spellcaster,
};
