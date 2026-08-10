import type { CSSProperties, ReactNode } from "react";

/**
 * Eine Zeile mit farbiger Kante links.
 *
 * Das ist das meistbenutzte Muster der ganzen App: die Farbe eines Spielers
 * (oder eines Beets) steht als Kante links, der Rest ist eine ruhige Flaeche.
 * Es stand achtmal einzeln im Code – in der Rangliste, in den Standings-Chips,
 * in der Spielerliste, in beiden Play-Ansichten, in der Beetkarte und im
 * Raum-Sheet –, jedes Mal mit leicht anderen Abstaenden.
 */
export function PlayerRow({
  accent,
  as: Tag = "div",
  highlight = false,
  className = "",
  style,
  children,
  ...rest
}: {
  /** Die Farbe der Kante – eine Spieler- oder Beetfarbe, kein Theme-Wert. */
  accent: string;
  as?: "div" | "li";
  /** Hebt die Zeile hervor (Sieger, aktiver Spieler). */
  highlight?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      {...rest}
      style={{ borderInlineStartColor: accent, ...style }}
      className={`bg-base-200 rounded-field flex items-center gap-3 border-s-4 px-3 py-2 ${
        highlight ? "ring-primary/40 ring-2" : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
