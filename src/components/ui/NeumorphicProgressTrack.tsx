import { cn } from "../../utils/cn";

export interface ProgressNode {
  readonly label: string | number;
  readonly tone?: "emerald" | "amber" | "coral" | "neutral";
}

export interface NeumorphicProgressTrackProps {
  /** Persentase kemajuan / posisi indikator (0–100). */
  readonly percent: number;
  /** Rentang aman opsional (left% dan width%) untuk visualisasi batas Min–Max nutrien. */
  readonly rangeStartPct?: number | undefined;
  readonly rangeWidthPct?: number | undefined;
  readonly tone?: "emerald" | "amber" | "coral" | "petrol";
  readonly nodes?: readonly ProgressNode[] | undefined;
  readonly showThumb?: boolean | undefined;
  readonly className?: string | undefined;
}

const FILL_CLASSES: Record<NonNullable<NeumorphicProgressTrackProps["tone"]>, string> = {
  emerald: "bg-gradient-to-r from-emerald-500 to-teal-400",
  amber: "bg-gradient-to-r from-amber-400 to-orange-400",
  coral: "bg-gradient-to-r from-[#F26E58] to-rose-500",
  petrol: "bg-gradient-to-r from-[#0E7490] to-[#22D3EE]",
};

const NODE_RING_CLASSES: Record<NonNullable<ProgressNode["tone"]>, string> = {
  emerald: "border-emerald-500 text-emerald-700 dark:text-emerald-300",
  amber: "border-amber-400 text-amber-700 dark:text-amber-300",
  coral: "border-[#EC6453] text-rose-700 dark:text-rose-300",
  neutral: "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300",
};

/**
 * Jalur progres cekung (neumorphic inset groove) dengan penanda node timbul.
 */
export function NeumorphicProgressTrack({
  percent,
  rangeStartPct,
  rangeWidthPct,
  tone = "emerald",
  nodes,
  showThumb = false,
  className,
}: NeumorphicProgressTrackProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn("relative flex items-center", className)}>
      <div className="neu-well relative h-2.5 w-full overflow-hidden rounded-full">
        {rangeStartPct !== undefined && rangeWidthPct !== undefined ? (
          <div
            className="absolute top-0 bottom-0 rounded-full bg-emerald-400/35 dark:bg-emerald-400/25"
            style={{
              left: `${Math.max(0, Math.min(100, rangeStartPct))}%`,
              width: `${Math.max(4, Math.min(100, rangeWidthPct))}%`,
            }}
          />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              FILL_CLASSES[tone],
            )}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>

      {showThumb && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm dark:border-slate-900",
            tone === "emerald"
              ? "bg-emerald-600"
              : tone === "amber"
                ? "bg-amber-500"
                : tone === "coral"
                  ? "bg-[#EC6453]"
                  : "bg-[#0E7490]",
          )}
          style={{ left: `${clamped}%` }}
        />
      )}

      {nodes !== undefined && nodes.length > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
          {nodes.map((node, idx) => (
            <span
              key={`${node.label}-${idx}`}
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 bg-white px-1 text-[10px] font-bold tabular-nums shadow-sm dark:bg-[#0D2E3A]",
                NODE_RING_CLASSES[node.tone ?? "neutral"],
              )}
            >
              {node.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
