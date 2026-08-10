export type Segment<K extends string | number> = {
  key: K;
  label: string;
  /** Zweite Zeile in kleiner Schrift, z. B. „Alle auf einem Gerät". */
  hint?: string;
};

/**
 * Eine Reihe sich gegenseitig ausschliessender Schalter.
 *
 * Das Rezept (daisyUI-`join` mit `btn-primary` fuer die Wahl und `btn-outline`
 * fuer den Rest) stand vorher viermal fast gleich im Code – in der
 * Qwixx-Einrichtung zweimal, in der Beet-Beetkarte und im Farbmodus-Schalter.
 * Bei jeder Designaenderung mussten alle vier gefunden werden.
 */
export function SegmentedControl<K extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className = "",
}: {
  options: readonly Segment<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Beschriftung fuer Screenreader; sichtbar steht sie meist darueber. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`join ${className}`}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          onClick={() => onChange(option.key)}
          className={`btn join-item h-auto flex-1 flex-col gap-0 ${
            size === "sm" ? "btn-sm py-1.5" : "py-2"
          } ${value === option.key ? "btn-primary" : "btn-outline"}`}
        >
          <span className={size === "sm" ? "text-xs font-medium" : "text-sm font-semibold"}>
            {option.label}
          </span>
          {option.hint && (
            <span
              className={`font-normal opacity-70 ${size === "sm" ? "text-[0.65rem]" : "text-xs"}`}
            >
              {option.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
