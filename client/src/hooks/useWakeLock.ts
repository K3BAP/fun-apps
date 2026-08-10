import { useEffect, useRef } from "react";

export function wakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/**
 * Haelt den Bildschirm wach, solange `active` gilt.
 *
 * Ein Spielblock liegt oft minutenlang unberuehrt auf dem Tisch – da soll sich
 * das Display nicht abschalten. Zu beachten (unveraendert gegenueber der
 * bisherigen Umsetzung):
 *
 * - Das System entzieht den Lock, sobald der Tab in den Hintergrund geht;
 *   deshalb wird er bei `visibilitychange` neu angefordert.
 * - Voraussetzung ist HTTPS.
 * - Ein abgelehnter Request (z. B. Energiesparmodus) bleibt still. Dann sperrt
 *   das Display trotzdem – per Web-API laesst sich das nicht umgehen.
 */
export function useWakeLock(active: boolean): { supported: boolean } {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!wakeLockSupported()) return;

    let cancelled = false;

    const release = () => {
      const lock = lockRef.current;
      if (!lock) return;
      lockRef.current = null;
      void lock.release().catch(() => {});
    };

    const request = () => {
      if (lockRef.current || document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          // Waehrend der Request lief, kann sich die Lage geaendert haben:
          // `cancelled` faengt genau den Fall ab, dass dieser Effekt schon
          // aufgeraeumt wurde (Phasenwechsel, Schalter umgelegt).
          if (cancelled || !active) {
            void lock.release().catch(() => {});
            return;
          }
          lockRef.current = lock;
          lock.addEventListener("release", () => {
            if (lockRef.current === lock) lockRef.current = null;
          });
        })
        .catch(() => {
          /* z. B. Energiesparmodus – kein Grund fuer eine Fehlermeldung */
        });
    };

    const sync = () => {
      if (active && document.visibilityState === "visible") request();
      else release();
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", sync);
      release();
    };
  }, [active]);

  return { supported: wakeLockSupported() };
}
