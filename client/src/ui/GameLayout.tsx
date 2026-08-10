import type { CSSProperties, ReactNode } from "react";
import { CONTENT_WIDTH, Container, type ContentWidth } from "./Container";

/**
 * Layout der Spiel-Ansicht: Kopf und Fuss stehen fest, nur die Mitte scrollt.
 *
 * Dadurch bleiben Kurzstand und Aktionsknopf immer sichtbar, und eine Tabelle
 * in der Mitte kann ihre eigene klebende Kopfzeile haben, ohne sich mit der
 * Seitenkopfzeile zu schlagen.
 *
 * `width` gilt fuer den ganzen Bildschirm: Kopf, Inhalt und Fuss lesen ihn ueber
 * `--fa-w` aus demselben `Container`. Die Balken selbst laufen weiterhin ueber
 * die volle Breite – nur ihr Inhalt ist zentriert und buendig zum Spielfeld.
 */
export function GameLayout({
  header,
  footer,
  width = "board",
  children,
}: {
  header: ReactNode;
  footer?: ReactNode;
  width?: ContentWidth;
  children: ReactNode;
}) {
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{ "--fa-w": CONTENT_WIDTH[width] } as CSSProperties}
    >
      {header}
      <main className="min-h-0 flex-1 overflow-auto overscroll-contain">{children}</main>
      {footer && (
        <div className="bg-base-100 border-base-300 border-t safe-bottom">
          {/* Der Fuss traegt eine Handlung, keinen Inhalt – er bleibt auch auf
              breiten Bildschirmen schmal, statt einen 1000px-Knopf zu zeigen. */}
          <Container size="form" className="px-3 pt-3 sm:px-4">
            {footer}
          </Container>
        </div>
      )}
    </div>
  );
}
