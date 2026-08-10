import { useCallback, useEffect, useMemo, useState } from "react";
import { produce } from "immer";
import { nsKey, readJson, writeJson } from "@/storage/keys";
import type { GameDefinition } from "./types";

/** So viele Schritte lassen sich hoechstens zurueecknehmen. */
const UNDO_LIMIT = 50;

type History<S> = {
  past: S[];
  present: S;
  future: S[];
};

export interface GameStore<S, A> {
  state: S;
  dispatch: (action: A) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Neues Spiel: alles auf Anfang, ausser was `keepOnReset` festhaelt. */
  reset: () => void;
}

type Persisted<S> = { v: number; s: S };

function storageKey(id: string): string {
  return nsKey(id, "state");
}

function loadState<S, A>(def: GameDefinition<S, A>): S {
  const raw = readJson<Persisted<S> | null>(storageKey(def.id), null);
  // Andere Version -> verwerfen. Bewusst keine Migration: ein halb verstandener
  // alter Stand ist schlimmer als ein frischer Block.
  if (!raw || raw.v !== def.version || raw.s == null) return def.initial();
  return raw.s;
}

/**
 * Der Zustand eines Spiels: ein Reducer, Persistenz und – falls das Spiel es
 * anbietet – Undo/Redo.
 *
 * Alle Aenderungen laufen durch `dispatch`. Es gibt keinen zweiten Weg, den
 * State anzufassen; genau das macht spaeter auch die Netzwerk-Synchronisierung
 * unauffaellig, weil eingehende Aenderungen dieselbe Bahn benutzen.
 */
export function useGameStore<S, A>(def: GameDefinition<S, A>): GameStore<S, A> {
  const [history, setHistory] = useState<History<S>>(() => ({
    past: [],
    present: loadState(def),
    future: [],
  }));

  // `def` ist eine Modulkonstante je App und aendert sich zur Laufzeit nicht –
  // die Callbacks unten sind dadurch trotz der Abhaengigkeit referenzstabil.
  useEffect(() => {
    writeJson(storageKey(def.id), { v: def.version, s: history.present } satisfies Persisted<S>);
  }, [def.id, def.version, history.present]);

  const dispatch = useCallback(
    (action: A) => {
      setHistory((h) => {
        const next = produce(h.present, (draft) => {
          def.reducer(draft as S, action);
        });
        if (next === h.present) return h;

        const undoable = def.undo === true && def.transient?.(action) !== true;
        if (!undoable) return { ...h, present: next };
        return {
          past: [...h.past, h.present].slice(-UNDO_LIMIT),
          present: next,
          future: [],
        };
      });
    },
    [def],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      const previous = h.past.at(-1);
      if (previous === undefined) return h;
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      const [next, ...rest] = h.future;
      if (next === undefined) return h;
      return { past: [...h.past, h.present], present: next, future: rest };
    });
  }, []);

  const reset = useCallback(() => {
    setHistory((h) => ({
      past: [],
      // `keepOnReset` liest den *bisherigen* Stand – daher innerhalb des Updaters.
      present: { ...def.initial(), ...def.keepOnReset?.(h.present) },
      future: [],
    }));
  }, [def]);

  return useMemo(
    () => ({
      state: history.present,
      dispatch,
      undo,
      redo,
      canUndo: def.undo === true && history.past.length > 0,
      canRedo: def.undo === true && history.future.length > 0,
      reset,
    }),
    [history, dispatch, undo, redo, reset, def.undo],
  );
}
