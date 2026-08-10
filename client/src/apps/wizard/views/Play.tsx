import { PlayerRow } from "@/ui/PlayerRow";
import { StepTabs } from "@/ui/StepTabs";
import { Container } from "@/ui/Container";
import { GameHeader } from "@/ui/GameHeader";
import { GameLayout } from "@/ui/GameLayout";
import { StandingsChips } from "@/ui/StandingsChips";
import { Stepper } from "@/ui/Stepper";
import {
  bidsBlocked,
  dealerIndex,
  maxRounds,
  roundScore,
  sumOf,
  totalScore,
  tricksValid,
} from "../rules";
import { useWizard, type WizardStep } from "../state";
import { t } from "../strings";

const STEPS = [
  { key: "bid", label: t.stepBid },
  { key: "trick", label: t.stepTrick },
] as const satisfies readonly { key: WizardStep; label: string }[];

export function Play() {
  const { store } = useWizard();
  const { players, round, step, draftBids, draftTricks, enforce, rounds } = store.state;
  const total = maxRounds(players.length);
  const ids = players.map((p) => p.id);

  const sumBids = sumOf(draftBids, ids);
  const sumTricks = sumOf(draftTricks, ids);
  const blocked = bidsBlocked(sumBids, round, enforce);
  const tricksOk = tricksValid(sumTricks, round);
  const dealer = dealerIndex(round, players.length);
  const lastRound = round >= total;

  // Vor der ersten gewerteten Runde steht niemand vorn.
  const leaderId =
    rounds.length === 0
      ? null
      : players.reduce<{ id: string; score: number } | null>((best, player) => {
          const score = totalScore(rounds, player.id);
          return best === null || score > best.score ? { id: player.id, score } : best;
        }, null)?.id;

  return (
    <GameLayout
      header={<GameHeader primary={t.round(round, total)} secondary={t.cards(round)} />}
      footer={
        step === "bid" ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={blocked}
            onClick={() => store.dispatch({ type: "gotoStep", step: "trick" })}
          >
            {t.toTricks}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => store.dispatch({ type: "gotoStep", step: "bid" })}
            >
              {t.backToBids}
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={!tricksOk}
              onClick={() => store.dispatch({ type: "finishRound" })}
            >
              {lastRound ? t.finishGame : t.finishRound}
            </button>
          </div>
        )
      }
    >
      <StandingsChips
        standings={players.map((player) => ({
          player,
          score: totalScore(rounds, player.id),
        }))}
        leaderId={leaderId}
      />

      <Container className="flex flex-col gap-3 px-3 pb-4 sm:px-4">
        <div className="flex flex-col gap-1">
          <StepTabs steps={STEPS} current={step} />
          <h2 className="text-xl font-bold">{step === "bid" ? t.bidTitle : t.trickTitle}</h2>
          <p className="text-base-content/60 text-sm">
            {step === "bid" ? t.bidSubtitle : t.trickSubtitle}
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {players.map((player, index) => {
            const bid = draftBids[player.id] ?? 0;
            const tricks = draftTricks[player.id] ?? 0;
            const points = roundScore(bid, tricks);
            return (
              <PlayerRow as="li" key={player.id} accent={player.color}>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-medium">{player.name}</span>
                  {step === "bid" ? (
                    index === dealer && (
                      <span className="text-base-content/60 text-xs">{t.dealer}</span>
                    )
                  ) : (
                    <span className="text-base-content/60 text-xs">
                      {t.bidOf(bid)} ·{" "}
                      <span className={points >= 0 ? "text-success" : "text-error"}>
                        {points >= 0 ? "+" : ""}
                        {points}
                      </span>
                    </span>
                  )}
                </span>
                <Stepper
                  value={step === "bid" ? bid : tricks}
                  min={0}
                  max={round}
                  label={`${player.name}: ${step === "bid" ? t.bidTitle : t.trickTitle}`}
                  onChange={(value) =>
                    store.dispatch(
                      step === "bid"
                        ? { type: "setBid", player: player.id, value }
                        : { type: "setTricks", player: player.id, value },
                    )
                  }
                />
              </PlayerRow>
            );
          })}
        </ul>

        {step === "bid" ? (
          <p className={`text-sm ${blocked ? "text-error font-medium" : "text-base-content/70"}`}>
            {t.bidSum(sumBids, round)}
            {blocked ? ` — ${t.bidBlocked}` : enforce ? "" : ` ${t.enforceOff}`}
          </p>
        ) : (
          <p
            className={`text-sm ${tricksOk ? "text-success font-medium" : "text-error font-medium"}`}
          >
            {t.trickSum(sumTricks, round)}
            {tricksOk ? " ✓" : ` — ${t.trickNeeded(round)}`}
          </p>
        )}
      </Container>
    </GameLayout>
  );
}
