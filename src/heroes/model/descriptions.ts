import { HERO_BOARD_TUNING as B } from "../../tuning/heroes";
import { SPELL_TUNING } from "../../tuning/spells";

/** What a hero or spell does on the board, for its PoE2 gem-style tooltip (playtest hv-7ic2.83). */
export interface HeroDescription {
  /** The grey tag line, as on a PoE2 skill gem. */
  tags: readonly string[];
  /** One or two sentences: targeting, shape, what it hits, and its role. */
  text: string;
  /** Where it reaches, in tiles. */
  range: string;
}

const tiles = (n: number) => `${n} ${n === 1 ? "tile" : "tiles"}`;

/** One per catalog entry, matching the behaviors in src/heroes/board/ and src/spells/. */
const DESCRIPTIONS: Readonly<Record<string, HeroDescription>> = {
  "MvM/Heroes/EzomyteAcolyte": {
    tags: ["Persistent", "Mana"],
    text: `Makes a mana orb every ${B.acolyte.orbSeconds} s, the first within ${B.acolyte.firstOrbMaxSeconds} s; Spirit makes the orbs bigger. Deals no damage, but blocks monsters like any hero.`,
    range: "Its own tile",
  },
  "Metadata/Items/Gems/SkillGemRollingSlam": {
    tags: ["Attack", "Melee", "Area", "Slam"],
    text: `When a monster comes within ${tiles(B.rollingSlam.reach)} in its lane, slams an area ${tiles(B.rollingSlam.firstOffset)} ahead, then a larger one ${tiles(B.rollingSlam.secondOffset)} ahead. Very tough, so it holds the lane as a wall.`,
    range: `${tiles(B.rollingSlam.reach)} ahead in its lane`,
  },
  "Metadata/Items/Gems/SkillGemIceStrike": {
    tags: ["Attack", "Melee", "Strike", "Cold"],
    text: `Strikes the most advanced monster on its tile or the next one. Every ${B.iceStrike.combo === 3 ? "third" : `${B.iceStrike.combo}th`} strike is a slower, harder finisher that reaches ${tiles(B.iceStrike.finalReach)} ahead.`,
    range: `${tiles(B.meleeReach)} ahead; finisher ${tiles(B.iceStrike.finalReach)}`,
  },
  "Metadata/Items/Gems/SkillGemFallingThunder": {
    tags: ["Attack", "Melee", "Area", "Projectile", "Lightning"],
    text: `Slams a cone ahead: its own lane from ${tiles(B.fallingThunder.ownLaneFrom)} out and both neighbouring lanes from ${tiles(B.fallingThunder.adjacentLaneFrom)} out. Every ${B.fallingThunder.volleyEvery === 3 ? "third" : `${B.fallingThunder.volleyEvery}th`} slam also fires lightning bolts that pierce down all three lanes.`,
    range: `${tiles(B.fallingThunder.reach)} ahead, three lanes`,
  },
  "Metadata/Items/Gems/SkillGemLightningArrow": {
    tags: ["Attack", "Projectile", "Lightning", "Chaining"],
    text: `Shoots the first monster in its lane. Each hit sends lightning beams to nearby monsters within ${B.lightningArrow.beamRadius} tiles, in any lane, and the beams chain on.`,
    range: `${tiles(B.laneProjectileRange)} along its lane`,
  },
  "Metadata/Items/Gems/SkillGemLightningSpear": {
    tags: ["Attack", "Projectile", "Lightning"],
    text: "Not on the board yet: it can be placed and blocks monsters, but does not attack until its behavior lands.",
    range: "None yet",
  },
  "Metadata/Items/Gem/SkillGemArmourPiercingRounds": {
    tags: ["Attack", "Projectile", "Ammunition", "Physical"],
    text: "Fires crossbow bolts at the first monster in its lane; each bolt breaks the monster's armour, so physical hits on it land harder. After emptying its clip it stops to reload.",
    range: `${tiles(B.laneProjectileRange)} along its lane`,
  },
  "Metadata/Items/Gems/SkillGemSpark": {
    tags: ["Spell", "Projectile", "Lightning"],
    text: `Casts sparks down its own lane and both neighbouring lanes whenever a monster is within reach of any of them.`,
    range: `${tiles(B.spark.range)} ahead, three lanes`,
  },
  "Metadata/Items/Gems/SkillGemEarthquake": {
    tags: ["Spell card", "Attack", "Area", "Slam"],
    text: "Smashes one whole column of the board, then an aftershock hits the same column again a moment later.",
    range: "One column, every lane",
  },
  "Metadata/Items/Gem/SkillGemExplosiveGrenade": {
    tags: ["Spell card", "Attack", "Area", "Grenade", "Fire"],
    text: `Throws a grenade that rolls ${tiles(SPELL_TUNING.grenadeRollTiles)} toward the gate and explodes after a short fuse.`,
    range: "3×3 tiles",
  },
  "Metadata/Items/Gems/SkillGemComet": {
    tags: ["Spell card", "Spell", "Area", "Cold"],
    text: "Calls down a comet that lands on the chosen tiles after a delay, dealing heavy cold damage.",
    range: "3×3 tiles",
  },
};

export function heroDescription(skillId: string): HeroDescription {
  const description = DESCRIPTIONS[skillId];
  if (!description) throw new Error(`no hero description for ${skillId}`);
  return description;
}
