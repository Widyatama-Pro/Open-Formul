import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ResolvedThemeMode, ThemeModeSetting, ThemePaletteId } from "../types";
import { syncAndroidSystemBars } from "./android-theme-bridge";
import { isThemePaletteId } from "./palettes";
import { syncPwaThemeMeta } from "./pwa-theme-sync";

export const THEME_STORAGE_KEYS = {
  id: "openformul-theme-id",
  mode: "openformul-theme-mode",
  amoled: "openformul-theme-amoled",
} as const;

const LEGACY_STORAGE_KEYS = {
  id: "app-theme-id",
  mode: "app-theme-mode",
  amoled: "app-theme-amoled",
} as const;

export interface UsePortableThemeOptions {
  readonly storageKeyId?: string;
  readonly storageKeyMode?: string;
  readonly storageKeyAmoled?: string;
  readonly defaultPalette?: ThemePaletteId;
  readonly defaultMode?: ThemeModeSetting;
  readonly defaultAmoled?: boolean;
  readonly syncPwa?: boolean;
  readonly syncAndroid?: boolean;
}

export interface PortableThemeState {
  readonly paletteId: ThemePaletteId;
  readonly modeSetting: ThemeModeSetting;
  readonly resolvedMode: ResolvedThemeMode;
  readonly amoledPureBlack: boolean;
  readonly setPaletteId: (id: ThemePaletteId) => void;
  readonly setModeSetting: (mode: ThemeModeSetting) => void;
  readonly setAmoledPureBlack: (enabled: boolean) => void;
  readonly toggleLightDark: () => void;
}

function readStoredValue(primaryKey: string, legacyKey?: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const val = window.localStorage.getItem(primaryKey);
    if (val !== null) return val;
    if (legacyKey) return window.localStorage.getItem(legacyKey);
    return null;
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or private-mode access errors
  }
}

function getSystemDarkPreference(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function applyThemeToDocument(
  paletteId: ThemePaletteId,
  resolvedMode: ResolvedThemeMode,
  amoledPureBlack: boolean,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", paletteId);
  root.setAttribute("data-mode", resolvedMode);
  root.classList.toggle("dark", resolvedMode === "dark");
  if (resolvedMode === "dark" && amoledPureBlack) {
    root.setAttribute("data-amoled", "true");
  } else {
    root.removeAttribute("data-amoled");
  }
}

export function usePortableTheme(options: UsePortableThemeOptions = {}): PortableThemeState {
  const {
    storageKeyId = THEME_STORAGE_KEYS.id,
    storageKeyMode = THEME_STORAGE_KEYS.mode,
    storageKeyAmoled = THEME_STORAGE_KEYS.amoled,
    defaultPalette = "original-default",
    defaultMode = "light",
    defaultAmoled = false,
    syncPwa = true,
    syncAndroid = true,
  } = options;

  const [paletteId, setPaletteIdState] = useState<ThemePaletteId>(() => {
    const saved = readStoredValue(storageKeyId, LEGACY_STORAGE_KEYS.id);
    return isThemePaletteId(saved) ? saved : defaultPalette;
  });

  const [modeSetting, setModeSettingState] = useState<ThemeModeSetting>(() => {
    const saved = readStoredValue(storageKeyMode, LEGACY_STORAGE_KEYS.mode);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return defaultMode;
  });

  const [amoledPureBlack, setAmoledState] = useState<boolean>(() => {
    const saved = readStoredValue(storageKeyAmoled, LEGACY_STORAGE_KEYS.amoled);
    if (saved === "true") return true;
    if (saved === "false") return false;
    return defaultAmoled;
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemDarkPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    return undefined;
  }, []);

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (modeSetting === "system") return systemPrefersDark ? "dark" : "light";
    return modeSetting;
  }, [modeSetting, systemPrefersDark]);

  useEffect(() => {
    applyThemeToDocument(paletteId, resolvedMode, amoledPureBlack);

    const raf =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame(() => {
            document.documentElement.classList.add("theme-transition-ready");
          })
        : null;

    const synced = syncPwa
      ? syncPwaThemeMeta({ paletteId, mode: resolvedMode, amoledPureBlack })
      : null;
    if (syncAndroid) {
      void syncAndroidSystemBars({
        paletteId,
        mode: resolvedMode,
        amoledPureBlack,
        ...(synced ? { resolvedCanvasHex: synced.canvasHex } : {}),
      });
    }

    return () => {
      if (
        raf !== null &&
        typeof window !== "undefined" &&
        typeof window.cancelAnimationFrame === "function"
      ) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [paletteId, resolvedMode, amoledPureBlack, syncPwa, syncAndroid]);

  const setPaletteId = useCallback(
    (id: ThemePaletteId) => {
      setPaletteIdState(id);
      writeStoredValue(storageKeyId, id);
    },
    [storageKeyId],
  );

  const setModeSetting = useCallback(
    (mode: ThemeModeSetting) => {
      setModeSettingState(mode);
      writeStoredValue(storageKeyMode, mode);
    },
    [storageKeyMode],
  );

  const setAmoledPureBlack = useCallback(
    (enabled: boolean) => {
      setAmoledState(enabled);
      writeStoredValue(storageKeyAmoled, String(enabled));
    },
    [storageKeyAmoled],
  );

  const toggleLightDark = useCallback(() => {
    const next: ResolvedThemeMode = resolvedMode === "light" ? "dark" : "light";
    setModeSetting(next);
  }, [resolvedMode, setModeSetting]);

  return {
    paletteId,
    modeSetting,
    resolvedMode,
    amoledPureBlack,
    setPaletteId,
    setModeSetting,
    setAmoledPureBlack,
    toggleLightDark,
  };
}

export const ThemeContext = createContext<PortableThemeState | null>(null);

const FALLBACK_THEME_STATE: PortableThemeState = {
  paletteId: "original-default",
  modeSetting: "light",
  resolvedMode: "light",
  amoledPureBlack: false,
  setPaletteId: () => {},
  setModeSetting: () => {},
  setAmoledPureBlack: () => {},
  toggleLightDark: () => {},
};

/**
 * Mengakses state tema aktif di mana pun dalam komponen.
 * Mengembalikan fallback aman apabila dipanggil di luar <ThemeProvider> (mis. pada unit test terisolasi).
 */
export function useTheme(): PortableThemeState {
  return useContext(ThemeContext) ?? FALLBACK_THEME_STATE;
}

export function useOptionalThemeContext(): PortableThemeState | null {
  return useContext(ThemeContext);
}
