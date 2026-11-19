import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "neu-cta-btn border border-transparent",
  secondary: "neu-pill-btn text-[var(--text-primary)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] active:scale-[0.97]",
  danger:
    "border border-transparent bg-[var(--status-danger)] text-[var(--text-on-danger)] shadow-[var(--shadow-neu-flat)] hover:brightness-95 active:scale-[0.97]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3 text-xs md:min-h-8 md:px-2.5",
  md: "min-h-10 px-4 text-sm md:min-h-9",
};

/** Tombol taktil Tactile Neumorphism dengan animasi tekan GPU-composited. */
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
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
}
