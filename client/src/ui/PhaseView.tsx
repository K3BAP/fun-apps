import type { ReactNode } from "react";
import type { Phase } from "@/game/types";

/** Loest den `render()`-Dispatcher der bisherigen Apps ab. */
export function PhaseView({
  phase,
  setup,
  play,
  result,
}: {
  phase: Phase;
  setup: ReactNode;
  play: ReactNode;
  result: ReactNode;
}) {
  if (phase === "setup") return setup;
  if (phase === "play") return play;
  return result;
}
