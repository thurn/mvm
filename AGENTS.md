# Working on the 'Mercs vs. Monsters' prototype.

This is a throwaway web-based prototype for a tower defense game. Do not overarchitect. Treat all code as disposable. The two exceptions are the save formats and the split between the pure simulation and its presentation, which everything else depends on.

Validate with `scripts/ci`. Immediately commit all changes using Conventional Commits syntax, then deliver them through Tollgate: on master run `tg push-master --wait`; in a Tollgate worktree submit with `tg candidate HEAD`, approve, and wait for promotion. Tollgate owns pushes to remote master.

## Plan

Executor sessions in Hive project `mvm` follow the delivery plan at `docs/plan/README.md`, its re-entry point.

- **Delivery.** Plan beads deliver through Tollgate worktrees (`tg candidate`, then `tg approve --wait`), never by committing on master. `tg push-master` is for the operator's own direct changes.
- **Review.** Plan beads are reviewed only by their paired `review-qa` beads. Outside the plan, changes of any size are delivered without warden review.
- **No subagents.** Never dispatch a subagent for implementation, review, QA or research, and never shell out to another agent CLI.
- **Never break a save.** Every change to a persisted shape keeps every golden fixture in `src/save/fixtures/` loading, through a default or a migration.
- **Never commit image or audio files.** Commit text inputs only (recipes, sound maps, credits); `npm run assets` bakes the rest.
- **Pre-existing issues** go in `docs/plan/evidence/pre-existing/<bead-id>.md`, in the same commit.
