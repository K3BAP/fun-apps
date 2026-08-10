import { useState } from "react";
import { NAME_MAX_LENGTH, type Player, type PlayerId } from "@/game/players";
import { recentNames, rememberName } from "@/storage/roster";
import { SortablePlayerList } from "./SortablePlayerList";

/**
 * „Spieler anlegen, sortieren, loeschen“ – in allen vier Spielen identisch und
 * darum genau einmal geschrieben.
 */
export function PlayerSetup({
  players,
  min,
  max,
  onAdd,
  onRemove,
  onReorder,
}: {
  players: readonly Player[];
  min: number;
  max: number;
  onAdd: (name: string) => void;
  onRemove: (id: PlayerId) => void;
  onReorder: (ids: PlayerId[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState(recentNames);
  const full = players.length >= max;

  function add(name = draft) {
    if (full) return;
    rememberName(name);
    // Nachziehen, damit ein gerade entfernter Spieler wieder vorgeschlagen wird.
    setSuggestions(recentNames());
    onAdd(name);
    setDraft("");
  }

  // Wer schon mitspielt, wird nicht noch einmal vorgeschlagen.
  const unused = suggestions.filter((name) => !players.some((player) => player.name === name));

  return (
    <div className="flex flex-col gap-3">
      <div className="join w-full">
        <input
          type="text"
          className="input join-item w-full"
          placeholder={full ? `Maximal ${max} Spieler` : "Spielername …"}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="off"
          disabled={full}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
          aria-label="Spielername"
        />
        <button
          type="button"
          className="btn btn-primary join-item"
          disabled={full}
          onClick={() => add()}
        >
          Hinzufügen
        </button>
      </div>

      {!full && unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((name) => (
            <button
              key={name}
              type="button"
              className="btn btn-xs btn-outline"
              onClick={() => add(name)}
            >
              + {name}
            </button>
          ))}
        </div>
      )}

      {players.length > 0 && (
        <SortablePlayerList players={players} onReorder={onReorder} onRemove={onRemove} />
      )}

      <p className="text-base-content/60 text-sm">
        {players.length < min
          ? `Mindestens ${min} Spieler anlegen.`
          : `${players.length} Spieler · am Griff ≡ ziehen zum Sortieren`}
      </p>
    </div>
  );
}
