import { useState } from "react";
import { rankBy } from "@/game/rank";
import { Container } from "@/ui/Container";
import { Ranking, type RankingEntry } from "@/ui/Ranking";
import { AppHero } from "@/ui/AppHero";
import { ShareButton } from "@/ui/ShareButton";
import { BlockSheet } from "../components/BlockSheet";
import { hits, totalScore } from "../rules";
import { useWizard, wizardGame } from "../state";
import { t } from "../strings";

export function Result() {
  const { store } = useWizard();
  const { players, rounds } = store.state;
  const [blockOpen, setBlockOpen] = useState(false);

  const ranked = rankBy(players, (player) => totalScore(rounds, player.id));
  const winner = ranked[0];

  const entries: RankingEntry[] = ranked.map((entry) => ({
    ...entry,
    detail: t.hitsOf(hits(rounds, entry.item.id), rounds.length),
  }));

  return (
    <Container size="form" className="flex flex-col gap-5 px-4 pb-8 safe-bottom">
      <AppHero
        emoji="🧙"
        title={t.finalTitle}
        subtitle={winner ? t.winner(winner.item.name, winner.score) : ""}
      />

      <Ranking entries={entries} />

      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setBlockOpen(true)}>
          {t.showBlock}
        </button>
        <ShareButton summary={wizardGame.summarize!(store.state)} />
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
    </Container>
  );
}
