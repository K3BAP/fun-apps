import type { ReactNode } from "react";

/**
 * Die eine Stelle, an der Inhaltsbreiten festgelegt werden.
 *
 * Vorher stand `max-w-lg` elfmal einzeln im Code, die Kopfzeile benutzte
 * `max-w-3xl` und die Landing-Page `max-w-2xl` – ab 512px Fensterbreite lagen
 * Kopfzeile und Inhalt darunter also nicht mehr uebereinander, und die
 * Fussleiste hatte gar keine Begrenzung.
 *
 * `GameLayout` legt die Breite seines Bildschirms als `--fa-w` fest; alles
 * darin liest denselben Wert. Damit *kann* der Kopf nicht mehr breiter sein als
 * sein Inhalt. Ausserhalb von `GameLayout` (Setup, Ergebnis) gibt `size` die
 * Breite direkt vor.
 */
export const CONTENT_WIDTH = {
  /** Formulare und Listen: eine Textspalte, die man in einem Blick erfasst. */
  form: "32rem",
  /** Spielbretter: darf breiter werden, damit die Felder groesser werden. */
  board: "40rem",
  /** Tabellen mit einer Spalte je Spieler. */
  table: "64rem",
} as const;

export type ContentWidth = keyof typeof CONTENT_WIDTH;

export function Container({
  size,
  className = "",
  children,
}: {
  /** Ohne Angabe gilt die Breite, die `GameLayout` gesetzt hat. */
  size?: ContentWidth;
  className?: string;
  children: ReactNode;
}) {
  const width = size ? CONTENT_WIDTH[size] : "var(--fa-w, 32rem)";
  return (
    <div className={`mx-auto w-full ${className}`} style={{ maxWidth: width }}>
      {children}
    </div>
  );
}
