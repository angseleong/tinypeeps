import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Throwaway: serves this folder, with ../../assets as the public folder (/characters/Knight.glb, ...).
export default defineConfig({
  root: import.meta.dirname,
  publicDir: "../../assets",
  plugins: [react()],
  server: { port: 5199, strictPort: true },
});
