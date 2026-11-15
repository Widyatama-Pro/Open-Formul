import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export type SquircleTone = "sky" | "mint" | "coral" | "orchid" | "amber" | "indigo" | "petrol";

export type SquircleSize = "xs" | "sm" | "md" | "lg";

export interface GlossySquircleIconProps {
  readonly tone?: SquircleTone;
  readonly size?: SquircleSize;
  readonly icon?: ReactNode;
  readonly className?: string | undefined;
}

const TONE_GRADIENTS: Record<SquircleTone, string> = {
  sky: "from-[#5BC8FF] via-[#279CE8] to-[#0E74C9] shadow-[0_8px_18px_-4px_rgba(20,136,214,0.42)]",
  mint: "from-[#43E6B5] via-[#10C293] to-[#04936E] shadow-[0_8px_18px_-4px_rgba(16,185,129,0.4)]",
  coral: "from-[#FFA27F] via-[#F26E58] to-[#DB4738] shadow-[0_8px_18px_-4px_rgba(236,100,83,0.42)]",
  orchid:
    "from-[#F69AD0] via-[#DC62AD] to-[#B83286] shadow-[0_8px_18px_-4px_rgba(219,39,119,0.38)]",
  amber: "from-[#FCD35D] via-[#F59E0B] to-[#D97706] shadow-[0_8px_18px_-4px_rgba(245,158,11,0.4)]",
  indigo: "from-[#9DA8FF] via-[#686DF2] to-[#4745D6] shadow-[0_8px_18px_-4px_rgba(79,70,229,0.38)]",
  petrol: "from-[#22B8CF] via-[#0E7490] to-[#0B4657] shadow-[0_8px_18px_-4px_rgba(14,75,90,0.44)]",
};

const SIZE_CLASSES: Record<SquircleSize, string> = {
  xs: "h-7 w-7 rounded-[9px]",
  sm: "h-9 w-9 rounded-[11px]",
  md: "h-11 w-11 rounded-[14px]",
  lg: "h-14 w-14 rounded-[18px]",
};

/**
 * Ikon squircle kaca berlapis gradien & kilap spekular lembut
 * (terinspirasi dari ubin ikon kategori pada desain referensi).
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
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br text-white ring-1 ring-inset ring-white/50",
        TONE_GRADIENTS[tone],
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
        <path d="M0 0 H46 C46 25 25 46 0 46 Z" fill="rgba(255,255,255,0.24)" />
        <path d="M12 64 C12 40 34 22 64 22 V64 Z" fill="rgba(255,255,255,0.12)" />
        <path d="M20 64 C20 44 40 28 64 28" stroke="rgba(255,255,255,0.48)" strokeWidth="1.5" />
      </svg>
      {icon !== undefined && <span className="relative z-10 flex items-center">{icon}</span>}
    </span>
  );
}
