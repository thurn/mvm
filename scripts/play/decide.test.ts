import { describe, expect, test } from "vitest";
import { planUpdate, type Snapshot } from "./decide";

const snap = (oid: string, lock = "lock-a", assets: string | null = "assets-a"): Snapshot => ({
  oid,
  lock,
  assets,
});

describe("the play server's update decision", () => {
  test("nothing happens while staging is unchanged", () => {
    expect(planUpdate(snap("a"), snap("a"))).toEqual({
      checkout: false,
      install: false,
      assets: false,
    });
  });

  test("a new staging OID checks it out", () => {
    expect(planUpdate(snap("a"), snap("b"))).toEqual({
      checkout: true,
      install: false,
      assets: false,
    });
  });

  test("a changed lockfile reinstalls", () => {
    expect(planUpdate(snap("a"), snap("b", "lock-b"))).toEqual({
      checkout: true,
      install: true,
      assets: false,
    });
  });

  test("changed asset inputs rebake the assets", () => {
    expect(planUpdate(snap("a"), snap("b", "lock-a", "assets-b"))).toEqual({
      checkout: true,
      install: false,
      assets: true,
    });
  });

  test("asset inputs appearing for the first time bake them; none at all skips the step", () => {
    expect(planUpdate(snap("a", "lock-a", null), snap("b", "lock-a", "assets-a")).assets).toBe(
      true,
    );
    expect(planUpdate(snap("a", "lock-a", null), snap("b", "lock-a", null)).assets).toBe(false);
  });

  test("the first start installs and bakes", () => {
    expect(planUpdate(null, snap("a"))).toEqual({ checkout: true, install: true, assets: true });
    expect(planUpdate(null, snap("a", "lock-a", null))).toEqual({
      checkout: true,
      install: true,
      assets: false,
    });
  });
});
