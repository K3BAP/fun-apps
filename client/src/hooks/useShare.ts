import { useCallback, useState } from "react";

export type ShareResult = "shared" | "copied" | "failed";

/**
 * Ein Ergebnis teilen.
 *
 * Text, nicht Bild: `navigator.share` mit Dateien kennt Firefox nicht und
 * anderswo ist es wacklig, und ein sauber gesetzter Endstand liest sich in einer
 * Gruppe ohnehin gut. Wo es kein Teilen gibt, landet der Text in der
 * Zwischenablage – das ist der ehrlichere Rueckfall als ein toter Knopf.
 */
export function useShare(): {
  share: (text: string) => Promise<void>;
  result: ShareResult | null;
} {
  const [result, setResult] = useState<ShareResult | null>(null);

  const share = useCallback(async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        setResult("shared");
        return;
      }
      await navigator.clipboard.writeText(text);
      setResult("copied");
    } catch (error) {
      // Abbrechen im Teilen-Dialog ist kein Fehler.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResult("failed");
    }
  }, []);

  return { share, result };
}
