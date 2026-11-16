import type { ReactNode } from "react";
import { useState } from "react";
import {
  ChevronDown,
  Download,
  Languages,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  Wheat,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage, ThemeMode } from "../../types";
import { Badge } from "../ui/Badge";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface AppShellProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly theme: ThemeMode;
  readonly onToggleTheme: () => void;
  readonly onToggleLanguage: () => void;
  readonly isOnline?: boolean;
  readonly offlineReady?: boolean;
  readonly needRefresh?: boolean;
  readonly canInstall?: boolean;
  readonly isInstalled?: boolean;
  readonly onApplyUpdate?: () => void;
  readonly onInstallApp?: () => void;
  readonly children: ReactNode;
}

/**
 * Kerangka aplikasi adaptif bergaya Layered Glassmorphism & Soft Neumorphism:
 * bingkai luar bertema petrol-teal gelap yang tumpang-tindih dengan lembar kerja kaca buram.
 */
export function AppShell({
  route,
  onNavigate,
  language,
  theme,
  onToggleTheme,
  onToggleLanguage,
  isOnline = true,
  offlineReady = false,
  needRefresh = false,
  canInstall = false,
  isInstalled = false,
  onApplyUpdate,
  onInstallApp,
  children,
}: AppShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentNav = NAV_ITEMS.find((item) => item.id === route) ?? NAV_ITEMS[0]!;
  const currentTitle = getNavLabel(currentNav, language);

  return (
    <div className="relative flex h-dvh w-full overflow-hidden lg:p-3 xl:p-4">
      {/* Latar pendar atmosfer pastel agar efek frosted glass terlihat berdimensi */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 -left-24 h-96 w-96 rounded-full bg-cyan-300/35 blur-3xl dark:bg-cyan-500/15" />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl dark:bg-teal-500/12" />
        <div className="absolute -right-20 -bottom-24 h-96 w-96 rounded-full bg-rose-200/30 blur-3xl dark:bg-indigo-500/15" />
      </div>

      {/* Bingkai ganda desktop dengan border aksen cyan bercahaya */}
      <div className="shell-frame flex h-full w-full min-w-0 overflow-hidden lg:rounded-[28px]">
        <DesktopSidebar
          route={route}
          onNavigate={onNavigate}
          expanded={sidebarExpanded}
          onToggleExpand={() => setSidebarExpanded((prev) => !prev)}
          language={language}
          isOnline={isOnline}
          offlineReady={offlineReady}
        />

        {/* Lembar kerja kaca buram yang tumpang-tindih di atas rail sidebar */}
        <div className="glass-workspace-pane flex min-w-0 flex-1 flex-col overflow-hidden lg:-ml-2.5 lg:rounded-[24px]">
          {/* Header atas kaca dengan tombol kontrol neumorfik */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/65 px-3.5 lg:h-15 lg:px-6 dark:border-cyan-200/10">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Buka menu navigasi"
                className="neu-pill-btn hidden min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full text-[#123340] md:inline-flex lg:hidden dark:text-slate-100"
              >
                <Menu className="h-4 w-4" />
              </button>

              <GlossySquircleIcon tone="sky" size="sm" icon={<Wheat className="h-4 w-4" />} />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold tracking-tight text-[#122B36] dark:text-white">
                    Open Formul
                  </p>
                  <span className="hidden text-xs text-[#647E8B] sm:inline dark:text-slate-400">
                    / {currentTitle}
                  </span>
                </div>
                <p className="truncate text-[11px] font-medium text-[#54707E] dark:text-slate-300">
                  {language === "id" ? "Formulasi Pakan Presisi" : "Precision Feed Formulation"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canInstall && !isInstalled && onInstallApp && (
                <button
                  type="button"
                  onClick={onInstallApp}
                  className="neu-pill-btn hidden cursor-pointer items-center gap-1 rounded-full border border-cyan-400/55 bg-cyan-50/90 px-2.5 py-1 text-[11px] font-bold text-[#0B4657] sm:inline-flex dark:bg-cyan-950/60 dark:text-cyan-200"
                >
                  <Download className="h-3 w-3" />
                  <span>{language === "id" ? "Instal App" : "Install App"}</span>
                </button>
              )}

              {needRefresh && onApplyUpdate && (
                <button
                  type="button"
                  onClick={onApplyUpdate}
                  className="neu-pill-btn hidden cursor-pointer items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50/90 px-2.5 py-1 text-[11px] font-bold text-amber-900 sm:inline-flex dark:bg-amber-950/60 dark:text-amber-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{language === "id" ? "Update Tersedia" : "Update Ready"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onToggleLanguage}
                aria-label={
                  language === "id" ? "Ganti bahasa ke English" : "Switch language to Indonesian"
                }
                title={language === "id" ? "Bahasa: Indonesia" : "Language: English"}
                className="neu-pill-btn inline-flex h-10 min-w-10 cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 text-xs font-bold uppercase text-[#123340] md:h-9 md:min-w-9 dark:text-slate-100"
              >
                <Languages className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-300" />
                <span className="hidden sm:inline">{language}</span>
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === "light" ? "Mode gelap" : "Mode terang"}
                title={theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
                className="neu-pill-btn inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#123340] md:h-9 md:w-9 dark:text-slate-100"
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => onNavigate("settings")}
                aria-label="Ringkasan status workspace"
                className="neu-pill-btn hidden cursor-pointer items-center gap-2 rounded-full py-1 pr-2.5 pl-1.5 text-left sm:inline-flex"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#0E7490] to-[#10B981] text-[10px] font-bold text-white shadow-xs">
                  OF
                </span>
                <span className="leading-tight">
                  <span className="block text-[11px] font-bold text-[#122B36] dark:text-slate-100">
                    Workspace
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[#54707E] dark:text-slate-400">
                    {!isOnline ? (
                      <>
                        <WifiOff className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                        <span>Mode Offline</span>
                      </>
                    ) : offlineReady ? (
                      <>
                        <Wifi className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                        <span>HiGHS · Siap Offline</span>
                      </>
                    ) : (
                      <span>HiGHS · Lokal</span>
                    )}
                  </span>
                </span>
                <ChevronDown className="h-3 w-3 text-[#647E8B]" aria-hidden="true" />
              </button>

              <Badge tone={!isOnline ? "amber" : "emerald"} className="sm:hidden">
                {!isOnline ? "Offline" : offlineReady ? "Siap Offline" : "HiGHS"}
              </Badge>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-4 lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      <MobileBottomNav
        route={route}
        onNavigate={onNavigate}
        onOpenDrawer={() => setDrawerOpen(true)}
        language={language}
      />

      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        route={route}
        onNavigate={onNavigate}
        language={language}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onToggleLanguage={onToggleLanguage}
      />
    </div>
  );
}
