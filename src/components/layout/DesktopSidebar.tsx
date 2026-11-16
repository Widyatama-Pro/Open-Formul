import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Layers,
  Settings,
  Wheat,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface DesktopSidebarProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
  readonly language: AppLanguage;
  readonly isOnline?: boolean;
  readonly offlineReady?: boolean;
}

function renderNavIcon(id: AppRoute) {
  switch (id) {
    case "formulation":
      return <Calculator className="h-[18px] w-[18px] shrink-0" />;
    case "ingredients":
      return <Wheat className="h-[18px] w-[18px] shrink-0" />;
    case "requirements":
      return <ClipboardList className="h-[18px] w-[18px] shrink-0" />;
    case "recipes":
      return <FolderOpen className="h-[18px] w-[18px] shrink-0" />;
    case "advanced":
      return <Layers className="h-[18px] w-[18px] shrink-0" />;
    case "settings":
      return <Settings className="h-[18px] w-[18px] shrink-0" />;
  }
}

/**
 * Sidebar jangkar petrol-teal gelap bergaya layered glass-neumorphism:
 * default mode rail ikonik (ikon di atas label singkat) dengan kartu aktif putih timbul,
 * dan dapat diperluas untuk tampilan label penuh.
 */
export function DesktopSidebar({
  route,
  onNavigate,
  expanded,
  onToggleExpand,
  language,
  isOnline = true,
  offlineReady = false,
}: DesktopSidebarProps) {
  return (
    <aside
      aria-label="Navigasi utama desktop"
      className={cn(
        "hidden lg:flex lg:shrink-0 lg:flex-col lg:justify-between lg:py-4 lg:pr-4 lg:pl-2.5 text-white transition-[width] duration-200 motion-reduce:transition-none",
        expanded ? "lg:w-60" : "lg:w-[104px]",
      )}
    >
      <div className="flex flex-col gap-3">
        <div
          className={cn("flex items-center px-1", expanded ? "justify-between" : "justify-center")}
        >
          {expanded && (
            <span className="truncate text-xs font-bold tracking-wide text-cyan-100/90 uppercase">
              {language === "id" ? "Navigasi" : "Navigation"}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "Ciutkan sidebar" : "Perluas sidebar"}
            title={expanded ? "Ciutkan sidebar" : "Perluas sidebar"}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-50 transition-[transform,background-color] duration-150 hover:bg-white/20 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transform-none"
          >
            {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const active = item.id === route;
            const fullLabel = getNavLabel(item, language);
            const shortLabel = getNavLabel(item, language, true);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-label={fullLabel}
                aria-current={active ? "page" : undefined}
                title={expanded ? undefined : fullLabel}
                className={cn(
                  "group flex w-full cursor-pointer items-center rounded-2xl transition-[transform,background-color,box-shadow,color] duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transform-none",
                  expanded
                    ? "gap-3 px-3 py-2.5 text-left text-xs font-semibold"
                    : "flex-col justify-center gap-1.5 px-1.5 py-2.5 text-center text-[11px] font-medium",
                  active
                    ? "neu-active-sidebar-tile font-semibold"
                    : "text-cyan-50/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center transition-transform duration-150 group-hover:scale-105 motion-reduce:transform-none",
                    active ? "text-[#0B3A47]" : "text-cyan-100/85 group-hover:text-white",
                  )}
                >
                  {renderNavIcon(item.id)}
                </span>
                <span className="truncate">{expanded ? fullLabel : shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 px-1">
        <div
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2 py-2 text-[10px] font-medium text-cyan-100/90",
            !expanded && "flex-col gap-1 text-center",
          )}
        >
          {!isOnline ? (
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          ) : (
            <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
          )}
          <span className="truncate">
            {!isOnline
              ? language === "id"
                ? expanded
                  ? "Mode Offline"
                  : "Offline"
                : expanded
                  ? "Offline Mode"
                  : "Offline"
              : offlineReady
                ? language === "id"
                  ? expanded
                    ? "Siap Offline"
                    : "PWA Siap"
                  : expanded
                    ? "Offline Ready"
                    : "PWA Ready"
                : "PWA Lokal"}
          </span>
        </div>
      </div>
    </aside>
  );
}
