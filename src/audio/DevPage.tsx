import { useState } from "react";
import { SOUNDS } from "../assets/sounds";
import { audioEngine } from ".";
import { SFX } from "./zzfx";

/** `?scene=audio`: plays every ZzFX sketch and every mapped sound, with the audio log (1.7). */
export function AudioDevPage() {
  const [log, setLog] = useState<{ played: string[]; dropped: string[] }>({
    played: [],
    dropped: [],
  });
  const play = (id: string, x?: number) => {
    const engine = audioEngine();
    if (!engine) return;
    void engine.unlock().then(() => {
      engine.play(id, x === undefined ? {} : { x });
      setLog({ played: [...engine.log.played], dropped: [...engine.log.dropped] });
    });
  };
  const button = (id: string, x?: number) => (
    <button key={`${id}-${x ?? ""}`} onClick={() => play(id, x)} style={{ margin: 2 }}>
      {id}
      {x === undefined ? "" : ` @x=${x}`}
    </button>
  );
  return (
    <div style={{ padding: 16, color: "#ddd", fontFamily: "monospace" }}>
      <h2>ZzFX sketches</h2>
      <div>{Object.keys(SFX).map((id) => button(id))}</div>
      <h2>Mapped sounds (samples, or ZzFX when absent)</h2>
      <div>{Object.keys(SOUNDS).map((id) => button(id))}</div>
      <h2>Pan</h2>
      <div>{[0, 4.5, 9].map((x) => button("ui_click", x))}</div>
      <h2>audioLog</h2>
      <pre data-testid="audio-log">{JSON.stringify(log, null, 2)}</pre>
    </div>
  );
}
