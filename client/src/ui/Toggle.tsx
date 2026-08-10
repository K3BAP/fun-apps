/** Ein Schalter mit Titel und Kurzbeschreibung – fuer die Spieloptionen. */
export function Toggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 py-2 ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        className="toggle toggle-primary mt-0.5"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-medium">{title}</span>
        <span className="text-base-content/60 text-sm">{description}</span>
      </span>
    </label>
  );
}
