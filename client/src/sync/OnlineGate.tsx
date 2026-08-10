import { useState } from "react";
import { Link } from "react-router-dom";
import { CODE_LENGTH, isValidCode, normalizeCode, type RoomInfo } from "@fun/shared";
import { APPS } from "@/apps/manifests";
import type { AppManifest } from "@/apps/types";
import { usePersistentState } from "@/hooks/usePersistentState";
import { NAME_MAX_LENGTH } from "@/game/players";
import { nsKey } from "@/storage/keys";
import { recentNames, rememberName } from "@/storage/roster";
import { AppHero } from "@/ui/AppHero";
import { Container } from "@/ui/Container";
import { SetupCard } from "@/ui/SetupCard";
import { useRoom } from "./context";
import { devParams } from "./device";

/**
 * Der eigene Name gilt geraeteweit und ueber alle Spiele hinweg – wer online
 * spielt, heisst in Kniffel nicht anders als in Qwixx.
 */
const MY_NAME_KEY = nsKey("myName");

/**
 * Der Weg in ein Online-Spiel: Name sagen, dann Raum eroeffnen oder beitreten.
 *
 * Frueher lag das hinter dem ⋯-Menue eines schon laufenden Spiels, und die
 * Plaetze mussten vorher auf dem Geraet des Hosts angelegt werden. Jetzt ist es
 * der Anfang: Wer beitritt, bringt seinen Platz mit.
 */
export function OnlineGate({
  manifest,
  gameVersion,
  invite,
  onEnter,
  onCancel,
}: {
  manifest: AppManifest;
  gameVersion: number;
  /** Ein Code aus dem QR-Link – dann geht es hier nur noch um den Namen. */
  invite: string | null;
  /** Laeuft, bevor die Verbindung aufgebaut wird: der lokale Block faengt neu an. */
  onEnter: () => void;
  onCancel: () => void;
}) {
  const { client, snapshot } = useRoom();
  const [name, setName] = usePersistentState(MY_NAME_KEY, "");
  const [code, setCode] = useState(invite ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** Zu welchem Spiel der eingegebene Code gehoert, wenn es nicht dieses ist. */
  const [elsewhere, setElsewhere] = useState<AppManifest | null>(null);

  const named = name.trim() !== "";
  const suggestions = recentNames().filter((candidate) => candidate !== name.trim());

  function enter(run: () => void | Promise<void>): void {
    setProblem(null);
    setElsewhere(null);
    setBusy(true);
    rememberName(name);
    onEnter();
    void Promise.resolve(run())
      .catch(() => setProblem("Der Server ist gerade nicht erreichbar."))
      .finally(() => setBusy(false));
  }

  function create(): void {
    enter(async () => {
      await client.create(
        { gameId: manifest.id, gameVersion, maxSeats: manifest.players.max },
        name.trim(),
      );
    });
  }

  /**
   * Vor dem Beitreten wird nachgeschlagen, zu welchem Spiel der Code gehoert.
   *
   * Sonst landete man mit einem Qwixx-Code im Kniffel-Block: die Spielerliste
   * kaeme an, die Platzinhalte waeren aber die eines fremden Spiels.
   */
  function join(): void {
    enter(async () => {
      const response = await fetch(`/api/rooms/${normalizeCode(code)}`);
      if (!response.ok) {
        setProblem("Diesen Raum gibt es nicht (mehr).");
        return;
      }
      const info = (await response.json()) as RoomInfo;
      if (info.gameId !== manifest.id) {
        setElsewhere(APPS.find((app) => app.id === info.gameId) ?? null);
        setProblem(null);
        return;
      }
      client.join(info.code, name.trim());
    });
  }

  const connecting = snapshot.status === "connecting";
  const message = problem ?? snapshot.error;

  return (
    <Container size="form" className="flex flex-col gap-5 px-4 pb-8 safe-bottom">
      <AppHero
        subtitle={
          invite
            ? `Du wurdest zu Raum ${invite} eingeladen – jeder spielt auf seinem eigenen Gerät.`
            : "Online spielen: jeder auf seinem eigenen Gerät, ein gemeinsamer Spielstand."
        }
        back
      />

      <SetupCard>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Dein Name</span>
          <input
            type="text"
            className="input w-full"
            placeholder="Wie heißt du?"
            maxLength={NAME_MAX_LENGTH}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {suggestions.length > 0 && (
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className="btn btn-xs btn-outline"
                onClick={() => setName(candidate)}
              >
                {candidate}
              </button>
            ))}
          </div>
        )}
        <p className="text-base-content/60 -mt-2 text-sm">
          Unter diesem Namen erscheinst du bei den anderen.
        </p>
      </SetupCard>

      {elsewhere ? (
        <div className="alert alert-warning flex-col items-start gap-2 py-3 text-sm">
          <span>
            Dieser Raum gehört zu {elsewhere.title}, nicht zu {manifest.title}.
          </span>
          <Link
            to={`${elsewhere.path}?${new URLSearchParams({ raum: normalizeCode(code), ...devParams() })}`}
            className="btn btn-sm"
            onClick={onCancel}
          >
            Dort beitreten
          </Link>
        </div>
      ) : (
        message && <p className="alert alert-warning py-2 text-sm">{message}</p>
      )}

      {/* Mit Einladung steht das Beitreten oben – der Code ist ja schon da. */}
      <div className={`flex flex-col gap-4 ${invite ? "" : "flex-col-reverse"}`}>
        <div className="flex flex-col gap-1">
          <span className="text-base-content/60 text-xs">Einem Raum beitreten</span>
          <div className="join w-full">
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={CODE_LENGTH}
              placeholder="Code"
              aria-label="Raumcode"
              className="input join-item w-full text-center font-mono text-xl tracking-[0.3em] uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <button
              type="button"
              className="btn btn-primary join-item"
              disabled={!named || busy || connecting || !isValidCode(code)}
              onClick={join}
            >
              Beitreten
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-base-content/60 text-xs">Neues Spiel</span>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={!named || busy || connecting}
            onClick={create}
          >
            Raum eröffnen
          </button>
          <p className="text-base-content/60 text-sm">
            Du bekommst einen Code, den die anderen eingeben – bis zu {manifest.players.max}{" "}
            Spieler.
          </p>
        </div>
      </div>

      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
        Lieber allein auf diesem Gerät
      </button>
    </Container>
  );
}
