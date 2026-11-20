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
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { AnimatedTextSwap } from "../ui/AnimatedText";
import { TrakteerSupportButton } from "../ui/TrakteerSupportButton";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface DesktopSidebarProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly isOnline?: boolean;
}

function renderNavIcon(id: AppRoute) {
  switch (id) {
    case "formulation":
      return <Calculator className="h-6 w-6 shrink-0" />;
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
 * Sidebar desktop berlapis (Acrylic + Volumetric Glow Pill + Trakteer):
 * - Tab utama "Formulasi Ransum" berukuran 1,5x lebih besar/menonjol (60px vs 40px).
 * - Mode UI Enhancer: latar gradasi mendalam dengan gelombang cahaya bawah, glowing pill aktif,
 *   serta kartu dukungan Trakteer.
 * - Fallback klasik: indikator Liquid Concave Cutout saat UI Enhancer dimatikan.
 */
export const DesktopSidebar = memo(function DesktopSidebar({
  route,
  onNavigate,
  language,
  expanded,
  onToggleExpanded,
}: DesktopSidebarProps) {
  const themeCtx = useOptionalThemeContext();
  const uiEnhancer = themeCtx?.uiEnhancer ?? true;
  const useGpuFlip = (themeCtx?.motionEngine ?? "gpu_flip") === "gpu_flip";

  return (
    <aside
      aria-label="Navigasi utama desktop"
      className={cn(
        "relative z-30 hidden shrink-0 flex-col justify-between pb-3 text-[var(--shell-chrome-fg)] transition-[width] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
        uiEnhancer
          ? "sidebar-acrylic-shell border-r border-white/10"
          : "bg-[var(--shell-chrome-bg)]",
        expanded ? "w-[228px] min-w-[228px] max-w-[228px]" : "w-[72px] min-w-[72px] max-w-[72px]",
      )}
    >
      <div className="flex flex-col items-center">
        {/* Titik logo jangkar untuk App Intro Reveal (tanpa subjudul "Ransum Presisi") */}
        <div
          className={cn(
            "flex h-[64px] w-full shrink-0 items-center border-b border-white/10",
            expanded ? "justify-between px-4" : "justify-center",
          )}
        >
          <button
            type="button"
            onClick={() => onNavigate("formulation")}
            aria-label="OpenFormul — Beranda Formulasi"
            title="OpenFormul"
            className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl transition-transform duration-150 hover:opacity-95 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none"
          >
            <span className="relative inline-flex shrink-0 rounded-xl p-0.5 ring-1 ring-white/25 shadow-[0_0_18px_var(--sidebar-orb-glow,rgba(16,185,129,0.35))]">
              <img
                src={appLogo}
                alt="Logo OpenFormul"
                className="h-9 w-9 shrink-0 rounded-[10px] object-cover"
              />
            </span>
            {expanded && (
              <span className="inline-flex items-baseline gap-0 text-[19px] font-extrabold tracking-tight leading-none">
                <span className="text-white">Open</span>
                <span className="text-[var(--shell-chrome-accent)]">Formul</span>
              </span>
            )}
          </button>
        </div>

        <nav
          className={cn("mt-3 flex w-full flex-col gap-1", uiEnhancer ? "px-2" : "px-0")}
          aria-label="Menu modul"
        >
          {NAV_ITEMS.map((item) => {
            const active = item.id === route;
            const isPrimaryHub = item.id === "formulation";
            const fullLabel = getNavLabel(item, language);

            return (
              <div key={item.id} className="w-full">
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-label={fullLabel}
                  aria-current={active ? "page" : undefined}
                  title={expanded ? undefined : fullLabel}
                  data-primary-hub={isPrimaryHub ? "true" : undefined}
                  className={cn(
                    "group relative flex w-full cursor-pointer items-center transition-[transform,color,background-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
                    (uiEnhancer || !active) && "active:scale-[0.98]",
                    uiEnhancer
                      ? isPrimaryHub
                        ? "h-[60px] rounded-2xl border border-white/15 bg-white/6 shadow-[0_6px_20px_-6px_rgba(16,185,129,0.28)]"
                        : "h-10 rounded-xl"
                      : isPrimaryHub
                        ? "h-[60px] rounded-none"
                        : "h-10 rounded-none",
                    expanded
                      ? uiEnhancer
                        ? isPrimaryHub
                          ? "justify-start gap-3 px-3.5 text-left"
                          : "justify-start gap-2.5 px-3 text-left"
                        : isPrimaryHub
                          ? "justify-start gap-3 pl-5 pr-3 text-left"
                          : "justify-start gap-2.5 pl-5 pr-3 text-left"
                      : uiEnhancer
                        ? "justify-center px-0"
                        : "justify-center pl-1.5 pr-0",
                    active
                      ? uiEnhancer
                        ? "text-white"
                        : "text-[var(--shell-active-fg)]"
                      : uiEnhancer
                        ? "text-white/75 hover:bg-white/10 hover:text-white"
                        : "text-white/75 hover:text-white",
                  )}
                >
                  {!uiEnhancer && isPrimaryHub && !active && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2 inset-y-1 rounded-2xl border border-white/15 bg-white/6 transition-colors group-hover:bg-white/12"
                    />
                  )}
                  {!uiEnhancer && !isPrimaryHub && !active && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2 inset-y-0.5 rounded-xl bg-transparent transition-colors group-hover:bg-white/10"
                    />
                  )}

                  {active &&
                    (uiEnhancer ? (
                      <motion.span
                        {...(useGpuFlip ? { layoutId: "active-nav-glowing-pill" } : {})}
                        transition={{ type: "spring", stiffness: 440, damping: 34, mass: 0.8 }}
                        className={cn(
                          "glowing-nav-pill pointer-events-none absolute inset-0",
                          isPrimaryHub ? "rounded-2xl" : "rounded-xl",
                        )}
                        aria-hidden="true"
                      />
                    ) : (
                      <motion.span
                        {...(useGpuFlip ? { layoutId: "active-nav-cutout" } : {})}
                        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                        className="nav-liquid-cutout"
                        aria-hidden="true"
                      />
                    ))}

                  <span
                    className={cn(
                      "relative z-10 flex items-center justify-center transition-transform duration-150 group-hover:scale-105 motion-reduce:transform-none",
                      isPrimaryHub &&
                        (active && !uiEnhancer
                          ? "h-9 w-9 shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--primary-soft)] text-[var(--shell-active-fg)] shadow-xs"
                          : "h-9 w-9 shrink-0 rounded-xl border border-white/20 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"),
                      active && uiEnhancer && "drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]",
                    )}
                  >
                    {renderNavIcon(item.id)}
                  </span>

                  {expanded && (
                    <span
                      className={cn(
                        "relative z-10 min-w-0 flex-1 truncate",
                        isPrimaryHub
                          ? "text-[15px] font-extrabold tracking-tight"
                          : "text-xs font-semibold",
                      )}
                    >
                      <AnimatedTextSwap text={fullLabel} />
                    </span>
                  )}

                  {!expanded && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-full z-50 ml-3 translate-x-1 rounded-lg border border-white/15 bg-[var(--sidebar-deep-end,var(--bg-surface-elevated))] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                    >
                      {fullLabel}
                    </span>
                  )}
                </button>
                {isPrimaryHub && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "border-b border-white/12 opacity-80",
                      uiEnhancer ? "mx-2 my-2" : "my-3 mr-5 ml-3",
                    )}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Sidebar: Tombol Trakteer + Tombol Collapse (tanpa kartu profil pengguna online) */}
      <div className={cn("flex w-full flex-col gap-2 px-2.5", !expanded && "items-center px-2")}>
        <TrakteerSupportButton variant="sidebar" compact={!expanded} language={language} />

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
            "elastic-size-box inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 text-xs font-semibold text-white/90 transition-[transform,background-color] duration-150 hover:bg-white/18 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
            expanded ? "w-full px-3" : "w-9",
          )}
        >
          {expanded ? (
            <>
              <ChevronsLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">
                <AnimatedTextSwap text={language === "id" ? "Perkecil Menu" : "Collapse"} />
              </span>
            </>
          ) : (
            <ChevronsRight className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
});
