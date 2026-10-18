/** Music tracks (Appendix H §12.2), with paths as in `sounds.ts`. */
export const MUSIC = {
  title: "lpc/source-of-tales/music/bells_menu_theme_two.ogg",
  hideout: "music-old-tower-inn/The_Old_Tower_Inn.mp3",
  grassland: "music-heartfelt-battle/heartfelt-battle_loop.ogg",
  grassland_intensity: "music-battle-theme-a/battleThemeA.mp3",
} satisfies Record<string, string>;

export type MusicId = keyof typeof MUSIC;
