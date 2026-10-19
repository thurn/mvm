# Pre-existing issue found by hv-7ic2.87

**Life regeneration reads per minute as per second in item tooltips.** A
rare ring at item level 10 showed "91 Life Regeneration per second" and
"138 Life Regeneration per second". The mod's stat is
`base_life_regeneration_rate_per_minute`. `src/ui/cards/affixes.ts` prints
the raw per-minute value under a "per second" template. The hero sheet
divides it correctly through `STAT_MAP`'s divisor, so only the text is
wrong. Fix: divide by 60 in the tooltip, or read the value through the stat
map's divisor.
