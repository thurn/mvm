import { createMirrorClient } from "../save/mirror-client";
import { createRegistry, load, type SaveDocument, type SectionDefinition } from "../save/registry";
import { withDefaults } from "../save/normalize";
import { createIndexedDbStore, latestOf } from "../save/storage";

/** A toy section for checking the save layer by hand in the browser (1.4). */
const toy: SectionDefinition<{ value: number }> = {
  name: "account",
  schemaVersion: 1,
  migrations: {},
  normalize: (raw, report) => withDefaults(raw, { value: 0 }, report),
  validate: (data) => (Number.isFinite(data.value) ? [] : ["value must be a number"]),
};

/**
 * `window.__mvm.saveDebug` in dev builds: `write(n)` saves a toy document to
 * IndexedDB and the mirror; `read()` loads the newer of the two.
 */
export function installSaveDebug(target: Record<string, unknown>): void {
  // Opened on first use, so environments without IndexedDB (tests) never touch it.
  let opened: ReturnType<typeof createIndexedDbStore> | null = null;
  const store = () => (opened ??= createIndexedDbStore("mvm-save-debug"));
  const mirror = createMirrorClient();
  const registry = createRegistry([toy]);
  target.saveDebug = {
    async write(value: number) {
      const doc: SaveDocument = {
        format: 1,
        savedAt: new Date().toISOString(),
        build: "dev",
        account: { schemaVersion: 1, data: { value } },
        round: null,
      };
      await store().write(doc);
      return mirror.post(doc);
    },
    async read() {
      const doc = await latestOf(store(), mirror);
      return doc ? load(doc, registry).account : null;
    },
  };
}
