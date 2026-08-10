import { Link } from "react-router-dom";
import { APPS } from "@/apps/registry";
import { ShellScope } from "@/theme/ThemeProvider";
import { ColorModeToggle } from "@/ui/ColorModeToggle";

export default function Home() {
  return (
    <ShellScope>
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 safe-top safe-bottom">
        <header className="flex flex-col items-center gap-3 pt-8 text-center">
          <div className="text-5xl" aria-hidden="true">
            🎲
          </div>
          <h1 className="text-4xl font-bold tracking-tight">fun&#8209;apps</h1>
          <p className="text-base-content/70 max-w-md text-balance">
            Kleine nützliche Web-Apps – Spielblöcke, die mitrechnen. Offline nutzbar, ohne
            Anmeldung.
          </p>
          <ColorModeToggle className="mt-2" />
        </header>

        <nav aria-label="Apps" className="grid gap-3 sm:grid-cols-2">
          {APPS.map((app) => (
            <Link
              key={app.id}
              to={app.path}
              className="card card-border bg-base-200 border-base-300 hover:border-primary/60 focus-visible:outline-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <div className="card-body flex-row items-center gap-4 p-4">
                <span className="text-3xl leading-none" aria-hidden="true">
                  {app.emoji}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold">{app.title}</span>
                    <span className="text-base-content/50 text-xs">{app.subtitle}</span>
                  </span>
                  <span className="text-base-content/70 text-sm">{app.description}</span>
                </span>
                <span className="text-base-content/40 ml-auto text-xl" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </nav>

        <footer className="text-base-content/50 mt-auto py-6 text-center text-xs">
          Ein Sammelprojekt · fun.sponholz.org
        </footer>
      </div>
    </ShellScope>
  );
}
