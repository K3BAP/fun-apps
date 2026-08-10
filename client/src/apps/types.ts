import type { ThemePair } from "@/theme/themes";

export type AppId = "kniffel" | "wizard" | "beet" | "qwixx";

/**
 * Der Steckbrief einer Unter-App.
 *
 * Bewusst frei von React: Landing-Page, Router und der Generator fuer die
 * PWA-Shortcuts importieren alle vier Manifeste, sollen dabei aber keinen
 * Spielcode mitziehen.
 */
export type AppManifest = {
  readonly id: AppId;
  readonly path: `/${string}`;
  readonly title: string;
  /** Zusatz in der Kachel, z. B. "Spielblock" */
  readonly subtitle: string;
  readonly emoji: string;
  readonly description: string;
  readonly themes: ThemePair;
  readonly players: { readonly min: number; readonly max: number };
  /** Ist fuer diese App der Mehrgeraete-Modus vorgesehen? */
  readonly multiplayer: boolean;
};
