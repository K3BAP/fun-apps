/**
 * Die Schrittanzeige ueber einer mehrstufigen Eingabe.
 *
 * Wizard fuehrt durch Ansage und Stiche, „Ab ins Beet" durch Beete, Bonus und
 * Tierkarten – beide hatten dieselbe Pillenreihe wortgleich im Code stehen.
 *
 * Bewusst nur Anzeige, nicht bedienbar: die Reihenfolge der Schritte gibt das
 * Spiel vor, sie ist nicht frei waehlbar.
 */
export function StepTabs<S extends string>({
  steps,
  current,
}: {
  steps: readonly { key: S; label: string }[];
  current: S;
}) {
  return (
    <ol className="flex gap-2">
      {steps.map((step) => (
        <li
          key={step.key}
          aria-current={step.key === current ? "step" : undefined}
          className={`rounded-selector px-3 py-1 text-xs ${
            step.key === current ? "bg-primary text-primary-content font-semibold" : "bg-base-200"
          }`}
        >
          {step.label}
        </li>
      ))}
    </ol>
  );
}
