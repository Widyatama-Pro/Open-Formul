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
    <Select
      aria-label={language === "id" ? "Mode Optimasi" : "Optimization Mode"}
      title={activeMeta.hint}
      value={String(value)}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        if (parsed >= 1 && parsed <= 5) {
          onChange(parsed as OptimizationMode);
        }
      }}
      className="h-7 min-h-7 w-auto py-0 text-[11px] md:min-w-40"
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
  );
}
