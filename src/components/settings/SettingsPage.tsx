import { memo, useState } from "react";
import {
  AlertTriangle,
  Cpu,
  Database,
  Download,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { PwaStatus } from "../../hooks/use-pwa-status";
import { pickLang } from "../../i18n";
import type { StorageStats } from "../../storage";
import type { Basis, FormulationConfig, UserPreferences } from "../../types";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { ThemeSwitcherMenu, type ThemeChangePayload } from "./ThemeSwitcherMenu";

export interface SettingsPageProps {
  readonly preferences: UserPreferences;
  readonly onUpdate: (patch: Partial<UserPreferences>) => void;
  readonly config?: FormulationConfig;
  readonly onToggleAdvance?: (enabled: boolean) => void;
  readonly onToggleShowNdf?: (enabled: boolean) => void;
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

export const SettingsPage = memo(function SettingsPage({
  preferences,
  onUpdate,
  config,
  onToggleAdvance,
  onToggleShowNdf,
  onSetGlobalZeroInclusion,
  onOpenPrecisionDialog,
  storageStats,
  storageWarnings = [],
  onExportAllBackup,
  onResetSampleData,
  onClearAllUserData,
}: SettingsPageProps) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"reset" | "clear" | null>(null);

  const lang = preferences.language;
  const isAdvanceMode = config ? config.enableAdvanceNutrients : preferences.simpleMode === false;
  const isSimpleMode = !isAdvanceMode;
  const isNdfEnabled = config ? config.showNdf === true || config.enableAdvanceNutrients : false;
  const antiNolEnabled = config ? config.globalZeroInclusion.enforceNonZero : true;
  const antiNolMinPct =
    config?.globalZeroInclusion.minIfSelected ?? preferences.zeroInclusionDefaultPct ?? 1;

  const activePrecisionCount = config
    ? (config.fractionalObjective ? 1 : 0) +
      (config.enableStochasticSlp ? 1 : 0) +
      ((config.enzymes?.length ?? 0) > 0 ? 1 : 0)
    : 0;

  const handleSetFormulationMode = (advance: boolean) => {
    if (onToggleAdvance) {
      onToggleAdvance(advance);
    } else {
      onUpdate({ simpleMode: !advance });
    }
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
              "Atur bahasa, palet warna & mode tampilan, mode formulasi (Simpel / Lanjutan), opsi NDF, Anti-Nol, serta penyimpanan data lokal.",
              "Configure language, color palette & appearance mode, formulation mode (Simple / Advanced), NDF, Anti-Zero, and local data storage.",
            )}
          </p>
        </div>
      </div>

      {/* Kartu 1: Preferensi Umum */}
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

      {/* Kartu 2: Tema & Palet Warna (7 Palet × Terang/Gelap/Sistem + Android OLED) */}
      <Card interactive={false} className="overflow-hidden">
        <ThemeSwitcherMenu language={lang} onThemeChange={handleThemeChange} />
      </Card>

      {/* Kartu 3: Mode Formulasi & Opsi Lanjutan (Simpel/Advance, NDF, Anti-Nol, Presisi LP) */}
      <Card interactive={false} className="divide-y divide-[var(--border-subtle)]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-md">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {pickLang(
                  lang,
                  "Mode Formulasi (Simpel / Lanjutan)",
                  "Formulation Mode (Simple / Advanced)",
                )}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {pickLang(
                  lang,
                  "Mode Simpel otomatis menyingkat istilah nutrisi (PK, EM, TDN, LK, SK) agar tabel lapang. Mode Lanjutan menampilkan asam amino, elektrolit, NDF, dan anti-nutrisi.",
                  "Simple Mode abbreviates nutrient labels (CP, ME, TDN, EE, CF) for a spacious table. Advanced Mode displays amino acids, electrolytes, NDF, and anti-nutrients.",
                )}
              </p>
            </div>
            <div
              role="group"
              aria-label={pickLang(
                lang,
                "Pilih Mode Simpel atau Mode Lanjutan",
                "Select Simple or Advanced Mode",
              )}
              className="neu-pressed inline-flex rounded-lg p-0.5"
            >
              <button
                type="button"
                aria-pressed={isSimpleMode}
                onClick={() => handleSetFormulationMode(false)}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                  isSimpleMode
                    ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {pickLang(lang, "Mode Simpel", "Simple Mode")}
              </button>
              <button
                type="button"
                aria-pressed={isAdvanceMode}
                onClick={() => handleSetFormulationMode(true)}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                  isAdvanceMode
                    ? "bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {pickLang(lang, "Mode Lanjutan", "Advanced Mode")}
              </button>
            </div>
          </div>
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
            label={pickLang(lang, "Tampilkan Parameter NDF dan ADF", "Show NDF and ADF Parameters")}
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
                  {pickLang(lang, "Opsi Presisi LP (Lanjutan)", "Precision LP Options (Advanced)")}
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
      </Card>

      {/* Kartu 4: Penyimpanan Data Lokal */}
      {storageStats && (
        <Card interactive={false} className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <GlossySquircleIcon tone="sky" size="sm" icon={<Database className="h-4 w-4" />} />
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
  );
});
