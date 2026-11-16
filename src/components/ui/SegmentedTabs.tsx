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

/** Kontrol tab tersegmentasi dalam wadah cekung neumorfik dengan pil aktif timbul. */
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
      className={cn("neu-well inline-flex w-full rounded-2xl p-1", className)}
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
              "inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-[transform,box-shadow,background-color,color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0891B2] md:min-h-7 motion-reduce:transform-none",
              active
                ? "bg-white/95 text-[#0E4452] shadow-[-2px_-2px_6px_rgba(255,255,255,0.9),_3px_4px_10px_rgba(14,68,82,0.12)] dark:bg-[#134659] dark:text-white dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                : "text-[#516D7B] hover:text-[#122B36] dark:text-slate-300 dark:hover:text-white",
            )}
          >
            <span className="truncate">{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-[#DDF4FD] text-[#0B5A78] dark:bg-cyan-900/70 dark:text-cyan-200"
                    : "bg-white/70 text-[#516D7B] dark:bg-slate-800/80 dark:text-slate-300",
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
