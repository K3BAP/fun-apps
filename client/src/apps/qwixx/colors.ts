import type { RowKey } from "./rules";

/**
 * Die vier Reihenfarben sind Spielmaterial, kein Design – sie sehen in jedem
 * Theme gleich aus. Werte unveraendert aus dem bisherigen Block uebernommen.
 */
export const ROW_HEX: Record<RowKey, string> = {
  red: "#d1503c",
  yellow: "#d7ab2b",
  green: "#4e9a55",
  blue: "#4f86c6",
};
