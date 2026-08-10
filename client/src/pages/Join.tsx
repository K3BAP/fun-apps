import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isValidCode, normalizeCode, type RoomInfo } from "@fun/shared";
import { APPS } from "@/apps/registry";
import { ShellScope } from "@/theme/ThemeProvider";

/**
 * Ziel des QR-Codes: /beitreten/ABCD.
 *
 * Hier wird nur nachgeschlagen, zu welchem Spiel der Raum gehoert, und dorthin
 * weitergeleitet – beigetreten wird erst in der App selbst, wo der Raum-Dialog
 * und der Spielstand zu Hause sind.
 */
export default function Join() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const clean = normalizeCode(code);
  // Aus der Adresse ableitbar – dafuer braucht es keinen State.
  const malformed = !isValidCode(clean);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (malformed) return;

    let cancelled = false;
    fetch(`/api/rooms/${clean}`)
      .then((response) => (response.ok ? (response.json() as Promise<RoomInfo>) : null))
      .then((info) => {
        if (cancelled) return;
        const app = info && APPS.find((candidate) => candidate.id === info.gameId);
        if (!app) {
          setLookupError("Diesen Raum gibt es nicht (mehr).");
          return;
        }
        const params = new URLSearchParams({ raum: clean });
        // Den Entwicklungs-Schalter mitnehmen, sonst verliert der zweite Tab
        // beim Beitreten seinen eigenen Speicher.
        const device = new URLSearchParams(location.search).get("device");
        if (device) params.set("device", device);
        void navigate(`${app.path}?${params}`, { replace: true });
      })
      .catch(() => {
        if (!cancelled) setLookupError("Der Server ist gerade nicht erreichbar.");
      });

    return () => {
      cancelled = true;
    };
  }, [clean, malformed, navigate]);

  const error = malformed ? "Dieser Code sieht nicht richtig aus." : lookupError;

  return (
    <ShellScope>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        {error ? (
          <>
            <div className="text-5xl" aria-hidden="true">
              🤷
            </div>
            <h1 className="text-2xl font-bold">{error}</h1>
            <Link to="/" className="btn btn-primary">
              Zur Übersicht
            </Link>
          </>
        ) : (
          <span className="loading loading-dots loading-lg text-base-content/40" />
        )}
      </div>
    </ShellScope>
  );
}
