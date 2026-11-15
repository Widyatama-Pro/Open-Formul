import { OPTIMIZATION_MODE_META } from "../../data/mock-state";
import type { AppLanguage, OptimizationMode } from "../../types";
import { Select } from "../ui/Select";

export interface OptimizationModeSelectorProps {
  readonly value: OptimizationMode;
  readonly onChange: (mode: OptimizationMode) => void;
  readonly language: AppLanguage;
}

const MODES: readonly OptimizationMode[] = [1, 2, 3, 4, 5];

export function OptimizationModeSelector({
  value,
  onChange,
  language,
}: OptimizationModeSelectorProps) {
  const activeMeta = OPTIMIZATION_MODE_META[value];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Select
        aria-label={language === "id" ? "Mode Optimasi" : "Optimization Mode"}
        value={String(value)}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (parsed >= 1 && parsed <= 5) {
            onChange(parsed as OptimizationMode);
          }
        }}
        className="md:min-w-44"
      >
        {MODES.map((m) => {
          const meta = OPTIMIZATION_MODE_META[m];
          return (
            <option key={m} value={m}>
              {m}. {language === "id" ? meta.name : meta.nameEn}
            </option>
          );
        })}
      </Select>
      <p
        className="truncate text-[11px] font-medium text-[#54707E] dark:text-slate-300"
        title={activeMeta.hint}
      >
        {activeMeta.hint}
      </p>
    </div>
  );
}
