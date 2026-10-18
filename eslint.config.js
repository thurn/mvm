import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Directories that hold the pure, deterministic sim and what it calls (P11). */
const SIM_DIRS = ["sim", "combat", "heroes", "spells", "monsters", "loot", "account"];

const IMPURE_GLOBALS = [
  "window",
  "document",
  "navigator",
  "location",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "requestAnimationFrame",
  "setTimeout",
  "setInterval",
  "fetch",
  "Date",
  "performance",
  "crypto",
].map((name) => ({ name, message: "The sim is pure: no DOM, wall clock or ambient I/O (P11)." }));

export default tseslint.config(
  {
    ignores: [
      "dist/",
      ".cache/",
      "public/assets/",
      ".play/",
      ".saves/",
      ".worktrees/",
      "logs/",
      "artifacts/",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ["*.{js,ts}", "scripts/**/*.ts", "tests/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: SIM_DIRS.map((dir) => `src/${dir}/**/*.{ts,tsx}`),
    rules: {
      "no-restricted-globals": ["error", ...IMPURE_GLOBALS],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Draw from a named RNG stream (P11)." },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "react-dom/*"],
              message: "The sim never imports React (P11).",
            },
          ],
        },
      ],
    },
  },
);
