import { Link } from "react-router-dom";
import { ShellScope } from "@/theme/ThemeProvider";

export default function NotFound() {
  return (
    <ShellScope>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl" aria-hidden="true">
          🤷
        </div>
        <h1 className="text-2xl font-bold">Hier ist nichts</h1>
        <p className="text-base-content/70">Diese Seite gibt es nicht (mehr).</p>
        <Link to="/" className="btn btn-primary">
          Zur Übersicht
        </Link>
      </div>
    </ShellScope>
  );
}
