# Phase 0: Bootstrap

**Goal:** make `mvm` a Hive project, record the plan in AGENTS.md, and file
Phase 1. The planning session runs this phase itself after the operator
approves the plan ([P3](decisions.md#p3-bootstrap-by-the-planning-session)).
No executor starts before it ends.

[Back to the plan](README.md)

## Order

- 0.1 and 0.2 in either order.
- 0.3 files Phase 1 unadmitted at any point, and admits it only after 0.1 and
  0.2.

## Tasks

### 0.1 Register the Hive project

Edit `~/brain/hive.json` ([P1](decisions.md#p1-one-hive-project)):

- Repoint the stale `kvn` entry to `id: "mvm"`, with repository
  `/Users/dthurn/mvm` and invariants `/Users/dthurn/mvm/AGENTS.md`.
- Keep `observe_since`.
- First confirm the store holds no bead with `hive_project=kvn`.

**Acceptance:**

- `hive executor ready --session <id> --json`, run from `~/mvm`, resolves
  project `mvm` and returns an empty list.
- No other project entry changed (diff the file).

### 0.2 AGENTS.md

One commit on `master`, delivered with `tg push-master --wait` under the
current AGENTS.md rule. It is the last direct-to-master commit of the plan.
Amend AGENTS.md ([P9](decisions.md#p9-delivery-through-tollgate-worktrees)):

- **Plan.** Executor sessions follow `docs/plan/README.md`.
- **Delivery.** Plan beads deliver through Tollgate worktrees
  (`tg candidate`, `tg approve --wait`). `tg push-master` is for the
  operator's own direct changes.
- **Review.** Review happens only in `review-qa` beads
  ([P5](decisions.md#p5-reviews-are-paired-beads-from-day-one)). This
  replaces "Changes of any size are delivered without warden review" for plan
  beads.
- **No subagents** ([P6](decisions.md#p6-no-subagents)).
- **Never break a save** ([P15](decisions.md#p15-never-break-a-save)).
- **Never commit images or audio**
  ([P20](decisions.md#p20-assets-are-baked-never-committed)).
- **The pre-existing-issue path** `docs/plan/evidence/pre-existing/`.

Keep "Do not overarchitect. Treat all code as disposable." Add one line
naming the two exceptions: save formats, and the sim/presentation split.

### 0.3 File Phase 1

File the [Phase 1](phase-1-first-map.md) epic and children, following
[workflow § Filing a phase](workflow.md#filing-a-phase):

- one bead per task, plus one `review-qa` bead per task the page marks
  **Review: yes**;
- the task graph's edges, each review bead's edge to its task, and the
  serialization notes;
- admit the children only after 0.1 and 0.2.

Then give the operator the launch prompt from
[README § Starting and resuming](README.md#starting-and-resuming-the-stream).

## Exit gate

- `mvm` resolves as a Hive project.
- The AGENTS.md change has landed on `staging`.
- Phase 1 is filed and admitted, and `hbd dep cycles` is clean.
