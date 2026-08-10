import { createContext, use } from "react";
import type { AppManifest } from "@/apps/types";
import type { GameStore } from "./useGameStore";

export type GameContextValue<S, A> = {
  store: GameStore<S, A>;
  manifest: AppManifest;
  openMenu: () => void;
};

/*
 * Der Context kann die Generics eines konkreten Spiels nicht tragen – jedes
 * Spiel hat eigene State- und Action-Typen. `any` steht deshalb genau hier,
 * einmal; nach aussen gibt `useGame<S, A>()` wieder saubere Typen zurueck, und
 * jede App legt sich dafuer einen benannten Hook an (z. B. `useKniffel`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GameContext = createContext<GameContextValue<any, any> | null>(null);

export function useGame<S, A>(): GameContextValue<S, A> {
  const ctx = use(GameContext);
  if (!ctx) throw new Error("useGame muss innerhalb von <GameHost> benutzt werden");
  return ctx as GameContextValue<S, A>;
}
