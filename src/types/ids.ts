/**
 * Branded string IDs. Content is identified by RePoE IDs and instances by
 * UUID; brands keep the kinds from mixing. Declare each kind next to its
 * owner as `export type HeroId = Id<"Hero">`.
 */
declare const brand: unique symbol;

export type Id<Kind extends string> = string & { readonly [brand]: Kind };

/** Brands a raw string. Use at trust boundaries: importers, saves, tests. */
export function id<Kind extends string>(raw: string): Id<Kind> {
  return raw as Id<Kind>;
}
