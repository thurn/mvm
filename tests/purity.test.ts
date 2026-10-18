import { ESLint } from "eslint";
import { describe, expect, test } from "vitest";

const eslint = new ESLint();

async function ruleIds(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

describe("sim purity lint rule", () => {
  test.each([
    ["Math.random", "export const x = Math.random();\n", "no-restricted-properties"],
    ["Date", "export const x = Date.now();\n", "no-restricted-globals"],
    ["performance", "export const x = performance.now();\n", "no-restricted-globals"],
    ["window", "export const x = window.innerWidth;\n", "no-restricted-globals"],
    ["document", "export const x = document.title;\n", "no-restricted-globals"],
    [
      "React",
      'import { useState } from "react";\nexport const x = useState;\n',
      "no-restricted-imports",
    ],
  ])("rejects %s in src/sim/", async (_name, code, rule) => {
    expect(await ruleIds("src/sim/fixture.ts", code)).toContain(rule);
  });

  test.each(["combat", "heroes", "spells", "monsters", "loot", "account"])(
    "covers src/%s/",
    async (dir) => {
      const ids = await ruleIds(`src/${dir}/fixture.ts`, "export const x = Math.random();\n");
      expect(ids).toContain("no-restricted-properties");
    },
  );

  test("allows Math.random outside the sim", async () => {
    expect(await ruleIds("src/render/fixture.ts", "export const x = Math.random();\n")).toEqual([]);
  });
});
