import { cn } from "../../utils/cn";

export interface TabOption<T extends string> {
  readonly value: T;
  readonly label: string;
  /** Label ringkas opsional khusus layar mobile (< sm) agar seluruh tab muat tanpa terpotong. */
  readonly mobileLabel?: string | undefined;
  readonly badge?: string | number | undefined;
}

export interface SegmentedTabsProps<T extends string> {
  readonly options: readonly TabOption<T>[];
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly ariaLabel: string;
  /** Bila aktif, semua tab muat proporsional dalam lebar layar HP tanpa overflow horizontal. */
  readonly fitMobile?: boolean | undefined;
  readonly className?: string | undefined;
}

/** Kontrol tab tersegmentasi yang adaptif pada desktop maupun layar HP sempit. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fitMobile = false,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "neu-pressed rounded-xl p-1",
        fitMobile
          ? "grid w-full grid-flow-col auto-cols-fr gap-0.5 sm:inline-flex sm:w-auto sm:gap-1"
          : "no-scrollbar inline-flex w-full overflow-x-auto",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center rounded-lg font-semibold transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
              fitMobile
                ? "min-h-10 min-w-0 flex-wrap gap-1 px-1.5 py-1 text-center text-[11px] leading-tight sm:min-h-7 sm:flex-nowrap sm:gap-1.5 sm:px-2.5 sm:text-xs sm:whitespace-nowrap"
                : "min-h-9 flex-1 shrink-0 gap-1.5 px-2.5 py-1 text-xs whitespace-nowrap md:min-h-7",
              active
                ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {opt.mobileLabel ? (
              <>
                <span aria-hidden="true" className="sm:hidden">
                  {opt.mobileLabel}
                </span>
                <span className="sr-only truncate sm:not-sr-only">{opt.label}</span>
              </>
            ) : (
              <span className={cn(fitMobile ? "break-words sm:truncate" : "truncate")}>
                {opt.label}
              </span>
            )}
            {opt.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-[var(--status-success-soft)] text-[var(--status-success)]"
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
