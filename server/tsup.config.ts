import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  // Workspace-Pakete werden mit eingebacken – im Container gibt es keine
  // Symlinks zwischen den Workspaces.
  noExternal: [/^@fun\//],
});
