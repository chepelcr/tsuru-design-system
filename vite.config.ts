import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The demo page (tokens, components and the full avatar matrix) for QA.
export default defineConfig({
  root: "demo",
  plugins: [react()],
  build: { outDir: "../dist-demo", emptyOutDir: true },
});
