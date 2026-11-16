import { cn } from "../../utils/cn";

export interface TabOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly badge?: string | number | undefined;
}

export interface SegmentedTabsProps<T extends string> {
  readonly options: readonly TabOption<T>[];
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly ariaLabel: string;
  readonly className?: string | undefined;
}

/** Kontrol tab tersegmentasi dengan slide horizontal mulus tanpa scrollbar. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar inline-flex w-full overflow-x-auto rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] p-1 dark:border-[#1E333D] dark:bg-[#0B1519]",
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
              "inline-flex min-h-9 flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669] md:min-h-7 motion-reduce:transform-none",
              active
                ? "bg-white text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:bg-[#111F26] dark:text-white"
                : "text-[#475569] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white",
            )}
          >
            <span className="truncate">{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-emerald-50 text-[#059669] dark:bg-emerald-950/70 dark:text-emerald-300"
                    : "bg-white text-[#475569] dark:bg-[#162831] dark:text-slate-300",
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
