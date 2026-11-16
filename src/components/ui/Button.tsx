import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "neu-cta-btn text-white border border-transparent",
  secondary: "neu-pill-btn text-[#0F172A] dark:text-slate-100",
  ghost:
    "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] active:scale-[0.97] dark:text-slate-300 dark:hover:bg-[#162831] dark:hover:text-white",
  danger: "bg-rose-600 text-white border border-transparent hover:bg-rose-700 active:scale-[0.97]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3 text-xs md:min-h-8 md:px-2.5",
  md: "min-h-10 px-4 text-sm md:min-h-9",
};

/** Tombol taktil Precision Agritech dengan animasi tekan GPU-composited. */
export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold transition-[transform,background-color,border-color,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
}
