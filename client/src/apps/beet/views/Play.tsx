import { useSeatReady, type SeatReady } from "@/sync/useMySeat";
import { GameHeader } from "@/ui/GameHeader";
import { GameLayout } from "@/ui/GameLayout";
import { StandingsChips } from "@/ui/StandingsChips";
import { Stepper } from "@/ui/Stepper";
import { BedCard } from "../components/BedCard";
import { ROUNDS, TIER_POINTS, bonusTiers, gameTotal, maxTier } from "../rules";
import { bedsOf, beetTotalOf, beetTotals, useBeet, type BeetStep } from "../state";
import { t } from "../strings";

function StepTabs({ step }: { step: BeetStep }) {
  const tab = (own: BeetStep, label: string) => (
    <span
      key={own}
      className={`rounded-full px-3 py-1 text-xs ${
        step === own ? "bg-primary text-primary-content font-semibold" : "bg-base-200"
      }`}
    >
      {label}
    </span>
  );
  return (
    <div className="flex gap-2">
      {tab("beet", t.stepBeet)}
      {tab("bonus", t.stepBonus)}
      {tab("tier", t.stepTier)}
    </div>
  );
}

function StepHead({ step, title, subtitle }: { step: BeetStep; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1">
      <StepTabs step={step} />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-base-content/60 text-sm">{subtitle}</p>
    </div>
  );
}

/** Schritt ① – ein Gaertner nach dem anderen, im Raum alle gleichzeitig. */
function BeetStepView({ seatIndex }: { seatIndex: number | null }) {
  const { store } = useBeet();
  const { state } = store;
  // Im Raum blaettert niemand: jeder hat seinen eigenen Gaertner vor sich.
  const index = seatIndex ?? state.beetIdx;
  const player = state.players[index];
  if (!player) return null;

  return (
    <>
      <StepHead
        step="beet"
        title={t.beetTitle(player.name)}
        subtitle={
          seatIndex === null
            ? t.beetSubtitle(state.beetIdx + 1, state.players.length)
            : t.beetSubtitleRoom
        }
      />

      {bedsOf(state, player.id).map((bed, index) => (
        <BedCard
          key={index}
          bed={bed}
          index={index}
          accent={player.color}
          onChange={(patch) => store.dispatch({ type: "setBed", player: player.id, index, patch })}
        />
      ))}

      <p className="text-end font-semibold">
        {t.beetSum(player.name)}:{" "}
        <span className="text-primary text-lg tabular-nums">{beetTotalOf(state, player.id)}</span>
      </p>
    </>
  );
}

