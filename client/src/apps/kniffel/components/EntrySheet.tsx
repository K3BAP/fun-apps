import type { Player } from "@/game/players";
import { Sheet } from "@/ui/Sheet";
import { optionsFor, type Category } from "../rules";
import { t } from "../strings";

export type EntryTarget = { player: Player; cat: Category };

/** Eingabe eines Feldes: alle gueltigen Werte zum Antippen, plus „streichen“. */
export function EntrySheet({
  target,
  current,
  onPick,
  onClear,
  onClose,
}: {
  target: EntryTarget | null;
  current: number | undefined;
  onPick: (value: number) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const options = target ? optionsFor(target.cat) : [];
  const wide = target?.cat.section === "lower" && target.cat.kind === "fixed";

  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      title={target ? `${target.cat.label} · ${target.player.name}` : ""}
      description={target?.cat.hint}
      footer={
        current === undefined ? null : (
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            {t.clearField}
          </button>
        )
      }
    >
      <div className={`grid gap-2 ${wide ? "grid-cols-2" : "grid-cols-4 sm:grid-cols-6"}`}>
        {options.map((option) => {
          const selected = current === option.value;
          const strike = option.value === 0;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onPick(option.value)}
              className={`btn h-auto min-h-14 flex-col gap-0.5 py-2 ${
                selected ? "btn-primary" : strike ? "btn-outline btn-error" : "btn-outline"
              } ${option.main ? "col-span-1 text-lg" : ""}`}
            >
              <span className="text-lg leading-none font-bold tabular-nums">
                {strike ? "✕" : option.value}
              </span>
              {strike ? (
                <span className="text-xs font-normal opacity-70">{t.strike}</span>
              ) : (
                option.sub && <span className="text-xs font-normal opacity-70">{option.sub}</span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
