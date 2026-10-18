import type { AccountState } from "./state";

/**
 * The account as screens see it (mason hv-7ic2.98): one owner for changing,
 * saving and re-rendering. Every change goes through `update`, which saves
 * once and tells every subscribed view, so a change made anywhere (a screen,
 * the dev menu) shows everywhere without a screen wiring its own save.
 */
export interface AccountStore {
  get(): AccountState;
  /**
   * Runs a change on the account. Unless it returns `false` (a refused
   * change that wrote nothing), the account is saved once and views
   * re-render. Returns the change's result.
   */
  update<T>(change: (account: AccountState) => T): T;
  subscribe(listener: () => void): () => void;
  /** Bumps on every saved change; the snapshot views subscribe to. */
  version(): number;
}

export function createAccountStore(
  account: AccountState,
  persist: (account: AccountState) => void,
): AccountStore {
  const listeners = new Set<() => void>();
  let version = 0;
  return {
    get: () => account,
    update(change) {
      const result = change(account);
      if (result === false) return result;
      version++;
      persist(account);
      for (const listener of listeners) listener();
      return result;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
