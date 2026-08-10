import { defineConfig } from "vitest/config";

/**
 * Nur reine Logik wird getestet: die Regel-Module der Spiele und (spaeter) die
 * Raum-Logik des Servers. Deshalb `environment: "node"` – kein jsdom, keine
 * Komponententests.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "client",
          root: "./client",
          environment: "node",
          include: ["src/**/*.test.ts"],
          passWithNoTests: true,
        },
      },
    ],
  },
});
