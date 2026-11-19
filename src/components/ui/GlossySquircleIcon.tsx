import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../utils/cn";

export type SquircleTone = "sky" | "mint" | "coral" | "orchid" | "amber" | "indigo" | "petrol";

export type SquircleSize = "xs" | "sm" | "md" | "lg";

export interface GlossySquircleIconProps {
  readonly tone?: SquircleTone;
  readonly size?: SquircleSize;
  readonly icon?: ReactNode;
  readonly className?: string | undefined;
}

function buildSquircleStyle(tokenVar: string): CSSProperties {
  return {
    backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${tokenVar} 82%, black), color-mix(in srgb, ${tokenVar} 56%, black))`,
    boxShadow: `0 8px 18px -4px color-mix(in srgb, ${tokenVar} 38%, transparent)`,
  };
}

const TONE_STYLES: Record<SquircleTone, CSSProperties> = {
  sky: buildSquircleStyle("var(--status-info)"),
  mint: buildSquircleStyle("var(--status-success)"),
  coral: buildSquircleStyle("var(--status-danger)"),
  orchid: buildSquircleStyle("var(--color-accent)"),
  amber: buildSquircleStyle("var(--status-warning)"),
  indigo: buildSquircleStyle("var(--color-secondary)"),
  petrol: buildSquircleStyle("var(--color-primary)"),
};

const SIZE_CLASSES: Record<SquircleSize, string> = {
  xs: "h-7 w-7 rounded-[9px]",
  sm: "h-9 w-9 rounded-[11px]",
  md: "h-11 w-11 rounded-[14px]",
  lg: "h-14 w-14 rounded-[18px]",
};

/**
 * Ikon squircle kaca berlapis gradien semantik & kilap spekular lembut
 * yang beradaptasi terhadap 14 varian tema.
 */
export function GlossySquircleIcon({
  tone = "sky",
  size = "sm",
  icon,
  className,
}: GlossySquircleIconProps) {
  return (
    <span
      aria-hidden="true"
      style={TONE_STYLES[tone]}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden text-white ring-1 ring-inset ring-white/40",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {/* Lapisan kilap lengkung kaca */}
      <svg
        viewBox="0 0 64 64"
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
      >
        <path d="M0 0 H46 C46 25 25 46 0 46 Z" fill="rgba(255,255,255,0.20)" />
        <path d="M12 64 C12 40 34 22 64 22 V64 Z" fill="rgba(255,255,255,0.10)" />
        <path d="M20 64 C20 44 40 28 64 28" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
      </svg>
      {icon !== undefined && <span className="relative z-10 flex items-center">{icon}</span>}
    </span>
  );
}
