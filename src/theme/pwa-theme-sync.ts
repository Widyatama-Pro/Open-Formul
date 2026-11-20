/**
 * Portable Multi-Theme Design System — PWA Dynamic Meta & Manifest Sync
 * Updates <meta name="theme-color">, Apple iOS status bar style, and MS tile nav color
 * cleanly whenever any of the 14 theme variants or AMOLED override changes.
 */

import type { ResolvedThemeMode, ThemeModeSetting, ThemePaletteId } from "../types";

export type { ResolvedThemeMode, ThemeModeSetting, ThemePaletteId };

export interface PwaThemeSyncOptions {
  readonly paletteId?: ThemePaletteId;
  readonly mode?: ResolvedThemeMode;
  readonly amoledPureBlack?: boolean;
  readonly appName?: string;
  readonly shortName?: string;
}

interface PaletteCanvasPair {
  readonly light: { readonly canvas: string; readonly surface: string; readonly primary: string };
  readonly dark: { readonly canvas: string; readonly surface: string; readonly primary: string };
}

export const PALETTE_FALLBACK_HEX: Readonly<Record<ThemePaletteId, PaletteCanvasPair>> = {
  "original-default": {
    light: { canvas: "#F5F4EF", surface: "#E7EBE6", primary: "#142B27" },
    dark: { canvas: "#0F1A18", surface: "#172623", primary: "#3A6E5E" },
  },
  "prd-custom": {
    light: { canvas: "#F2F4F1", surface: "#E5E9E4", primary: "#1B3A32" },
    dark: { canvas: "#101615", surface: "#17201E", primary: "#3B7A68" },
  },
  "template-01": {
    light: { canvas: "#F7F7F5", surface: "#ECECE8", primary: "#111111" },
    dark: { canvas: "#111111", surface: "#1D1D1D", primary: "#F5F378" },
  },
  "template-02": {
    light: { canvas: "#FBFBFB", surface: "#EDEFF3", primary: "#242424" },
    dark: { canvas: "#18191D", surface: "#242424", primary: "#EAFB5D" },
  },
  "template-03": {
    light: { canvas: "#F8F7F4", surface: "#ECEAE4", primary: "#0E0F0B" },
    dark: { canvas: "#0E0F0B", surface: "#181A14", primary: "#FE813C" },
  },
  "template-04": {
    light: { canvas: "#EEFEFE", surface: "#E0F3F5", primary: "#202D41" },
    dark: { canvas: "#141B26", surface: "#202D41", primary: "#C8FF3C" },
  },
  "template-05": {
    light: { canvas: "#F3F6EC", surface: "#E4E9D5", primary: "#144425" },
    dark: { canvas: "#0B1F12", surface: "#144425", primary: "#D3FA53" },
  },
};

function isValidPaletteKey(value: string | null | undefined): value is ThemePaletteId {
  return value !== null && value !== undefined && Object.hasOwn(PALETTE_FALLBACK_HEX, value);
}

function upsertMetaTag(name: string, content: string, media?: string): void {
  if (typeof document === "undefined") return;
  const selector = media
    ? `meta[name="${name}"][media="${media}"]`
    : `meta[name="${name}"]:not([media])`;
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    if (media) meta.media = media;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function resolveActiveThemeColors(options: PwaThemeSyncOptions = {}): {
  readonly paletteId: ThemePaletteId;
  readonly mode: ResolvedThemeMode;
  readonly canvasHex: string;
  readonly surfaceHex: string;
  readonly primaryHex: string;
} {
  const rootEl = typeof document !== "undefined" ? document.documentElement : null;
  const paletteAttr = options.paletteId ?? rootEl?.getAttribute("data-theme");
  const paletteId: ThemePaletteId = isValidPaletteKey(paletteAttr)
    ? paletteAttr
    : "original-default";

  const modeAttr = options.mode ?? rootEl?.getAttribute("data-mode");
  const mode: ResolvedThemeMode = modeAttr === "dark" ? "dark" : "light";
  const amoled = options.amoledPureBlack ?? rootEl?.getAttribute("data-amoled") === "true";

  const fallback = PALETTE_FALLBACK_HEX[paletteId][mode];
  let computedStyle: CSSStyleDeclaration | null = null;
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      computedStyle = window.getComputedStyle(document.documentElement);
    } catch {
      computedStyle = null;
    }
  }
  const readVar = (name: string): string => computedStyle?.getPropertyValue(name).trim() ?? "";

  let canvasHex = readVar("--bg-canvas") || fallback.canvas;
  const surfaceHex = readVar("--bg-surface") || fallback.surface;
  const primaryHex = readVar("--color-primary") || fallback.primary;

  if (mode === "dark" && amoled) {
    canvasHex = "#000000";
  }

  return { paletteId, mode, canvasHex, surfaceHex, primaryHex };
}

/**
 * Synchronizes PWA browser chrome & iOS/Android WebView status meta tags with --bg-canvas.
 */
export function syncPwaThemeMeta(options: PwaThemeSyncOptions = {}): {
  readonly canvasHex: string;
  readonly mode: ResolvedThemeMode;
} {
  const { mode, canvasHex } = resolveActiveThemeColors(options);
  if (typeof document === "undefined") {
    return { canvasHex, mode };
  }

  upsertMetaTag("theme-color", canvasHex);
  upsertMetaTag("theme-color", canvasHex, "(prefers-color-scheme: light)");
  upsertMetaTag("theme-color", canvasHex, "(prefers-color-scheme: dark)");

  upsertMetaTag(
    "apple-mobile-web-app-status-bar-style",
    mode === "dark" ? "black-translucent" : "default",
  );
  upsertMetaTag("msapplication-navbutton-color", canvasHex);

  return { canvasHex, mode };
}

let activeBlobManifestUrl: string | null = null;

/**
 * Generates a dynamic Blob URL manifest reflecting the active theme_color
 * and background_color at runtime while resolving icon URLs relative to the active base.
 */
export function updateDynamicManifestLink(options: PwaThemeSyncOptions = {}): void {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const { canvasHex } = resolveActiveThemeColors(options);
  const manifestLink = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifestLink) return;

  const baseHref = typeof window !== "undefined" ? window.location.href : "https://localhost/";
  const resolveAsset = (path: string): string => {
    try {
      return new URL(path, baseHref).toString();
    } catch {
      return path;
    }
  };

  const dynamicManifest = {
    name: options.appName ?? "OpenFormul",
    short_name: options.shortName ?? "OpenFormul",
    start_url: resolveAsset("./?source=pwa"),
    scope: resolveAsset("./"),
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    theme_color: canvasHex,
    background_color: canvasHex,
    icons: [
      {
        src: resolveAsset("pwa-192x192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: resolveAsset("pwa-512x512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  if (activeBlobManifestUrl) {
    URL.revokeObjectURL(activeBlobManifestUrl);
  }
  const blob = new Blob([JSON.stringify(dynamicManifest)], {
    type: "application/manifest+json",
  });
  activeBlobManifestUrl = URL.createObjectURL(blob);
  manifestLink.href = activeBlobManifestUrl;
}
