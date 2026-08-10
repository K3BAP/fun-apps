import { useState } from "react";
import { rankBy } from "@/game/rank";
import { Ranking, type RankingEntry } from "@/ui/Ranking";
import { ResultHeader } from "@/ui/ResultHeader";
import { ShareButton } from "@/ui/ShareButton";
import { BlockSheet } from "../components/BlockSheet";
import { gameTotal, lastRoundTotal, roundTotal } from "../rules";
import { beetGame, useBeet } from "../state";
import { t } from "../strings";

export function Result() {
  const { store } = useBeet();
  const { players, rounds } = store.state;
  const [blockOpen, setBlockOpen] = useState(false);

  // Gleichstand entscheidet der letzte Durchgang.
  const ranked = rankBy(
    players,
    (player) => gameTotal(rounds, player.id),
    (player) => lastRoundTotal(rounds, player.id),
  );
  const winner = ranked[0];

  const entries: RankingEntry[] = ranked.map((entry) => ({
    ...entry,
    detail: t.roundBreakdown(rounds.map((round) => roundTotal(round, entry.item.id))),
  }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-8 safe-bottom">
      <ResultHeader
        title={t.finalTitle}
        subtitle={winner ? t.winner(winner.item.name, winner.score) : ""}
      />

      <Ranking entries={entries} />

      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setBlockOpen(true)}>
          {t.showBlock}
        </button>
        <ShareButton summary={beetGame.summarize!(store.state)} />
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

      <BlockSheet
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        players={players}
        rounds={rounds}
      />
    </div>
  );
}
