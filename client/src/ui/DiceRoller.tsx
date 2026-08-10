import { useState } from "react";
import { useHaptics } from "@/hooks/useHaptics";
import { Sheet } from "./Sheet";

export type DieSpec = {
  /** Feste Farbe (Qwixx-Reihenwuerfel) oder undefined fuer einen weissen Wuerfel. */
  color?: string;
  label: string;
};

const PIPS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function roll(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/**
 * Wuerfel fuer den Fall, dass keine da sind.
 *
 * Antippen haelt einen Wuerfel fest – ohne das waere es fuer Kniffel nutzlos,
 * wo genau das Liegenlassen den Zug ausmacht. Gehaltene Wuerfel bleiben beim
 * naechsten Wurf stehen.
 */
export function DiceRoller({
  open,
  onClose,
  dice,
  title = "Würfel",
  note,
}: {
  open: boolean;
  onClose: () => void;
  dice: readonly DieSpec[];
  title?: string;
  /** Warum hier weniger Würfel liegen als sonst – schlägt den Standardhinweis. */
  note?: string;
}) {
  const [values, setValues] = useState<number[]>(() => dice.map(roll));
  const [held, setHeld] = useState<boolean[]>(() => dice.map(() => false));
  const [rolls, setRolls] = useState(0);
  const { tap } = useHaptics();

  const canHold = dice.length > 1 && dice.every((die) => die.color === undefined);

  function rollAll() {
    tap();
    setValues((previous) => previous.map((value, i) => (held[i] ? value : roll())));
    setRolls((n) => n + 1);
  }

  function reset() {
    setHeld(dice.map(() => false));
    setValues(dice.map(roll));
    setRolls(0);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={note ?? (canHold ? "Antippen hält einen Würfel fest." : undefined)}
      footer={
        <div className="flex w-full gap-2">
          {rolls > 0 && (
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Zurücksetzen
            </button>
          )}
          <button type="button" className="btn btn-primary flex-1" onClick={rollAll}>
            Würfeln{rolls > 0 && ` · ${rolls}. Wurf`}
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap justify-center gap-3 py-2">
        {dice.map((die, index) => {
          const isHeld = held[index] === true;
          return (
            <button
              key={index}
              type="button"
              disabled={!canHold}
              onClick={() => {
                tap();
                setHeld((previous) => previous.map((v, i) => (i === index ? !v : v)));
              }}
              aria-label={`${die.label}: ${values[index]}${isHeld ? ", festgehalten" : ""}`}
              aria-pressed={isHeld}
              style={die.color ? { color: die.color, borderColor: die.color } : undefined}
              className={`grid size-16 place-items-center rounded-xl border-2 text-5xl leading-none ${
                isHeld ? "border-primary bg-primary/10" : "border-base-300"
              }`}
            >
              {PIPS[values[index] ?? 1]}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
