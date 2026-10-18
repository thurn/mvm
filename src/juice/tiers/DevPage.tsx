import { useMemo } from "react";
import { Board } from "../../app/Board";
import { findScene } from "../../dev/scenes";
import { audioEngine } from "../../audio";
import type { Tier } from "../../tuning/juice";

const TIERS: Tier[] = [0, 1, 2, 3, 4, 5];

/** `?scene=tiers`: a fight on the board and a button per tier, to compare their strength (1.22). */
export function TiersDevPage() {
  const scene = useMemo(() => findScene("starter-heroes")!, []);
  const fire = (tier: Tier) => {
    void audioEngine()?.unlock();
    window.__mvm?.fireTier?.(tier);
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: 8 }}>
        {TIERS.map((tier) => (
          <button key={tier} onClick={() => fire(tier)}>
            T{tier}
          </button>
        ))}
      </div>
      <Board scene={scene} />
    </div>
  );
}
