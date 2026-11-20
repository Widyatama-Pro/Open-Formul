import { memo, useState } from "react";
import {
  AlertTriangle,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Gauge,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import type { PwaStatus } from "../../hooks/use-pwa-status";
import { pickLang } from "../../i18n";
import type { StorageStats } from "../../storage";
import { useOptionalThemeContext } from "../../theme";
import type {
  Basis,
  FormulationConfig,
  MotionEngineMode,
  RenderingEngineMode,
  TableViewTier,
  UserPreferences,
} from "../../types";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
import { Input } from "../ui/Input";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { Switch } from "../ui/Switch";
import { ThemedSelect } from "../ui/ThemedSelect";
import { TrakteerSupportButton } from "../ui/TrakteerSupportButton";
import { ThemeSwitcherMenu, type ThemeChangePayload } from "./ThemeSwitcherMenu";

export const GITHUB_REPO_URL = "https://github.com/Widyatama-Pro/OpenFormul";
export const GITHUB_RELEASES_URL = "https://github.com/Widyatama-Pro/OpenFormul/releases";

export interface SettingsPageProps {
  readonly preferences: UserPreferences;
  readonly onUpdate: (patch: Partial<UserPreferences>) => void;
  readonly config?: FormulationConfig;
  readonly onToggleAdvance?: (enabled: boolean) => void;
  readonly onToggleShowNdf?: (enabled: boolean) => void;
  readonly onToggleShowBetn?: (enabled: boolean) => void;
  readonly onSetDecimalPlaces?: (decimals: 0 | 1 | 2) => void;
  readonly onSetTableViewTier?: (tier: TableViewTier) => void;
  readonly onSetGlobalZeroInclusion?: (enabled: boolean, minPct?: number) => void;
  readonly onOpenPrecisionDialog?: () => void;
  readonly storageStats?: StorageStats;
  readonly storageWarnings?: readonly string[];
  readonly pwaStatus?: PwaStatus;
  readonly onExportAllBackup?: () => void;
  readonly onResetSampleData?: () => Promise<void> | void;
  readonly onClearAllUserData?: () => Promise<void> | void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

type SettingsSectionTab = "basic" | "advanced";

export const SettingsPage = memo(function SettingsPage({
  preferences,
  onUpdate,
  config,
  onToggleAdvance,
  onToggleShowNdf,
  onToggleShowBetn,
  onSetDecimalPlaces,
  onSetTableViewTier,
  onSetGlobalZeroInclusion,
  onOpenPrecisionDialog,
  storageStats,
  storageWarnings = [],
  pwaStatus,
  onExportAllBackup,
  onResetSampleData,
  onClearAllUserData,
}: SettingsPageProps) {
  const [settingsTab, setSettingsTab] = useState<SettingsSectionTab>("basic");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"reset" | "clear" | null>(null);
  const themeCtx = useOptionalThemeContext();

  const lang = preferences.language;
  const activeTier: TableViewTier =
    preferences.tableViewTier ?? (config?.enableAdvanceNutrients ? "advanced" : "basic");
  const isAdvanceMode = config ? config.enableAdvanceNutrients : activeTier === "advanced";
  const isNdfEnabled = config ? config.showNdf === true || config.enableAdvanceNutrients : false;
  const isBetnEnabled = config?.showBetn === true;
  const decimalPlaces: 0 | 1 | 2 = preferences.decimalPlaces ?? 0;
  const isNutrientAbbreviated: boolean = preferences.simpleMode ?? true;
  const amoledEnabled = themeCtx?.amoledPureBlack ?? Boolean(preferences.amoledPureBlack);
  const antiNolEnabled = config ? config.globalZeroInclusion.enforceNonZero : true;
  const antiNolMinPct =
    config?.globalZeroInclusion.minIfSelected ?? preferences.zeroInclusionDefaultPct ?? 1;

  const activePrecisionCount = config
    ? (config.fractionalObjective ? 1 : 0) +
      (config.enableStochasticSlp ? 1 : 0) +
      ((config.enzymes?.length ?? 0) > 0 ? 1 : 0)
    : 0;

  const handleSetTier = (tier: TableViewTier) => {
    if (onSetTableViewTier) {
      onSetTableViewTier(tier);
      return;
    }
    const advance = tier === "advanced";
    onUpdate({ tableViewTier: tier });
    onToggleAdvance?.(advance);
  };

  const handleSetDecimalPlaces = (next: 0 | 1 | 2) => {
    if (onSetDecimalPlaces) {
      onSetDecimalPlaces(next);
    } else {
      onUpdate({ decimalPlaces: next });
    }
  };

  const handleToggleAmoled = (checked: boolean) => {
    themeCtx?.setAmoledPureBlack(checked);
    onUpdate({ amoledPureBlack: checked });
  };

  const handleThemeChange = (next: ThemeChangePayload) => {
    onUpdate({
      theme: next.resolvedMode,
      themePalette: next.paletteId,
      themeModeSetting: next.modeSetting,
      amoledPureBlack: next.amoledPureBlack,
      ...(next.uiEnhancer !== undefined ? { uiEnhancer: next.uiEnhancer } : {}),
    });
  };

  const activeEngineMode: RenderingEngineMode =
    themeCtx?.renderingEngine ?? preferences.renderingEngine ?? "ultra";
  const activeMotionEngine: MotionEngineMode =
    themeCtx?.motionEngine ?? preferences.motionEngine ?? "gpu_flip";
  const glassBlurPx = themeCtx?.glassBlurPx ?? preferences.glassBlurPx ?? 20;
  const glowIntensityPct = themeCtx?.glowIntensityPct ?? preferences.glowIntensityPct ?? 100;

  const handleSelectEngineMode = (mode: RenderingEngineMode) => {
    themeCtx?.setRenderingEngine(mode);
    onUpdate({
      renderingEngine: mode,
      ...(mode === "ultra" ? { glassBlurPx: 20 } : mode === "balanced" ? { glassBlurPx: 12 } : {}),
    });
  };

  const handleSelectMotionEngine = (mode: MotionEngineMode) => {
    themeCtx?.setMotionEngine(mode);
    onUpdate({ motionEngine: mode });
  };

  const handleChangeBlurPx = (px: number) => {
    themeCtx?.setGlassBlurPx(px);
    onUpdate({ glassBlurPx: px });
  };

  const handleChangeGlowPct = (pct: number) => {
    themeCtx?.setGlowIntensityPct(pct);
    onUpdate({ glowIntensityPct: pct });
  };

  const handleResetSamples = async () => {
    if (!onResetSampleData) return;
    setBusyAction("reset");
    try {
      await onResetSampleData();
      setActionNotice(
        pickLang(
          lang,
          "Katalog bahan, standar kebutuhan, dan konfigurasi awal dipulihkan (resep tersimpan Anda tetap aman).",
          "Default feed catalog, requirement standards, and initial config restored (your saved recipes stay safe).",
        ),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmClearAll = async () => {
    if (!onClearAllUserData) return;
    setBusyAction("clear");
    try {
      await onClearAllUserData();
      setConfirmClearOpen(false);
      setActionNotice(
        pickLang(
          lang,
          "Seluruh data lokal dibersihkan dan dikembalikan ke kondisi awal.",
          "All local data cleared and restored to initial defaults.",
        ),
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <GlossySquircleIcon
          tone="petrol"
          size="md"
          icon={<SlidersHorizontal className="h-5 w-5" />}
        />
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            {pickLang(lang, "Pengaturan Aplikasi", "Application Settings")}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {pickLang(
              lang,
              "Terbagi menjadi Pengaturan Dasar (harian) dan Pengaturan Lanjutan (formulasi presisi & data).",
              "Organized into Basic Settings (daily use) and Advanced Settings (precision formulation & data).",
            )}
          </p>
        </div>
      </div>

      <SegmentedTabs
        value={settingsTab}
        onChange={setSettingsTab}
        ariaLabel={pickLang(lang, "Kategori Pengaturan", "Settings Categories")}
        options={[
          {
            value: "basic",
            label: pickLang(lang, "Pengaturan Dasar", "Basic Settings"),
          },
          {
            value: "advanced",
            label: pickLang(lang, "Pengaturan Lanjutan", "Advanced Settings"),
            badge: activePrecisionCount > 0 ? activePrecisionCount : undefined,
          },
        ]}
      />

      {settingsTab === "basic" ? (
        <div className="space-y-5">
          {/* Kartu 1: Preferensi Umum & Tampilan Angka */}
          <Card interactive={false} className="divide-y divide-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Bahasa Antarmuka", "Interface Language")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Bahasa Indonesia / English</p>
              </div>
              <div className="w-44">
                <ThemedSelect
                  ariaLabel={pickLang(lang, "Pilih bahasa", "Select language")}
                  modalTitle={pickLang(lang, "Pilih Bahasa Antarmuka", "Select Interface Language")}
                  value={preferences.language}
                  language={lang}
                  popoverMinWidthPx={190}
                  onChange={(val) => onUpdate({ language: val as "id" | "en" })}
                  options={[
                    { value: "id", label: "Bahasa Indonesia" },
                    { value: "en", label: "English" },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Desimal Tampilan Angka", "Display Decimal Places")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Mengatur tampilan % makro & hasil racikan. Angka mikro (<2%) seperti Ca, P, dan Asam Amino tetap menjaga 2 desimal.",
                    "Controls macro % and formula display decimals. Micro values (<2%) such as Ca, P, and amino acids preserve 2 decimals.",
                  )}
                </p>
              </div>
              <div className="w-56">
                <ThemedSelect
                  ariaLabel={pickLang(lang, "Desimal Tampilan Angka", "Display Decimal Places")}
                  modalTitle={pickLang(lang, "Desimal Tampilan Angka", "Display Decimal Places")}
                  value={String(decimalPlaces)}
                  language={lang}
                  popoverMinWidthPx={260}
                  onChange={(val) => handleSetDecimalPlaces(Number(val) as 0 | 1 | 2)}
                  options={[
                    {
                      value: "0",
                      label: pickLang(
                        lang,
                        "0 desimal (Bulat, contoh 18%)",
                        "0 decimals (Integer, e.g. 18%)",
                      ),
                    },
                    {
                      value: "1",
                      label: pickLang(
                        lang,
                        "1 desimal (xx,0 — contoh 18,5%)",
                        "1 decimal (xx.0 — e.g. 18.5%)",
                      ),
                    },
                    {
                      value: "2",
                      label: pickLang(
                        lang,
                        "2 desimal (xx,00 — contoh 18,50%)",
                        "2 decimals (xx.00 — e.g. 18.50%)",
                      ),
                    },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {pickLang(
                      lang,
                      "Singkatan Nama Nutrien (PK, EM, LK, SK)",
                      "Abbreviate Nutrient Names (CP, ME, EE, CF)",
                    )}
                  </p>
                  <Badge tone={isNutrientAbbreviated ? "emerald" : "sky"}>
                    {isNutrientAbbreviated
                      ? pickLang(lang, "Disingkat (Default)", "Abbreviated (Default)")
                      : pickLang(lang, "Nama Lengkap", "Full Names")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Aktif (Default): menampilkan singkatan ringkas (PK, EM, LK, SK). Matikan untuk menampilkan nama lengkap (Protein Kasar, Energi Metabolis, Lemak Kasar, Serat Kasar).",
                    "On (Default): displays compact abbreviations (CP, ME, EE, CF). Turn off to show full names (Crude Protein, Metabolizable Energy, Ether Extract, Crude Fiber).",
                  )}
                </p>
              </div>
              <Switch
                checked={isNutrientAbbreviated}
                onCheckedChange={(checked) => onUpdate({ simpleMode: checked })}
                label={pickLang(
                  lang,
                  "Gunakan Singkatan Nama Nutrien (PK, EM, LK, SK)",
                  "Use Abbreviated Nutrient Names (CP, ME, EE, CF)",
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Basis Perhitungan Default", "Default Calculation Basis")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "As-Fed (unggas) atau Bahan Kering / BK (ruminansia)",
                    "As-Fed (poultry) or Dry Matter / DM (ruminants)",
                  )}
                </p>
              </div>
              <div className="w-48">
                <ThemedSelect
                  ariaLabel={pickLang(lang, "Basis default", "Default basis")}
                  modalTitle={pickLang(
                    lang,
                    "Basis Perhitungan Default",
                    "Default Calculation Basis",
                  )}
                  value={preferences.defaultBasis}
                  language={lang}
                  popoverMinWidthPx={210}
                  onChange={(val) => onUpdate({ defaultBasis: val as Basis })}
                  options={[
                    { value: "as_fed", label: "As-Fed" },
                    {
                      value: "dry_matter",
                      label: pickLang(lang, "Bahan Kering (BK)", "Dry Matter (DM)"),
                    },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Ukuran Batch Adukan Default (kg)", "Default Batch Size (kg)")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Dipakai otomatis saat memulai formulasi baru",
                    "Applied automatically when starting a new formulation",
                  )}
                </p>
              </div>
              <Input
                numeric
                type="number"
                min={1}
                value={preferences.defaultBatchKg}
                onChange={(e) =>
                  onUpdate({ defaultBatchKg: Math.max(1, Number(e.target.value) || 100) })
                }
                className="w-32"
              />
            </div>
          </Card>

          {/* Kartu 2: Tema & Palet Warna (UI Enhancer 7 Palet) */}
          <Card interactive={false} className="overflow-hidden">
            <ThemeSwitcherMenu
              language={lang}
              showAmoledToggle={false}
              compact
              onThemeChange={handleThemeChange}
            />
          </Card>

          {/* Kartu 3: Rendering & Motion Engine (120 FPS Zero-Hardcut) */}
          <Card interactive={false} className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <GlossySquircleIcon tone="mint" size="sm" icon={<Gauge className="h-4 w-4" />} />
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    {pickLang(lang, "Rendering & Motion Engine", "Rendering & Motion Engine")}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Pilih profil grafis kaca akrilik, mesin animasi 120 FPS anti-hardcut, serta intensitas blur dan pendaran cahaya.",
                      "Select acrylic glass graphics profile, 120 FPS anti-hardcut motion engine, and blur/glow intensity.",
                    )}
                  </p>
                </div>
              </div>
              <Badge tone="emerald">
                <Zap className="h-3 w-3" />
                <span>{activeMotionEngine === "gpu_flip" ? "120 FPS GPU FLIP" : "CSS Native"}</span>
              </Badge>
            </div>

            {/* 3 Profil Rendering Engine */}
            <div
              role="radiogroup"
              aria-label={pickLang(lang, "Profil Rendering Engine", "Rendering Engine Profile")}
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
            >
              {(
                [
                  {
                    id: "ultra",
                    titleId: "Mode 1 · Ultra Glass",
                    titleEn: "Mode 1 · Ultra Glass",
                    descId:
                      "Blur 20px, saturasi 165%, volumetric glow penuh & 120 FPS FLIP Physics (Default).",
                    descEn:
                      "20px blur, 165% saturation, full volumetric glow & 120 FPS FLIP Physics (Default).",
                  },
                  {
                    id: "balanced",
                    titleId: "Mode 2 · Balanced Acrylic",
                    titleEn: "Mode 2 · Balanced Acrylic",
                    descId: "Blur menengah 12px dengan specular rim light & transisi hemat daya.",
                    descEn: "Medium 12px blur with specular rim light & battery-friendly motion.",
                  },
                  {
                    id: "crisp",
                    titleId: "Mode 3 · Crisp Native",
                    titleEn: "Mode 3 · Crisp Native",
                    descId:
                      "Transparansi ringan tanpa shader blur berat untuk perangkat spesifikasi rendah.",
                    descEn:
                      "Lightweight crisp translucency without heavy shader blur for low-GPU devices.",
                  },
                ] as const
              ).map((profile) => {
                const selected = activeEngineMode === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-engine-control={profile.id}
                    onClick={() => handleSelectEngineMode(profile.id)}
                    className={cn(
                      "flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none",
                      selected
                        ? "border-[var(--status-success)] bg-[var(--status-success-soft)] shadow-[0_6px_18px_-6px_var(--glow-success-pill,rgba(16,185,129,0.28))]"
                        : "acrylic-subcard",
                    )}
                  >
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {pickLang(lang, profile.titleId, profile.titleEn)}
                    </span>
                    <span className="mt-1 text-[11px] leading-snug text-[var(--text-secondary)]">
                      {pickLang(lang, profile.descId, profile.descEn)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Animation & Layout Engine */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  {pickLang(lang, "Animation & Layout Engine", "Animation & Layout Engine")}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Mencegah kedipan & lompatan tata letak saat berganti bahasa, tab, atau panel target.",
                    "Eliminates flicker and layout jumps when switching languages, tabs, or panels.",
                  )}
                </p>
              </div>
              <div
                role="radiogroup"
                aria-label={pickLang(lang, "Pilih Animation Engine", "Select Animation Engine")}
                className="neu-pressed inline-flex rounded-xl p-1"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={activeMotionEngine === "gpu_flip"}
                  onClick={() => handleSelectMotionEngine("gpu_flip")}
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    activeMotionEngine === "gpu_flip"
                      ? "bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {pickLang(lang, "GPU FLIP 120 FPS", "GPU FLIP 120 FPS")}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={activeMotionEngine === "css_native"}
                  onClick={() => handleSelectMotionEngine("css_native")}
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    activeMotionEngine === "css_native"
                      ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {pickLang(lang, "CSS Native / Reduced", "CSS Native / Reduced")}
                </button>
              </div>
            </div>

            {/* Sliders Blur & Glow */}
            <div className="grid grid-cols-1 gap-4 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {pickLang(lang, "Intensitas Blur Kaca", "Glass Blur Intensity")}
                  </span>
                  <span className="font-bold tabular-nums text-[var(--status-success)]">
                    {glassBlurPx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={1}
                  value={glassBlurPx}
                  aria-label={pickLang(lang, "Intensitas Blur Kaca", "Glass Blur Intensity")}
                  onChange={(e) => handleChangeBlurPx(Number(e.target.value))}
                  className="w-full cursor-pointer accent-[var(--color-primary)]"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                    <span>{pickLang(lang, "Intensitas Glow", "Volumetric Glow")}</span>
                  </span>
                  <span className="font-bold tabular-nums text-[var(--status-success)]">
                    {glowIntensityPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={5}
                  value={glowIntensityPct}
                  aria-label={pickLang(lang, "Intensitas Glow", "Volumetric Glow")}
                  onChange={(e) => handleChangeGlowPct(Number(e.target.value))}
                  className="w-full cursor-pointer accent-[var(--color-primary)]"
                />
              </label>
            </div>
          </Card>

          {/* Kartu 4: Pembaruan Aplikasi & Repositori GitHub */}
          <Card interactive={false} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <GlossySquircleIcon tone="sky" size="sm" icon={<RefreshCw className="h-4 w-4" />} />
                <div className="max-w-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">
                      {pickLang(
                        lang,
                        "Cek Pembaruan Aplikasi & Repositori",
                        "Check App Updates & Repository",
                      )}
                    </h2>
                    <Badge tone="neutral">GitHub Releases</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Periksa apakah tersedia versi pembaruan (update) terbaru, catatan rilis, dan kode sumber resmi OpenFormul di repositori GitHub.",
                      "Check for the latest application updates, release notes, and official OpenFormul source code on GitHub.",
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pwaStatus?.needRefresh && pwaStatus.applyUpdate && (
                  <Button variant="primary" size="sm" onClick={pwaStatus.applyUpdate}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{pickLang(lang, "Pasang Update Sekarang", "Apply Update Now")}</span>
                  </Button>
                )}
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={pickLang(
                    lang,
                    "Cek update aplikasi terbaru di repositori GitHub",
                    "Check latest app updates on GitHub repository",
                  )}
                  className="neu-cta-btn inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-[transform,filter] duration-150 hover:brightness-105 active:scale-[0.97] motion-reduce:transform-none"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>
                    {pickLang(lang, "Cek Update di Repo GitHub", "Check Updates on GitHub")}
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-85" />
                </a>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neu-pill-btn inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none"
                >
                  <span>{pickLang(lang, "Buka Repo", "Open Repo")}</span>
                  <ExternalLink className="h-3 w-3 text-[var(--text-muted)]" />
                </a>
              </div>
            </div>
          </Card>

          {/* Kartu 5: Dukungan Kreator via Trakteer & Tentang Aplikasi */}
          <TrakteerSupportButton variant="settings" language={lang} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Kartu 3: Mode Formulasi & Opsi Lanjutan */}
          <Card interactive={false} className="divide-y divide-[var(--border-subtle)]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="max-w-md">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {pickLang(
                      lang,
                      "Tier Kolom & Mode Formulasi",
                      "Column Tier & Formulation Mode",
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Dasar menyembunyikan BK & batas Min/Max agar ringkas; Standar menampilkan BK/Min/Max/Ca/P; Mode Lanjutan membuka asam amino, NDF, dan elektrolit.",
                      "Basic hides DM & Min/Max for a clean grid; Standard shows DM/Min/Max/Ca/P; Advanced Mode opens amino acids, NDF, and electrolytes.",
                    )}
                  </p>
                </div>
                <div
                  role="group"
                  aria-label={pickLang(
                    lang,
                    "Pilih Tier Kolom Dasar, Standar, atau Mode Lanjutan",
                    "Select Basic, Standard, or Advanced Column Tier",
                  )}
                  className="neu-pressed inline-flex rounded-lg p-0.5"
                >
                  {(
                    [
                      { id: "basic", idLabel: "Dasar", enLabel: "Basic" },
                      { id: "standard", idLabel: "Standar", enLabel: "Standard" },
                      { id: "advanced", idLabel: "Mode Lanjutan", enLabel: "Advanced Mode" },
                    ] as const
                  ).map((tier) => {
                    const selected = activeTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleSetTier(tier.id)}
                        className={cn(
                          "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                          selected
                            ? tier.id === "advanced"
                              ? "bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                              : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                        )}
                      >
                        {pickLang(lang, tier.idLabel, tier.enLabel)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Tampilkan Parameter BETN", "Show NFE (BETN) Parameter")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Menampilkan kolom dan evaluasi Bahan Ekstrak Tanpa Nitrogen (BETN) hasil hitungan analisis proksimat.",
                    "Displays calculated Nitrogen-Free Extract (NFE/BETN) from proximate nutrient fractions.",
                  )}
                </p>
              </div>
              <Switch
                checked={isBetnEnabled}
                onCheckedChange={(checked) => onToggleShowBetn?.(checked)}
                label={pickLang(lang, "Tampilkan Parameter BETN", "Show NFE Parameter")}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Tampilkan Parameter NDF & ADF", "Show NDF & ADF Parameters")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Aktifkan kolom & target serat detergen (NDF/ADF) untuk formulasi sapi perah, sapi potong, dan domba tanpa harus membuka seluruh kolom asam amino.",
                    "Enable NDF/ADF fiber columns and targets for ruminant diets without exposing all amino acid columns.",
                  )}
                </p>
              </div>
              <Switch
                checked={isNdfEnabled}
                onCheckedChange={(checked) => onToggleShowNdf?.(checked)}
                disabled={isAdvanceMode}
                label={pickLang(
                  lang,
                  "Tampilkan Parameter NDF dan ADF",
                  "Show NDF and ADF Parameters",
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {pickLang(lang, "Aturan Anti-Nol Otomatis", "Automatic Anti-Zero Rule")}
                  </p>
                  <Badge tone={antiNolEnabled ? "emerald" : "neutral"}>
                    {antiNolEnabled
                      ? pickLang(lang, "Aktif Otomatis", "Auto Active")
                      : pickLang(lang, "Nonaktif", "Off")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Menjaga agar bahan makro yang Anda masukkan ke daftar pakan digunakan tidak otomatis menjadi 0%. Bahan mikro (mineral/premix/aditif) tetap aman mengikuti kebutuhan.",
                    "Keeps active macro ingredients from dropping to 0%. Micro-ingredients (minerals/premixes/additives) stay safely unconstrained.",
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {pickLang(lang, "Min %", "Min %")}
                  </span>
                  <Input
                    numeric
                    type="number"
                    min={0.1}
                    max={25}
                    step={0.5}
                    disabled={!antiNolEnabled}
                    aria-label={pickLang(
                      lang,
                      "Persentase minimum Anti-Nol",
                      "Anti-Zero minimum percentage",
                    )}
                    value={antiNolMinPct}
                    onChange={(e) => {
                      const val = Math.max(0.1, Math.min(25, Number(e.target.value) || 1));
                      onUpdate({ zeroInclusionDefaultPct: val });
                      onSetGlobalZeroInclusion?.(antiNolEnabled, val);
                    }}
                    className="w-20"
                  />
                </div>
                <Switch
                  checked={antiNolEnabled}
                  onCheckedChange={(checked) => onSetGlobalZeroInclusion?.(checked, antiNolMinPct)}
                  label={pickLang(
                    lang,
                    "Aktifkan Aturan Anti-Nol Otomatis",
                    "Enable Automatic Anti-Zero Rule",
                  )}
                />
              </div>
            </div>

            {onOpenPrecisionDialog && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="max-w-md">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {pickLang(
                        lang,
                        "Opsi Presisi LP (Lanjutan)",
                        "Precision LP Options (Advanced)",
                      )}
                    </p>
                    {activePrecisionCount > 0 && (
                      <Badge tone="emerald">
                        {activePrecisionCount} {pickLang(lang, "aktif", "active")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Konfigurasi tingkat lanjut untuk optimasi biaya per energi/nutrien, margin keamanan stokastik, dan matriks multi-enzim.",
                      "Advanced settings for cost-per-nutrient optimization, stochastic safety margins, and multi-enzyme matrices.",
                    )}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={onOpenPrecisionDialog}>
                  <Cpu className="h-3.5 w-3.5 text-[var(--status-info)]" />
                  <span>{pickLang(lang, "Atur Presisi LP", "Configure Precision LP")}</span>
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="flex max-w-md items-start gap-2.5">
                <Smartphone
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary)]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {pickLang(
                      lang,
                      "Android OLED Hitam Pekat (#000000)",
                      "Android OLED Pure Black (#000000)",
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Menghemat baterai & mencegah color banding di layar AMOLED saat Mode Gelap aktif.",
                      "Eliminates dark grey power draw & color banding on AMOLED screens when Dark mode is active.",
                    )}
                  </p>
                </div>
              </div>
              <Switch
                checked={amoledEnabled}
                onCheckedChange={handleToggleAmoled}
                data-theme-control="amoled"
                label={pickLang(
                  lang,
                  "Aktifkan Android OLED Hitam Pekat",
                  "Enable Android OLED Pure Black",
                )}
              />
            </div>
          </Card>

          {/* Kartu 4: Penyimpanan Data Lokal */}
          {storageStats && (
            <Card interactive={false} className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <GlossySquircleIcon
                    tone="sky"
                    size="sm"
                    icon={<Database className="h-4 w-4" />}
                  />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">
                      {pickLang(lang, "Penyimpanan Data Lokal", "Local Data Storage")}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      {pickLang(
                        lang,
                        "Seluruh bahan, harga kustom, target nutrien, dan resep disimpan langsung di perangkat Anda tanpa internet.",
                        "All ingredients, custom prices, targets, and recipes stay saved locally on your device.",
                      )}
                    </p>
                  </div>
                </div>

                <Badge tone={storageStats.storageMode === "indexeddb" ? "emerald" : "amber"}>
                  {storageStats.storageMode === "indexeddb"
                    ? pickLang(lang, "Penyimpanan Lokal Aktif", "Local Storage Active")
                    : pickLang(lang, "Mode Memori", "Memory Mode")}
                </Badge>
              </div>

              <div className="neu-well grid grid-cols-2 gap-2.5 rounded-2xl p-3 text-xs tabular-nums sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                    {pickLang(lang, "Katalog Bahan", "Feed Catalog")}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {storageStats.ingredientCount} {pickLang(lang, "bahan", "feeds")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                    {pickLang(lang, "Standar Kebutuhan", "Standards")}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {storageStats.requirementCount} {pickLang(lang, "profil", "profiles")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                    {pickLang(lang, "Resep Tersimpan", "Saved Recipes")}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {storageStats.recipeCount} {pickLang(lang, "resep", "recipes")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                    {pickLang(lang, "Estimasi Ukuran", "Est. Size")}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {formatBytes(storageStats.estimatedBytes)}
                  </span>
                </div>
              </div>

              {storageWarnings.length > 0 && (
                <div className="rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] p-3 text-xs text-[var(--text-primary)]">
                  {storageWarnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </div>
              )}

              {actionNotice && (
                <div
                  role="status"
                  className="rounded-2xl border border-[var(--status-success-border)] bg-[var(--status-success-soft)] p-3 text-xs font-medium text-[var(--text-primary)]"
                >
                  {actionNotice}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {onExportAllBackup && (
                  <Button variant="secondary" size="sm" onClick={onExportAllBackup}>
                    <Download className="h-3.5 w-3.5" />
                    <span>{pickLang(lang, "Unduh Cadangan Data", "Download Backup")}</span>
                  </Button>
                )}

                {onResetSampleData && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyAction !== null}
                    onClick={() => void handleResetSamples()}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{pickLang(lang, "Reset Data Bawaan", "Reset Sample Data")}</span>
                  </Button>
                )}

                {onClearAllUserData && !confirmClearOpen && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busyAction !== null}
                    onClick={() => setConfirmClearOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{pickLang(lang, "Hapus Semua Data Lokal", "Clear All Local Data")}</span>
                  </Button>
                )}
              </div>

              {confirmClearOpen && onClearAllUserData && (
                <div
                  role="alert"
                  className="rounded-2xl border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3.5 text-xs text-[var(--text-primary)]"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-danger)]" />
                    <div className="flex-1 space-y-2">
                      <p className="font-bold">
                        {pickLang(
                          lang,
                          "Hapus seluruh data lokal (termasuk resep tersimpan dan harga kustom)?",
                          "Clear all local data (including saved recipes and custom prices)?",
                        )}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {pickLang(
                          lang,
                          "Tindakan ini mengosongkan penyimpanan lokal dan memulihkan dataset awal.",
                          "This clears local storage and restores the initial factory dataset.",
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={busyAction !== null}
                          onClick={() => void handleConfirmClearAll()}
                        >
                          {pickLang(lang, "Konfirmasi Hapus Permanen", "Confirm Permanent Delete")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyAction !== null}
                          onClick={() => setConfirmClearOpen(false)}
                        >
                          {pickLang(lang, "Batal", "Cancel")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
});
