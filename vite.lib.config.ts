import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The library bundle: ESM only, React stays a peer dependency. Styles ship as
// plain CSS files (copied by scripts/copy-assets.mjs), never injected by JS.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    lib: { entry: "src/index.ts", formats: ["es"], fileName: () => "index.js" },
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
  },
});
