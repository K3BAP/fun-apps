import { useHaptics } from "@/hooks/useHaptics";
import { useMySeatIndex } from "@/sync/useMySeat";
import { Container } from "@/ui/Container";
import { GameHeader } from "@/ui/GameHeader";
import { GameLayout } from "@/ui/GameLayout";
import { StandingsChips } from "@/ui/StandingsChips";
import { QwixxSheet } from "../components/QwixxSheet";
import { sheetScore, variantInfo } from "../rules";
import {
  activePlayer,
  canEvaluate,
  closedFor,
  endReason,
  scoresHidden,
  sheetOf,
  useQwixx,
} from "../state";
import { t } from "../strings";

export function Play() {
  const { store } = useQwixx();
  const mySeatIndex = useMySeatIndex();
  const { tap } = useHaptics();
  const { state } = store;
  // Ohne eigene Wahl zeigt der Block den eigenen Platz – ausserhalb eines Raums
  // gibt es keinen, dann bleibt es beim ersten Spieler.
  const player = activePlayer(state, mySeatIndex !== null && mySeatIndex >= 0 ? mySeatIndex : 0);
  if (!player) return null;

  // Im Raum darf man nur in den eigenen Block schreiben – die anderen sind zum
  // Ansehen da (und liefern nebenbei die Reihensperren).
  const inRoom = mySeatIndex !== null;
  const readOnly = inRoom && state.players.indexOf(player) !== mySeatIndex;
  const solo = state.mode === "solo" && !inRoom;
  const hidden = scoresHidden(state);
  const sheet = sheetOf(state, player.id);
  const closed = closedFor(state);
  const badge = variantInfo(state.variant).badge;
  const reason = endReason(state);
  const evaluable = canEvaluate(state);

  // Bei verdeckten Punkten gibt es keinen sichtbaren Fuehrenden.
  const leaderId = hidden
    ? null
    : state.players.reduce<{ id: string; score: number } | null>((best, candidate) => {
        const score = sheetScore(sheetOf(state, candidate.id));
        return best === null || score > best.score ? { id: candidate.id, score } : best;
      }, null)?.id;

  return (
    <GameLayout
      header={
        <GameHeader
          badge={badge}
          primary={hidden ? t.hidden : t.points(sheetScore(sheet))}
          secondary={player.name}
        />
      }
      footer={
        <div className="flex flex-col gap-2">
          {reason && (
            <p className="alert alert-info alert-soft py-2 text-sm">
              {t.endBanner(
                solo
                  ? reason === "penalties"
                    ? t.endSoloPenalties
                    : t.endSoloRows
                  : reason === "penalties"
                    ? t.endSharedPenalties
                    : t.endSharedRows,
              )}
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!evaluable}
            onClick={() => store.dispatch({ type: "evaluate" })}
          >
            {t.evaluate}
          </button>
          {!evaluable && <p className="text-base-content/60 text-xs">{t.evaluateLocked}</p>}
        </div>
      }
    >
      {!solo && (
        <StandingsChips
          standings={state.players.map((candidate) => ({
            player: candidate,
            score: hidden ? null : sheetScore(sheetOf(state, candidate.id)),
          }))}
          leaderId={leaderId}
          activeId={player.id}
          onSelect={(id) => store.dispatch({ type: "selectPlayer", id })}
        />
      )}

      <Container className="px-3 pt-2 pb-4 sm:px-4">
        <QwixxSheet
          sheet={sheet}
          variant={state.variant}
          closed={closed}
          extClosed={state.extClosed}
          hideScores={hidden}
          readOnly={readOnly}
          onToggleCell={(row, index) => {
            tap();
            store.dispatch({ type: "toggleCell", player: player.id, row, index });
          }}
          onToggleLock={(row) => {
            tap();
            store.dispatch({ type: "toggleExtClosed", row });
          }}
          onSetPenalty={(box) => {
            tap();
            store.dispatch({ type: "setPenalty", player: player.id, box });
          }}
        />
      </Container>
    </GameLayout>
  );
}
