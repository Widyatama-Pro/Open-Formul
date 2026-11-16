import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type BadgeTone = "neutral" | "emerald" | "amber" | "rose" | "sky";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral:
    "border-white/80 bg-[#EAF2F6]/85 text-[#3F5B68] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-cyan-200/15 dark:bg-[#0D3240]/80 dark:text-slate-200",
  emerald:
    "border-emerald-300/70 bg-emerald-100/75 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-emerald-700/60 dark:bg-emerald-950/65 dark:text-emerald-300",
  amber:
    "border-amber-300/75 bg-amber-100/75 text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-amber-700/60 dark:bg-amber-950/65 dark:text-amber-200",
  rose: "border-[#F27D6B]/70 bg-rose-100/75 text-rose-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-rose-700/60 dark:bg-rose-950/65 dark:text-rose-200",
  sky: "border-sky-300/75 bg-[#DDF4FD]/85 text-[#0B5A78] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-cyan-600/50 dark:bg-cyan-950/65 dark:text-cyan-200",
};

/** Lencana status kapsul bergaya frosted glass (selalu dipasangkan dengan teks/ikon eksplisit). */
export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap backdrop-blur-xs",
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    />
  );
}
