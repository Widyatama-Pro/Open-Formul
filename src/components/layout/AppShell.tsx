import type { ReactNode } from "react";
import { useState } from "react";
import { Languages, Menu, Moon, RefreshCw, Sun } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import appLogo from "../../assets/logo.jpg";
import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileNavDrawer } from "./MobileNavDrawer";

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
 * Kerangka aplikasi OpenFormul:
 * - Intro reveal dari titik logo pojok kiri atas dalam 380ms
 * - Sidebar desktop collapsible + header selaras dengan palet tema aktif
 * - Kanvas utama bersih berfokus pada produktivitas formulasi
 */
export function AppShell({
  route,
  onNavigate,
  language,
  theme,
  onToggleTheme,
  onToggleLanguage,
  needRefresh = false,
  onApplyUpdate,
  children,
}: AppShellProps) {
  const [drawerMode, setDrawerMode] = useState<"closed" | "mobile-secondary" | "tablet-all">(
    "closed",
  );
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-dvh w-full overflow-hidden overscroll-none bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <motion.div
          initial={{ clipPath: "circle(0% at 32px 32px)" }}
          animate={{ clipPath: "circle(150% at 32px 32px)" }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="shell-frame flex h-full w-full min-w-0 overflow-hidden overscroll-none"
        >
          <DesktopSidebar
            route={route}
            onNavigate={onNavigate}
            language={language}
            expanded={sidebarExpanded}
            onToggleExpanded={() => setSidebarExpanded((prev) => !prev)}
          />

          <motion.div
            variants={SHELL_STAGGER_VARIANTS}
            initial="hidden"
            animate="visible"
            className="workspace-canvas relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-none"
          >
            {/* Header atas ringkas (50px di HP agar ruang kerja lega, 60px di desktop) */}
            <motion.header
              variants={HEADER_ITEM_VARIANTS}
              style={{ paddingTop: "var(--safe-area-top)" }}
              className="flex min-h-[50px] shrink-0 items-center justify-between gap-3 border-b border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-bg)] px-3.5 text-[var(--shell-chrome-fg)] lg:min-h-[60px] lg:px-5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDrawerMode("tablet-all")}
                  aria-label={language === "id" ? "Buka menu navigasi" : "Open navigation menu"}
                  className="hidden min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-btn-bg)] text-[var(--shell-chrome-fg)] transition-colors hover:bg-[var(--shell-chrome-btn-hover)] active:scale-95 md:inline-flex lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>

                {!sidebarExpanded && (
                  <button
                    type="button"
                    onClick={() => onNavigate("formulation")}
                    className="flex min-w-0 cursor-pointer items-center gap-2 text-left transition-opacity hover:opacity-95 active:scale-[0.99] motion-reduce:transform-none lg:gap-2.5"
                  >
                    <img
                      src={appLogo}
                      alt="Logo OpenFormul"
                      className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/25 lg:hidden"
                    />
                    <p className="inline-flex items-baseline gap-0 truncate text-[18px] font-extrabold tracking-tight lg:text-[20px]">
                      <span className="text-[var(--shell-chrome-fg)]">Open</span>
                      <span className="text-[var(--shell-chrome-accent)]">Formul</span>
                    </p>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {needRefresh && onApplyUpdate && (
                  <button
                    type="button"
                    onClick={onApplyUpdate}
                    className="hidden cursor-pointer items-center gap-1 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--status-warning)] transition-colors hover:brightness-95 active:scale-95 sm:inline-flex"
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
                  className="inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-btn-bg)] px-2.5 text-xs font-bold uppercase text-[var(--shell-chrome-fg)] transition-[transform,background-color] duration-150 hover:bg-[var(--shell-chrome-btn-hover)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none"
                >
                  <Languages className="h-3.5 w-3.5 text-[var(--shell-chrome-accent)]" />
                  <span className="hidden sm:inline">{language}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={
                    theme === "light"
                      ? language === "id"
                        ? "Mode gelap"
                        : "Dark mode"
                      : language === "id"
                        ? "Mode terang"
                        : "Light mode"
                  }
                  title={
                    theme === "light"
                      ? language === "id"
                        ? "Aktifkan mode gelap"
                        : "Enable dark mode"
                      : language === "id"
                        ? "Aktifkan mode terang"
                        : "Enable light mode"
                  }
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-btn-bg)] text-[var(--shell-chrome-fg)] transition-[transform,background-color] duration-150 hover:bg-[var(--shell-chrome-btn-hover)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none"
                >
                  {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>
              </div>
            </motion.header>

            <motion.main
              variants={MAIN_ITEM_VARIANTS}
              className={cn(
                "min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-contain",
                route === "formulation"
                  ? "overflow-hidden"
                  : "workspace-main-scrollbar overflow-y-auto pb-24 md:pb-4 lg:pb-0",
              )}
            >
              {children}
            </motion.main>
          </motion.div>
        </motion.div>

        <MobileBottomNav
          route={route}
          onNavigate={onNavigate}
          onOpenDrawer={() => setDrawerMode("mobile-secondary")}
          language={language}
        />

        <MobileNavDrawer
          open={drawerMode !== "closed"}
          secondaryOnly={drawerMode === "mobile-secondary"}
          onClose={() => setDrawerMode("closed")}
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
