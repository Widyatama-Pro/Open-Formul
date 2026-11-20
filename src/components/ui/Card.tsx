import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type CardHighlight = "none" | "coral" | "emerald" | "amber";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly interactive?: boolean | undefined;
  readonly highlight?: CardHighlight | undefined;
}

const HIGHLIGHT_CLASS: Record<CardHighlight, string> = {
  none: "",
  coral: "glass-card-coral",
  emerald: "glass-card-emerald",
  amber: "glass-card-amber",
};

/** Permukaan 3-layer Acrylic Glass dengan specular rim light & ambient colored shadow. */
export function Card({ interactive = true, highlight = "none", className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl",
        interactive && "glass-card-interactive",
        HIGHLIGHT_CLASS[highlight],
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-2.5",
        className,
      )}
      {...rest}
    />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...rest} />;
}
