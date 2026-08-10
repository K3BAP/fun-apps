import { createContext, use } from "react";
import type { RoomClient, RoomSnapshot } from "./roomClient";

export type RoomContextValue = { client: RoomClient; snapshot: RoomSnapshot };

export const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom(): RoomContextValue {
  const ctx = use(RoomContext);
  if (!ctx) throw new Error("useRoom muss innerhalb von <RoomProvider> benutzt werden");
  return ctx;
}
