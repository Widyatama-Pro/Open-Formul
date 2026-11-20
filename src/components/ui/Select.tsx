import type { SelectHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly invalid?: boolean | undefined;
}

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  const hasCustomWidth = typeof className === "string" && /(?:^|\s)w-\S+/.test(className);
  return (
    <select
      aria-invalid={invalid === true ? true : undefined}
      className={cn(
        "min-h-10 min-w-0 max-w-full cursor-pointer truncate rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-[var(--shadow-neu-pressed)] transition-[border-color,background-color] duration-150 focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--bg-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)] md:min-h-8 md:py-1",
        !hasCustomWidth && "w-full",
        invalid === true && "border-[var(--status-danger)]",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
