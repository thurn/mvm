import { useSyncExternalStore } from "react";
import type { AccountState } from "../account/state";
import type { AccountStore } from "../account/store";

const noSubscription = () => () => {};

/** The store's account, re-rendering on every saved change; null without a store. */
export function useAccount(store: AccountStore): AccountState;
export function useAccount(store: AccountStore | null): AccountState | null;
export function useAccount(store: AccountStore | null): AccountState | null {
  useSyncExternalStore(store?.subscribe ?? noSubscription, () => store?.version() ?? 0);
  return store?.get() ?? null;
}
