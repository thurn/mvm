/**
 * The M1 screen flow (GDD §15, plan 1.34): title → focus → campaign →
 * Level 1 → level end → hideout → campaign map. Pure, so the transitions are
 * testable without the UI.
 */
export type Screen = "title" | "focus" | "campaign" | "level" | "levelEnd" | "hideout" | "credits";

export type RouteAction =
  | "newGame"
  | "continue"
  | "credits"
  | "back"
  | "focusChosen"
  | "playLevel"
  | "levelEnded"
  | "replay"
  | "hideout"
  | "campaign";

/** What exists in the save: an account, and a round in progress. */
export interface SaveState {
  hasAccount: boolean;
  hasRound: boolean;
}

/** The title's buttons: "Continue" when there is anything to continue; "New game" only without an account. */
export function titleOptions(save: SaveState): { continue: boolean; newGame: boolean } {
  return { continue: save.hasAccount || save.hasRound, newGame: !save.hasAccount };
}

/** Where an action leads from a screen, or the same screen when it doesn't apply. */
export function route(from: Screen, action: RouteAction, save: SaveState): Screen {
  switch (action) {
    case "newGame":
      return from === "title" && !save.hasAccount ? "focus" : from;
    case "continue":
      if (from !== "title") return from;
      // A round in progress resumes straight into the level; an account goes to its campaign.
      return save.hasRound ? "level" : save.hasAccount ? "campaign" : from;
    case "credits":
      return from === "title" ? "credits" : from;
    case "back":
      return from === "credits" || from === "focus" ? "title" : from;
    case "focusChosen":
      return from === "focus" ? "campaign" : from;
    case "playLevel":
      return from === "campaign" || from === "hideout" ? "level" : from;
    case "levelEnded":
      return from === "level" ? "levelEnd" : from;
    case "replay":
      return from === "levelEnd" ? "level" : from;
    case "hideout":
      return from === "levelEnd" || from === "campaign" ? "hideout" : from;
    case "campaign":
      // The hideout opens the map, to pick any unlocked level (plan 2.24).
      return from === "hideout" ? "campaign" : from;
  }
}
