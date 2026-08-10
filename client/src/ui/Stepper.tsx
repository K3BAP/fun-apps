import { useCallback, useEffect, useRef } from "react";
import { useHaptics } from "@/hooks/useHaptics";
import { MinusIcon, PlusIcon } from "./icons";

/** Ab hier laeuft der Wert beim Halten weiter, und in diesem Takt. */
const HOLD_DELAY_MS = 400;
const HOLD_STEP_MS = 90;

/**
 * −/Wert/+ zum Eintippen kleiner Zahlen. In Wizard und Beet identisch.
 *
 * Frueher waren das zwei `btn-sm` (32px – unter der 44px-Grenze, die diese App
 * sich selbst setzt) mit einem andersfarbigen Feld dazwischen, das innerhalb
 * des umrandeten `join` wie ein Loch aussah. Jetzt ist es ein durchgehendes
 * Feld: der Wert sitzt darin, nicht daneben.
 *
 * Halten zaehlt weiter. In „Ab ins Beet" gehen Salatkoepfe bis 99 – 99 einzelne
 * Tipper waeren Quaelerei.
 */
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
  onChange: (next: number) => void;
  label: string;
}) {
  const { tap } = useHaptics();

  // Die Timer laufen ausserhalb von React und muessen beim Loslassen wie beim
  // Verschwinden der Komponente zuverlaessig abgeraeumt werden.
  const hold = useRef<{ delay?: number; repeat?: number }>({});
  const stop = useCallback(() => {
    clearTimeout(hold.current.delay);
    clearInterval(hold.current.repeat);
    hold.current = {};
  }, []);
  useEffect(() => stop, [stop]);

  /**
   * Ein Druck ist ein in sich geschlossener Lauf: `current` zaehlt lokal weiter,
   * damit der Takt nicht bei jedem Tick mit dem Wert von damals rechnet.
   */
  const start = useCallback(
    (delta: -1 | 1) => {
      stop();
      let current = value;
      const tick = () => {
        const next = Math.min(max, Math.max(min, current + delta));
        if (next === current) {
          stop();
          return;
        }
        current = next;
        onChange(next);
        tap();
      };

      tick();
      hold.current.delay = window.setTimeout(() => {
        hold.current.repeat = window.setInterval(tick, HOLD_STEP_MS);
      }, HOLD_DELAY_MS);
    },
    [max, min, onChange, stop, tap, value],
  );

  const button = (delta: -1 | 1) => (
    <button
      type="button"
      disabled={delta < 0 ? value <= min : value >= max}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        // Der Zeiger bleibt bis zum Loslassen bei diesem Knopf – sonst laeuft
        // der Takt weiter, wenn der Finger daneben rutscht.
        event.currentTarget.setPointerCapture(event.pointerId);
        start(delta);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      aria-label={`${label}: ${delta < 0 ? "weniger" : "mehr"}`}
      className="text-base-content/70 hover:bg-base-200 grid size-11 shrink-0 place-items-center transition disabled:opacity-25 motion-safe:active:scale-90"
    >
      {delta < 0 ? <MinusIcon /> : <PlusIcon />}
    </button>
  );

  return (
    <div
      className="border-base-300 bg-base-100 rounded-field inline-flex items-center border"
      role="group"
      aria-label={label}
    >
      {button(-1)}
      <span className="min-w-9 text-center text-lg font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      {button(1)}
    </div>
  );
}
