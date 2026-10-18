/** What the play server knows about one `staging` commit. */
export interface Snapshot {
  oid: string;
  /** The package-lock.json blob ID. */
  lock: string;
  /** The asset inputs' tree ID, or null when the commit has none yet. */
  assets: string | null;
}

export interface UpdatePlan {
  checkout: boolean;
  install: boolean;
  assets: boolean;
}

/** Which steps a move from `current` to `next` needs (P18). The first start does everything. */
export function planUpdate(current: Snapshot | null, next: Snapshot): UpdatePlan {
  if (!current) return { checkout: true, install: true, assets: next.assets !== null };
  if (current.oid === next.oid) return { checkout: false, install: false, assets: false };
  return {
    checkout: true,
    install: current.lock !== next.lock,
    assets: next.assets !== null && current.assets !== next.assets,
  };
}
