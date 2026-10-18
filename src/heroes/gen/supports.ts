import { heroGems, spellGems, supportGems } from "../../data";
import type { GemData, GemId } from "../../data/types";
import { HERO_GEN_TUNING as T } from "../../tuning/heroes";

type Rng = () => number;

const ELEMENTS = ["fire", "cold", "lightning", "chaos"] as const;
const ROMAN: Record<string, 1 | 2 | 3> = { I: 1, II: 2, III: 3 };

/** The RePoE fields this module reads from `activeSkill` and `supportGem`. */
interface ActiveSkill {
  types?: string[];
}
interface SupportRule {
  allowed_types?: string[] | null;
  excluded_types?: string[] | null;
}

/**
 * Evaluates a PoE2 type expression in RPN (AND, OR, NOT); leftover stack items
 * are OR-ed (B §1.10 step 2). An empty or absent expression is null here.
 */
export function evaluateTypes(expression: readonly string[], types: ReadonlySet<string>): boolean {
  const stack: boolean[] = [];
  for (const token of expression) {
    if (token === "AND" || token === "OR") {
      const b = stack.pop() ?? false;
      const a = stack.pop() ?? false;
      stack.push(token === "AND" ? a && b : a || b);
    } else if (token === "NOT") stack.push(!(stack.pop() ?? false));
    else stack.push(types.has(token));
  }
  return stack.some(Boolean);
}

function gem(skillId: string): GemData | undefined {
  return [...heroGems(), ...spellGems()].find((g) => g.id === skillId);
}

/** A skill's active-skill types; crossbow heroes take their shot and ammo skills' union. */
export function skillTypes(skillId: string): Set<string> {
  if (skillId.startsWith("MvM/")) return new Set(T.acolyteTypes);
  const types = new Set<string>();
  for (const skill of gem(skillId)?.skills ?? [])
    if (!skill.isSupport)
      for (const t of (skill.activeSkill as ActiveSkill | null)?.types ?? []) types.add(t);
  return types;
}

/** A support's family (its name without the tier numeral), tier and level gate. */
export function supportInfo(id: string): { family: string; tier: 1 | 2 | 3; minLevel: number } {
  const data = supportGems().find((s) => s.id === id);
  if (!data) throw new Error(`unknown support ${id}`);
  const numeral = /\s+(I{1,3})$/.exec(data.name);
  const tier =
    (numeral && ROMAN[numeral[1]!]) ||
    (data.craftingLevel <= 2 ? 1 : data.craftingLevel <= 4 ? 2 : 3);
  return {
    family: numeral ? data.name.slice(0, numeral.index) : data.name,
    tier,
    minLevel: T.tierLevel[tier],
  };
}

/** The MvM anti-synergy blockers (B §1.10), by family; symmetric. */
const CONFLICTS: [string, (family: string) => boolean][] = [
  ["Attunement", (f) => f.endsWith("Attunement")],
  [
    "Brutality",
    (f) =>
      [
        "Elemental Armament",
        "Elemental Focus",
        "Ignite",
        "Freeze",
        "Frost Nexus",
        "Shock",
        "Shock Conduction",
        "Lightning Exposure",
      ].includes(f) ||
      f.endsWith("Attunement") ||
      f.endsWith("Penetration"),
  ],
  [
    "Elemental Focus",
    (f) =>
      [
        "Ignite",
        "Fiery Death",
        "Freeze",
        "Frost Nexus",
        "Shock",
        "Shock Conduction",
        "Lightning Exposure",
      ].includes(f),
  ],
  ["Controlled Destruction", (f) => ["Pinpoint Critical", "Supercritical", "Ambush"].includes(f)],
  ["Exploit Weakness", (f) => f === "Armour Break"],
];

const isAttunement = (family: string) => family.endsWith("Attunement");

/** Whether two supports block each other (same family, or a conflict group). */
export function conflicts(a: string, b: string): boolean {
  const fa = supportInfo(a).family;
  const fb = supportInfo(b).family;
  if (fa === fb) return true;
  const blocks = (x: string, y: string) =>
    CONFLICTS.some(([owner, blocked]) =>
      owner === "Attunement" ? isAttunement(x) && blocked(y) : x === owner && blocked(y),
    );
  return blocks(fa, fb) || blocks(fb, fa);
}

/** The hero's damage types: element tags, and physical for element-less attacks or physical tags. */
function damageTypes(skillId: string): Set<string> {
  const tags = new Set(gem(skillId)?.tags ?? []);
  const types = skillTypes(skillId);
  const out = new Set<string>(ELEMENTS.filter((e) => tags.has(e)));
  if (tags.has("physical") || (types.has("Attack") && out.size === 0)) out.add("physical");
  return out;
}

/** "No dead rolls" (B §1.10 step 4): supports that cannot do anything on this hero. */
function deadOn(supportId: string, skillId: string): boolean {
  const support = supportGems().find((s) => s.id === supportId)!;
  const { family } = supportInfo(supportId);
  const types = skillTypes(skillId);
  const damage = damageTypes(skillId);
  const stats = JSON.stringify(gem(skillId)?.skills ?? []);
  if (family === "Pierce" && stats.includes("cannot_pierce")) return true;
  if (family === "Fork" && stats.includes("projectiles_cannot_fork")) return true;
  if (family === "Chain" && stats.includes("cannot_chain")) return true;
  if (family === "Longshot" && types.has("Melee")) return true;
  if (family === "Close Combat" && !types.has("Melee")) return true;
  if (family === "Brutality") return !(damage.has("physical") && damage.size === 1);
  // Attunements convert to their element: only for physical heroes or that element's own.
  if (isAttunement(family)) {
    const element = family.split(" ")[0]!.toLowerCase();
    return !(damage.has(element) || (damage.has("physical") && damage.size === 1));
  }
  if (family === "Poison") return !(damage.has("chaos") || damage.has("physical"));
  for (const element of ["fire", "cold", "lightning", "physical"] as const)
    if (support.tags.includes(element) && !damage.has(element)) return true;
  return false;
}

/** Whether a support can roll on a skill at all, ignoring level (steps 1, 2, 4). */
export function isCompatible(supportId: string, skillId: string): boolean {
  const support = supportGems().find((s) => s.id === supportId);
  if (!support || support.craftingLevel === 0) return false;
  const rule = support.skills[0]?.supportGem as SupportRule | null | undefined;
  const types = skillTypes(skillId);
  if (rule?.allowed_types && !evaluateTypes(rule.allowed_types, types)) return false;
  if (rule?.excluded_types && evaluateTypes(rule.excluded_types, types)) return false;
  return !deadOn(supportId, skillId);
}

function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: Rng): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1]!;
}

/**
 * Rolls `count` supports for a hero (B §1.10): compatible, tier-gated by level,
 * 3× toward recommended, drawn without replacement, never sharing a family or
 * conflicting with each other or with `existing`.
 */
export function rollSupports(
  skillId: string,
  level: number,
  count: number,
  rng: Rng,
  existing: readonly string[] = [],
): GemId[] {
  const recommended = new Set<string>(gem(skillId)?.recommendedSupports ?? []);
  let pool = supportGems()
    .map((s) => s.id as string)
    .filter((id) => isCompatible(id, skillId) && supportInfo(id).minLevel <= level)
    .filter((id) => existing.every((other) => !conflicts(id, other)));
  const picked: GemId[] = [];
  while (picked.length < count && pool.length > 0) {
    const id = pickWeighted(pool, (s) => (recommended.has(s) ? T.recommendedWeight : 1), rng);
    picked.push(id as GemId);
    pool = pool.filter((other) => !conflicts(other, id));
  }
  return picked;
}
