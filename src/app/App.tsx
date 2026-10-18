import { findScene } from "../dev/scenes";
import { Board } from "./Board";

export function App() {
  const sceneName = new URLSearchParams(window.location.search).get("scene");
  if (sceneName) {
    const scene = findScene(sceneName);
    if (scene) return <Board scene={scene} />;
    return <p>Unknown scene: {sceneName}</p>;
  }
  return <h1>Mercs vs. Monsters</h1>;
}
