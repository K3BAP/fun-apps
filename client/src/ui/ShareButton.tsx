import { useGame } from "@/game/context";
import type { GameSummary } from "@/game/types";
import { medal } from "@/game/rank";
import { useShare } from "@/hooks/useShare";

/** Endstand als Text – so, wie man ihn in eine Gruppe schickt. */
function summaryText(title: string, emoji: string, summary: GameSummary): string {
  const date = new Date().toLocaleDateString("de-DE");
  const lines = summary.standings.map(
    (entry, index) => `${medal(index + 1)} ${entry.name} · ${entry.score}`,
  );
  return [`${emoji} ${title} · ${date}`, ...lines, summary.note, "fun.sponholz.org"]
    .filter(Boolean)
    .join("\n");
}

export function ShareButton({ summary }: { summary: GameSummary }) {
  const { manifest } = useGame();
  const { share, result } = useShare();

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => void share(summaryText(manifest.title, manifest.emoji, summary))}
    >
      {result === "copied"
        ? "✓ In die Zwischenablage kopiert"
        : result === "failed"
          ? "Teilen hat nicht geklappt"
          : "📤 Ergebnis teilen"}
    </button>
  );
}
