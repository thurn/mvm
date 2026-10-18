# Working on the 'Mercs vs. Monsters' prototype.

This is a throwaway web-based prototype for a tower defense game. Do not overarchitect. Treat all code as disposable.

Validate with `scripts/ci`. Immediately commit all changes using Conventional Commits syntax, then deliver them through Tollgate: on master run `tg push-master --wait`; in a Tollgate worktree submit with `tg candidate HEAD`, approve, and wait for promotion. Tollgate owns pushes to remote master. Changes of any size are delivered without warden review.
