import { countdownAt } from "../../app/boot";
import { Hud, type HudProps } from "../hud/Hud";
import { useRound, type RoundStore } from "../hud/round-store";

/** The HUD with the resume countdown derived from each frame's time. */
export function ResumeHud({
  countdownStartedAt,
  ...props
}: Omit<HudProps, "countdown"> & { store: RoundStore; countdownStartedAt: number | null }) {
  const { view } = useRound(props.store);
  return <Hud {...props} countdown={countdownAt(countdownStartedAt, view.now)} />;
}
