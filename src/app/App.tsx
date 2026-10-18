import { AudioDevPage } from "../audio/DevPage";
import { findScene } from "../dev/scenes";
import { TiersDevPage } from "../juice/tiers/DevPage";
import { LootShowerPage } from "../juice/loot/DevPage";
import { Board } from "./Board";
import { Game } from "./Game";
import { ResumeCheck } from "../ui/resume/ResumeCheck";

export function App() {
  const sceneName = new URLSearchParams(window.location.search).get("scene");
  if (sceneName === "resume") return <ResumeCheck />;
  if (sceneName === "audio") return <AudioDevPage />;
  if (sceneName === "tiers") return <TiersDevPage />;
  if (sceneName === "loot-shower") return <LootShowerPage />;
  if (sceneName) {
    const scene = findScene(sceneName);
    if (scene) return <Board scene={scene} />;
    return <p>Unknown scene: {sceneName}</p>;
  }
  return <Game />;
}
