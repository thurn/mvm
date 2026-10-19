# Pre-existing issues found by hv-mb9m.51

Both are fixed in the same commit as this note.

**Shrinewarden shows its raw ID.** Salvaging a dev-granted Shrinewarden
said "Salvaged MvM/Heroes/Shrinewarden". e2384c1 added the hero to the
catalog, but `skillName` (`src/ui/cards/HeroCard.tsx`) only names MvM custom
heroes from its `CUSTOM_NAMES` table, which lacked it, so cards, stash tiles
and messages showed the ID. Fixed by naming it there; a cards test now
checks every catalog hero and spell has a display name.

**The stash labels spells as heroes.** hv-mb9m.32's note was still open: a
stashed spell's tile read "Hero · level N". `StashPanel` now says
"Spell · level N" for spells.
