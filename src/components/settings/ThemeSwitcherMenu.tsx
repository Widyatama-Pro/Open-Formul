import { memo, useCallback } from "react";
import { Check, Monitor, Moon, Palette, Smartphone, Sun } from "lucide-react";
import { pickLang } from "../../i18n";
import {
  OPENFORMUL_PALETTE_CATALOG,
  getPaletteLabel,
  getPaletteSubtitle,
  useOptionalThemeContext,
  usePortableTheme,
  type PaletteDescriptor,
  type PortableThemeState,
  type UsePortableThemeOptions,
} from "../../theme";
import type { AppLanguage, ResolvedThemeMode, ThemeModeSetting, ThemePaletteId } from "../../types";
import { cn } from "../../utils/cn";

export interface ThemeChangePayload {
  readonly paletteId: ThemePaletteId;
  readonly modeSetting: ThemeModeSetting;
  readonly resolvedMode: ResolvedThemeMode;
  readonly amoledPureBlack: boolean;
}

export interface ThemeSwitcherMenuProps {
  readonly language?: AppLanguage;
  readonly palettes?: readonly PaletteDescriptor[];
  readonly storageNamespace?: UsePortableThemeOptions;
  readonly showAmoledToggle?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
  readonly onThemeChange?: (state: ThemeChangePayload) => void;
}

interface ThemeSwitcherMenuViewProps extends ThemeSwitcherMenuProps {
  readonly theme: PortableThemeState;
}

