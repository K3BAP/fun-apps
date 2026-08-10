import type { ComponentType, LazyExoticComponent } from "react";
import type { AppId, AppManifest } from "./types";
import kniffel from "./kniffel/manifest";
import wizard from "./wizard/manifest";
import beet from "./beet/manifest";
import qwixx from "./qwixx/manifest";

/**
 * Die eine Stelle, an der Unter-Apps registriert werden.
 *
 * Routen, die Kacheln der Landing-Page und die Shortcuts im PWA-Manifest werden
 * hieraus erzeugt – eine neue App braucht einen Ordner und einen Eintrag hier,
 * sonst nichts.
 */
export const APPS: readonly AppManifest[] = [kniffel, wizard, beet, qwixx];

/**
 * Die tatsaechlichen Ansichten, nachgeladen pro Route. Fehlt eine App hier, ist
 * sie noch nicht portiert und die Route zeigt einen Platzhalter.
 */
export const APP_VIEWS: Partial<Record<AppId, LazyExoticComponent<ComponentType>>> = {};

export function manifestFor(id: AppId): AppManifest {
  const found = APPS.find((app) => app.id === id);
  if (!found) throw new Error(`Unbekannte App: ${id}`);
  return found;
}
