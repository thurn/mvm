# Golden save fixtures

One real document section per version (P15), written by
`npm run save:fixture -- <section>`:

- `account/v<n>.json` and `round/v<n>.json`: each a `{ schemaVersion, data }`
  section from a dev-built document.
- `milestones/m<n>.json`: the operator's whole save at each milestone.

`tests/save-fixtures.test.ts` loads every file here through the current registry. A
change to a persisted shape keeps all of them loading, through a default or
a migration; fixtures are never edited or deleted.
