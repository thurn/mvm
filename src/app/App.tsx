import { findScene } from "../dev/scenes";
import { Board } from "./Board";
import { Game } from "./Game";
import { ResumeCheck } from "../ui/resume/ResumeCheck";

export function App() {
  const sceneName = new URLSearchParams(window.location.search).get("scene");
  if (sceneName === "resume") return <ResumeCheck />;
  if (sceneName) {
    const scene = findScene(sceneName);
    if (scene) return <Board scene={scene} />;
    return <p>Unknown scene: {sceneName}</p>;
  }
  return <Game />;
}
