import uniquesData from "../../data/uniques.json";
import type { UniqueData } from "./types";

const UNIQUES = uniquesData as unknown as readonly UniqueData[];

/** The demo's uniques (Appendix C §C.4), with their raw PoE2 mods. */
export const uniques = (): readonly UniqueData[] => UNIQUES;
