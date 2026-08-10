import { Link } from "react-router-dom";
import { APPS } from "@/apps/registry";
import { useTheme } from "@/theme/context";
import { ShellScope } from "@/theme/ThemeProvider";
import { accentColor } from "@/theme/themes";
import { ColorModeToggle } from "@/ui/ColorModeToggle";
import { ArrowRightIcon, DevicesIcon } from "@/ui/icons";

export default function Home() {
  return (
    <ShellScope>
      <Tiles />
    </ShellScope>
  );
}

/**
 * Eigene Komponente, weil sie das Farbschema braucht – und `useTheme` erst
 * innerhalb von `ShellScope` etwas Sinnvolles liefert.
 */
function Tiles() {
  const { scheme } = useTheme();

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 safe-top safe-bottom">
      <header className="flex flex-col items-center gap-3 pt-8 text-center">
        <div className="text-5xl" aria-hidden="true">
          🎲
        </div>
        <h1 className="text-4xl font-bold tracking-tight">fun&#8209;apps</h1>
        <p className="text-base-content/70 max-w-md text-balance">
          Kleine nützliche Web-Apps – Spielblöcke, die mitrechnen. Offline nutzbar, ohne Anmeldung.
        </p>
        <ColorModeToggle className="mt-2" />
      </header>

      <nav aria-label="Apps" className="grid gap-3 sm:grid-cols-2">
        {APPS.map((app) => (
          <div
            key={app.id}
            className="card card-border bg-base-200 border-base-300 overflow-hidden shadow-sm"
          >
            <Link
              to={app.path}
              className="focus-visible:outline-primary group focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
              <div className="card-body flex-row items-start gap-4 p-4">
                {/*
                Die Kacheln liegen alle im Shell-Theme und sahen deshalb gleich
                aus. Das farbige Emoji-Feld zeigt, welche Farbe einen drinnen
                erwartet – es ist die Akzentfarbe der App.
              */}
                <span
                  className="rounded-box grid size-12 shrink-0 place-items-center text-2xl"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${accentColor(app.accent, scheme)} 32%, transparent)`,
                  }}
                  aria-hidden="true"
                >
                  {app.emoji}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold">{app.title}</span>
                    <span className="text-base-content/50 text-xs">{app.subtitle}</span>
                  </span>
                  <span className="text-base-content/70 text-sm">{app.description}</span>
                </span>
                <ArrowRightIcon className="text-base-content/30 group-hover:text-base-content/60 mt-3 size-5 shrink-0 transition-colors" />
              </div>
            </Link>

            {/*
              Der zweite Weg in dieselbe App: jeder auf seinem eigenen Gerät.
              Er steht hier vorne und nicht mehr im ⋯-Menü einer schon
              laufenden Partie – online zu spielen ist eine Entscheidung, die
              man am Anfang trifft.
            */}
            {app.multiplayer && (
              <Link
                to={`${app.path}?online=1`}
                className="border-base-300 hover:bg-base-300/60 focus-visible:outline-primary text-base-content/70 hover:text-base-content flex items-center justify-center gap-2 border-t px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <DevicesIcon className="size-4" />
                Online-Multiplayer
              </Link>
            )}
          </div>
        ))}
      </nav>

      <footer className="text-base-content/50 mt-auto py-6 text-center text-xs">
        Ein Sammelprojekt · fun.sponholz.org
      </footer>
    </div>
  );
}
