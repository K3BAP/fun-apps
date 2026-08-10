import { rankBy } from "@/game/rank";
import { Ranking, type RankingEntry } from "@/ui/Ranking";
import { ResultHeader } from "@/ui/ResultHeader";
import { ROW_HEX } from "../colors";
import {
  PENALTY_POINTS,
  ROWS,
  ROW_KEYS,
  countMarks,
  dirGlyph,
  rowScore,
  sheetScore,
  variantInfo,
} from "../rules";
import { ShareButton } from "@/ui/ShareButton";
import { qwixxGame, sheetOf, useQwixx } from "../state";
import { t } from "../strings";

function variantSuffix(badge: string | null): string {
  return badge ? ` · ${badge}` : "";
}

function ResumeButton() {
  const { store } = useQwixx();
  return (
    <button
      type="button"
      className="btn btn-ghost"
      title={t.resumeHint}
      onClick={() => store.dispatch({ type: "resume" })}
    >
      {t.resume}
    </button>
  );
}

/** Einzelmodus: persoenliche Ergebnis-Karte statt Rangliste. */
function SoloResult() {
  const { store } = useQwixx();
  const { state } = store;
  const player = state.players[0];
  if (!player) return null;

  const sheet = sheetOf(state, player.id);
  const total = sheetScore(sheet);
  const suffix = variantSuffix(variantInfo(state.variant).badge);

  return (
    <>
      <ResultHeader
        emoji="🌈"
        title={t.resultSoloTitle}
        subtitle={t.resultSoloSubtitle(player.name, total, suffix)}
      />

      <ol className="flex flex-col gap-2">
        {ROWS.map((row) => {
          const locked = sheet.locked[row.key];
          return (
            <li
              key={row.key}
              style={{ borderInlineStartColor: ROW_HEX[row.key] }}
              className="bg-base-200 flex items-center gap-3 rounded-lg border-s-4 px-3 py-2"
            >
              <span className="w-6 text-center" style={{ color: ROW_HEX[row.key] }}>
                {dirGlyph(state.variant, row.key)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="font-semibold">
                  {row.label}
                  {locked && " 🔒"}
                </span>
                <span className="text-base-content/60 text-sm">
                  {t.marks(countMarks(sheet.marks[row.key]))}
                  {locked && t.lockBonus}
                </span>
              </span>
              <span className="text-lg font-bold tabular-nums">
                {rowScore(sheet.marks[row.key], locked)}
              </span>
            </li>
          );
        })}

        {sheet.penalties > 0 && (
          <li className="bg-base-200 border-error flex items-center gap-3 rounded-lg border-s-4 px-3 py-2">
            <span className="text-error w-6 text-center">✕</span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="font-semibold">{t.penalties}</span>
              <span className="text-base-content/60 text-sm">
                {sheet.penalties} × −{PENALTY_POINTS}
              </span>
            </span>
            <span className="text-lg font-bold tabular-nums">
              −{sheet.penalties * PENALTY_POINTS}
            </span>
          </li>
        )}

        <li className="bg-base-300 flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="w-6 text-center">Σ</span>
          <span className="min-w-0 flex-1 font-semibold">{t.total}</span>
          <span className="text-xl font-bold tabular-nums">{total}</span>
        </li>
      </ol>
    </>
  );
}

function SharedResult() {
  const { store } = useQwixx();
  const { state } = store;

  const ranked = rankBy(state.players, (player) => sheetScore(sheetOf(state, player.id)));
  const winner = ranked[0];
  const suffix = variantSuffix(variantInfo(state.variant).badge);

  const entries: RankingEntry[] = ranked.map((entry) => {
    const sheet = sheetOf(state, entry.item.id);
    const closedCount = ROW_KEYS.filter((key) => sheet.locked[key]).length;
    return {
      ...entry,
      detail: `${t.closedRows(closedCount)} · ${t.penaltyCount(sheet.penalties)}`,
    };
  });

  return (
    <>
      <ResultHeader
        emoji="🌈"
        title={t.finalTitle}
        subtitle={winner ? t.winner(winner.item.name, winner.score, suffix) : ""}
      />
      <Ranking entries={entries} />
    </>
  );
}

export function Result({ onShowOverview }: { onShowOverview: () => void }) {
  const { store } = useQwixx();
  const solo = store.state.mode === "solo";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-8 safe-bottom">
      {solo ? <SoloResult /> : <SharedResult />}

      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-ghost" onClick={onShowOverview}>
          {t.showOverview}
        </button>
        <ShareButton summary={qwixxGame.summarize!(store.state)} />
        <ResumeButton />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => store.dispatch({ type: "playAgain" })}
        >
          {solo ? t.againSolo : t.againShared}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => store.dispatch({ type: "backToSetup" })}
        >
          {solo ? t.backToStart : t.newGame}
        </button>
      </div>
    </div>
  );
}
