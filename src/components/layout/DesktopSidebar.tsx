import { memo } from "react";
import {
  Calculator,
  ClipboardList,
  FolderOpen,
  Layers,
  Settings,
  Wheat,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion } from "motion/react";
import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface DesktopSidebarProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly isOnline?: boolean;
  readonly offlineReady?: boolean;
}

function renderNavIcon(id: AppRoute) {
  switch (id) {
    case "formulation":
      return <Calculator className="h-[19px] w-[19px] shrink-0" />;
    case "ingredients":
      return <Wheat className="h-[19px] w-[19px] shrink-0" />;
    case "requirements":
      return <ClipboardList className="h-[19px] w-[19px] shrink-0" />;
    case "recipes":
      return <FolderOpen className="h-[19px] w-[19px] shrink-0" />;
    case "advanced":
      return <Layers className="h-[19px] w-[19px] shrink-0" />;
    case "settings":
      return <Settings className="h-[19px] w-[19px] shrink-0" />;
  }
}

/**
 * Sidebar rail vertikal ramping (64px) dengan Deep Forest Slate (#0F3D3E)
 * dan indikator aktif Liquid Concave Cutout yang menyatu ke kanvas #F8FAFC.
 */
export const DesktopSidebar = memo(function DesktopSidebar({
  route,
  onNavigate,
  language,
  isOnline = true,
  offlineReady = false,
}: DesktopSidebarProps) {
  return (
    <aside
      aria-label="Navigasi utama desktop"
      className="relative z-30 hidden w-16 min-w-16 max-w-16 shrink-0 flex-col justify-between bg-[#0F3D3E] pb-3 text-white lg:flex dark:bg-[#072223]"
    >
      <div className="flex flex-col items-center">
        {/* Titik logo jangkar di (32px, 32px) untuk App Intro Reveal */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center">
          <button
            type="button"
            onClick={() => onNavigate("formulation")}
            aria-label="OpenFormul — Beranda Formulasi"
            title="OpenFormul"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#059669] text-white shadow-xs transition-[transform,background-color] duration-150 hover:bg-[#047857] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 motion-reduce:transform-none"
          >
            <Wheat className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 flex w-full flex-col gap-1.5" aria-label="Menu modul">
          {NAV_ITEMS.map((item) => {
            const active = item.id === route;
            const fullLabel = getNavLabel(item, language);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-label={fullLabel}
                aria-current={active ? "page" : undefined}
                title={fullLabel}
                className={cn(
                  "group relative flex h-12 w-full cursor-pointer items-center justify-center transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-300 motion-reduce:transform-none",
                  active
                    ? "text-[#0F3D3E] dark:text-emerald-400"
                    : "text-[#94A3B8] hover:text-white",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="active-nav-cutout"
                    transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                    className="nav-liquid-cutout"
                    aria-hidden="true"
                  />
                )}

                <span
                  className={cn(
                    "relative z-10 flex items-center justify-center transition-transform duration-150 group-hover:scale-105 motion-reduce:transform-none",
                    active && "translate-x-0.5",
                  )}
                >
                  {renderNavIcon(item.id)}
                </span>

                {/* Tooltip hover instan */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-full z-50 ml-2.5 translate-x-1 rounded-lg bg-[#0F172A] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 shadow-md transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 dark:bg-[#1E333D]"
                >
                  {fullLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center px-1.5">
        <div
          title={
            !isOnline
              ? language === "id"
                ? "Mode Offline"
                : "Offline Mode"
              : offlineReady
                ? language === "id"
                  ? "PWA Siap Offline"
                  : "PWA Offline Ready"
                : "HiGHS Lokal"
          }
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#94A3B8]"
        >
          {!isOnline ? (
            <WifiOff className="h-4 w-4 text-[#D97706]" aria-hidden="true" />
          ) : (
            <Wifi className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
          )}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-full z-50 ml-2.5 translate-x-1 rounded-lg bg-[#0F172A] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 shadow-md transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 dark:bg-[#1E333D]"
          >
            {!isOnline
              ? language === "id"
                ? "Mode Offline"
                : "Offline Mode"
              : offlineReady
                ? language === "id"
                  ? "PWA Siap Offline"
                  : "PWA Offline Ready"
                : "HiGHS Lokal"}
          </span>
        </div>
      </div>
    </aside>
  );
});
