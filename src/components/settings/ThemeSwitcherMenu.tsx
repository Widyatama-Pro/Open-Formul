import { memo, useCallback, useRef, type KeyboardEvent, type TouchEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Moon,
  Palette,
  Smartphone,
  Sparkles,
  Sun,
} from "lucide-react";
import { pickLang } from "../../i18n";
import {
  OPENFORMU_PALETTE_CATALOG,
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
import { Switch } from "../ui/Switch";

export interface ThemeChangePayload {
  readonly paletteId: ThemePaletteId;
  readonly modeSetting: ThemeModeSetting;
  readonly resolvedMode: ResolvedThemeMode;
  readonly amoledPureBlack: boolean;
  readonly uiEnhancer?: boolean;
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
  palettes = OPENFORMU_PALETTE_CATALOG,
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
    uiEnhancer,
    setPaletteId,
    setModeSetting,
    setAmoledPureBlack,
    setUiEnhancer,
  } = theme;

  const touchStartXRef = useRef<number | null>(null);

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

  const handleSelectPalette = useCallback(
    (nextId: ThemePaletteId) => {
      setPaletteId(nextId);
      onThemeChange?.({
        paletteId: nextId,
        modeSetting,
        resolvedMode,
        amoledPureBlack,
      });
    },
    [amoledPureBlack, modeSetting, onThemeChange, resolvedMode, setPaletteId],
  );

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

  const handleToggleEnhancer = (nextEnhancer: boolean) => {
    setUiEnhancer(nextEnhancer);
    onThemeChange?.({
      paletteId,
      modeSetting,
      resolvedMode,
      amoledPureBlack,
      uiEnhancer: nextEnhancer,
    });
  };

  const activeIdxRaw = palettes.findIndex((p) => p.id === paletteId);
  const activeIdx = activeIdxRaw >= 0 ? activeIdxRaw : 0;
  const activePaletteMeta = palettes[activeIdx] ?? palettes[0] ?? OPENFORMU_PALETTE_CATALOG[0]!;
  const activeSwatches =
    resolvedMode === "dark" ? activePaletteMeta.darkSwatches : activePaletteMeta.swatches;

  const stepPalette = useCallback(
    (delta: -1 | 1) => {
      if (palettes.length <= 1) return;
      const nextIdx = (activeIdx + delta + palettes.length) % palettes.length;
      const nextPalette = palettes[nextIdx];
      if (nextPalette) {
        handleSelectPalette(nextPalette.id);
      }
    },
    [activeIdx, handleSelectPalette, palettes],
  );

  const handleStepperKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepPalette(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepPalette(1);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartXRef.current = null;
    if (startX === null || endX === undefined) return;
    const dx = endX - startX;
    if (Math.abs(dx) >= 36) {
      stepPalette(dx > 0 ? -1 : 1);
    }
  };

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
                `${palettes.length} Palet × Terang / Gelap · ${getPaletteLabel(activePaletteMeta, language)} (${resolvedMode === "dark" ? "Gelap" : "Terang"})`,
                `${palettes.length} Palettes × Light / Dark · ${getPaletteLabel(activePaletteMeta, language)} (${resolvedMode === "dark" ? "Dark" : "Light"})`,
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

      {/* Pemilih Tema Tunggal dengan Tombol Geser Kiri / Kanan */}
      <div className="space-y-2.5">
        <div
          role="group"
          aria-label={pickLang(language, "Pilihan palet warna", "Color Palette")}
          tabIndex={0}
          onKeyDown={handleStepperKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="acrylic-subcard flex items-center gap-2 rounded-2xl p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <button
            type="button"
            data-theme-control="palette-prev"
            aria-label={pickLang(language, "Tema sebelumnya", "Previous theme")}
            onClick={() => stepPalette(-1)}
            className="neu-pill-btn inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[var(--text-primary)] active:scale-95 motion-reduce:transform-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            data-theme-control="palette-current"
            data-palette-id={activePaletteMeta.id}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 px-1.5 py-1"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                {activeSwatches.slice(0, 4).map((hex, idx) => (
                  <span
                    key={`${activePaletteMeta.id}-sw-${idx}`}
                    title={hex}
                    className="inline-block h-5 w-5 rounded-full ring-2 ring-[var(--bg-surface-elevated)]"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                  {getPaletteLabel(activePaletteMeta, language)}
                </p>
                <p className="truncate text-[11px] text-[var(--text-muted)]">
                  {getPaletteSubtitle(activePaletteMeta, language)}
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--text-secondary)]">
              {activeIdx + 1} / {palettes.length}
            </span>
          </div>

          <button
            type="button"
            data-theme-control="palette-next"
            aria-label={pickLang(language, "Tema berikutnya", "Next theme")}
            onClick={() => stepPalette(1)}
            className="neu-pill-btn inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[var(--text-primary)] active:scale-95 motion-reduce:transform-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Titik indikator posisi palet */}
        <div
          role="group"
          aria-label={pickLang(
            language,
            "Indikator posisi palet warna",
            "Palette position indicators",
          )}
          className="flex items-center justify-center gap-1.5"
        >
          {palettes.map((palette, idx) => (
            <button
              key={palette.id}
              type="button"
              tabIndex={-1}
              data-theme-control="palette"
              data-palette-id={palette.id}
              aria-label={getPaletteLabel(palette, language)}
              aria-pressed={idx === activeIdx}
              onClick={() => handleSelectPalette(palette.id)}
              className={cn(
                "h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-200",
                idx === activeIdx
                  ? "w-5 bg-[var(--color-primary)]"
                  : "w-1.5 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]",
              )}
            />
          ))}
        </div>

        {/* Sakelar ringkas UI Enhancer */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 transition-[border-color,box-shadow,background-color] duration-200",
            uiEnhancer
              ? "border-[var(--status-success-border)] bg-[var(--status-success-soft)] shadow-[0_6px_22px_-6px_var(--glow-primary-soft,rgba(16,185,129,0.22))]"
              : "border-[var(--border-subtle)] bg-[var(--bg-sunken)]",
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/40 shadow-sm"
              style={{
                backgroundColor: activePaletteMeta.enhancerAccentHex,
                color: "#ffffff",
                boxShadow: uiEnhancer
                  ? `0 0 14px ${activePaletteMeta.enhancerAccentHex}75`
                  : undefined,
              }}
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="truncate text-xs font-bold text-[var(--text-primary)]">
              UI Enhancer
            </span>
          </div>

          <Switch checked={uiEnhancer} onCheckedChange={handleToggleEnhancer} label="UI Enhancer" />
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
