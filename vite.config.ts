import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { logSink } from "./vite/log-sink";
import { saveMirror } from "./vite/save-mirror";

export default defineConfig({
  plugins: [
    react(),
    // The play server points these at the primary checkout's .saves/ and logs/play.jsonl (P18).
    saveMirror(process.env.MVM_SAVES_DIR ?? ".saves"),
    logSink(process.env.MVM_LOG_FILE ?? "logs/dev.jsonl"),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "src/**/*.test.ts",
            "tests/**/*.test.ts",
            "scripts/**/*.test.ts",
            "vite/**/*.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
});
