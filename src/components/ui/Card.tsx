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

/** Permukaan kartu kaca-neumorfik dengan elevasi halus saat hover. */
export function Card({ interactive = true, highlight = "none", className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-[20px]",
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
        "flex items-center justify-between gap-4 border-b border-white/60 px-4 py-3 dark:border-cyan-200/10",
        className,
      )}
      {...rest}
    />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...rest} />;
}
