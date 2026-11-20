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

/** Dialog adaptif Tactile Neumorphism tanpa backdrop blur agar tetap 60fps. */
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
      className={cn("fixed inset-0 z-50 flex bg-black/50", containerMode)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden overscroll-contain border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[0_24px_54px_-14px_rgba(0,0,0,0.34),0_4px_16px_-4px_rgba(0,0,0,0.14)]",
          panelRadius,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle !== undefined && (
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="neu-pill-btn inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] md:min-h-8 md:min-w-8"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar mobile-drawer-scroll flex-1 overflow-y-auto overscroll-contain bg-[var(--bg-canvas)] p-5">
          {children}
        </div>

        {footer !== undefined && (
          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
