import { Calculator, FolderOpen, Menu, Wheat } from "lucide-react";
import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface MobileBottomNavProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly onOpenDrawer: () => void;
  readonly language: AppLanguage;
}

const PRIMARY_MOBILE_ROUTES: readonly AppRoute[] = ["formulation", "ingredients", "recipes"];

function renderMobileIcon(id: AppRoute) {
  switch (id) {
    case "formulation":
      return <Calculator className="h-[18px] w-[18px]" />;
    case "ingredients":
      return <Wheat className="h-[18px] w-[18px]" />;
    case "recipes":
      return <FolderOpen className="h-[18px] w-[18px]" />;
    default:
      return <Menu className="h-[18px] w-[18px]" />;
  }
}

/** Navigasi bawah bergaya frosted glass dock untuk layar ponsel (< 768px) dengan target sentuh >= 44px. */
export function MobileBottomNav({
  route,
  onNavigate,
  onOpenDrawer,
  language,
}: MobileBottomNavProps) {
  const isOverflowRoute = !PRIMARY_MOBILE_ROUTES.includes(route);

  return (
    <nav
      aria-label="Navigasi bawah mobile"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/80 bg-[#F4F9FC]/88 px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-10px_28px_rgba(14,68,82,0.1)] backdrop-blur-xl md:hidden dark:border-cyan-200/15 dark:bg-[#08222D]/90"
    >
      {PRIMARY_MOBILE_ROUTES.map((id) => {
        const item = NAV_ITEMS.find((n) => n.id === id)!;
        const active = route === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-semibold transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 motion-reduce:transform-none",
              active
                ? "bg-[#0E4756] text-white shadow-[0_6px_14px_rgba(14,71,86,0.28)] dark:bg-cyan-600"
                : "text-[#54707E] hover:text-[#122B36] dark:text-slate-300 dark:hover:text-white",
            )}
          >
            {renderMobileIcon(id)}
            <span className="truncate">{getNavLabel(item, language, true)}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label={language === "id" ? "Buka menu lainnya" : "Open more menu"}
        className={cn(
          "flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-semibold transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 motion-reduce:transform-none",
          isOverflowRoute
            ? "bg-[#0E4756] text-white shadow-[0_6px_14px_rgba(14,71,86,0.28)] dark:bg-cyan-600"
            : "text-[#54707E] hover:text-[#122B36] dark:text-slate-300 dark:hover:text-white",
        )}
      >
        <Menu className="h-[18px] w-[18px]" />
        <span>{language === "id" ? "Menu" : "More"}</span>
      </button>
    </nav>
  );
}
