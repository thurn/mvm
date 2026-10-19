# Pre-existing issue found by hv-mb9m.32

**The stash labels spells as heroes.** After dev-granting spells, the stash
listed Earthquake and Explosive Grenade as "Hero · level 6".
`src/ui/hideout/StashPanel.tsx` builds every non-item entry's subtitle as
`Hero · level N` and never checks whether the skill is a spell. Fix: read
the catalog role and say "Spell · level N" for spells.
