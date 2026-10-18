import { expect, test } from "vitest";

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
