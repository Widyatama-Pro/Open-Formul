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
import { MotionConfig, motion } from "motion/react";
import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage, ThemeMode } from "../../types";
import { Badge } from "../ui/Badge";
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

const SHELL_STAGGER_VARIANTS = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.03,
    },
  },
} as const;

const HEADER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

const MAIN_ITEM_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

/**
 * Kerangka aplikasi Precision Agritech Light Mode:
 * - Intro reveal dari titik logo pojok kiri atas (32px, 32px) dalam 380ms
 * - Rail sidebar vertikal ramping 64px dengan Liquid Concave Cutout
 * - Top header ringkas 52px + kanvas utama Cool Alabaster (#F8FAFC)
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentNav = NAV_ITEMS.find((item) => item.id === route) ?? NAV_ITEMS[0]!;
  const currentTitle = getNavLabel(currentNav, language);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-dvh w-full overflow-hidden bg-[var(--canvas-bg)] text-[#0F172A] dark:text-[#F8FAFC]">
        <motion.div
          initial={{ clipPath: "circle(0% at 32px 32px)" }}
          animate={{ clipPath: "circle(150% at 32px 32px)" }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="shell-frame flex h-full w-full min-w-0 overflow-hidden"
        >
          <DesktopSidebar
            route={route}
            onNavigate={onNavigate}
            language={language}
            isOnline={isOnline}
            offlineReady={offlineReady}
          />

          <motion.div
            variants={SHELL_STAGGER_VARIANTS}
            initial="hidden"
            animate="visible"
            className="workspace-canvas relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden"
          >
            {/* Header atas ringkas (height: 52px) */}
            <motion.header
              variants={HEADER_ITEM_VARIANTS}
              className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-3.5 lg:px-5 dark:border-[#1E333D] dark:bg-[#111F26]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Buka menu navigasi"
                  className="neu-pill-btn hidden min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg text-[#0F172A] md:inline-flex lg:hidden dark:text-slate-100"
                >
                  <Menu className="h-4 w-4" />
                </button>

                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F3D3E] text-white lg:hidden dark:bg-[#059669]"
                >
                  <Wheat className="h-4 w-4" />
                </span>

                <div className="flex min-w-0 items-baseline gap-2">
                  <p className="truncate text-sm font-bold tracking-tight text-[#0F172A] dark:text-white">
                    OpenFormul
                  </p>
                  <span className="hidden text-xs font-medium text-[#475569] sm:inline dark:text-slate-400">
                    / {currentTitle}
                  </span>
                  <span className="hidden text-[11px] font-medium text-[#475569] xl:inline dark:text-slate-400">
                    · {language === "id" ? "Formulasi Pakan Presisi" : "Precision Feed Formulation"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canInstall && !isInstalled && onInstallApp && (
                  <button
                    type="button"
                    onClick={onInstallApp}
                    className="neu-pill-btn hidden cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#047857] sm:inline-flex dark:bg-emerald-950/60 dark:text-emerald-200"
                  >
                    <Download className="h-3 w-3" />
                    <span>{language === "id" ? "Instal App" : "Install App"}</span>
                  </button>
                )}

                {needRefresh && onApplyUpdate && (
                  <button
                    type="button"
                    onClick={onApplyUpdate}
                    className="neu-pill-btn hidden cursor-pointer items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-[#B45309] sm:inline-flex dark:bg-amber-950/60 dark:text-amber-200"
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
                  className="neu-pill-btn inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-bold uppercase text-[#0F172A] dark:text-slate-100"
                >
                  <Languages className="h-3.5 w-3.5 text-[#059669] dark:text-emerald-400" />
                  <span className="hidden sm:inline">{language}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={theme === "light" ? "Mode gelap" : "Mode terang"}
                  title={theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
                  className="neu-pill-btn inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#0F172A] dark:text-slate-100"
                >
                  {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate("settings")}
                  aria-label="Ringkasan status workspace"
                  className="neu-pill-btn hidden cursor-pointer items-center gap-2 rounded-lg py-1 pr-2.5 pl-1.5 text-left sm:inline-flex"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0F3D3E] text-[10px] font-bold text-white dark:bg-[#059669]">
                    OF
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[11px] font-bold text-[#0F172A] dark:text-slate-100">
                      Workspace
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#475569] dark:text-slate-400">
                      {!isOnline ? (
                        <>
                          <WifiOff className="h-2.5 w-2.5 text-[#D97706]" />
                          <span>Mode Offline</span>
                        </>
                      ) : offlineReady ? (
                        <>
                          <Wifi className="h-2.5 w-2.5 text-[#059669] dark:text-emerald-400" />
                          <span>HiGHS · Siap Offline</span>
                        </>
                      ) : (
                        <span>HiGHS · Lokal</span>
                      )}
                    </span>
                  </span>
                  <ChevronDown className="h-3 w-3 text-[#475569]" aria-hidden="true" />
                </button>

                <Badge tone={!isOnline ? "amber" : "emerald"} className="sm:hidden">
                  {!isOnline ? "Offline" : offlineReady ? "Siap Offline" : "HiGHS"}
                </Badge>
              </div>
            </motion.header>

            <motion.main
              variants={MAIN_ITEM_VARIANTS}
              className="custom-scrollbar min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-4 lg:pb-0"
            >
              {children}
            </motion.main>
          </motion.div>
        </motion.div>

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
    </MotionConfig>
  );
}
