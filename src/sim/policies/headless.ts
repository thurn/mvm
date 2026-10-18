import type { GemId } from "../../data/types";
import { catalogEntry } from "../../heroes/model/catalog";
import { starterCard } from "../../heroes/model/starter";
import type { LevelDefinition } from "../../monsters/levels/types";
import { startLevel } from "../../monsters/waves";
import { rollDrops, type Drop } from "../../loot/drops";
import { id } from "../../types/ids";
import { lockRoster } from "../economy/roster";
import { step } from "../kernel";
import { streamRng } from "../rng";
import { STEPS_PER_SECOND } from "../time";
import { FOCUSES } from "./focus";
import { POLICIES } from "./policies";

export interface RoundRequest {
  level: LevelDefinition;
  focus: string;
  policy: string;
  seed: number;
  /** A round that hasn't ended by then counts as a loss. */
  maxSeconds?: number;
}

/** What one headless round measured. */
export interface RoundMetrics {
  won: boolean;
  levelSeconds: number;
  kills: number;
  leaks: number;
  /** Mana at 0, 7.5, 15, 25 and 60 s. */
  mana: Record<string, number>;
  firstGearDropSeconds: number | null;
  drops: Record<
    "normal" | "magic" | "rare" | "unique" | "hero" | "spell" | "currency" | "gold",
    number
  >;
}

export const MANA_SAMPLES = [0, 7.5, 15, 25, 60] as const;

function count(drops: readonly Drop[], metrics: RoundMetrics) {
  for (const drop of drops) {
    if (drop.kind === "item") metrics.drops[drop.item.rarity]++;
    else if (drop.kind === "hero" || drop.kind === "spell") metrics.drops[drop.kind]++;
    else if (drop.kind === "currency") metrics.drops.currency++;
    else if (drop.kind === "gold") metrics.drops.gold += drop.amount;
  }
}

/**
 * Plays one round headless (GDD §17): the focus's starter kit, a scripted
 * placement policy, and the kernel at 60 Hz. Kills roll their drops from the
 * round's `loot` stream for the metrics.
 */
export function runRound(request: RoundRequest): RoundMetrics {
  const kit = FOCUSES[request.focus];
  const policy = POLICIES[request.policy];
  if (!kit || !policy)
    throw new Error(`unknown focus ${request.focus} or policy ${request.policy}`);
  const state = startLevel(request.level, request.seed);
  lockRoster(
    state,
    kit.map((skill) => starterCard(id<"Gem">(skill as string) as GemId, 1, `card-${skill}`)),
  );
  const rosterWeaponClasses = kit
    .map((s) => catalogEntry(s).weapon)
    .filter((w): w is NonNullable<typeof w> => w !== null);
  const metrics: RoundMetrics = {
    won: false,
    levelSeconds: 0,
    kills: 0,
    leaks: 0,
    mana: {},
    firstGearDropSeconds: null,
    drops: { normal: 0, magic: 0, rare: 0, unique: 0, hero: 0, spell: 0, currency: 0, gold: 0 },
  };
  const monsters = new Map<string, { rarity: string; affixes: number }>();
  const lootRng = streamRng(state.rng, "loot");
  let nextId = 0;
  const maxTicks = (request.maxSeconds ?? 600) * STEPS_PER_SECOND;
  while (state.result === null && state.tick < maxTicks) {
    const seconds = state.tick / STEPS_PER_SECOND;
    for (const sample of MANA_SAMPLES)
      if (Math.abs(seconds - sample) < 1e-9) metrics.mana[sample] = state.mana;
    for (const m of state.monsters)
      if (!monsters.has(m.id))
        monsters.set(m.id, { rarity: m.rarity, affixes: m.affixes?.length ?? 0 });
    for (const event of step(state, policy(state))) {
      if (event.type === "leak") metrics.leaks++;
      // Monster kills carry a rarity; hero deaths don't. A monster can spawn and die in one step.
      if (event.type !== "kill" || event.rarity === null) continue;
      metrics.kills++;
      const monster = monsters.get(event.targetId) ?? { rarity: event.rarity, affixes: 0 };
      const killer = state.heroes.find((h) => h.id === event.sourceId);
      const drops = rollDrops(
        {
          rarity: monster.rarity as "normal",
          affixCount: monster.affixes,
          areaLevel: request.level.areaLevel,
        },
        {
          killerStats: killer?.actor.stats ?? {},
          rosterWeaponClasses,
          newId: () => `drop-${nextId++}`,
        },
        lootRng,
      );
      if (metrics.firstGearDropSeconds === null && drops.some((d) => d.kind === "item")) {
        metrics.firstGearDropSeconds = state.tick / STEPS_PER_SECOND;
      }
      count(drops, metrics);
    }
  }
  metrics.won = state.result === "won";
  metrics.levelSeconds = state.tick / STEPS_PER_SECOND;
  return metrics;
}
