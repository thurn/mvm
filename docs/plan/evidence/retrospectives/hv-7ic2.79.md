# Phase 1 retrospective (hv-7ic2.79)

A read-only `sage` pass over Phase 1 (epic `hv-7ic2`), written at staging
`0e9a98d` on 2026-10-18. Sources: the close notes and friction blocks of
the 97 closed child beads, Tollgate's status and event history, the 48
closed `review-qa` beads, and the one `playtest` bead.

## What happened

- **Span.** The first Phase 1 bead was filed at 17:26 UTC. The last child
  bead before this one closed at 23:43 UTC.
- **Volume.** 97 child beads closed: about 50 work beads, 48 reviews, 8
  `mason` refactors and the M1 playthrough. Staging gained 81 commits:
  42 `feat`, 27 `fix`, 7 `refactor`, 2 `test`, 2 `docs`, 1 `chore`.
- **M1** landed on staging `5991f59`. All three focuses passed the
  playthrough with `caps` empty, and save v1 is frozen with the milestone
  save committed.
- **Still open.** These beads are outside 1.40's and 1.41's scope:
  - hv-7ic2.85: level-end fold;
  - hv-7ic2.86: spell telegraph;
  - hv-7ic2.93: HUD scale;
  - hv-7ic2.94: first-clear offer;
  - hv-7ic2.95: New game with an existing account;
  - hv-7ic2.87–.92: team affixes, monster elements and their reviews;
  - 1.42 and the gate.

## Delivery and Tollgate

- **Gates are fast and green.** Over the last 23 candidates in the event
  window, a candidate took a median of 13 s from creation to promotion
  (max 22 s). Authorization followed creation by a median of 3 s. All 24
  retained history items promoted on their first attempt.
- **One early gate failure.** The first gate timed out at 10 minutes
  (hv-7ic2.15). Asset-library tests probed `~/Documents` from Tollgate's
  sandboxed runner, which blocks on macOS folder privacy. Gating those
  tests on explicit env vars fixed it for good.
- **Stacked follow-up commits were refused** ("unpromoted ancestor") until
  squashed (hv-7ic2.15, early 1.x). Workflow § Delivery now says commit
  once.
- **`tg approve` with a bead ID** returned "source is already queued" twice
  (hv-7ic2.69). Workflow § Delivery says `approve <candidate-id>`, but
  decisions.md and README still read `tg approve <id>` or `tg approve
  --wait`.
- **The master checkout went dirty.** Tollgate recorded 14
  `user-master.sync-needs-attention` events, each "master worktree is
  dirty". The cause was untracked `.playwright-mcp/` logs that Playwright
  MCP writes into the primary checkout's root. The operator's 3b46c97
  ignored the directory, and master now matches staging. Earlier QA
  screenshots also landed in the primary root and had to be moved.

## Reviews

- 48 review beads closed. Their notes record 13 accepted findings, 7
  rejected, 5 confirmed and 3 left unresolved. The unresolved ones were
  filed as their own beads or tracked: hv-7ic2.85, hv-7ic2.86, and a
  menu-screen hitstop for the first-clear reveal.
- **Where reviews paid off.** The feature reviews (1.x r-beads) usually
  found something: juice settings ignored by menu-screen effects (1.35r
  and 1.36r), a missing sound behind a cue row (1.38), uncovered spell rows
  in a seam test (1.38r), a wrong hero description (hv-7ic2.84) and
  live-count drift in the fx probe (hv-7ic2.109, a mason review).
- **Where they didn't.** Seven of the eight mason reviews needed no fix; the eighth (hv-7ic2.109) fixed the fx probe.
  Refactors with strong type and test gates leave little for a same-session
  review to catch. One review recorded a factual correction to its bead's
  notes (hv-7ic2.103).
- **Independence.** The executor that implemented a bead also claimed and
  ran its review. Reviews stayed cold in procedure (fresh worktree, diff
  first), but the reviewer had seen the work. That fits P5's letter; the
  operator may want a different session to own review beads in Phase 2.

