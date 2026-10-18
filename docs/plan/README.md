# Mercs vs. Monsters: Delivery Plan

Executor sessions build the Mercs vs. Monsters prototype ("MvM") specified in
the [GDD](../gdd.md) and its appendices A–H. They are top-level Claude Code or
Codex sessions, bound to the Hive project `mvm`. Each one implements one bead
at a time, **itself**, and lands it on `staging` through Tollgate.

The plan runs without operator review. The operator's decisions are recorded
in [decisions](decisions.md) (P1–P28). Where this plan and the design
documents differ, the decisions win.

**This page is the re-entry point.** After any context compaction, resume, or
restart, do these steps in order:

1. Read this page.
2. Follow [workflow → Re-entry](workflow.md#re-entry).
3. Read only the page for the current phase.

**Reviews are beads.** Every bead that changes behavior has a paired
`review-qa` bead, from the first bead on
([P5](decisions.md#p5-reviews-are-paired-beads-from-day-one)). The session
that claims it runs `warden` over the landed diff itself, plays the change,
and fixes what it confirms.

**No subagents, ever** ([P6](decisions.md#p6-no-subagents)). A session
implements, reviews and QAs its own bead. It never dispatches an
implementation or review subagent, and never shells out to another agent CLI.

**Saves never break** ([P15](decisions.md#p15-never-break-a-save)). The
operator plays a build that updates under them while beads land. Their
in-progress round must resume after every landing.

## Outcomes

When Phase 1 (M1) ends:

- **Level 1 feels great.** It is the GDD's first level: 3 lanes, Shamblers,
  5 waves and 150 starting mana. It is fully juiced per Appendix H
  ([P27](decisions.md#p27-m1-juice-scope)): hits, damage numbers, loot drop
  choreography, mana orbs, deaths, significance bands, stat-driven VFX,
  intensity tiers, pitch ladders, ailments, sound and music.
- **The loop closes.** The player picks a focus and plays Level 1. They see
  the loot summary, equip a drop in a minimal hideout, and replay. A better
  item visibly changes the board: the GDD's first proof point
  ([P26](decisions.md#p26-m1-scope)).
- **The numbers are real.** Heroes, items, affixes, currency and monsters
  come from the PoE2 RePoE export through a committed importer, and combat
  runs the Appendix A pipeline
  ([P19](decisions.md#p19-real-poe2-data-through-an-importer)).
- **Progress survives builds.** A round in progress resumes mid-wave after a
  reload or a new build. The account survives every later build through
  versioned saves, defaults and migrations
  ([P13](decisions.md#p13-one-save-document-two-sections)–[P17](decisions.md#p17-reconciliation-on-load)).
- **The operator plays live.** `npm run play` serves the newest `staging` on
  a fixed port and follows it as beads land
  ([P18](decisions.md#p18-the-play-server)).

Later phases take the prototype to the full 20-level demo
([P28](decisions.md#p28-horizon)).

## Baseline at plan time

Measured on 2026-10-18 at `staging` `85d8754`.

| Fact | Value |
| --- | --- |
| Code | None. The repository holds `docs/` (GDD, appendices A–H, `docs/data/passive-subtree.json`), `AGENTS.md`, `scripts/ci` |
| Validation | `scripts/ci` exits early without `package.json`. Tollgate runs one step, `ci` (10 min timeout), and pushes to `origin` |
| Tollgate | Configured; `staging` = `release` = `85d8754`; queue empty |
| Hive | `~/brain/hive.json` has a stale `kvn` entry pointing at `/Users/dthurn/kvn` (no beads). No `mvm` entry |
| Art | `~/Documents/lpc/` holds the 14 LPC packs Appendix G maps, including `ulpc-generator` and `source-of-tales` |
| Audio | `~/Documents/game-audio/` holds the 23 CC0 packs Appendix H §12 maps |
| PoE2 data | Not local. `~/repoe-fork.github.io` is the PoE1 export; use `github.com/repoe-fork/poe2` (GDD §3) |

## Non-goals

- **Mobile and touch.** The game is desktop only
  ([P25](decisions.md#p25-desktop-only)).
- **Deploys, hosting, multiplayer, telemetry, monetisation.**
- **Original balance or art.** PoE2 numbers and LPC art are test
  scaffolding (GDD §3).
- **Systems past the M1 scope in Phase 1:** crafting, vendors, the gamble
  tab, the loot filter UI, the passive tree, bosses, Strongboxes and
  terrain. Later phases take them on.
- **Durable architecture.** Code is disposable (AGENTS.md). The exceptions
  are the save formats and the sim/presentation split, which everything else
  depends on.

## Phase map

Work runs in dependency order. Each phase page has a task graph. A later
phase's tasks start as soon as their prerequisites land, so phases overlap.
Gates close in order.

| # | Phase | Page | Earliest start | Exit gate (summary) |
| --- | --- | --- | --- | --- |
| 0 | Bootstrap | [phase-0-bootstrap.md](phase-0-bootstrap.md) | Run by the planning session after approval | Hive knows `mvm`; AGENTS.md amended; Phase 1 filed and admitted |
| 1 | First map (**M1**) | [phase-1-first-map.md](phase-1-first-map.md) | Phase 0 closes | Level 1 fully juiced, loop closed, rounds resume across builds, save v1 frozen, M1 reviewed |
| 2 | Grassland (**M2**) | [phase-2-grassland.md](phase-2-grassland.md) | M1 playthrough bead | Levels 1–5, the Bloated Miller, Strongboxes, crafting with reveals, vendors, gamble, loot filter |
| 3 | Build depth (**M3**) | [phase-3-build-depth.md](phase-3-build-depth.md) | Phase 2 gate | Passive tree; Bog and Desert ruins (levels 6–15) with their bosses, terrain and archetypes |
| 4 | Finale (**M4**) | [phase-4-finale.md](phase-4-finale.md) | Phase 3 gate | Winter keep, Count Geonor, the 20-level demo end to end |
| 5 | Calibration and polish (**M5**) | [phase-5-calibration.md](phase-5-calibration.md) | Phase 4 assembly beads | Appendix E targets met or documented; final acceptance |

**Milestones never pause the stream**
([P4](decisions.md#p4-milestones-never-pause-the-stream)). The operator plays
whenever they like, on the play server. Their feedback arrives as `playtest`
beads, which preempt other ready work.

**Phase pages are refined lazily.** Each phase's filing bead first updates its
phase page from what the earlier phases taught, then files its beads
([workflow § Filing a phase](workflow.md#filing-a-phase)). Pages for Phases
2–5 are outlines until then.

## Operating model

- **One Hive project, default stream.** Beads carry `hive_project=mvm` and no
  stream ([P1](decisions.md#p1-one-hive-project)).
- **Executor sessions.** 6–8 Claude Code or Codex sessions at the widest
  point ([P8](decisions.md#p8-a-wide-graph)). Each claims one ready bead,
  implements it itself, lands it on `staging`, and claims the next.
- **Concurrency is in the bead graph.** Phase 1 fans out to eight parallel
  beads right after the scaffold. Semantic edges hold real prerequisites.
  Serialization edges order only incompatible changes to the same seam.
- **Delivery.** Each bead is one Conventional Commit in a Tollgate worktree,
  submitted with `tg candidate` and authorized with `tg approve <candidate-id> --wait`. This
  plan grants promotion authority for in-scope plan work
  ([P9](decisions.md#p9-delivery-through-tollgate-worktrees)).
- **Validation.** Tollgate's one `ci` step runs `scripts/ci` on every
  candidate. Its budget is 60 s; it is watched, never asserted.

## Starting and resuming the stream

The planning session runs Phase 0
([P3](decisions.md#p3-bootstrap-by-the-planning-session)). The operator then
starts executor sessions in `~/mvm`, as many as they choose, with:

```text
/executor mvm — continuous mode is explicitly authorized for project mvm.
Execute docs/plan/README.md as one of its executor sessions, without pausing
for approval. Promotion of in-scope plan work is authorized. Never dispatch
subagents.
```

(In Codex, invoke the `executor` skill with the same text.)

- **Waiting.** A session with nothing ready waits with `hive executor await`.
- **Scaling down.** To drain a session, tell it to stop after its current bead.
- **Abandoned sessions** are handled as in
  [workflow § Re-entry](workflow.md#re-entry).

To play, the operator runs `npm run play` once in `~/mvm` and opens
`http://localhost:5180`.

## Global invariants

- **The sim is pure and deterministic.** `src/sim/` and everything it calls
  have no DOM, no wall clock and no `Math.random`. All randomness flows
  through named, serializable RNG streams
  ([P11](decisions.md#p11-a-pure-deterministic-sim)).
- **Juice never changes outcomes.** Presentation reads sim events and state.
  It never writes to the sim. A test runs the same scripted round with juice
  on and off and compares state hashes
  ([P12](decisions.md#p12-juice-is-presentation-only)).
- **Outcomes, not seeds, are state.** Wave plans, spawned monsters, rolled
  affixes and drops are written into state when first produced, and never
  re-derived on load ([P16](decisions.md#p16-outcomes-not-seeds)).
- **Never break a save.** From the first bead that persists anything, every
  change to a persisted shape keeps every committed golden fixture loading
  ([P15](decisions.md#p15-never-break-a-save)).
- **Content is identified by RePoE IDs; instances by UUID.** Use the branded
  ID types in `src/types/ids.ts`. Never key anything by display name.
- **Tunables live in `src/tuning/`,** never as literals in logic. That
  includes Appendix A's four global knobs, Appendix E's rates and Appendix
  H's juice table ([P21](decisions.md#p21-tunables-and-knobs)).
- **Never commit image or audio files.** Committed asset data is text only:
  recipes, sound maps and credits
  ([P20](decisions.md#p20-assets-are-baked-never-committed)).
- **Log new features** well enough to reconstruct a run, with IDs and never
  names ([P23](decisions.md#p23-logging)).
- **Docs describe the current system.** Never write "no longer" or "removed"
  phrasing.
- **Log pre-existing issues** in
  `docs/plan/evidence/pre-existing/<bead-id>.md`, in the same commit.
- **Leave the primary checkout alone.** All work happens in Tollgate
  worktrees. The exceptions are gitignored QA captures in
  `~/mvm/artifacts/qa/<bead-id>/`, the play worktree `~/mvm/.play/`, and
  `~/mvm/.saves/`.
- **Never dispatch subagents or shell out to another agent**
  ([P6](decisions.md#p6-no-subagents)).

## Evidence

These records are run-scoped and live under `docs/plan/`.

| Record | Path | Written by |
| --- | --- | --- |
| Pre-existing issues | `evidence/pre-existing/<bead-id>.md` | Any bead |
| Retrospectives | `evidence/retrospectives/<bead-id>.md` | Phase-end retrospective beads |
| Calibration reports | `evidence/calibration/<bead-id>.md` | Calibration beads |
| Final report | `report.md` | The Phase 5 gate |

**Friction** is recorded in each bead's close notes as tagged lines
([workflow § Introspection](workflow.md#introspection)). Bead notes are the
progress ledger. Phase pages are never edited to record status, only refined
at filing time.

## Done criteria

The plan is complete when all of these hold:

1. Every phase gate bead is closed with `hive_resolution=completed`.
2. A new campaign can be played from focus select through Count Geonor on
   desktop, with `window.__mvm.caps` empty.
3. The headless simulator meets the Appendix E targets, or `report.md`
   records each miss with its cause and the tunable that would close it.
4. A save written at each milestone (M1–M4) loads, migrated, in the final
   build, and a test loads every committed milestone fixture.
5. The design documents describe the delivered game.
