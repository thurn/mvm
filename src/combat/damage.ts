import { DAMAGE_TYPES, type DamageType } from "./stats";

/** Damage per type. JSON-safe; every type is present. */
export type DamageMap = Record<DamageType, number>;

export function damageMap(values: Partial<DamageMap> = {}): DamageMap {
  return {
    physical: values.physical ?? 0,
    fire: values.fire ?? 0,
    cold: values.cold ?? 0,
    lightning: values.lightning ?? 0,
    chaos: values.chaos ?? 0,
  };
}

export function totalDamage(damage: DamageMap): number {
  let total = 0;
  for (const type of DAMAGE_TYPES) total += damage[type];
  return total;
}

export function mapDamage(
  damage: DamageMap,
  f: (amount: number, type: DamageType) => number,
): DamageMap {
  const out = damageMap();
  for (const type of DAMAGE_TYPES) out[type] = f(damage[type], type);
  return out;
}