/** Schritt ② – ergibt sich vollstaendig aus den Beetpunkten aller Spieler. */
function BonusStepView() {
  const { store } = useBeet();
  const { state } = store;
  const totals = beetTotals(state);
  const bonus = bonusTiers(totals);
  const ranked = [...state.players].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));

  return (
    <>
      <StepHead step="bonus" title={t.bonusTitle} subtitle={t.bonusSubtitle} />
      <ul className="flex flex-col gap-2">
        {ranked.map((player) => (
          <li
            key={player.id}
            style={{ borderInlineStartColor: player.color }}
            className="bg-base-200 flex items-center gap-3 rounded-lg border-s-4 px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
            <span className="text-base-content/60 text-sm tabular-nums">
              {t.beetPoints(totals[player.id] ?? 0)}
            </span>
            <span className="badge badge-primary badge-lg font-bold tabular-nums">
              +{bonus[player.id] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Schritt ③ – wie viele Beete erfuellen eine Tierkarte? */
function TierStepView({ seatIndex }: { seatIndex: number | null }) {
  const { store } = useBeet();
  const { state } = store;
  const limit = maxTier(state.round);
  // Im Raum trägt jeder nur für sich ein; die anderen stehen daneben.
  const rows = seatIndex === null ? state.players : state.players.slice(seatIndex, seatIndex + 1);

  return (
    <>
      <StepHead step="tier" title={t.tierTitle} subtitle={t.tierSubtitle(limit)} />
      <ul className="flex flex-col gap-2">
        {rows.map((player) => {
          const count = Math.min(state.draftTier[player.id] ?? 0, limit);
          return (
            <li
              key={player.id}
              style={{ borderInlineStartColor: player.color }}
              className="bg-base-200 flex items-center gap-3 rounded-lg border-s-4 px-3 py-2"
            >
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate font-medium">{player.name}</span>
                <span className="text-base-content/60 text-xs">
                  {t.tierBeds(count)} · <span className="text-success">+{count * TIER_POINTS}</span>
                </span>
              </span>
              <Stepper
                value={count}
                min={0}
                max={limit}
                label={`${player.name}: ${t.tierTitle}`}
                onChange={(value) => store.dispatch({ type: "setTier", player: player.id, value })}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Im Raum ersetzt ein einziger Knopf alle Weiter-Knoepfe: „Fertig“. Sobald alle
 * fertig sind, schaltet der Tisch gemeinsam weiter.
 */
function ReadyFooter({ seat }: { seat: SeatReady }) {
  const { store } = useBeet();
  const last = store.state.step === "tier" && store.state.round >= ROUNDS;

  return (
    <div className="flex flex-col gap-2">
      {seat.ready && (
        <p className="text-base-content/60 text-center text-sm">
          {seat.waitingFor > 0 ? t.waitingFor(seat.waitingFor) : t.allReady}
        </p>
      )}
      <button
        type="button"
        className={`btn btn-block ${seat.ready ? "btn-outline" : "btn-primary"}`}
        onClick={() => seat.setReady(!seat.ready)}
      >
        {seat.ready ? t.notReady : last ? t.finishGame : t.ready}
      </button>
    </div>
  );
}

function Footer() {
  const { store } = useBeet();
  const { state } = store;

  if (state.step === "beet") {
    const last = state.beetIdx >= state.players.length - 1;
    return (
      <div className="flex gap-2">
        {state.beetIdx > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => store.dispatch({ type: "gotoGardener", index: state.beetIdx - 1 })}
          >
            {t.previousGardener}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={() =>
            store.dispatch(
              last
                ? { type: "gotoStep", step: "bonus" }
                : { type: "gotoGardener", index: state.beetIdx + 1 },
            )
          }
        >
          {last ? t.toBonus : t.nextGardener}
        </button>
      </div>
    );
  }

  if (state.step === "bonus") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => store.dispatch({ type: "gotoStep", step: "beet" })}
        >
          {t.backToBeet}
        </button>
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={() => store.dispatch({ type: "gotoStep", step: "tier" })}
        >
          {t.toTier}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => store.dispatch({ type: "gotoStep", step: "bonus" })}
      >
        {t.backToBonus}
      </button>
      <button
        type="button"
        className="btn btn-primary flex-1"
        onClick={() => store.dispatch({ type: "finishRound" })}
      >
        {state.round >= ROUNDS ? t.finishGame : t.finishRound}
      </button>
    </div>
  );
}

export function Play() {
  const { store } = useBeet();
  const { state } = store;
  const seat = useSeatReady();
  const seatIndex = seat?.index ?? null;

  return (
    <GameLayout
      header={
        <GameHeader
          primary={t.round(state.round, ROUNDS)}
          secondary={t.tierCards(maxTier(state.round))}
        />
      }
      footer={seat ? <ReadyFooter seat={seat} /> : <Footer />}
    >
      <StandingsChips
        standings={state.players.map((player) => ({
          player,
          score: gameTotal(state.rounds, player.id),
        }))}
      />

      <section className="mx-auto flex max-w-lg flex-col gap-3 px-3 pb-4">
        {state.step === "beet" && <BeetStepView seatIndex={seatIndex} />}
        {state.step === "bonus" && <BonusStepView />}
        {state.step === "tier" && <TierStepView seatIndex={seatIndex} />}
      </section>
    </GameLayout>
  );
}