function ThemeSwitcherMenuView({
  language = "id",
  palettes = OPENFORMUL_PALETTE_CATALOG,
  showAmoledToggle = true,
  compact = false,
  className = "",
  onThemeChange,
  theme,
}: ThemeSwitcherMenuViewProps) {
  const {
    paletteId,
    modeSetting,
    resolvedMode,
    amoledPureBlack,
    setPaletteId,
    setModeSetting,
    setAmoledPureBlack,
  } = theme;

  const resolveModeForSetting = useCallback(
    (setting: ThemeModeSetting): ResolvedThemeMode => {
      if (setting === "light" || setting === "dark") return setting;
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        try {
          return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        } catch {
          return resolvedMode;
        }
      }
      return resolvedMode;
    },
    [resolvedMode],
  );

  const handleSelectMode = (nextMode: ThemeModeSetting) => {
    setModeSetting(nextMode);
    onThemeChange?.({
      paletteId,
      modeSetting: nextMode,
      resolvedMode: resolveModeForSetting(nextMode),
      amoledPureBlack,
    });
  };

  const handleSelectPalette = (nextId: ThemePaletteId) => {
    setPaletteId(nextId);
    onThemeChange?.({
      paletteId: nextId,
      modeSetting,
      resolvedMode,
      amoledPureBlack,
    });
  };

  const handleToggleAmoled = () => {
    const nextAmoled = !amoledPureBlack;
    setAmoledPureBlack(nextAmoled);
    onThemeChange?.({
      paletteId,
      modeSetting,
      resolvedMode,
      amoledPureBlack: nextAmoled,
    });
  };

  const activePaletteMeta =
    palettes.find((p) => p.id === paletteId) ?? palettes[0] ?? OPENFORMUL_PALETTE_CATALOG[0]!;

  const modeOptions: ReadonlyArray<{
    readonly value: ThemeModeSetting;
    readonly label: string;
    readonly icon: typeof Sun;
  }> = [
    { value: "light", label: pickLang(language, "Terang", "Light"), icon: Sun },
    { value: "dark", label: pickLang(language, "Gelap", "Dark"), icon: Moon },
    { value: "system", label: pickLang(language, "Sistem", "System"), icon: Monitor },
  ];

  return (
    <section
      className={cn("flex flex-col gap-4", compact ? "p-3.5" : "p-4 sm:p-5", className)}
      aria-label={pickLang(language, "Tema dan Palet Warna", "Theme and Color Palette Switcher")}
    >
      {/* Header + Mode Segmented Switch (Terang / Gelap / Sistem) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="neu-pressed inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-primary)]"
          >
            <Palette className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              {pickLang(language, "Tema & Palet Warna", "Theme & Color Palette")}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {pickLang(
                language,
                `7 Palet × Terang / Gelap · Aktif: ${getPaletteLabel(activePaletteMeta, language)} (${resolvedMode === "dark" ? "Gelap" : "Terang"})`,
                `7 Palettes × Light / Dark · Active: ${getPaletteLabel(activePaletteMeta, language)} (${resolvedMode === "dark" ? "Dark" : "Light"})`,
              )}
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label={pickLang(language, "Mode tampilan warna", "Color Mode")}
          className="neu-pressed inline-flex gap-1 rounded-xl p-1"
        >
          {modeOptions.map((opt) => {
            const active = modeSetting === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                data-theme-control="mode"
                data-mode-value={opt.value}
                onClick={() => handleSelectMode(opt.value)}
                className={cn(
                  "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] md:min-h-8 motion-reduce:transform-none",
                  active
                    ? "border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] font-bold text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                    : "border border-transparent font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact 7-Palette Swatch Pills */}
      <div className="space-y-2.5">
        <div
          role="radiogroup"
          aria-label={pickLang(language, "Pilihan palet warna", "Color Palette")}
          className="flex flex-wrap gap-2"
        >
          {palettes.map((palette) => {
            const isSelected = palette.id === paletteId;
            const activeSwatches =
              resolvedMode === "dark" ? palette.darkSwatches : palette.swatches;

            return (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-theme-control="palette"
                data-palette-id={palette.id}
                onClick={() => handleSelectPalette(palette.id)}
                className={cn(
                  "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
                  isSelected
                    ? "border-[1.5px] border-[var(--color-accent)] bg-[var(--bg-surface-elevated)] shadow-[var(--shadow-neu-pressed)]"
                    : "neu-button border border-transparent",
                )}
              >
                <span className="flex -space-x-1.5" aria-hidden="true">
                  {activeSwatches.slice(0, 4).map((hex, idx) => (
                    <span
                      key={`${palette.id}-sw-${idx}`}
                      title={hex}
                      className="inline-block h-4 w-4 rounded-full ring-2 ring-[var(--bg-surface-elevated)]"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
                <span className="text-xs font-semibold whitespace-nowrap text-[var(--text-primary)]">
                  {getPaletteLabel(palette, language)}
                </span>
                {isSelected && (
                  <Check
                    className="h-3 w-3 shrink-0 text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="neu-well flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-[11px]">
          <span className="font-semibold text-[var(--text-primary)]">
            {getPaletteLabel(activePaletteMeta, language)}
          </span>
          <span className="text-[var(--text-muted)]">
            {getPaletteSubtitle(activePaletteMeta, language)}
          </span>
        </div>
      </div>

      {/* Optional AMOLED Pure-Black Dark Mode Toggle */}
      {showAmoledToggle && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
          <div className="flex max-w-md items-start gap-2.5">
            <Smartphone
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary)]"
              aria-hidden="true"
            />
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                {pickLang(
                  language,
                  "Android OLED Hitam Pekat (#000000)",
                  "Android OLED Pure Black (#000000)",
                )}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {pickLang(
                  language,
                  "Menghemat baterai & mencegah color banding di layar AMOLED saat Mode Gelap aktif.",
                  "Eliminates dark grey power draw & color banding on AMOLED screens when Dark mode is active.",
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={amoledPureBlack}
            aria-label={pickLang(
              language,
              "Aktifkan Android OLED Hitam Pekat",
              "Enable Android OLED Pure Black",
            )}
            data-theme-control="amoled"
            onClick={handleToggleAmoled}
            className={cn(
              "inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border-subtle)] p-1 shadow-[var(--shadow-neu-pressed)] transition-[background-color,transform] duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
              amoledPureBlack
                ? "justify-end bg-[var(--color-primary)]"
                : "justify-start bg-[var(--bg-sunken)]",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 rounded-full transition-colors",
                amoledPureBlack ? "bg-[var(--text-on-primary)]" : "bg-[var(--text-muted)]",
              )}
            />
          </button>
        </div>
      )}
    </section>
  );
}

function StandaloneThemeSwitcherMenu(props: ThemeSwitcherMenuProps) {
  const localTheme = usePortableTheme(props.storageNamespace);
  return <ThemeSwitcherMenuView {...props} theme={localTheme} />;
}

export const ThemeSwitcherMenu = memo(function ThemeSwitcherMenu(props: ThemeSwitcherMenuProps) {
  const ctx = useOptionalThemeContext();
  if (ctx !== null && !props.storageNamespace) {
    return <ThemeSwitcherMenuView {...props} theme={ctx} />;
  }
  return <StandaloneThemeSwitcherMenu {...props} />;
});

export default ThemeSwitcherMenu;
