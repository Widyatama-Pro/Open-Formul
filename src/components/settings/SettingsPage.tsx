import { memo, useState } from "react";
import {
  AlertTriangle,
  Cpu,
  Database,
  Download,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Trash2,
} from "lucide-react";
import type { PwaStatus } from "../../hooks/use-pwa-status";
import { pickLang } from "../../i18n";
import type { StorageStats } from "../../storage";
import { useOptionalThemeContext } from "../../theme";
import type { Basis, FormulationConfig, TableViewTier, UserPreferences } from "../../types";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
import { Input } from "../ui/Input";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { ThemeSwitcherMenu, type ThemeChangePayload } from "./ThemeSwitcherMenu";

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
    onUpdate({ tableViewTier: tier, simpleMode: !advance });
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
    });
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
              <Select
                aria-label={pickLang(lang, "Pilih bahasa", "Select language")}
                value={preferences.language}
                onChange={(e) => onUpdate({ language: e.target.value as "id" | "en" })}
                className="w-44"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </Select>
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
              <Select
                aria-label={pickLang(lang, "Desimal Tampilan Angka", "Display Decimal Places")}
                value={String(decimalPlaces)}
                onChange={(e) => handleSetDecimalPlaces(Number(e.target.value) as 0 | 1 | 2)}
                className="w-52"
              >
                <option value="0">
                  {pickLang(
                    lang,
                    "0 desimal (Bulat, contoh 18%)",
                    "0 decimals (Integer, e.g. 18%)",
                  )}
                </option>
                <option value="1">
                  {pickLang(
                    lang,
                    "1 desimal (xx,0 — contoh 18,5%)",
                    "1 decimal (xx.0 — e.g. 18.5%)",
                  )}
                </option>
                <option value="2">
                  {pickLang(
                    lang,
                    "2 desimal (xx,00 — contoh 18,50%)",
                    "2 decimals (xx.00 — e.g. 18.50%)",
                  )}
                </option>
              </Select>
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
              <Select
                aria-label={pickLang(lang, "Basis default", "Default basis")}
                value={preferences.defaultBasis}
                onChange={(e) => onUpdate({ defaultBasis: e.target.value as Basis })}
                className="w-44"
              >
                <option value="as_fed">As-Fed</option>
                <option value="dry_matter">
                  {pickLang(lang, "Bahan Kering (BK)", "Dry Matter (DM)")}
                </option>
              </Select>
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

          {/* Kartu 2: Tema & Palet Warna (Kompak) */}
          <Card interactive={false} className="overflow-hidden">
            <ThemeSwitcherMenu
              language={lang}
              showAmoledToggle={false}
              compact
              onThemeChange={handleThemeChange}
            />
          </Card>
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
