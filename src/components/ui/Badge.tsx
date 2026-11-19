import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type BadgeTone = "neutral" | "emerald" | "amber" | "rose" | "sky";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]",
  emerald:
    "border-[var(--status-success-border)] bg-[var(--status-success-soft)] text-[var(--status-success)]",
  amber:
    "border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
  rose: "border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] text-[var(--status-danger)]",
  sky: "border-[var(--status-info-border)] bg-[var(--status-info-soft)] text-[var(--status-info)]",
};

/** Lencana status kapsul kontras tinggi tanpa backdrop blur (selalu berpasangan teks/ikon). */
export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    />
  );
}
