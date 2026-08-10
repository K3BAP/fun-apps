import { useTheme } from "@/theme/context";
import type { ColorMode } from "@/theme/useColorScheme";

const OPTIONS: { mode: ColorMode; label: string }[] = [
  { mode: "system", label: "Auto" },
  { mode: "light", label: "Hell" },
  { mode: "dark", label: "Dunkel" },
];

/** Die eine globale Hell/Dunkel-Einstellung – gilt in allen Apps. */
export function ColorModeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Farbmodus"
      className={`join border border-base-300 ${className}`}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="radio"
          aria-checked={mode === option.mode}
          onClick={() => setMode(option.mode)}
          className={`btn join-item btn-sm ${mode === option.mode ? "btn-primary" : "btn-ghost"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
