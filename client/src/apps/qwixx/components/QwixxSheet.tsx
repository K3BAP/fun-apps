import type { CSSProperties } from "react";
import { readableInk } from "@/ui/ink";
import { ROW_HEX } from "../colors";
import {
  CELLS,
  MAX_PENALTIES,
  ROWS,
  ROW_LABEL,
  canUnmark,
  cellColor,
  cellNumber,
  cellState,
  countMarks,
  dirGlyph,
  isBlocked,
  rowScore,
  type Locks,
  type RowKey,
  type SeatSheet,
  type VariantKey,
} from "../rules";
import { t } from "../strings";

/** Setzt die Reihen- bzw. Zellenfarbe fuer die `row-*`-Utilities. */
function rowVar(hex: string): CSSProperties {
  return { "--row": hex } as CSSProperties;
}

function Cell({
  variant,
  rowKey,
  index,
  sheet,
  blocked,
  readOnly,
  onToggle,
}: {
  variant: VariantKey;
  rowKey: RowKey;
  index: number;
  sheet: SeatSheet;
  blocked: boolean;
  readOnly: boolean;
  onToggle: () => void;
}) {
  const state = cellState(sheet, rowKey, index, blocked);
  const number = cellNumber(variant, rowKey, index);
  const color = cellColor(variant, rowKey, index);
  const hex = ROW_HEX[color];

  // Ein gesetztes Kreuz laesst sich nur loesen, wenn es das rechteste ist.
  const clickable = !readOnly && (state === "available" || canUnmark(sheet, rowKey, index));
  const marked = state === "marked";

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onToggle}
      style={
        marked ? { ...rowVar(hex), backgroundColor: hex, color: readableInk(hex) } : rowVar(hex)
      }
      aria-label={`${ROW_LABEL[rowKey]} ${number}${color === rowKey ? "" : ` · ${ROW_LABEL[color]}`}`}
      aria-pressed={marked}
      className={`row-face grid aspect-square min-w-0 place-items-center rounded-md border-2 text-[0.7rem] font-bold tabular-nums transition sm:text-sm motion-safe:active:scale-90 ${
        marked ? "border-transparent" : ""
      } ${state === "skipped" ? "line-through opacity-40" : ""} ${
        state === "off" || state === "lockedOut" ? "opacity-40" : ""
      }`}
    >
      {number}
    </button>
  );
}

function LockCell({
  rowKey,
  sheet,
  closedByOther,
  manuallyClosed,
  readOnly,
  onToggle,
}: {
  rowKey: RowKey;
  sheet: SeatSheet;
  closedByOther: boolean;
  manuallyClosed: boolean;
  readOnly: boolean;
  onToggle: () => void;
}) {
  const mine = sheet.locked[rowKey];
  const hex = ROW_HEX[rowKey];
  const label = ROW_LABEL[rowKey];
  const shut = mine || manuallyClosed || closedByOther;

  const title = mine
    ? t.lockedByYou(label)
    : closedByOther
      ? t.lockedByOther(label)
      : manuallyClosed
        ? t.lockRowUndo(label)
        : t.lockRow(label);

  return (
    <button
      type="button"
      disabled={readOnly || mine || closedByOther}
      onClick={onToggle}
      title={title}
      aria-label={title}
      style={shut ? { ...rowVar(hex), backgroundColor: hex } : rowVar(hex)}
      className={`row-edge grid aspect-square min-w-0 place-items-center rounded-md border-2 text-[0.7rem] transition sm:text-sm motion-safe:active:scale-90 ${
        shut ? "border-transparent" : "border-dashed"
      }`}
    >
      🔒
    </button>
  );
}

