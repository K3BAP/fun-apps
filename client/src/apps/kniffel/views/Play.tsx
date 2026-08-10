import { useState } from "react";
import { useMySeatIndex } from "@/sync/useMySeat";
import { GameHeader } from "@/ui/GameHeader";
import { GameLayout } from "@/ui/GameLayout";
import { EntrySheet, type EntryTarget } from "../components/EntrySheet";
import { ScoreTable } from "../components/ScoreTable";
import { TOTAL_FIELDS, activeIndex, allComplete, currentRound, totalFilled } from "../rules";
import { sheetOf, sheetsInOrder, useKniffel } from "../state";
import { t } from "../strings";

export function Play() {
  const { store } = useKniffel();
  const { players } = store.state;
  const sheets = sheetsInOrder(store.state);
  const [target, setTarget] = useState<EntryTarget | null>(null);
  // Im Raum gehoert einem genau eine Spalte; ohne Raum alle.
  const editableIndex = useMySeatIndex();

  const filled = totalFilled(sheets);
  const maxFields = TOTAL_FIELDS * players.length;
  const done = allComplete(sheets);

  return (
    <GameLayout
      header={
        <GameHeader
          primary={t.round(currentRound(sheets), TOTAL_FIELDS)}
          secondary={t.fields(filled, maxFields)}
        />
      }
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!done}
          onClick={() => store.dispatch({ type: "evaluate" })}
        >
          {done ? t.showResult : t.openFields(maxFields - filled)}
        </button>
      }
    >
      <ScoreTable
        players={players}
        sheets={sheets}
        activeIdx={activeIndex(sheets)}
        editableIndex={editableIndex}
        onPick={(player, cat) => setTarget({ player, cat })}
      />

      <EntrySheet
        target={target}
        current={target ? sheetOf(store.state, target.player.id)[target.cat.key] : undefined}
        onClose={() => setTarget(null)}
        onPick={(value) => {
          if (!target) return;
          store.dispatch({
            type: "setValue",
            player: target.player.id,
            cat: target.cat.key,
            value,
          });
          setTarget(null);
        }}
        onClear={() => {
          if (!target) return;
          store.dispatch({
            type: "setValue",
            player: target.player.id,
            cat: target.cat.key,
            value: null,
          });
          setTarget(null);
        }}
      />
    </GameLayout>
  );
}
