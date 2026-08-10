import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { APPS } from "./src/apps/manifests";

const INK = "#1c1a17";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Niemals von selbst neu laden: ein laufendes Spiel darf nicht unter den
      // Fingern verschwinden. Der neue Service Worker wartet, bis der Nutzer im
      // Hinweis auf „Neu laden“ tippt.
      registerType: "prompt",
      injectRegister: null,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Kein runtimeCaching: /api ist live-only und darf nie aus dem Cache kommen.
      },
      manifest: {
        name: "fun-apps",
        short_name: "fun-apps",
        description: "Kleine nützliche Web-Apps – Spielblöcke, die mitrechnen.",
        lang: "de",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: INK,
        theme_color: INK,
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        // Aus der Registry erzeugt – eine neue App bringt ihren Shortcut mit.
        // In der Praxis wertet das nur Android aus.
        shortcuts: APPS.map((app) => ({
          name: `${app.title} · ${app.subtitle}`,
          short_name: app.title,
          url: app.path,
          icons: [{ src: `/icons/${app.id}-192.png`, sizes: "192x192", type: "image/png" }],
        })),
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Der Server laeuft im Dev getrennt auf 3000; im Build liefert er dieselben
    // Pfade aus. Client-Code nutzt darum immer relative /api-Pfade.
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true, ws: true },
    },
  },
});