/** Der Spielblock eines Spielers: vier Farbreihen, Schloesser, Fehlwuerfe. */
export function QwixxSheet({
  sheet,
  variant,
  closed,
  extClosed,
  hideScores,
  readOnly = false,
  onToggleCell,
  onToggleLock,
  onSetPenalty,
}: {
  sheet: SeatSheet;
  variant: VariantKey;
  /** Von irgendwem geschlossene Reihen. */
  closed: Locks;
  /** Von Hand gesetzte Schloesser. */
  extClosed: Locks;
  hideScores: boolean;
  /** Im Raum: fremde Bloecke sieht man, aber man schreibt nicht hinein. */
  readOnly?: boolean;
  onToggleCell: (row: RowKey, index: number) => void;
  onToggleLock: (row: RowKey) => void;
  onSetPenalty: (box: number) => void;
}) {
  const blockedLabels = ROWS.filter((row) => isBlocked(sheet, row.key, closed)).map(
    (row) => row.label,
  );

  return (
    // Der Block ist ein Blatt Papier, das auf dem Tisch liegt – wie in
    // Einrichtung und Ergebnis, wo schon immer eine Karte stand.
    <section className="card card-border bg-base-200 border-base-300 shadow-sm">
      <div className="card-body gap-2 p-2 sm:p-3">
        {ROWS.map((row) => {
          const blocked = isBlocked(sheet, row.key, closed);
          const shut = sheet.locked[row.key];
          const marks = sheet.marks[row.key];
          const hex = ROW_HEX[row.key];

          return (
            <div
              key={row.key}
              style={rowVar(hex)}
              className={`rounded-field row-tint flex items-center gap-1.5 border p-1 ${
                shut ? "ring-2 ring-inset" : ""
              } ${blocked ? "border-dashed opacity-70" : ""}`}
            >
              {/* Das Punkte-Badge: massive Reihenfarbe, wie auf dem gedruckten Block. */}
              <span
                className="flex w-9 shrink-0 flex-col items-center rounded-md py-1 leading-none sm:w-11"
                style={{ backgroundColor: hex, color: readableInk(hex) }}
              >
                <span className="text-[0.65rem] opacity-80">{dirGlyph(variant, row.key)}</span>
                <span className="text-sm font-bold tabular-nums">
                  {hideScores
                    ? t.marksCount(countMarks(marks))
                    : rowScore(marks, sheet.locked[row.key])}
                </span>
              </span>

              <div className="grid min-w-0 flex-1 grid-cols-12 gap-0.5 sm:gap-1">
                {Array.from({ length: CELLS }, (_, index) => (
                  <Cell
                    key={index}
                    variant={variant}
                    rowKey={row.key}
                    index={index}
                    sheet={sheet}
                    blocked={blocked}
                    readOnly={readOnly}
                    onToggle={() => onToggleCell(row.key, index)}
                  />
                ))}
                <LockCell
                  rowKey={row.key}
                  sheet={sheet}
                  closedByOther={blocked && !extClosed[row.key]}
                  manuallyClosed={extClosed[row.key]}
                  readOnly={readOnly}
                  onToggle={() => onToggleLock(row.key)}
                />
              </div>
            </div>
          );
        })}

        <div className="border-base-300 mt-1 flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-sm">{t.penalties}</span>
          <div className="flex gap-1.5">
            {Array.from({ length: MAX_PENALTIES }, (_, box) => (
              <button
                key={box}
                type="button"
                onClick={() => onSetPenalty(box)}
                disabled={readOnly}
                aria-pressed={box < sheet.penalties}
                aria-label={`Fehlwurf ${box + 1}`}
                className={`grid size-9 place-items-center rounded-md border-2 font-bold transition motion-safe:active:scale-90 ${
                  box < sheet.penalties
                    ? "border-error bg-error text-error-content"
                    : "border-base-300"
                }`}
              >
                ✕
              </button>
            ))}
          </div>
        </div>

        <p className="text-base-content/60 text-xs">
          {blockedLabels.length > 0 ? t.blockedRows(blockedLabels) : t.lockHint}
        </p>
      </div>
    </section>
  );
}