## Mason pass (1.40)

1.40 filed eight beads, and all landed with their reviews before this
retrospective:

- hv-7ic2.96: account rules moved to `src/account`, with branded IDs and
  one way to acquire a hero. The dev grant still made weaponless heroes,
  and this fixed it.
- hv-7ic2.98: an account store, and screen phases typed to carry their
  account. A dev grant now shows at once.
- hv-7ic2.100: tagged-union hero kits. Typing them uncovered a live bug:
  the acolyte crook glow and `mana_charge` had never played.
- hv-7ic2.102: typed sound IDs, with behavioral cue invariants replacing
  exact-list tests.
- hv-7ic2.104: one UI juice hook, plus a guard test.
- hv-7ic2.106: `window.__mvm.reset()` and `?reset=1`.
- hv-7ic2.108: `window.__mvm.fx` juice measurements.
- hv-7ic2.110: a spellcaster autoplay policy.

## Friction themes (from close notes)

| Theme | Beads | Status |
|---|---|---|
| Resetting the game for QA took a multi-step dance (IndexedDB blocked while open, the `.saves/` mirror, pagehide re-saves, settings) | .65, .67, .70, .75, .77 | **Fixed** by hv-7ic2.106 |
| Effects under ~400 ms couldn't be captured; headless rAF slows under polling | .43, .75, .76 | **Fixed** by hv-7ic2.108 (numeric peaks) |
| Autoplay never cast spells, so spell QA was hand-scripted (once with an off-by-one column) | .75, .76 | **Fixed** by hv-7ic2.110 |
| Prettier reflow made scripted edits miss | .49, .61, and this session | **Mitigated**: Workflow § Editing says to format first and assert matches; it still recurs |
| jsdom drag tests passed while the real browser drop failed (tooltips swallowed drops) | .71, .77 | **Fixed in code** by hv-7ic2.104 (HoverTip); the QA rule isn't written down |
| `tg approve` takes a candidate ID, not a bead ID | .69 | **Filed** as hv-7ic2.114 (decisions.md and README wording) |
| Playwright MCP output (logs, screenshots) lands in the primary checkout | .69, Tollgate sync events | **Mitigated**: 3b46c97 ignores `.playwright-mcp/`; screenshots should be given absolute paths under `artifacts/qa/` |
| `window.__mvm.audioLog` is never populated, so audio can't be asserted | .101 | **Filed** as hv-7ic2.112 |
| Vitest swallows `console.log` in ad-hoc probe tests | .36 | Tip only: throw the result, or write a scratch file |
| Playwright `evaluate` calls over 300 s abort the MCP tool | .70 | Tip only: split long runs |

## Playtest

One operator playtest bead (hv-7ic2.83): hero descriptions in PoE2
gem-style tooltips. It was filed during play and delivered and reviewed
within the session, and its review corrected one description (Ice
Strike's finisher). The M1 playthrough (1.39) took the operator's role
for the rest of the loop. Its own findings were fixed in one commit, and
three more were filed as beads (hv-7ic2.93, .94, .95).

## Improvements filed

- **hv-7ic2.112** (review hv-7ic2.113): populate `window.__mvm.audioLog`
  from the audio engine's log, so QA can assert that a sound played.
- **hv-7ic2.114** (docs only): Browser QA and delivery wording.
  - Drag-and-drop needs a real-browser drag check.
  - Give Playwright screenshots absolute paths under `artifacts/qa/`.
  - `tg approve` takes the candidate ID (decisions.md and README).

## Recommendations for Phase 2 (no bead)

- Have a session other than the implementer claim `review-qa` beads where
  capacity allows, especially for UI and juice work, where reviews found
  the most.
- Keep the fixture freeze discipline: every Phase 1 change kept v1, and
  `m1.json` is now the oldest real document to protect.
