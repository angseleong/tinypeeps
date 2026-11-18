import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// The layout from AGENTS.md: Electron in src/desktop, the window in src/app. Output names stay the
// defaults (out/main, out/preload, out/renderer), which src/desktop/main.ts loads.
export default defineConfig({
  main: { build: { rollupOptions: { input: { index: resolve("src/desktop/main.ts") } } } },
  preload: { build: { rollupOptions: { input: { index: resolve("src/desktop/preload.ts") } } } },
  renderer: {
    root: "src/app",
    build: { rollupOptions: { input: { index: resolve("src/app/index.html") } } },
    plugins: [react(), tailwindcss()],
  },
});
