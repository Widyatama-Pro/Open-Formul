import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean | undefined;
  readonly numeric?: boolean | undefined;
}

/** Input presisi Tactile Neumorphism dengan perataan tabular dan fokus terkalibrasi tema. */
export function Input({ invalid, numeric, className, ...rest }: InputProps) {
  const hasCustomWidth = typeof className === "string" && /(?:^|\s)w-\S+/.test(className);
  return (
    <input
      aria-invalid={invalid === true ? true : undefined}
      className={cn(
        "min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-neu-pressed)] placeholder:text-[var(--text-muted)] transition-[border-color,background-color] duration-150 focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--bg-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-8 md:py-1",
        !hasCustomWidth && "w-full",
        invalid === true &&
          "border-[var(--status-danger)] bg-[var(--status-danger-soft)] text-[var(--text-primary)] focus-visible:outline-[var(--status-danger)]",
        numeric === true && "text-right tabular-nums",
        className,
      )}
      {...rest}
    />
  );
}
