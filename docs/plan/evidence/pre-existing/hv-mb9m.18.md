# Pre-existing issues found by hv-mb9m.18

Both are fixed in the same commit as this note.

**Banner cues were never shown, and the flag-wave horn never played.** The
`flagWarning` cue row emits a "A huge wave of Monsters approaches!" banner
and the `flag_horn` sound, but no presentation system consumed `banner`
cues. Sound cues are played by the system that owns their event, and none
owned `flagWarning`. The new `bannerSystem` (`src/juice/banners/`) draws
banner text across the board for 2.2 s and plays the flag wave's and the
Strongbox ambush's sounds. The level end's banner stays with the level-end
screen and its stinger with the music system.

**The Strongbox chest was never drawn.** Its closed, opening and open
frames were baked into the atlas (`src/assets/tiles.ts`), but no layer drew
`state.strongbox`, so a box blocked its tile invisibly. The new
`strongboxSystem` draws it.
