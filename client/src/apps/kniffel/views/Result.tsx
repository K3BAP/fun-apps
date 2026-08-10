import { rankBy } from "@/game/rank";
import { Ranking, type RankingEntry } from "@/ui/Ranking";
import { ResultHeader } from "@/ui/ResultHeader";
import { ShareButton } from "@/ui/ShareButton";
import { BONUS_POINTS, bonus, grandTotal, lowerSum, upperTotal } from "../rules";
import { kniffelGame, sheetOf, useKniffel } from "../state";
import { t } from "../strings";

export function Result() {
  const { store } = useKniffel();
  const { state } = store;

  const ranked = rankBy(state.players, (player) => grandTotal(sheetOf(state, player.id)));
  const winner = ranked[0];

  const entries: RankingEntry[] = ranked.map((entry) => {
    const sheet = sheetOf(state, entry.item.id);
    return {
      ...entry,
      detail: (
        <>
          {t.breakdown(upperTotal(sheet), lowerSum(sheet))}
          {bonus(sheet) > 0 && (
            <span className="text-success"> {t.bonusIncluded(BONUS_POINTS)}</span>
          )}
        </>
      ),
    };
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-8 safe-bottom">
      <ResultHeader
        title={t.finalTitle}
        subtitle={winner ? t.winner(winner.item.name, winner.score) : ""}
      />

      <Ranking entries={entries} />

      <div className="flex flex-col gap-2">
        <ShareButton summary={kniffelGame.summarize!(state)} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => store.dispatch({ type: "playAgain" })}
        >
          {t.again}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => store.dispatch({ type: "backToSetup" })}
        >
          {t.newGame}
        </button>
      </div>
    </div>
  );
}
