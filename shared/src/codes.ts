import type { RoomCode } from "./protocol";

/**
 * Ohne 0/O/1/I/L – ein Raumcode wird vorgelesen und abgetippt, nicht kopiert.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 4;

export function generateCode(random: () => number = Math.random): RoomCode {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return code;
}

/** Eingaben grosszuegig annehmen: Kleinschreibung und Leerzeichen sind egal. */
export function normalizeCode(input: string): RoomCode {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidCode(input: string): boolean {
  const code = normalizeCode(input);
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}
