import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type BadgeTone = "neutral" | "emerald" | "amber" | "rose" | "sky";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral:
    "border-[#E2E8F0] bg-[#F1F5F9] text-[#475569] dark:border-[#1E333D] dark:bg-[#162831] dark:text-slate-300",
  emerald:
    "border-emerald-200 bg-emerald-50 text-[#047857] dark:border-emerald-800/70 dark:bg-emerald-950/65 dark:text-emerald-300",
  amber:
    "border-amber-200 bg-amber-50 text-[#B45309] dark:border-amber-800/70 dark:bg-amber-950/65 dark:text-amber-200",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/65 dark:text-rose-200",
  sky: "border-teal-200 bg-teal-50 text-[#0F3D3E] dark:border-teal-800/70 dark:bg-teal-950/65 dark:text-teal-200",
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
