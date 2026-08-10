import { useTheme } from "@/theme/context";
import type { ColorMode } from "@/theme/useColorScheme";
import { SegmentedControl, type Segment } from "./SegmentedControl";

const OPTIONS: readonly Segment<ColorMode>[] = [
  { key: "system", label: "Auto" },
  { key: "light", label: "Hell" },
  { key: "dark", label: "Dunkel" },
];

/** Die eine globale Hell/Dunkel-Einstellung – gilt in allen Apps. */
export function ColorModeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useTheme();

  return (
    <SegmentedControl
      label="Farbmodus"
      size="sm"
      options={OPTIONS}
      value={mode}
      onChange={setMode}
      className={className}
    />
  );
}
