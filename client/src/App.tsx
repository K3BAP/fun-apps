import { Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { APPS, APP_VIEWS } from "@/apps/registry";
import { UpdateToast } from "@/pwa/UpdateToast";
import { RoomProvider } from "@/sync/RoomProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import Home from "@/pages/Home";
import Join from "@/pages/Join";
import NotFound from "@/pages/NotFound";

/** Kurzer Moment beim Nachladen einer App – bewusst unauffaellig. */
function RouteFallback() {
  return (
    <div className="bg-base-100 flex min-h-dvh items-center justify-center">
      <span className="loading loading-dots loading-lg text-base-content/40" />
    </div>
  );
}

/**
 * Der Raum liegt ueber dem Router, nicht in der einzelnen App.
 *
 * Der Weg Lobby -> Spiel ist ein Wechsel der Ansicht, kein Wechsel des Raums:
 * laege die Verbindung eine Ebene tiefer, risse sie beim Start des Spiels ab
 * und muesste sich neu aufbauen.
 */
export default function App() {
  return (
    <ThemeProvider>
      <RoomProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/beitreten/:code" element={<Join />} />
              {APPS.map((app) => {
                const View = APP_VIEWS[app.id];
                return <Route key={app.id} path={`${app.path}/*`} element={<View />} />;
              })}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <UpdateToast />
        </BrowserRouter>
      </RoomProvider>
    </ThemeProvider>
  );
}
