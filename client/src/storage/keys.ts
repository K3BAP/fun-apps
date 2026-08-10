/**
 * Alle localStorage-Zugriffe laufen ueber diese Datei.
 *
 * Der Namensraum `fa2:` ist bewusst neu – die alten Staende der Vanilla-Apps
 * (`kniffel_v1`, `qwixx_v1`, …) werden nicht uebernommen.
 *
 * localStorage kann werfen (Privatmodus, volles Kontingent). Ein Spielblock ist
 * das nicht wert: Fehler werden geschluckt, die App laeuft mit dem Standardwert
 * weiter – genau wie in den alten Apps.
 */
const NS = "fa2";

export function nsKey(...parts: string[]): string {
  return [NS, ...parts].join(":");
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* kein Grund fuer eine Fehlermeldung */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* siehe oben */
  }
}
