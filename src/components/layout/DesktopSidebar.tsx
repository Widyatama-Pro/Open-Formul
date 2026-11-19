import { memo } from "react";
import {
  Calculator,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FolderOpen,
  Layers,
  Settings,
  Wheat,
} from "lucide-react";
import { motion } from "motion/react";
import appLogo from "../../assets/logo.jpg";
import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface DesktopSidebarProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
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
 * Sidebar desktop mengikuti token --shell-chrome-bg, logo Open Formulasi,
 * indikator aktif Liquid Concave Cutout, serta tombol perbesar/perkecil yang jelas.
 */
export const DesktopSidebar = memo(function DesktopSidebar({
  route,
  onNavigate,
  language,
  expanded,
  onToggleExpanded,
}: DesktopSidebarProps) {
  return (
    <aside
      aria-label="Navigasi utama desktop"
      className={cn(
        "relative z-30 hidden shrink-0 flex-col justify-between bg-[var(--shell-chrome-bg)] pb-3 text-[var(--shell-chrome-fg)] transition-[width] duration-200 lg:flex",
        expanded ? "w-52 min-w-52 max-w-52" : "w-16 min-w-16 max-w-16",
      )}
    >
      <div className="flex flex-col items-center">
        {/* Titik logo jangkar untuk App Intro Reveal */}
        <div
          className={cn(
            "flex h-[52px] w-full shrink-0 items-center border-b border-[var(--shell-chrome-border)]",
            expanded ? "justify-between px-3" : "justify-center",
          )}
        >
          <button
            type="button"
            onClick={() => onNavigate("formulation")}
            aria-label="Open Formulasi — Beranda Formulasi"
            title="Open Formulasi"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl transition-transform duration-150 hover:opacity-95 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none"
          >
            <img
              src={appLogo}
              alt="Logo Open Formulasi"
              className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
            />
            {expanded && (
              <span className="inline-flex items-baseline gap-1 truncate text-sm font-bold tracking-tight">
                <span className="text-[var(--shell-chrome-fg)]">Open</span>
                <span className="text-[var(--shell-chrome-accent)]">Formulasi</span>
              </span>
            )}
          </button>
        </div>

        <nav className="mt-2.5 flex w-full flex-col gap-1.5" aria-label="Menu modul">
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
                title={expanded ? undefined : fullLabel}
                className={cn(
                  "group relative flex h-11 w-full cursor-pointer items-center transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
                  expanded ? "justify-start gap-2.5 pl-5 pr-3 text-left" : "justify-center",
                  active
                    ? "text-[var(--shell-active-fg)]"
                    : "text-[var(--shell-chrome-muted)] hover:text-[var(--shell-chrome-fg)]",
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
                    active && !expanded && "translate-x-0.5",
                  )}
                >
                  {renderNavIcon(item.id)}
                </span>

                {expanded && (
                  <span className="relative z-10 truncate text-xs font-semibold">{fullLabel}</span>
                )}

                {!expanded && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-full z-50 ml-2.5 translate-x-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-neu-flat)] transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                  >
                    {fullLabel}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tombol perbesar / perkecil sidebar */}
      <div className={cn("flex w-full px-2", expanded ? "justify-end" : "justify-center")}>
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? language === "id"
                ? "Perkecil sidebar navigasi"
                : "Collapse navigation sidebar"
              : language === "id"
                ? "Perbesar sidebar navigasi"
                : "Expand navigation sidebar"
          }
          title={
            expanded
              ? language === "id"
                ? "Perkecil sidebar"
                : "Collapse sidebar"
              : language === "id"
                ? "Perbesar sidebar"
                : "Expand sidebar"
          }
          className={cn(
            "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-btn-bg)] text-xs font-semibold text-[var(--shell-chrome-fg)] transition-[transform,background-color] duration-150 hover:bg-[var(--shell-chrome-btn-hover)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
            expanded ? "w-full px-3" : "w-9",
          )}
        >
          {expanded ? (
            <>
              <ChevronsLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{language === "id" ? "Perkecil Menu" : "Collapse"}</span>
            </>
          ) : (
            <ChevronsRight className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
});
