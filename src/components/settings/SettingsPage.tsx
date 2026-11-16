import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Laptop,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { PwaStatus } from "../../hooks/use-pwa-status";
import type { StorageStats } from "../../storage";
import type { Basis, UserPreferences } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface SettingsPageProps {
  readonly preferences: UserPreferences;
  readonly onUpdate: (patch: Partial<UserPreferences>) => void;
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

export function SettingsPage({
  preferences,
  onUpdate,
  storageStats,
  storageWarnings = [],
  pwaStatus,
  onExportAllBackup,
  onResetSampleData,
  onClearAllUserData,
}: SettingsPageProps) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"reset" | "clear" | null>(null);

  const handleResetSamples = async () => {
    if (!onResetSampleData) return;
    setBusyAction("reset");
    try {
      await onResetSampleData();
      setActionNotice(
        "Katalog bahan, standar kebutuhan, dan konfigurasi awal dipulihkan (resep tersimpan Anda tetap aman).",
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
      setActionNotice("Seluruh data lokal IndexedDB dibersihkan dan dikembalikan ke kondisi awal.");
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
          <p className="text-xs font-medium text-[#54707E] dark:text-slate-400">
            {preferences.language === "id" ? "Preferensi Sistem" : "System Preferences"}
          </p>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[#122B36] dark:text-slate-100">
            {preferences.language === "id" ? "Pengaturan Aplikasi" : "Application Settings"}
          </h1>
          <p className="mt-0.5 text-xs text-[#54707E] dark:text-slate-400">
            Preferensi antarmuka, bahasa, basis default, serta status penyimpanan offline IndexedDB.
          </p>
        </div>
      </div>

      <Card interactive={false} className="divide-y divide-white/70 dark:divide-cyan-200/10">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[#122B36] dark:text-slate-100">
              Bahasa Antarmuka (i18n)
            </p>
            <p className="text-xs text-[#54707E] dark:text-slate-400">
              Bahasa Indonesia atau English
            </p>
          </div>
          <Select
            aria-label="Pilih bahasa"
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
            <p className="text-sm font-semibold text-[#122B36] dark:text-slate-100">
              Tema Tampilan
            </p>
            <p className="text-xs text-[#54707E] dark:text-slate-400">
              Mode Terang atau Gelap (Dark Mode)
            </p>
          </div>
          <Select
            aria-label="Pilih tema"
            value={preferences.theme}
            onChange={(e) => onUpdate({ theme: e.target.value as "light" | "dark" })}
            className="w-44"
          >
            <option value="light">Terang (Light)</option>
            <option value="dark">Gelap (Dark)</option>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[#122B36] dark:text-slate-100">
              Basis Perhitungan Default
            </p>
            <p className="text-xs text-[#54707E] dark:text-slate-400">
              As-Fed (unggas/babi) atau Bahan Kering (ruminansia)
            </p>
          </div>
          <Select
            aria-label="Basis default"
            value={preferences.defaultBasis}
            onChange={(e) => onUpdate({ defaultBasis: e.target.value as Basis })}
            className="w-44"
          >
            <option value="as_fed">As-Fed</option>
            <option value="dry_matter">Bahan Kering (BK)</option>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[#122B36] dark:text-slate-100">
              Ukuran Batch Adukan Default (kg)
            </p>
            <p className="text-xs text-[#54707E] dark:text-slate-400">
              Dipakai otomatis saat membuka formulasi baru
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

      {(storageStats || pwaStatus) && (
        <Card interactive={false} className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <GlossySquircleIcon tone="mint" size="sm" icon={<Download className="h-4 w-4" />} />
              <div>
                <h2 className="text-sm font-bold text-[#122B36] dark:text-slate-100">
                  {preferences.language === "id"
                    ? "Unduh & Instal Aplikasi (PC .exe, Android .apk & PWA)"
                    : "Download & Install App (PC .exe, Android .apk & PWA)"}
                </h2>
                <p className="text-xs text-[#54707E] dark:text-slate-400">
                  {preferences.language === "id"
                    ? "Unduh installer Windows (.exe) & Android (.apk) dari GitHub Releases atau pasang langsung sebagai PWA 100% offline."
                    : "Download the Windows (.exe) & Android (.apk) installers from GitHub Releases or install directly as a 100% offline PWA."}
                </p>
              </div>
            </div>

            {pwaStatus && (
              <Badge
                tone={pwaStatus.isInstalled ? "emerald" : pwaStatus.canInstall ? "sky" : "neutral"}
              >
                {pwaStatus.isInstalled ? (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {preferences.language === "id" ? "Sudah Terinstal" : "Installed"}
                  </span>
                ) : pwaStatus.canInstall ? (
                  preferences.language === "id" ? (
                    "Siap Diinstal"
                  ) : (
                    "Ready to Install"
                  )
                ) : (
                  "PWA Offline"
                )}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {pwaStatus?.canInstall && !pwaStatus.isInstalled && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  void pwaStatus.installApp().then((outcome) => {
                    if (outcome === "accepted") {
                      setActionNotice(
                        preferences.language === "id"
                          ? "Open Formul berhasil dipasang ke perangkat Anda."
                          : "Open Formul has been installed on your device.",
                      );
                    }
                  });
                }}
              >
                <Download className="h-3.5 w-3.5" />
                <span>
                  {preferences.language === "id" ? "Instal Aplikasi Sekarang" : "Install App Now"}
                </span>
              </Button>
            )}

            <a
              href="https://github.com/Widyatama-Pro/Open-Formul/releases"
              target="_blank"
              rel="noreferrer"
              className="neu-pill-btn inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-[#123340] md:min-h-8 md:px-3 md:text-xs dark:text-slate-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>
                {preferences.language === "id"
                  ? "Unduh .exe & .apk di GitHub Releases"
                  : "Download .exe & .apk on GitHub Releases"}
              </span>
            </a>
          </div>

          <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
            <div className="neu-well rounded-2xl p-3">
              <div className="flex items-center gap-1.5 font-bold text-[#122B36] dark:text-slate-100">
                <Laptop className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-300" />
                <span>Desktop PC (Windows .exe / Tauri &amp; PWA)</span>
              </div>
              <p className="mt-1 leading-relaxed text-[#466270] dark:text-slate-300">
                {preferences.language === "id"
                  ? "Unduh installer Windows (.exe) di GitHub Releases, atau buka di Chrome/Edge lalu klik ikon Instal untuk memasang aplikasi desktop offline."
                  : "Download the Windows (.exe) installer on GitHub Releases, or open in Chrome/Edge and click Install to add the offline desktop app."}
              </p>
            </div>
            <div className="neu-well rounded-2xl p-3">
              <div className="flex items-center gap-1.5 font-bold text-[#122B36] dark:text-slate-100">
                <Smartphone className="h-3.5 w-3.5 text-[#059669] dark:text-emerald-300" />
                <span>Mobile (Android .apk / Capacitor &amp; PWA)</span>
              </div>
              <p className="mt-1 leading-relaxed text-[#466270] dark:text-slate-300">
                {preferences.language === "id"
                  ? "Unduh file Open-Formul-android.apk di GitHub Releases (izinkan pasang dari sumber tidak dikenal), atau instal PWA lewat Chrome/Safari."
                  : "Download Open-Formul-android.apk from GitHub Releases (allow unknown sources), or install the PWA via Chrome/Safari."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {(storageStats || pwaStatus) && (
        <Card interactive={false} className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <GlossySquircleIcon tone="sky" size="sm" icon={<Database className="h-4 w-4" />} />
              <div>
                <h2 className="text-sm font-bold text-[#122B36] dark:text-slate-100">
                  Penyimpanan Offline (IndexedDB) &amp; Status PWA
                </h2>
                <p className="text-xs text-[#54707E] dark:text-slate-400">
                  Seluruh bahan, harga kustom, target nutrien, dan resep disimpan lokal di perangkat
                  Anda tanpa server eksternal.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {storageStats && (
                <Badge tone={storageStats.storageMode === "indexeddb" ? "emerald" : "amber"}>
                  {storageStats.storageMode === "indexeddb" ? "IndexedDB Aktif" : "Mode Memori"}
                </Badge>
              )}
              {pwaStatus && (
                <Badge tone={pwaStatus.isOnline ? "sky" : "amber"}>
                  {pwaStatus.isOnline ? (
                    <span className="inline-flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      {pwaStatus.offlineReady ? "Siap Offline" : "Online"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <WifiOff className="h-3 w-3" />
                      Mode Offline
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>

          {storageStats && (
            <div className="neu-well grid grid-cols-2 gap-2.5 rounded-2xl p-3 text-xs tabular-nums sm:grid-cols-4">
              <div>
                <span className="block text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                  Katalog Bahan
                </span>
                <span className="font-bold text-[#122B36] dark:text-slate-100">
                  {storageStats.ingredientCount} bahan
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                  Standar Kebutuhan
                </span>
                <span className="font-bold text-[#122B36] dark:text-slate-100">
                  {storageStats.requirementCount} profil
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                  Resep Tersimpan
                </span>
                <span className="font-bold text-[#122B36] dark:text-slate-100">
                  {storageStats.recipeCount} resep
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                  Estimasi Ukuran
                </span>
                <span className="font-bold text-[#122B36] dark:text-slate-100">
                  {formatBytes(storageStats.estimatedBytes)}
                </span>
              </div>
            </div>
          )}

          {storageWarnings.length > 0 && (
            <div className="rounded-2xl border border-amber-300/70 bg-amber-50/90 p-3 text-xs text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/45 dark:text-amber-200">
              {storageWarnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          {actionNotice && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-300/70 bg-emerald-50/90 p-3 text-xs font-medium text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/45 dark:text-emerald-200"
            >
              {actionNotice}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {pwaStatus?.needRefresh && (
              <Button variant="primary" size="sm" onClick={pwaStatus.applyUpdate}>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Muat Ulang Versi Baru</span>
              </Button>
            )}

            {onExportAllBackup && (
              <Button variant="secondary" size="sm" onClick={onExportAllBackup}>
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Backup Semua (.json)</span>
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
                <span>Reset Data Bawaan</span>
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
                <span>Hapus Semua Data Lokal</span>
              </Button>
            )}
          </div>

          {confirmClearOpen && onClearAllUserData && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-300/80 bg-rose-50/95 p-3.5 text-xs text-rose-950 dark:border-rose-700/60 dark:bg-rose-950/50 dark:text-rose-100"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" />
                <div className="flex-1 space-y-2">
                  <p className="font-bold">
                    Hapus seluruh data lokal (termasuk resep tersimpan dan harga kustom)?
                  </p>
                  <p className="text-[11px] opacity-90">
                    Tindakan ini mengosongkan IndexedDB dan memulihkan dataset pabrik awal. Unduh
                    backup `.json` lebih dulu bila masih diperlukan.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busyAction !== null}
                      onClick={() => void handleConfirmClearAll()}
                    >
                      Konfirmasi Hapus Permanen
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyAction !== null}
                      onClick={() => setConfirmClearOpen(false)}
                    >
                      Batal
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
}
