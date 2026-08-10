import type { ReactNode } from "react";

/**
 * Die Karte, auf der eingerichtet wird: Spielerliste, Optionen, Hinweise.
 *
 * Stand in allen vier Einrichtungs-Ansichten als dieselbe Verschachtelung aus
 * `card card-border bg-base-200 border-base-300` und `card-body` – nur die
 * Abstaende wichen zufaellig voneinander ab.
 */
export function SetupCard({ children }: { children: ReactNode }) {
  return (
    <section className="card card-border bg-base-200 border-base-300 shadow-sm">
      <div className="card-body gap-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}
