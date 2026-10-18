import { DAMAGE_TYPES, type DamageType } from "../combat/stats";
import type { SimEvent, SimEventOf } from "../sim/events";
import { JUICE_TUNING, type PresetName, type Tier } from "../tuning/juice";
import { significance } from "./core/significance";
import type { JuiceSettings } from "./core/settings";
import type { Cue, CueBatch } from "./director/cue";
import { bandEffects, hitSoundId, hitstopMs } from "./hits/bands";

type Row<T extends SimEvent["type"]> = (
  event: SimEventOf<T>,
  settings: JuiceSettings,
) => { tier: Tier; cues: Cue[] };

const IMPACT: Readonly<Record<DamageType, PresetName>> = {
  physical: "dust",
  fire: "embers",
  cold: "frost",
  lightning: "sparks",
  chaos: "bubbles",
};

function mainType(breakdown: Record<DamageType, number>): DamageType {
  return DAMAGE_TYPES.reduce(
    (best, type) => (breakdown[type] > breakdown[best] ? type : best),
    "physical" as DamageType,
  );
}

const RARITY_TIER = { normal: 1, magic: 2, rare: 3, unique: 5 } as const;

/**
 * The cue table (P12, Appendix H §1.3 and §2.6): one row per SimEvent kind,
 * mapping the event, and a hit's significance band, to a tier and cues.
 * Later beads refine rows; every event kind has one.
 */
