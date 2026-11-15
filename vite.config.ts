import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Open Formul — Formulasi Pakan Ternak Presisi",
        short_name: "Open Formul",
        description:
          "Aplikasi PWA offline-first untuk formulasi pakan ternak presisi berbasis optimasi Linear Programming (HiGHS WASM).",
        theme_color: "#0E5E6F",
        background_color: "#DCEEF5",
        display: "standalone",
        lang: "id",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  worker: {
    format: "es",
  },
});
