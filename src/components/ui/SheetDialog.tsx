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

/** Dialog adaptif crisp surface (#FFFFFF) tanpa backdrop blur agar tetap 60fps. */
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
      ? "rounded-t-2xl max-h-[90dvh]"
      : variant === "dialog"
        ? "rounded-2xl max-w-2xl max-h-[85dvh]"
        : "rounded-t-2xl max-h-[90dvh] md:max-w-2xl md:rounded-2xl md:max-h-[85dvh]";

  return (
    <div
      className={cn("fixed inset-0 z-50 flex bg-[#0F172A]/45", containerMode)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden overscroll-contain border border-[#E2E8F0] bg-white shadow-[0_20px_48px_-12px_rgba(15,23,42,0.22)] dark:border-[#1E333D] dark:bg-[#111F26]",
          panelRadius,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-5 py-3.5 dark:border-[#1E333D]">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-[#0F172A] dark:text-slate-100">
              {title}
            </h2>
            {subtitle !== undefined && (
              <p className="mt-0.5 text-xs text-[#475569] dark:text-slate-300">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="neu-pill-btn inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full text-[#475569] md:min-h-8 md:min-w-8 dark:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-5">{children}</div>

        {footer !== undefined && (
          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 dark:border-[#1E333D] dark:bg-[#0B1519]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
