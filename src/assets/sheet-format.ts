/** One ULPC animation's frame grid (Appendix G §2.1, §2.3). */
export interface SheetFormat {
  frameSize: number;
  frames: number;
  /** Rows in the source sheet: 4 (up, left, down, right) or 1 (facing the camera). */
  rows: 1 | 4;
}

/** The per-animation sheets every ULPC body uses (G §2.1). */
export const SHEET_FORMAT: Readonly<Record<string, SheetFormat>> = {
  spellcast: { frameSize: 64, frames: 7, rows: 4 },
  thrust: { frameSize: 64, frames: 8, rows: 4 },
  walk: { frameSize: 64, frames: 9, rows: 4 },
  slash: { frameSize: 64, frames: 6, rows: 4 },
  shoot: { frameSize: 64, frames: 13, rows: 4 },
  hurt: { frameSize: 64, frames: 6, rows: 1 },
  idle: { frameSize: 64, frames: 2, rows: 4 },
  run: { frameSize: 64, frames: 8, rows: 4 },
  jump: { frameSize: 64, frames: 5, rows: 4 },
  // The oversize and custom animations MvM uses (G §2.3).
  thrust_oversize: { frameSize: 192, frames: 8, rows: 4 },
  slash_oversize: { frameSize: 192, frames: 6, rows: 4 },
  slash_reverse_oversize: { frameSize: 192, frames: 6, rows: 4 },
  walk_128: { frameSize: 128, frames: 9, rows: 4 },
  tool_hammer: { frameSize: 128, frames: 9, rows: 4 },
};

/** The row of each facing in a 4-row sheet (G §1.2). */
export const FACING_ROW = { right: 3, left: 1 } as const;
