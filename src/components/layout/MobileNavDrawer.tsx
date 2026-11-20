import { memo } from "react";
import {
  Calculator,
  ClipboardList,
  FolderOpen,
  Layers,
  Moon,
  Settings,
  Sun,
  Wheat,
} from "lucide-react";
import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { SheetDialog } from "../ui/SheetDialog";
import { TrakteerSupportButton } from "../ui/TrakteerSupportButton";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface MobileNavDrawerProps {
  readonly open: boolean;
  /**
   * Saat dibuka dari tombol "Menu" di Mobile Bottom Navigation, tampilkan HANYA menu sekunder
   * (Profil Kebutuhan Ternak, Modul Lanjutan, Pengaturan) tanpa menduplikasi menu bar bawah.
   */
  readonly secondaryOnly?: boolean;
  readonly onClose: () => void;
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly theme: ThemeMode;
  readonly onToggleTheme: () => void;
  readonly onToggleLanguage: () => void;
}

const PRIMARY_BOTTOM_NAV_ROUTES = new Set<AppRoute>(["formulation", "ingredients", "recipes"]);

function renderIcon(id: AppRoute) {
  switch (id) {
    case "formulation":
      return <Calculator className="h-4 w-4" />;
    case "ingredients":
      return <Wheat className="h-4 w-4" />;
    case "requirements":
      return <ClipboardList className="h-4 w-4" />;
    case "recipes":
      return <FolderOpen className="h-4 w-4" />;
    case "advanced":
      return <Layers className="h-4 w-4" />;
    case "settings":
      return <Settings className="h-4 w-4" />;
  }
}

export const MobileNavDrawer = memo(function MobileNavDrawer({
  open,
  secondaryOnly = true,
  onClose,
  route,
  onNavigate,
  language,
  theme,
  onToggleTheme,
  onToggleLanguage,
}: MobileNavDrawerProps) {
  const visibleItems = secondaryOnly
    ? NAV_ITEMS.filter((item) => !PRIMARY_BOTTOM_NAV_ROUTES.has(item.id))
    : NAV_ITEMS;

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={language === "id" ? "Menu & Pengaturan" : "Menu & Settings"}
      subtitle={
        language === "id"
          ? "Profil ternak, modul lanjutan, dan preferensi tampilan"
          : "Livestock profiles, advanced modules, and display preferences"
      }
      variant="responsive"
    >
      <div className="space-y-4">
        <div className="space-y-1.5 rounded-xl border border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-bg)] p-2.5">
          {visibleItems.map((item) => {
            const active = item.id === route;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={cn(
                  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3.5 text-left text-sm font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.98] motion-reduce:transform-none",
                  active
                    ? "bg-[var(--bg-canvas)] text-[var(--shell-active-fg)] shadow-[var(--shadow-neu-flat)]"
                    : "text-[var(--shell-chrome-muted)] hover:bg-[var(--shell-chrome-btn-hover)] hover:text-[var(--shell-chrome-fg)]",
                )}
              >
                {renderIcon(item.id)}
                <span>{getNavLabel(item, language)}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onToggleTheme}
            className="neu-pill-btn flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[var(--text-primary)]"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>
              {theme === "light"
                ? language === "id"
                  ? "Mode Gelap"
                  : "Dark Mode"
                : language === "id"
                  ? "Mode Terang"
                  : "Light Mode"}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleLanguage}
            className="neu-pill-btn flex min-h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-bold uppercase text-[var(--text-primary)]"
          >
            {language === "id" ? "Bahasa: ID" : "Language: EN"}
          </button>
        </div>

        <TrakteerSupportButton variant="sidebar" compact={false} language={language} />
      </div>
    </SheetDialog>
  );
});
