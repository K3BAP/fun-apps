import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { ThemeContext, useTheme } from "./context";
import { SHELL_THEME, type ThemePair } from "./themes";
import { useColorScheme } from "./useColorScheme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { mode, scheme, setMode } = useColorScheme();
  return <ThemeContext value={{ mode, scheme, setMode }}>{children}</ThemeContext>;
}

/**
 * daisyUI-Farben stehen als `oklch(...)` in den berechneten Stilen, und das
 * versteht nicht jeder mobile Browser in <meta name="theme-color">. Das Canvas
 * parst jede gueltige CSS-Farbe und gibt sie als sRGB zurueck.
 */
function toHex(color: string): string | null {
  if (!color) return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * Setzt das Theme fuer einen Bereich der App – in der Praxis: fuer eine Route.
 *
 * `data-theme` landet auf einem Wrapper-Div, damit daisyUI seine Variablen von
 * dort aufloest und nichts zwischen den Apps ausblutet. Zusaetzlich wird
 * dasselbe Theme an <html> gehaengt: nur so stimmt der Hintergrund ausserhalb
 * des Wrappers (Overscroll-Bereich, native Bedienelemente, Scrollbalken).
 */
export function ThemeScope({ pair, children }: { pair: ThemePair; children: ReactNode }) {
  const { scheme } = useTheme();
  const theme = pair[scheme];
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = scheme;
  }, [theme, scheme]);

  // Die Statusleiste auf Android faerbt sich nach <meta name="theme-color">.
  // Der Wert steht nicht fest, sondern faellt aus dem gewaehlten Theme heraus.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const hex = toHex(getComputedStyle(el).backgroundColor);
    if (hex) meta.content = hex;
  }, [theme]);

  return (
    <div ref={ref} data-theme={theme} className="bg-base-100 text-base-content min-h-dvh">
      {children}
    </div>
  );
}

/** Theme-Scope der Huelle: Landing-Page und Fehlerseiten. */
export function ShellScope({ children }: { children: ReactNode }) {
  return <ThemeScope pair={SHELL_THEME}>{children}</ThemeScope>;
}
