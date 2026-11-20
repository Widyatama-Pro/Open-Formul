import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type BadgeTone = "neutral" | "emerald" | "amber" | "rose" | "sky";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]",
  emerald: "glow-pill-emerald border-[var(--status-success-border)] text-[var(--status-success)]",
  amber:
    "border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] text-[var(--status-warning)] shadow-[0_2px_10px_-2px_color-mix(in_srgb,var(--status-warning)_22%,transparent)]",
  rose: "border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] text-[var(--status-danger)] shadow-[0_2px_10px_-2px_color-mix(in_srgb,var(--status-danger)_24%,transparent)]",
  sky: "border-[var(--status-info-border)] bg-[var(--status-info-soft)] text-[var(--status-info)] shadow-[0_2px_10px_-2px_color-mix(in_srgb,var(--status-info)_22%,transparent)]",
};

/** Lencana status kapsul kaca bercahaya kontras tinggi (selalu berpasangan teks/ikon). */
export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "elastic-size-box inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    />
  );
}
