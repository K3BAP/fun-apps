import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { APPS } from "./manifests";
import type { AppId, AppManifest } from "./types";

export { APPS };

/**
 * Die Ansicht je Unter-App, nachgeladen pro Route.
 *
 * Der Typ ist vollstaendig (kein `Partial`): eine App, die in `manifests.ts`
 * steht, aber hier fehlt, faellt beim Uebersetzen auf – nicht erst im Browser.
 */
export const APP_VIEWS: Record<AppId, LazyExoticComponent<ComponentType>> = {
  kniffel: lazy(() => import("./kniffel/KniffelApp")),
  wizard: lazy(() => import("./wizard/WizardApp")),
  beet: lazy(() => import("./beet/BeetApp")),
  qwixx: lazy(() => import("./qwixx/QwixxApp")),
};

export function manifestFor(id: AppId): AppManifest {
  const found = APPS.find((app) => app.id === id);
  if (!found) throw new Error(`Unbekannte App: ${id}`);
  return found;
}
