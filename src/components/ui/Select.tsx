import type { SelectHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly invalid?: boolean | undefined;
}

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid === true ? true : undefined}
      className={cn(
        "min-h-10 w-full cursor-pointer rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] transition-[border-color,background-color] duration-150 focus-visible:border-[#059669] focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#059669]/30 md:min-h-8 md:py-1 dark:border-[#1E333D] dark:bg-[#0B1519] dark:text-slate-100 dark:focus-visible:bg-[#111F26]",
        invalid === true && "border-rose-500",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
