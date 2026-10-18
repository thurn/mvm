# Workflow

This page tells each executor session how to do the work. The phase pages say
what the work is. It combines:

- the Hive executor role (`executor`, `bead` and `justiciar` skills in
  `~/hive/skills/`);
- the global `wt` skill;
- this repository's [AGENTS.md](../../AGENTS.md).

Where they differ, the [decisions](decisions.md) win, then AGENTS.md. In
particular, sessions never dispatch subagents
([P6](decisions.md#p6-no-subagents)), even where a skill offers one.

[Back to the plan](README.md)

## Identity and scope

- **Sessions.** Each executor session is a top-level Claude Code or Codex
  session started in `~/mvm`, bound to project `mvm`
  ([P1](decisions.md#p1-one-hive-project)). The operator starts and stops
  sessions to set capacity.
- **Actor.** A session's actor is its own host ID:
  `"${CLAUDE_CODE_SESSION_ID:?}"` in Claude Code, `"${CODEX_THREAD_ID:?}"` in
  Codex, expanded inside each Beads command.
- **One bead at a time.** A session claims one ready bead, implements it
  itself, and waits for it to land on `staging` before claiming the next.
- **Session-only actions.** Only the session that owns a bead calls Beads,
  the Tollgate queue, `tg worktree` or `tg update` for it.
- **Continuous mode is authorized.** It ends when the Phase 5 epic closes.
- **The stream is silent.** Send no push notifications or outbound messages.
  Progress lives in bead notes and session titles.

### Starting, scaling, and draining

- **Start:** launch with the prompt in
  [README § Starting and resuming](README.md#starting-and-resuming-the-stream).
  The session runs
  `/Users/dthurn/hive/bin/hive executor start --project mvm --session <its ID> --continuous --json`.
- **Wait instead of stopping.** When nothing is ready but other sessions hold
  work that open beads wait on, run
  `/Users/dthurn/hive/bin/hive executor await --session <its ID> --json`
  under Hive's waiting guidance (`~/hive/skills/shared/waiting.md`). Keep the
  default 65-minute wait. Stay silent while nothing changes. Resume on
  `ExecutorWorkReady` or `ExecutorWorkAssigned`. On
  `ExecutorQueueDrained`, stop with kind `drained`.
- **Drain** when told to stop: land the current bead, claim nothing new, run
  `hive executor stop --kind pause`.
- **A session that ends holding a bead** is resumed if its host can resume
  it. If the operator says it will not return, another session releases the
  bead under Hive's abandoned-assignment repair
  (`~/hive/skills/shared/repair.md`) and restarts it from a fresh worktree.

## Beads

Define the routing prefix in every shell command that touches Beads:

```sh
# Claude Code
hbd() { env BEADS_DIR=/Users/dthurn/brain/.beads BEADS_DOLT_AUTO_START=0 BD_NON_INTERACTIVE=1 BD_NO_HOOKS=true bd --sandbox --dolt-auto-commit off --actor "${CLAUDE_CODE_SESSION_ID:?}" "$@"; }
# Codex
hbd() { env BEADS_DIR=/Users/dthurn/brain/.beads BEADS_DOLT_AUTO_START=0 BD_NON_INTERACTIVE=1 BD_NO_HOOKS=true bd --sandbox --dolt-auto-commit off --actor "${CODEX_THREAD_ID:?}" "$@"; }
```

Never initialize a store, start a second server or fall back to another
database. If the configured Dolt server is down, run `justiciar` at once;
never wait it out.

**Every plan bead carries:**

- metadata `hive_project=mvm` and `hive_origin_thread`;
- `--parent` set to its phase epic;
- a description that names its phase-page section and scope, and ends with an
  `Areas:` line;
- acceptance criteria copied from the phase page, including its
  **Tests first** list.

**Labels:**

| Label | Meaning |
| --- | --- |
| `core` | The bead lays down a seam; its review bead reviews the design too |
| `juice` | Presentation feel work; its review bead runs the juice A/B |
| `review-qa` | A review/QA bead ([below](#review-and-qa-beads)) |
| `filing` | Files the next phase |
| `playtest` | Operator feedback |
| `ci-fix` | Repairs a red `staging` |
| `introspection` | Refactor, tooling or workflow improvement |
| `retrospective` | A phase-end retrospective |
| `gate` | A phase gate |

**Before filing any bead,** search unfinished `mvm` beads for the same
primary Areas file and the same purpose. Extend the existing bead if you own
it; otherwise record why the new bead is distinct, in its notes.

**Follow-up work gets a new bead** with the right edges, never a reopen.

**A newly found prerequisite of a running bead:**

1. File a new bead with an edge.
2. Make an unvalidated checkpoint commit in the running bead's worktree, and
   record it in the notes.
3. Implement the prerequisite yourself, or leave it ready for another session
   and wait.
4. Rebase the checkpoint with `tg --no-launch update`, finish, and amend into
   the bead's single commit.

### Filing a phase

Filing a phase is a `filing` bead keyed `filing=mvm-phase-<n>`, so exactly
one session files it. The session that claims it:

1. **Refines the phase page.** Revise the page from what landed, what the
   retrospective found, and open `playtest` beads. Fix scope, the task
   graph, acceptance criteria, Tests first lists and Areas. Keep the graph
   wide ([P8](decisions.md#p8-a-wide-graph)). Commit that page change as the
   filing bead's own commit, through the normal delivery path.
2. **Creates the epic** (`--type epic`, the exit gate as acceptance, the
   metadata above).
3. **Creates one child per task** on the refined page, and one `review-qa`
   child per behavior-changing task. Omit `hive_project` for now, and set
   `intended_project=mvm` instead, so no session selects a child before its
   edges exist.
4. **Adds the task graph's edges.** Each review bead depends on its task.
   Then add [serialization edges](#serialization) against this phase and
   every unfinished bead. Inspect them with `hbd show <id> --json`, and run
   `hbd dep cycles`.
5. **Admits the children.** Only after the edges are correct, set
   `hive_project=mvm` on each one.

### Areas

Each bead's `Areas:` line lists the directories and files it may change. A
change outside them stops the session to decide whether to file a new bead.
Areas identify possible overlap. They are not locks.

| Area | Path |
| --- | --- |
| Sim kernel | `src/sim/` |
| Combat | `src/combat/` |
| Heroes and spells | `src/heroes/`, `src/spells/` |
| Monsters and waves | `src/monsters/` |
| Loot | `src/loot/` |
| Account and lifecycle | `src/account/` |
| Save | `src/save/` |
| Data | `data/`, `src/data/`, `scripts/import-poe2/` |
| Tuning | `src/tuning/<domain>.ts` (one file per domain) |
| Juice | `src/juice/` |
| Renderer | `src/render/` |
| Audio | `src/audio/` |
| UI | `src/ui/<screen>/` |
| Dev tools | `src/dev/` |
| Assets | `scripts/assets/`, `src/assets/` |
| Play and dev server | `scripts/play/`, `vite/` |

**Hub seams.** These files are shared by design. A bead that changes one
lists it explicitly, and adds cases without changing existing ones:

- `src/sim/events.ts` (the `SimEvent` union);
- `src/sim/intents.ts`;
- `src/sim/state.ts` (the `RoundState` type);
- `src/account/state.ts`;
- `src/save/registry.ts` (section schemas and migrations);
- `src/juice/cues.ts` (the event→cue table);
- `src/dev/qa-surface.ts` and `src/dev/scenes/index.ts`;
- `src/types/ids.ts`;
- `package.json`.

### Serialization

Serialization edges limit costly conflicts. They do not prevent every
conflict.

- **Add an edge** for a real implementation prerequisite, or for
  incompatible changes to the same behavior: two beads redefining the same
  event's fields, the same section's schema version, or the same tuning
  table's shape.
- **No edge** for a shared filename alone: new `SimEvent` variants, new
  scenes, new cue rows or new screens beside each other.
- **Record the precise overlap** in both beads' notes when you add an edge.
- **Owners resolve ordinary textual conflicts** with `tg --no-launch update`
  and revalidate the combined behavior.
- **Save schema bumps serialize.** Two beads that both bump the same
  section's `schemaVersion` get an edge, so migrations stay linear.

### Selection order

Claim only from the session's fresh ready list,
`/Users/dthurn/hive/bin/hive executor ready --session <its ID> --json`.
Never claim by ID around the list, because that bypasses serialization
edges.

Among ready beads, take them in this order:

1. `ci-fix`.
2. `playtest`.
3. `introspection` beads filed by a trigger, and review follow-ups.
4. `review-qa`.
5. `filing`.
6. Everything else, by priority, then by **critical-path first** (the phase
   page names the critical path), then by age.

## Delivery

For each claimed bead:

1. **Read the bead** and its phase-page section. Record the plan and Areas in
   the notes.
2. **Create a worktree** with `tg --no-launch worktree create wt/<bead-id>`,
   which bases it on `staging`. Run `npm install` and `npm run assets` in it.
3. **Write the failing tests first.** Commit nothing yet. Record in the notes
   which tests failed for the right reason.
4. **Implement** until they pass. You do this yourself; never through a
   subagent ([P6](decisions.md#p6-no-subagents)).
5. **Validate** ([Validation ladder](#validation-ladder)) and run the QA the
   bead calls for.
6. **Commit once,** as a detailed Conventional Commit whose trailer names the
   bead (`Bead: <id>`).
7. **Submit** with `tg --no-launch --json candidate HEAD`, then authorize
   with `tg --no-launch approve <candidate-id> --wait` as a background
   command. This plan grants promotion authority for in-scope work.
8. **Repair** a failing candidate in the same worktree, and resubmit.
9. **Close** after the candidate lands on `staging`, with
   `hive_resolution=completed` and close notes that end with the friction
   block ([Introspection](#introspection)).

**Updating a worktree.** When another bead lands first and conflicts, run
`tg --no-launch update` in your own worktree. Resolve the conflicts,
revalidate the combined behavior, and resubmit.

## Validation

### Validation ladder

1. **While iterating:** `npm test -- <file>`.
2. **Before committing:** `npm run review` (format check, lint, typecheck,
   unit and scenario tests) and `npm run knip`. Delete whatever exports and
   files your change leaves unused.
3. **Save-shape changes:** `npm run save:fixture` for the new version, then
   `npm test -- src/save` ([P15](decisions.md#p15-never-break-a-save)).
4. **Data changes:** `npm run import:poe2 -- --check`.
5. **`scripts/ci`** in full only for changes to tooling, configuration or
   cross-cutting architecture. Tollgate runs it on every candidate anyway.

### Editing

Prettier reflows code and JSON, so text that was on one line may not be
any more. A scripted edit that misses its target fails silently.

- **Format first.** Run `npm run format` before scripted text edits, and after
  them.
- **Edits must match.** A scripted replacement asserts that its target was
  found, or uses the editor's exact-match edit, which fails on no match.
- **Edit JSON as JSON.** Change `tsconfig*.json` and `package.json` by
  parsing and rewriting them, never with text replacement.

### The gate and ci-fix

- **The gate.** Tollgate's one `ci` step runs `scripts/ci` on every
  candidate and promotes to `staging`. **A bead lands when it reaches
  `staging`.**
- **Budget.** The gate has a 60 s budget. It is watched, never asserted. A
  bead that pushes it past 60 s files an `introspection` bead at once. The
  likely remedy is a split into a fast gate and an asynchronous release
  stage with Tollgate.
- **A red `staging`** (a promotion that later fails, or a broken
  `npm run play` on staging) gets a `ci-fix` bead keyed
  `ci_step=<step>`. Search for an unfinished one first. It preempts
  everything.
- **Flaky results** are diagnosed, never retried until green.

## Review and QA beads

Every behavior-changing bead has a paired **review/QA bead** (label
`review-qa`, titled `Review <n>: <title>`), from the first code bead on
([P5](decisions.md#p5-reviews-are-paired-beads-from-day-one)). It depends on
its implementation bead and is claimed after that bead lands.

A review/QA bead:

1. **Gathers the review inputs.** It works in a fresh worktree on `staging`.
   It takes the reviewed bead's commit from its `Bead:` trailer, and records:
   - the commit's base and head OIDs;
   - the changed paths;
   - the bead's acceptance criteria and Tests first list;
   - the decisions and design sections that apply.
2. **Reviews the diff cold** with the `warden` skill. It reads the whole
   diff, and enough surrounding code to verify each claim, without the
   author's notes beyond the bead's description and acceptance. It checks:
   - correctness and behavior;
   - test quality: do the tests pin the contracts, and would they catch a
     regression?
   - the sim/juice split ([P12](decisions.md#p12-juice-is-presentation-only));
   - save safety ([P15](decisions.md#p15-never-break-a-save));
   - remaining risk.

   The session does this itself and never dispatches a reviewer.
3. **Runs manual QA** of the changed workflow in the browser
   ([Browser QA](#browser-qa)), with `window.__mvm.caps` empty.
   - **`juice` beads** add the A/B: the bead's QA scene at `juice=0` and at
     `juice=1`, captured both ways. The finding is whether the difference is
     obvious in the first 30 seconds (Appendix H §14). They also check the
     "juice rewards; it never hides" rule (H §1.1): no lane or monster stays
     covered for more than 250 ms.
   - **`core` beads** also get a judgment of the seam: will the abstraction
     hold for the beads and phases that build on it?
4. **Verifies every finding** against the code at `staging` and fixes the
   confirmed ones within its own Areas, which are the reviewed bead's Areas.
5. **Commits once** (fixes plus any pre-existing-issue file), or closes with
   no commit when nothing is confirmed.
6. **Records** each finding's disposition (accepted, rejected or unresolved)
   in its close notes. A finding too large to fix here files its own bead,
   which preempts other work.

## Browser QA

- **Playwright.** Use the globally configured Playwright MCP service
  (`http://localhost:8931/mcp`). If it is unavailable, run
  `playwright-mcp-service start` and retry. Never launch a browser directly.
- **Servers.** Run your own dev server on a free port of 5181 or higher,
  never 5180 (the play server). Kill only your own server's process tree.
- **Assertions.** Assert through the DOM and `window.__mvm`
  ([P22](decisions.md#p22-the-qa-surface)): state, cue log, tier log and
  audio log, with `window.__mvm.caps` empty at the end.
- **Fresh start.** `await window.__mvm.reset()` forgets every save (IndexedDB,
  the log ring and the dev server's `.saves/` mirror) and lands on a fresh
  title from any screen, mid-round included; `reset({ settings: true })`
  also restores default juice settings. Loading with `?reset=1` (or
  `?reset=settings`) does the same before boot. Dev builds only.
- **Scenes.** Prefer `?scene=<name>` for feel work. Use `debugSlowmo` to
  capture timing.
- **Autoplay.** `?autoplay=pvzOpener` plays a level hands-free;
  `?autoplay=spellcaster` also banks mana and casts the focus's spell, for QA
  that needs spells in a real round.
- **Measuring juice.** Screenshots miss effects shorter than their own
  latency, so assert the A/B with numbers: `window.__mvm.fx.peaks()` returns
  what started since the last call (particles emitted per preset, peak live
  particles, the largest shake amplitude in px, the strongest screen flash
  and vignette) and starts over; `fx.live()` is the live particle count. Call
  `peaks()` once to reset, play the moment, call it again. At `juice=0` the
  particles, shake and flash read zero.
- **Screenshots.** Captures go to the primary checkout's gitignored
  `/Users/dthurn/mvm/artifacts/qa/<bead-id>/` and are referenced by filename
  only. Never commit them.
- **Visual changes** add captures at 1280×720 and 1920×1080, plus one
  changed interaction state. New screens add one cold `visual-review` pass.

## Introspection

From the first bead ([P7](decisions.md#p7-introspection-from-day-one)):

- **Friction lines.** Every bead's close notes end with a block like this,
  including `review-qa`, `mason`, filing and gate beads:

  ```text
  Friction:
  - scene-boot (20m): no QA scene for multi-lane loot, hand-built state via __mvm
  - gate-time (10m): scenario tests ran the whole suite for a tuning edit
  Implement: 95m. Validation: review 38s, focused 12s.
  ```

  A bead with no friction ends with the empty form, which still carries the
  time line:

  ```text
  Friction: none.
  Implement: 20m. Validation: review 35s.
  ```

  Tags are short kebab-case slugs. Reuse a tag for the same cause.
- **Trigger.** At each dispatch boundary, check the phase's close notes. A
  tag that appears in three beads files an `introspection` bead keyed
  `trigger=<tag>/mvm-phase-<n>`, unless one exists. It targets the cause,
  preserves behavior and preempts phase work.
- **Phase-end beads** run the refactor-and-tooling pass (`mason`), then the
  retrospective (`sage`, read-only). Both file bounded beads that land within
  the phase.

## Playtest beads

The operator plays on the play server when they choose
([P4](decisions.md#p4-milestones-never-pause-the-stream)). Their feedback
becomes `playtest` beads. A session that receives feedback in chat files it
verbatim, with the play server's `staging` OID and a copy of
`~/mvm/.saves/latest.json` attached to the notes by path.

A playtest bead may:

- fix the issue;
- amend a phase page and file follow-up beads;
- record a decision change, as a new P-decision entry, only when the operator
  stated it.

## Logging

Every system logs per [P23](decisions.md#p23-logging), with IDs and never
names.

- **Play server:** `~/mvm/logs/play.jsonl`.
- **Executor dev servers:** `logs/dev.jsonl` inside the worktree.
- **Every build:** the last 5,000 lines in IndexedDB, with JSONL export.

## Failure and recovery

- **A blocked Hive, Beads or Tollgate operation** (Dolt down, a stuck queue,
  a Tollgate restart) gets `justiciar` at once, not a timed wait.
- **A Hive or Tollgate defect** that blocks the stream is fixed at its cause,
  as its own bead in that repository, under that repository's AGENTS.md.
- **Usage limits.** Wait for the reset and continue the bead, or drain.

## Re-entry

After compaction, resume or restart:

1. Read [README](README.md), then this page.
2. List your own claimed beads, with
   `hbd list --assignee <your ID> --status in_progress --json`, filtered to
   `hive_project=mvm`.
3. For each one, read its notes for the worktree, the candidate and the next
   action. Check the candidate with `tg --no-launch status`. Continue the
   bead.
4. With nothing claimed, check `tg --no-launch status`, then select from the
   ready list.
