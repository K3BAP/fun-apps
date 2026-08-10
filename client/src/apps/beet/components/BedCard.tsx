import { Stepper } from "@/ui/Stepper";
import { bedPoints, type Bed, type Colors } from "../rules";
import { t } from "../strings";

/** Ein Beet: Farbigkeit, ganze Salate, „keine halben“, Tomate-Paprika-Paare. */
export function BedCard({
  bed,
  index,
  accent,
  onChange,
}: {
  bed: Bed;
  index: number;
  accent: string;
  onChange: (patch: Partial<Bed>) => void;
}) {
  return (
    <section
      style={{ borderInlineStartColor: accent }}
      className="bg-base-200 border-base-300 flex flex-col gap-2 rounded-lg border border-s-4 p-3"
    >
      <header className="flex items-baseline justify-between">
        <h3 className="font-semibold">{t.bedTitle(index + 1)}</h3>
        <span className="text-sm font-bold tabular-nums">{t.points(bedPoints(bed))}</span>
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-base-content/60 text-xs">{t.colorfulness}</span>
        <div className="join">
          {t.colorOptions.map((option) => (
            <button
              key={option.colors}
              type="button"
              onClick={() => onChange({ colors: option.colors as Colors })}
              aria-pressed={bed.colors === option.colors}
              className={`btn join-item btn-sm h-auto flex-1 flex-col gap-0 py-1.5 ${
                bed.colors === option.colors ? "btn-primary" : "btn-outline"
              }`}
            >
              <span className="text-xs font-medium">{option.label}</span>
              <span className="text-[0.65rem] font-normal opacity-70">{option.points} P</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{t.wholeSalads}</span>
        <Stepper
          value={bed.salate}
          min={0}
          max={99}
          label={`${t.bedTitle(index + 1)}: ${t.wholeSalads}`}
          onChange={(salate) => onChange({ salate })}
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex flex-col leading-tight">
          <span className="text-sm">{t.noHalfSalads}</span>
          <span className="text-base-content/50 text-xs">{t.noHalfHint}</span>
        </span>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={bed.noHalf}
          onChange={(event) => onChange({ noHalf: event.target.checked })}
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{t.pairs}</span>
        <Stepper
          value={bed.pairs}
          min={0}
          max={99}
          label={`${t.bedTitle(index + 1)}: ${t.pairs}`}
          onChange={(pairs) => onChange({ pairs })}
        />
      </div>
    </section>
  );
}
