import type { ReactNode } from "react";

/**
 * Layout der Spiel-Ansicht: Kopf und Fuss stehen fest, nur die Mitte scrollt.
 *
 * Dadurch bleiben Kurzstand und Aktionsknopf immer sichtbar, und eine Tabelle
 * in der Mitte kann ihre eigene klebende Kopfzeile haben, ohne sich mit der
 * Seitenkopfzeile zu schlagen.
 */
export function GameLayout({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {header}
      <main className="min-h-0 flex-1 overflow-auto overscroll-contain">{children}</main>
      {footer && (
        <div className="bg-base-100 border-base-300 border-t px-3 pt-3 safe-bottom">{footer}</div>
      )}
    </div>
  );
}
