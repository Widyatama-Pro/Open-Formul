import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

function normalizeBasePath(rawBase: string | undefined): string {
  const trimmed = rawBase?.trim() ?? "";
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const isNativeShell = mode === "native" || env["VITE_NATIVE_SHELL"] === "true";
  const basePath = isNativeShell ? "/" : normalizeBasePath(env["VITE_BASE_PATH"]);

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      ...(!isNativeShell
        ? [
            VitePWA({
              registerType: "autoUpdate",
              injectRegister: "auto",
              includeAssets: [
                "logo.png",
                "apple-touch-icon.png",
                "pwa-192x192.png",
                "pwa-512x512.png",
              ],
              manifest: {
                id: "./",
                name: "OpenFormu",
                short_name: "OpenFormu",
                description:
                  "Aplikasi PWA offline-first lintas platform (Desktop & Mobile) untuk formulasi pakan ternak presisi berbasis Linear Programming (HiGHS WASM).",
                theme_color: "#F5F4EF",
                background_color: "#F5F4EF",
                display: "standalone",
                display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
                orientation: "any",
                categories: ["productivity", "utilities", "education"],
                lang: "id",
                start_url: "./",
                scope: "./",
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
                globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,wasm,woff2}"],
                navigateFallback: "index.html",
              },
            }),
          ]
        : []),
    ],
    worker: {
      format: "es",
    },
  };
});
