import { useCallback, useId, useRef, type KeyboardEvent, type WheelEvent } from "react";
import { motion } from "motion/react";
import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";
import { AnimatedTextSwap } from "./AnimatedText";

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

/** Kontrol tab tersegmentasi 120 FPS dengan GPU shared-layout sliding pill & dukungan wheel/arrow scroll. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fitMobile = false,
  className,
}: SegmentedTabsProps<T>) {
  const pillId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const themeCtx = useOptionalThemeContext();
  const useGpuFlip = (themeCtx?.motionEngine ?? "gpu_flip") === "gpu_flip";

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const el = listRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      el.scrollLeft += event.deltaY;
    }
  }, []);

  const handleKeyDown = useCallback(
    (idx: number, event: KeyboardEvent<HTMLButtonElement>) => {
      if (options.length <= 1) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const nextIdx = (idx + delta + options.length) % options.length;
        const nextOpt = options[nextIdx];
        if (nextOpt) {
          onChange(nextOpt.value);
          const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
          const nextBtn = buttons?.[nextIdx];
          nextBtn?.focus();
          if (typeof nextBtn?.scrollIntoView === "function") {
            nextBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
        }
      }
    },
    [onChange, options],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onWheel={handleWheel}
      className={cn(
        "acrylic-control-capsule rounded-xl p-1",
        fitMobile
          ? "flex w-full items-center justify-between gap-0.5 sm:inline-flex sm:w-auto sm:gap-1"
          : "custom-scrollbar inline-flex w-full overflow-x-auto",
        className,
      )}
    >
      {options.map((opt, idx) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onClick={(e) => {
              onChange(opt.value);
              const el = listRef.current;
              if (
                el &&
                el.scrollWidth > el.clientWidth &&
                typeof e.currentTarget.scrollIntoView === "function"
              ) {
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
              }
            }}
            className={cn(
              "elastic-size-box relative inline-flex cursor-pointer items-center justify-center rounded-lg font-semibold transition-[transform,color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
              fitMobile
                ? "min-h-10 min-w-0 flex-auto gap-1 px-1.5 py-1 text-center text-[11px] leading-none whitespace-nowrap sm:min-h-7 sm:flex-initial sm:gap-1.5 sm:px-2.5 sm:text-xs"
                : "min-h-9 flex-1 shrink-0 gap-1.5 px-2.5 py-1 text-xs whitespace-nowrap md:min-h-7",
              active
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {active &&
              (useGpuFlip ? (
                <motion.span
                  layoutId={`segmented-pill-${pillId}`}
                  transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.75 }}
                  aria-hidden="true"
                  className="acrylic-tab-pill pointer-events-none absolute inset-0 rounded-lg"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-lg bg-[var(--bg-surface-elevated)] shadow-[var(--shadow-neu-flat)]"
                />
              ))}

            <span className="relative z-10 inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap">
              {opt.mobileLabel ? (
                <>
                  <span aria-hidden="true" className="truncate sm:hidden">
                    {opt.mobileLabel}
                  </span>
                  <span className="sr-only truncate sm:not-sr-only">
                    <AnimatedTextSwap text={opt.label} />
                  </span>
                </>
              ) : (
                <span className="truncate">
                  <AnimatedTextSwap text={opt.label} />
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
            </span>
          </button>
        );
      })}
    </div>
  );
}
