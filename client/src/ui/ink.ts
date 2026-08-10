/**
 * Lesbare Schriftfarbe auf einer beliebigen Flaeche.
 *
 * Die Spielerfarben und die vier Qwixx-Reihenfarben gehoeren zum Spielmaterial
 * und nicht zum Theme – auf ihnen stand vorher hart `text-white`. Auf dem Gold
 * `#c9a15a` (2.4:1) und dem Qwixx-Gelb `#d7ab2b` (2.2:1) war die Zahl im Feld
 * damit praktisch nicht zu lesen; mit dunkler Schrift sind es 7.2:1 und 8.0:1.
 *
 * Gerechnet statt tabelliert, damit eine neue Spielerfarbe nicht daran denken
 * muss – und beide Richtungen werden verglichen, statt einen Schwellwert zu
 * raten. Dass dabei Rot weisse und Blau dunkle Schrift bekommt, ist kein
 * Versehen: bei diesen Farben ist es tatsaechlich herum jeweils deutlich besser.
 */

/** Fast schwarz statt reinem Schwarz – das wirkt auf bunten Flaechen weicher. */
const DARK = "#1c1a17";
const LIGHT = "#ffffff";

/** sRGB-Kanal in linearen Wert (die Gammakurve aus der sRGB-Norm). */
function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Kontrastverhaeltnis nach WCAG: 1:1 (gleich) bis 21:1 (Schwarz auf Weiss). */
function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export function readableInk(background: string): string {
  const base = luminance(background);
  return contrast(base, luminance(DARK)) >= contrast(base, luminance(LIGHT)) ? DARK : LIGHT;
}
