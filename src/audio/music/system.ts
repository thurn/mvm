import { audioEngine, musicPlayer } from "..";
import type { PresentationFactory } from "../../juice/director/systems";
import type { SettingsStore } from "../../juice/core/settings";
import type { Bus } from "../../tuning/audio";
import { BOSS_JUICE } from "../../tuning/juice";
import { chooseTrack, IntensityState } from "./intensity";

const BUSES: Bus[] = ["music", "sfx", "loot", "ui"];

/** The settings store whose volumes the engine follows; subscribed once, not per board. */
let followed: SettingsStore | null = null;

/**
 * Music for a round (H §10.4): Grassland's base track, crossfading to its
 * intensity track on a flag warning or above 12 monsters and back 6 s after;
 * the boss track after a boss's intro cut (H §7.5);
 * the victory or defeat stinger when the level ends. It also applies the
 * volume sliders from the settings store.
 */
export const musicSystem: PresentationFactory = ({ stack, settings, now }) => {
  const engine = audioEngine();
  const player = musicPlayer();
  if (!engine || !player) return { id: "music", consume() {} };

  const applyVolumes = () => {
    const volume = settings.get().volume;
    engine.setVolume("master", volume.master);
    for (const bus of BUSES) engine.setVolume(bus, volume[bus]);
  };
  applyVolumes();
  if (followed !== settings) {
    followed = settings;
    settings.subscribe(applyVolumes);
  }

  const intensity = new IntensityState();
  let ended = false;
  /** When the boss intro began: its music cut, then the boss track (H §7.5). */
  let bossAt: number | null = null;
  void player.play("grassland");
  // The intensity check runs every frame from a draw slot that draws nothing.
  stack.register({
    id: "music-intensity",
    layer: "hud",
    draw: (_ctx, frame) => {
      if (ended) return;
      const intense = intensity.update(frame.now / 1000, frame.state.monsters.length);
      const boss = frame.state.monsters.some((m) => m.boss) && bossAt !== null;
      const track = chooseTrack(
        intense,
        boss
          ? {
              sinceSpawnSeconds: (frame.now - bossAt!) / 1000,
              cutSeconds: BOSS_JUICE.musicCutSeconds,
            }
          : null,
      );
      if (track) void player.play(track);
    },
  });

  return {
    id: "music",
    consume(cue, batch) {
      if (batch.event === "bossSpawned" && bossAt === null) bossAt = batch.at;
      if (batch.event === "flagWarning" && cue.kind === "banner")
        intensity.flagWarning(now() / 1000);
      if (batch.event === "levelEnd" && cue.kind === "sound" && !ended) {
        ended = true;
        player.stop(0.5);
        engine.play(cue.id);
      }
    },
  };
};
