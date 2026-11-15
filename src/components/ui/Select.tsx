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
        "neu-well min-h-11 w-full cursor-pointer rounded-xl px-3 py-1.5 text-sm font-medium text-[#122B36] transition-[box-shadow,border-color,background-color] duration-150 focus-visible:bg-white/95 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#0891B2] md:min-h-8 md:px-2.5 md:py-1 dark:text-slate-100 dark:focus-visible:bg-[#0D303D]",
        invalid === true && "border-[#EC6453]",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
