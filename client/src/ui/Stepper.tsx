/** −/Wert/+ zum Eintippen kleiner Zahlen. In Wizard und Beet identisch. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Fuer Screenreader: wovon ist das hier die Zahl? */
  label: string;
}) {
  return (
    <div className="join border-base-300 border" role="group" aria-label={label}>
      <button
        type="button"
        className="btn join-item btn-sm px-3 text-lg"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={`${label}: weniger`}
      >
        −
      </button>
      <span
        className="bg-base-100 join-item grid min-w-11 place-items-center px-1 text-lg font-bold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className="btn join-item btn-sm px-3 text-lg"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`${label}: mehr`}
      >
        +
      </button>
    </div>
  );
}
