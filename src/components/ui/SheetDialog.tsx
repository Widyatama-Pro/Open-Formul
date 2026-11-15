import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export interface SheetDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly variant?: "bottom-sheet" | "dialog" | "responsive";
}

/** Dialog adaptif bergaya frosted glass: Bottom Sheet di layar sempit dan Modal di desktop. */
export function SheetDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = "responsive",
}: SheetDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const containerMode =
    variant === "bottom-sheet"
      ? "items-end justify-center p-0"
      : variant === "dialog"
        ? "items-center justify-center p-4"
        : "items-end justify-center p-0 md:items-center md:p-4";

  const panelRadius =
    variant === "bottom-sheet"
      ? "rounded-t-[26px] max-h-[90dvh]"
      : variant === "dialog"
        ? "rounded-[24px] max-w-2xl max-h-[85dvh]"
        : "rounded-t-[26px] max-h-[90dvh] md:max-w-2xl md:rounded-[24px] md:max-h-[85dvh]";

  return (
    <div
      className={cn("fixed inset-0 z-50 flex bg-[#07232C]/45 backdrop-blur-sm", containerMode)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden overscroll-contain border border-white/80 bg-[#F4F9FC]/92 shadow-[0_24px_60px_-12px_rgba(7,41,51,0.34)] backdrop-blur-2xl dark:border-cyan-200/15 dark:bg-[#0B2632]/92",
          panelRadius,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/70 px-5 py-4 dark:border-cyan-200/10">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-[#122B36] dark:text-slate-100">
              {title}
            </h2>
            {subtitle !== undefined && (
              <p className="mt-0.5 text-xs text-[#54707E] dark:text-slate-300">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="neu-pill-btn inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[#375563] md:min-h-8 md:min-w-8 dark:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer !== undefined && (
          <div className="border-t border-white/70 bg-white/55 px-5 py-3.5 dark:border-cyan-200/10 dark:bg-[#08202A]/70">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
