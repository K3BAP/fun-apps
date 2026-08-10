import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { CloseIcon } from "@/ui/icons";

/**
 * Meldet eine neue Version – und laedt erst neu, wenn der Nutzer es sagt.
 *
 * Das ist die ganze Update-Strategie: der neue Service Worker installiert sich
 * im Hintergrund und wartet. Ein automatischer Reload wuerde sonst mitten im
 * Spiel zuschlagen; ein Spielblock, der sich waehrend einer Partie neu laedt,
 * ist schlimmer als eine Version Rueckstand.
 */
export function UpdateToast() {
  const [update, setUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh: () => setUpdate(() => () => void updateSW(true)),
    });
  }, []);

  if (!update) return null;

  return (
    <div className="toast toast-center toast-bottom z-50 w-full max-w-sm px-4">
      <div className="alert alert-info flex-row items-center gap-3 shadow-lg">
        <span className="flex-1 text-sm">Neue Version verfügbar</span>
        <button type="button" className="btn btn-sm" onClick={update}>
          Neu laden
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost btn-circle"
          onClick={() => setUpdate(null)}
          aria-label="Hinweis schließen"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
