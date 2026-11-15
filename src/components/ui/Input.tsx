import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean | undefined;
  readonly numeric?: boolean | undefined;
}

/** Input cekung neumorfik dengan fokus bercahaya cyan-teal dan perataan tabular. */
export function Input({ invalid, numeric, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid === true ? true : undefined}
      className={cn(
        "neu-well min-h-11 w-full rounded-xl px-3 py-1.5 text-sm text-[#122B36] placeholder:text-[#7B94A0] transition-[box-shadow,border-color,background-color] duration-150 focus-visible:bg-white/95 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#0891B2] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-8 md:py-1 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:bg-[#0D303D]",
        invalid === true &&
          "border-[#EC6453] bg-rose-50/75 text-rose-900 focus-visible:outline-rose-600 dark:border-rose-500 dark:bg-rose-950/35 dark:text-rose-100",
        numeric === true && "text-right tabular-nums",
        className,
      )}
      {...rest}
    />
  );
}
