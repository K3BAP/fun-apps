import type { Player } from "@/game/players";
import {
  BONUS_POINTS,
  BONUS_THRESHOLD,
  LOWER,
  UPPER,
  bonus,
  grandTotal,
  lowerSum,
  upperSum,
  upperTotal,
  type CatKey,
  type Category,
  type Sheet,
} from "../rules";
import { STICKY_COL, STICKY_HEAD } from "@/ui/PlayerTable";
import { t } from "../strings";

// Dieselben Bausteine wie in `PlayerTable`, damit die dichte Kniffel-Tabelle
// nicht anders klebt als die Uebersichten der anderen Spiele.
const CAT_COL = `${STICKY_COL} z-10 min-w-36 sm:min-w-44`;
const CELL = "border-base-300 border-b px-2 py-1.5 text-center tabular-nums";

function CategoryLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="flex flex-col text-start leading-tight">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-base-content/50 text-xs">{hint}</span>
    </span>
  );
}

function SectionRow({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <th
        colSpan={span}
        className="bg-base-200 border-base-300 sticky start-0 border-y px-2 py-1 text-start text-xs font-semibold tracking-wide uppercase"
      >
        {label}
      </th>
    </tr>
  );
}

function CalcRow({
  label,
  sheets,
  compute,
  emphasis,
}: {
  label: string;
  sheets: readonly Sheet[];
  compute: (sheet: Sheet) => number;
  emphasis?: "sum" | "grand";
}) {
  const weight = emphasis === "grand" ? "text-base font-bold" : "font-semibold";
  return (
    <tr className={emphasis === "grand" ? "bg-base-200" : "bg-base-200/50"}>
      <th className={`${CAT_COL} ${CELL} text-start text-sm ${weight}`}>{label}</th>
      {sheets.map((sheet, index) => (
        <td key={index} className={`${CELL} ${weight}`}>
          {compute(sheet)}
        </td>
      ))}
    </tr>
  );
}

function BonusRow({ sheets }: { sheets: readonly Sheet[] }) {
  return (
    <tr className="bg-base-200/50">
      <th className={`${CAT_COL} ${CELL} text-start`}>
        <CategoryLabel label={t.bonus} hint={`ab ${BONUS_THRESHOLD} → +${BONUS_POINTS}`} />
      </th>
      {sheets.map((sheet, index) => (
        <td key={index} className={CELL}>
          {bonus(sheet) > 0 ? (
            <span className="text-success font-semibold">+{BONUS_POINTS}</span>
          ) : (
            <span className="text-base-content/60 text-sm">
              <b className="text-base-content">{upperSum(sheet)}</b>/{BONUS_THRESHOLD}
            </span>
          )}
        </td>
      ))}
    </tr>
  );
}

function ValueCell({
  value,
  active,
  editable,
  onClick,
  label,
}: {
  value: number | undefined;
  active: boolean;
  editable: boolean;
  onClick: () => void;
  label: string;
}) {
  const empty = value === undefined;
  const struck = value === 0;
  const text = empty ? (editable ? "+" : "") : struck ? "—" : value;

  return (
    <td className={`${CELL} p-0 ${active ? "bg-primary/5" : ""}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={!editable}
        aria-label={label}
        className={`min-h-11 w-full px-2 py-1.5 text-center ${
          empty ? "text-base-content/25" : struck ? "text-base-content/40" : "font-semibold"
        }`}
      >
        {text}
      </button>
    </td>
  );
}

/**
 * Der Block: links die Kategorien (klebend), je Spieler eine Spalte. Bei vielen
 * Spielern scrollt die Tabelle waagerecht, die Kategoriespalte bleibt stehen.
 */
export function ScoreTable({
  players,
  sheets,
  activeIdx,
  editableIndex,
  onPick,
}: {
  players: readonly Player[];
  sheets: readonly Sheet[];
  activeIdx: number;
  /** `null` = alle Spalten bearbeitbar (ohne Raum). Sonst nur die eigene. */
  editableIndex: number | null;
  onPick: (player: Player, cat: Category) => void;
}) {
  const span = players.length + 1;

  const catRows = (cats: readonly Category[]) =>
    cats.map((cat) => (
      <tr key={cat.key}>
        <th className={`${CAT_COL} ${CELL} text-start font-normal`}>
          <CategoryLabel label={cat.label} hint={cat.hint} />
        </th>
        {players.map((player, index) => (
          <ValueCell
            key={player.id}
            value={sheets[index]?.[cat.key as CatKey]}
            active={index === activeIdx}
            editable={editableIndex === null || editableIndex === index}
            label={`${cat.label}, ${player.name}`}
            onClick={() => onPick(player, cat)}
          />
        ))}
      </tr>
    ));

  return (
    // Auf dem Handy fuellt die Tabelle den Bildschirm (`min-w-full`), ab Tablet
    // steht sie in ihrer natuerlichen Breite zentriert (`sm:min-w-0 mx-auto`).
    // Sonst zerrt eine Partie zu zweit dreizehn Zeilen ueber den ganzen Monitor.
    <table className="mx-auto w-max min-w-full border-separate border-spacing-0 text-sm sm:min-w-0">
      <thead>
        <tr>
          <th
            className={`${CAT_COL} ${STICKY_HEAD} border-base-300 z-20 border-b px-2 py-2 text-start text-xs font-semibold`}
          >
            {t.category}
          </th>
          {players.map((player, index) => (
            <th
              key={player.id}
              style={{ borderBottomColor: player.color }}
              className={`${STICKY_HEAD} min-w-20 border-b-2 px-2 py-2 sm:min-w-24 ${
                index === activeIdx ? "bg-primary/5" : ""
              }`}
            >
              <span className="block truncate text-sm font-semibold">{player.name}</span>
              <span className="block text-lg font-bold tabular-nums">
                {grandTotal(sheets[index] ?? {})}
              </span>
              {index === activeIdx && (
                <span className="text-primary block text-[0.65rem] tracking-wide uppercase">
                  {t.turn}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        <SectionRow label={t.upperBlock} span={span} />
        {catRows(UPPER)}
        <CalcRow label={t.subtotal} sheets={sheets} compute={upperSum} emphasis="sum" />
        <BonusRow sheets={sheets} />
        <CalcRow label={t.upperBlock} sheets={sheets} compute={upperTotal} emphasis="sum" />

        <SectionRow label={t.lowerBlock} span={span} />
        {catRows(LOWER)}
        <CalcRow label={t.lowerBlock} sheets={sheets} compute={lowerSum} emphasis="sum" />
        <CalcRow label={t.grandTotal} sheets={sheets} compute={grandTotal} emphasis="grand" />
      </tbody>
    </table>
  );
}
