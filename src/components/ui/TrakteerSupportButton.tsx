import { Coffee, ExternalLink, Heart } from "lucide-react";
import { pickLang } from "../../i18n";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { handleExternalLinkClick } from "../../utils/external-link";

export const TRAKTEER_SUPPORT_URL = "https://trakteer.id/reza_widya_utama/tip?open=true";

export interface TrakteerSupportButtonProps {
  readonly variant?: "sidebar" | "settings";
  readonly compact?: boolean;
  /** Permukaan tempat tombol dirender: "dark" (sidebar gelap) atau "adaptive" (mengikuti Light/Dark mode). */
  readonly surface?: "dark" | "adaptive";
  readonly language?: AppLanguage;
  readonly className?: string;
}

/**
 * Tombol / kartu dukungan kreator Trakteer dengan bahasa desain acrylic glass & golden/coral rim glow.
 */
export function TrakteerSupportButton({
  variant = "sidebar",
  compact = false,
  surface = "dark",
  language = "id",
  className,
}: TrakteerSupportButtonProps) {
  const label = pickLang(language, "Dukung via Trakteer", "Support via Trakteer");
  const subtitle = pickLang(
    language,
    "Traktir kopi & dukung riset OpenFormu",
    "Buy a coffee & support OpenFormu",
  );

  if (variant === "settings") {
    return (
      <div
        className={cn(
          "trakteer-glass-card relative overflow-hidden rounded-2xl p-3.5 sm:p-5",
          className,
        )}
      >
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-400/30 to-rose-500/25 text-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.28)] dark:border-amber-300/45 dark:text-amber-400 sm:h-11 sm:w-11"
            >
              <Coffee className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {pickLang(language, "Dukung Kreator OpenFormu", "Support OpenFormu Creator")}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                  <Heart className="h-2.5 w-2.5 fill-current" />
                  <span>Open-Source</span>
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {pickLang(
                  language,
                  "OpenFormu dikembangkan gratis & offline-first untuk peternak serta formulator. Dukungan Anda membantu pembaruan standar SNI/NRC dan pengembangan fitur baru.",
                  "OpenFormu is built free & offline-first for farmers and nutritionists. Your support helps maintain SNI/NRC data and new solver tools.",
                )}
              </p>
            </div>
          </div>

          <a
            href={TRAKTEER_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleExternalLinkClick(e, TRAKTEER_SUPPORT_URL)}
            aria-label={label}
            className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300/55 bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-[0_6px_22px_-4px_rgba(245,158,11,0.45)] transition-[transform,box-shadow,filter] duration-150 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none sm:w-auto"
          >
            <Coffee className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-85" />
          </a>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <a
        href={TRAKTEER_SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => handleExternalLinkClick(e, TRAKTEER_SUPPORT_URL)}
        aria-label={label}
        title={label}
        className={cn(
          "trakteer-glass-card group relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-amber-200 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
          className,
        )}
      >
        <Coffee className="h-4 w-4 text-amber-300 transition-transform duration-150 group-hover:scale-110" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full z-50 ml-2.5 translate-x-1 rounded-lg border border-amber-300/35 bg-[var(--sidebar-deep-end,var(--shell-chrome-bg))] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-amber-100 opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
        >
          {label}
        </span>
      </a>
    );
  }

  const isAdaptive = surface === "adaptive";

  return (
    <a
      href={TRAKTEER_SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => handleExternalLinkClick(e, TRAKTEER_SUPPORT_URL)}
      aria-label={label}
      title={subtitle}
      className={cn(
        "trakteer-glass-card group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
        isAdaptive &&
          "!border-amber-600/35 !bg-gradient-to-r !from-amber-100/95 !to-orange-100/90 dark:!border-amber-300/35 dark:!from-amber-400/20 dark:!to-rose-500/20",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-[0_0_12px_rgba(251,191,36,0.3)]",
          isAdaptive
            ? "border-amber-600/35 bg-amber-500/20 text-amber-900 dark:border-amber-200/35 dark:bg-gradient-to-br dark:from-amber-400/35 dark:to-rose-500/35 dark:text-amber-100"
            : "border-amber-200/35 bg-gradient-to-br from-amber-400/35 to-rose-500/35 text-amber-100",
        )}
      >
        <Coffee className="h-4 w-4 transition-transform duration-150 group-hover:scale-110" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[11px] font-bold",
            isAdaptive ? "text-amber-950 dark:text-amber-100" : "text-amber-100",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "block truncate text-[9.5px] font-medium",
            isAdaptive ? "text-amber-900/85 dark:text-amber-200/85" : "text-amber-200/80",
          )}
        >
          {pickLang(language, "Traktir kopi kreator", "Buy creator a coffee")}
        </span>
      </span>
      <ExternalLink
        aria-hidden="true"
        className={cn(
          "h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5",
          isAdaptive ? "text-amber-800 dark:text-amber-200/80" : "text-amber-200/75",
        )}
      />
    </a>
  );
}
