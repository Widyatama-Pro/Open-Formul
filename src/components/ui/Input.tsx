import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean | undefined;
  readonly numeric?: boolean | undefined;
}

/** Input presisi berbingkai #E2E8F0 dengan fokus Precision Emerald dan perataan tabular. */
export function Input({ invalid, numeric, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid === true ? true : undefined}
      className={cn(
        "min-h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-sm text-[#0F172A] placeholder:text-[#64748B] transition-[border-color,background-color] duration-150 focus-visible:border-[#059669] focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#059669]/30 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-8 md:py-1 dark:border-[#1E333D] dark:bg-[#0B1519] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:bg-[#111F26]",
        invalid === true &&
          "border-rose-500 bg-rose-50 text-rose-900 focus-visible:outline-rose-600 dark:border-rose-500 dark:bg-rose-950/35 dark:text-rose-100",
        numeric === true && "text-right tabular-nums",
        className,
      )}
      {...rest}
    />
  );
}
