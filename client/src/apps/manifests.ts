import type { AppManifest } from "./types";
import kniffel from "./kniffel/manifest";
import wizard from "./wizard/manifest";
import beet from "./beet/manifest";
import qwixx from "./qwixx/manifest";

/**
 * Die Steckbriefe aller Unter-Apps – ohne React.
 *
 * Bewusst getrennt von `registry.ts`: diese Datei wird auch von
 * `vite.config.ts` importiert, um die Shortcuts im PWA-Manifest zu erzeugen.
 * Dort darf kein React-Code mit hineingezogen werden, und der `@/`-Alias steht
 * noch nicht zur Verfuegung – deshalb sind alle Importe hier relativ.
 */
export const APPS: readonly AppManifest[] = [kniffel, wizard, beet, qwixx];
