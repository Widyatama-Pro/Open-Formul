import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "neu-cta-btn text-white border border-white/15",
  secondary: "neu-pill-btn text-[#123340] dark:text-slate-100",
  ghost:
    "text-[#375563] hover:bg-white/65 hover:shadow-[0_4px_12px_rgba(14,68,82,0.08)] active:scale-[0.97] dark:text-slate-200 dark:hover:bg-[#133D4E]/70",
  danger:
    "bg-gradient-to-br from-[#F26E58] to-rose-600 text-white shadow-[0_8px_18px_-4px_rgba(225,29,72,0.34)] hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.97]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 text-sm md:min-h-8 md:px-3 md:text-xs",
  md: "min-h-11 px-4 text-sm md:min-h-9",
};

/** Tombol neumorfik-kaca dengan animasi tekan taktil & area sentuh minimal 44px di mobile. */
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
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-[transform,box-shadow,background-color,border-color,filter] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0891B2] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
}
