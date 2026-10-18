/** Board tiles are 64 logical px; the board is 9 columns × 5 lanes (P10). */
export const TILE = 64;
export const BOARD_WIDTH = 9 * TILE;
export const BOARD_HEIGHT = 5 * TILE;

/** The largest integer scale at which the logical board fits the viewport, at least 1. */
export function chooseScale(
  viewportWidth: number,
  viewportHeight: number,
  width = BOARD_WIDTH,
  height = BOARD_HEIGHT,
): number {
  return Math.max(
    1,
    Math.min(Math.floor(viewportWidth / width), Math.floor(viewportHeight / height)),
  );
}
