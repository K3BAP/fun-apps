import type { AppId } from "@/apps/types";

export type HistoryEntry = {
  id: string;
  gameId: AppId;
  /** ISO-Zeitstempel des Spielendes. */
  playedAt: string;
  standings: { name: string; score: number }[];
  /** Zusatz, z. B. der gewaehlte Qwixx-Block. */
  note?: string;
};

const DB_NAME = "fa2-history";
const DB_VERSION = 1;
const STORE = "games";

/**
 * Der Verlauf beendeter Spiele – nur anhaengen, nie aendern.
 *
 * IndexedDB statt localStorage, weil hier mit der Zeit einiges zusammenkommt und
 * es nicht bei jedem Start durch JSON.parse muss. Eine Ansicht dafuer gibt es
 * bewusst noch nicht: erst sammeln, dann gegen echte Daten bauen.
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("playedAt", "playedAt");
        store.createIndex("gameId", "gameId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Fehler werden geschluckt – ein Verlaufseintrag ist kein Spielstand. */
export async function appendGame(entry: Omit<HistoryEntry, "id" | "playedAt">): Promise<void> {
  try {
    const db = await openDb();
    const record: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      playedAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* kein Grund, ein fertiges Spiel zu stoeren */
  }
}

/** Beendete Spiele, neueste zuerst. Fuer die spaetere Statistik-Ansicht. */
export async function listGames(limit = 50): Promise<HistoryEntry[]> {
  try {
    const db = await openDb();
    const entries = await new Promise<HistoryEntry[]>((resolve, reject) => {
      const out: HistoryEntry[] = [];
      const tx = db.transaction(STORE, "readonly");
      const cursor = tx.objectStore(STORE).index("playedAt").openCursor(null, "prev");
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current || out.length >= limit) return resolve(out);
        out.push(current.value as HistoryEntry);
        current.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });
    db.close();
    return entries;
  } catch {
    return [];
  }
}
