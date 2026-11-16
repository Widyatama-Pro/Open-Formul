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
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface MobileNavDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly theme: ThemeMode;
  readonly onToggleTheme: () => void;
  readonly onToggleLanguage: () => void;
}

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

export function MobileNavDrawer({
  open,
  onClose,
  route,
  onNavigate,
  language,
  theme,
  onToggleTheme,
  onToggleLanguage,
}: MobileNavDrawerProps) {
  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title="Open Formul"
      subtitle={
        language === "id" ? "Navigasi Modul & Preferensi" : "Module Navigation & Preferences"
      }
      variant="responsive"
    >
      <div className="space-y-4">
        <div className="space-y-1.5 rounded-2xl bg-gradient-to-b from-[#0E4756] to-[#082B35] p-2.5 shadow-inner">
          {NAV_ITEMS.map((item) => {
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
                  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 text-left text-sm font-semibold transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.98] motion-reduce:transform-none",
                  active
                    ? "neu-active-sidebar-tile"
                    : "text-cyan-50/80 hover:bg-white/10 hover:text-white",
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
            className="neu-pill-btn flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#123340] dark:text-slate-100"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>{theme === "light" ? "Mode Gelap" : "Mode Terang"}</span>
          </button>
          <button
            type="button"
            onClick={onToggleLanguage}
            className="neu-pill-btn flex min-h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-bold uppercase text-[#123340] dark:text-slate-100"
          >
            {language === "id" ? "Bahasa: ID" : "Language: EN"}
          </button>
        </div>
      </div>
    </SheetDialog>
  );
}
