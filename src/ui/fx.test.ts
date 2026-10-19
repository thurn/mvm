import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../juice/core/settings";
import { JUICE_TUNING } from "../tuning/juice";
import { menuTier } from "./fx";

const SOURCES = import.meta.glob<string>(["./**/*.ts", "./**/*.tsx", "!./**/*.test.*"], {
  query: "?raw",
  import: "default",
  eager: true,
});

/** mason hv-7ic2.104: UI effects meet the juice settings only through src/ui/fx.tsx. */
test("no UI file outside fx.tsx and the dev menu reads the juice settings directly", () => {
  const offenders = Object.entries(SOURCES)
    .filter(([path]) => path !== "./fx.tsx" && !path.startsWith("./dev/"))
    .filter(([, text]) => /sharedSettings|flashAlpha\(|reduceFlashing|settings\.juice/.test(text))
    .map(([path]) => path);
  expect(offenders).toEqual([]);
});

/** hv-mb9m.58: menu screens get the board's tier package, under the same settings. */
test("a menu tier package follows the tier table and scales to nothing at juice 0", () => {
  const t4 = menuTier(4, DEFAULT_SETTINGS);
  expect(t4.holdMs).toBe(JUICE_TUNING.tiers[4].globalHitstopMs);
  expect(t4.shakePx).toBeGreaterThan(0);
  expect(t4.vignette).toBe(JUICE_TUNING.screen[4]!.vignette!.alpha);
  expect(menuTier(5, DEFAULT_SETTINGS).flash).toBe(JUICE_TUNING.screen[5]!.flash!.alpha);
  expect(menuTier(5, { ...DEFAULT_SETTINGS, reduceFlashing: true }).flash).toBeLessThanOrEqual(
    JUICE_TUNING.reduceFlashingMaxAlpha,
  );
  expect(menuTier(4, { ...DEFAULT_SETTINGS, shake: "off" }).shakePx).toBe(0);
  const none = menuTier(5, { ...DEFAULT_SETTINGS, juice: 0 });
  expect([none.holdMs, none.shakePx, none.flash, none.vignette]).toEqual([0, 0, 0, 0]);
});
