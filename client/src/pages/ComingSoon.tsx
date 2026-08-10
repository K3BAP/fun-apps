import { Link } from "react-router-dom";
import type { AppManifest } from "@/apps/types";
import { ThemeScope } from "@/theme/ThemeProvider";

/**
 * Platzhalter fuer eine registrierte, aber noch nicht portierte App. Faellt weg,
 * sobald alle vier Spiele in APP_VIEWS stehen.
 */
export default function ComingSoon({ manifest }: { manifest: AppManifest }) {
  return (
    <ThemeScope pair={manifest.themes}>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl" aria-hidden="true">
          {manifest.emoji}
        </div>
        <h1 className="text-2xl font-bold">{manifest.title}</h1>
        <p className="text-base-content/70 max-w-sm">Wird gerade umgebaut – bald wieder da.</p>
        <Link to="/" className="btn btn-primary">
          Zur Übersicht
        </Link>
      </div>
    </ThemeScope>
  );
}
