import { projectileSystem } from "../../heroes/board/projectiles";
import { heroSystem } from "../../heroes/board/system";
import type { System } from "../system";
import { locomotionSystem } from "./locomotion";
import { scriptedSystem } from "./scripted";

/**
 * Every registered system. The kernel runs them by phase, then in this
 * order within a phase. Later beads add their system here.
 */
export const SYSTEMS: readonly System[] = [
  scriptedSystem,
  heroSystem,
  projectileSystem,
  locomotionSystem,
];
