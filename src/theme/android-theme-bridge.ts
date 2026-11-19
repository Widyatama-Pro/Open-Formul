/**
 * Portable Multi-Theme Design System — Android Capacitor & System Bar Bridge
 * Synchronizes @capacitor/status-bar and navigation bar styling automatically
 * based on active background luminance, with optional AMOLED pure-black override.
 */

import type { ResolvedThemeMode, ThemePaletteId } from "../types";
import { resolveActiveThemeColors } from "./pwa-theme-sync";

export type CapacitorBarStyle = "DARK" | "LIGHT" | "DEFAULT";

export interface AndroidThemeBridgeOptions {
  readonly paletteId?: ThemePaletteId;
  readonly mode?: ResolvedThemeMode;
  readonly amoledPureBlack?: boolean;
  readonly overlayWebView?: boolean;
  readonly resolvedCanvasHex?: string;
}

export interface AndroidSystemBarResult {
  readonly backgroundColor: string;
  readonly iconStyle: CapacitorBarStyle;
  readonly isDarkBackground: boolean;
  readonly luminance: number;
  readonly appliedToCapacitor: boolean;
}

interface CapacitorStatusBarPlugin {
  setBackgroundColor?: (opts: { color: string }) => Promise<void>;
  setStyle?: (opts: { style: string }) => Promise<void>;
  setOverlaysWebView?: (opts: { overlay: boolean }) => Promise<void>;
}

interface CapacitorNavBarPlugin {
  setNavigationBarColor?: (opts: { color: string; darkButtons?: boolean }) => Promise<void>;
  setColor?: (opts: { color: string; darkButtons?: boolean }) => Promise<void>;
}

interface CapacitorGlobal {
  readonly isNativePlatform?: () => boolean;
  readonly Plugins?: {
    readonly StatusBar?: CapacitorStatusBarPlugin;
    readonly NavigationBar?: CapacitorNavBarPlugin;
    readonly EdgeToEdge?: CapacitorNavBarPlugin;
  };
}

interface CapacitorWindow extends Window {
  readonly Capacitor?: CapacitorGlobal;
}

/**
 * Computes WCAG 2.1 relative luminance (0.0 = black, 1.0 = white) from a 6-digit hex color.
 */
export function computeRelativeLuminance(hexColor: string): number {
  const clean = hexColor.replace("#", "").trim();
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return 0.5;
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const toLinear = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Resolves Capacitor StatusBar Style:
 * - Note: In Capacitor @capacitor/status-bar, Style.Dark renders LIGHT (white) icons
 *   on dark backgrounds, while Style.Light renders DARK (black) icons on light backgrounds.
 */
export function resolveSystemBarAppearance(bgHex: string): {
  readonly iconStyle: CapacitorBarStyle;
  readonly isDarkBackground: boolean;
  readonly luminance: number;
} {
  const luminance = computeRelativeLuminance(bgHex);
  const isDarkBackground = luminance < 0.35;
  return {
    iconStyle: isDarkBackground ? "DARK" : "LIGHT",
    isDarkBackground,
    luminance: Number(luminance.toFixed(4)),
  };
}

/**
 * Applies the active theme background color & icon polarity to Android StatusBar & NavigationBar.
 * Safe to call in Web/PWA environments (degrades gracefully when Capacitor is absent).
 */
export async function syncAndroidSystemBars(
  options: AndroidThemeBridgeOptions = {},
): Promise<AndroidSystemBarResult> {
  let mode: ResolvedThemeMode;
  let canvasHex: string;
  if (options.resolvedCanvasHex !== undefined && options.mode !== undefined) {
    mode = options.mode;
    canvasHex = options.resolvedCanvasHex;
  } else {
    const resolved = resolveActiveThemeColors({
      ...(options.paletteId !== undefined ? { paletteId: options.paletteId } : {}),
      ...(options.mode !== undefined ? { mode: options.mode } : {}),
      ...(options.amoledPureBlack !== undefined
        ? { amoledPureBlack: options.amoledPureBlack }
        : {}),
    });
    mode = resolved.mode;
    canvasHex = resolved.canvasHex;
  }

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (mode === "dark" && options.amoledPureBlack) {
      root.setAttribute("data-amoled", "true");
    } else {
      root.removeAttribute("data-amoled");
    }
  }

  const bgColor = mode === "dark" && options.amoledPureBlack ? "#000000" : canvasHex;
  const { iconStyle, isDarkBackground, luminance } = resolveSystemBarAppearance(bgColor);
  let appliedToCapacitor = false;

  const capacitorObj =
    typeof window !== "undefined" ? (window as CapacitorWindow).Capacitor : undefined;

  try {
    const statusBarPlugin = capacitorObj?.Plugins?.StatusBar;
    if (statusBarPlugin) {
      if (typeof options.overlayWebView === "boolean" && statusBarPlugin.setOverlaysWebView) {
        await statusBarPlugin.setOverlaysWebView({ overlay: options.overlayWebView });
      }
      if (statusBarPlugin.setBackgroundColor) {
        await statusBarPlugin.setBackgroundColor({ color: bgColor });
      }
      if (statusBarPlugin.setStyle) {
        await statusBarPlugin.setStyle({ style: iconStyle });
      }
      appliedToCapacitor = true;
    }

    const navBarPlugin = capacitorObj?.Plugins?.NavigationBar ?? capacitorObj?.Plugins?.EdgeToEdge;
    if (navBarPlugin) {
      if (navBarPlugin.setNavigationBarColor) {
        await navBarPlugin.setNavigationBarColor({
          color: bgColor,
          darkButtons: !isDarkBackground,
        });
      } else if (navBarPlugin.setColor) {
        await navBarPlugin.setColor({
          color: bgColor,
          darkButtons: !isDarkBackground,
        });
      }
      appliedToCapacitor = true;
    }
  } catch {
    // Swallow native bridge errors when running in browser preview / non-Capacitor WebView
  }

  return {
    backgroundColor: bgColor,
    iconStyle,
    isDarkBackground,
    luminance,
    appliedToCapacitor,
  };
}
