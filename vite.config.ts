import { defineConfig } from "vitest/config";
import MillionLint from "@million/lint";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), MillionLint.vite(), wasm(), topLevelAwait()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  build: {
    target: 'esnext'
  }
});