const CUE_TABLE: { [K in SimEvent["type"]]: Row<K> } = {
  hit(event, settings) {
    if (event.avoidedBy) {
      return {
        tier: 1,
        cues: [
          {
            kind: "number",
            sourceId: event.sourceId,
            targetId: event.targetId,
            amount: 0,
            type: "physical",
            crit: false,
            big: false,
            lane: event.lane,
            x: event.x,
            words: event.avoidedBy === "evade" ? "EVADE" : "BLOCK",
          },
          { kind: "sound", id: `hit_${event.avoidedBy}`, bus: "sfx" },
        ],
      };
    }
    const band = significance(event.dealt, event.targetMaxLife, false, settings);
    // A hit fully mitigated to nothing reads as IMMUNE (H §2.5).
    if (event.dealt <= 0)
      return {
        tier: 1,
        cues: [
          {
            kind: "number",
            sourceId: event.sourceId,
            targetId: event.targetId,
            amount: 0,
            type: "physical",
            crit: false,
            big: false,
            lane: event.lane,
            x: event.x,
            words: "IMMUNE",
          },
        ],
      };
    const tier: Tier = event.crit || band === "big" ? 2 : 1;
    const type = mainType(event.breakdown);
    const cues: Cue[] = [
      { kind: "flash", targetId: event.targetId, crit: event.crit, band },
      {
        kind: "number",
        sourceId: event.sourceId,
        targetId: event.targetId,
        amount: event.dealt,
        type,
        crit: event.crit,
        big: band === "big",
        lane: event.lane,
        x: event.x,
      },
      {
        kind: "particles",
        preset: IMPACT[type],
        lane: event.lane,
        x: event.x,
        scale: bandEffects(band).particleScale,
      },
      {
        kind: "sound",
        id: hitSoundId(band),
        bus: "sfx",
        x: event.x,
        gainDb: bandEffects(band).gainDb,
      },
    ];
    // Big hits add a low thump under the heavy variant (H §2.6).
    if (bandEffects(band).thump)
      cues.push({ kind: "sound", id: "hit_thump", bus: "sfx", x: event.x });
    const ms = hitstopMs(band, event.crit);
    if (ms > 0)
      cues.push({
        kind: "hitstop",
        scope: "actor",
        actorIds: [event.sourceId, event.targetId],
        ms,
      });
    return { tier, cues };
  },
  // DoT ticks every step; the hits system sums them into 0.5 s numbers (H §2.5).
  dot: (event) => ({
    tier: 0,
    cues: [
      {
        kind: "number",
        sourceId: event.sourceId,
        targetId: event.targetId,
        amount: event.amount,
        type: "fire",
        crit: false,
        big: false,
        lane: event.lane,
        x: event.x,
        dot: true,
      },
    ],
  }),
  // The soul puff, the coins and the hero tile flash are the kills system's, timed off the death cue (H §7.2).
  kill: (event) => ({
    tier:
      event.rarity === null
        ? 3
        : event.rarity === "rare"
          ? 3
          : event.rarity === "unique" || event.rarity === "boss"
            ? 5
            : 2,
    cues: [
      {
        kind: "death",
        targetId: event.targetId,
        lane: event.lane,
        x: event.x,
        rarity: event.rarity,
      },
      ...(event.rarity === null
        ? [{ kind: "sound", id: "hero_death", bus: "sfx", x: event.x } as const]
        : [
            { kind: "sound", id: "kill", bus: "sfx", x: event.x } as const,
            { kind: "sound", id: "kill_pop", bus: "sfx", x: event.x } as const,
          ]),
    ],
  }),
  drop(event) {
    const drop = event.drop;
    const tier: Tier =
      drop.kind === "item"
        ? RARITY_TIER[drop.item.rarity]
        : drop.kind === "hero" || drop.kind === "spell"
          ? 4
          : drop.kind === "currency"
            ? 3
            : 1;
    return {
      tier,
      cues: [
        { kind: "lootTimeline", dropId: event.dropId, drop, lane: event.lane, x: event.x },
        {
          kind: "sound",
          id: drop.kind === "item" ? `drop_${drop.item.rarity}` : `drop_${drop.kind}`,
          bus: "sfx",
        },
      ],
    };
  },
  manaSpawn: () => ({ tier: 0, cues: [{ kind: "sound", id: "mana_spawn", bus: "sfx" }] }),
  manaCollect: () => ({
    tier: 0,
    cues: [
      { kind: "hudBump", target: "mana" },
      { kind: "sound", id: "mana_collect", bus: "ui" },
    ],
  }),
  placed: (event) => ({
    tier: 2,
    cues: [
      { kind: "particles", preset: "dust", lane: event.lane, x: event.column },
      { kind: "sound", id: "place_thunk", bus: "sfx", x: event.column },
    ],
  }),
  placeRefused: () => ({ tier: 0, cues: [{ kind: "sound", id: "ui_deny", bus: "ui" }] }),
  shovelled: (event) => ({
    tier: 1,
    cues: [
      { kind: "particles", preset: "dust", lane: event.lane, x: event.column },
      { kind: "sound", id: "shovel", bus: "sfx" },
    ],
  }),
  leak: () => ({
    tier: 3,
    cues: [
      { kind: "hudBump", target: "life" },
      { kind: "sound", id: "leak", bus: "sfx" },
    ],
  }),
  cast: () => ({ tier: 2, cues: [{ kind: "sound", id: "cast", bus: "sfx" }] }),
  castRefused: () => ({ tier: 0, cues: [{ kind: "sound", id: "ui_deny", bus: "ui" }] }),
  spellImpact: (event) => ({
    tier: 3,
    cues: [
      ...event.tiles.map((tile): Cue => ({
        kind: "particles",
        preset: "dust",
        lane: tile.lane,
        x: tile.column,
        scale: 0.5,
      })),
      { kind: "sound", id: `spell_${event.part}`, bus: "sfx" },
    ],
  }),
  waveStart: (event) => ({
    tier: event.flag ? 3 : 1,
    cues: [
      { kind: "hudBump", target: "wave" },
      { kind: "sound", id: event.flag ? "wave_flag" : "wave_start", bus: "sfx" },
    ],
  }),
  flagWarning: () => ({
    tier: 4,
    cues: [
      { kind: "banner", text: "A huge wave of Monsters approaches!" },
      { kind: "sound", id: "flag_horn", bus: "sfx" },
    ],
  }),
  levelEnd: (event) => ({
    tier: event.result === "won" ? 5 : 3,
    cues: [
      { kind: "banner", text: event.result === "won" ? "Level cleared!" : "The line has fallen" },
      { kind: "sound", id: event.result === "won" ? "level_won" : "level_lost", bus: "music" },
    ],
  }),
  // Ailment events carry no position; their visuals are 1.30's ailment layer.
  // The ailments system draws the apply flash, overlays and particles from these (H §8).
  ailmentApplied: (event) => ({
    tier: event.ailment === "freeze" || event.ailment === "fullyBroken" ? 2 : 1,
    cues: [
      { kind: "ailment", targetId: event.targetId, ailment: event.ailment, phase: "apply" },
      { kind: "sound", id: `ailment_${event.ailment}`, bus: "sfx" },
    ],
  }),
  ailmentExpired: (event) => ({
    tier: 0,
    cues: [{ kind: "ailment", targetId: event.targetId, ailment: event.ailment, phase: "expire" }],
  }),
  stun: (event) => ({
    tier: event.kind === "heavy" ? 3 : 1,
    cues: [
      ...(event.kind === "heavy"
        ? [
            {
              kind: "ailment",
              targetId: event.targetId,
              ailment: "heavyStun",
              phase: "apply",
            } as const,
          ]
        : []),
      { kind: "sound", id: `stun_${event.kind}`, bus: "sfx" },
    ],
  }),
};

/** The tier's own global effects (H §1.3): shake, global hitstop, slow-mo and music duck. */
export function tierCues(tier: Tier): Cue[] {
  const row = JUICE_TUNING.tiers[tier];
  const cues: Cue[] = [];
  if (row.trauma > 0) cues.push({ kind: "shake", trauma: row.trauma });
  if (row.globalHitstopMs > 0) cues.push({ kind: "hitstop", scope: "global" });
  if (row.slowmo) cues.push({ kind: "slowmo", scale: row.slowmo.scale, ms: row.slowmo.ms });
  if (row.duckDb < 0) cues.push({ kind: "duck", db: row.duckDb, seconds: tier === 5 ? 2 : 1 });
  return cues;
}

/** One event's tier and cues: its row plus its tier's global effects. */
export function cuesFor(event: SimEvent, settings: JuiceSettings): Omit<CueBatch, "at"> {
  const row = (CUE_TABLE[event.type] as Row<typeof event.type>)(event as never, settings);
  return { event: event.type, tier: row.tier, cues: [...row.cues, ...tierCues(row.tier)] };
}
