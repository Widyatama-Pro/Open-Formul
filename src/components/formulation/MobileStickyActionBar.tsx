import { memo } from "react";
import { Calculator } from "lucide-react";
import { pickLang } from "../../i18n";
import type { AppLanguage, FormulationStatus } from "../../types";
import { formatCurrencyIdr } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export interface MobileStickyActionBarProps {
  readonly status: FormulationStatus;
  readonly costPerKg: number | null;
  readonly activeStep: "ingredients" | "targets" | "results";
  readonly language?: AppLanguage;
  readonly onShowResults: () => void;
}

/** Bar aksi lengket di mobile tepat di atas Bottom Navigation Bar (safe-area aware). */
export const MobileStickyActionBar = memo(function MobileStickyActionBar({
  status,
  costPerKg,
  activeStep,
  language = "id",
  onShowResults,
}: MobileStickyActionBarProps) {
  const statusBadge =
    status === "optimal" ? (
      <Badge tone="emerald">Optimal</Badge>
    ) : status === "near_feasible" ? (
      <Badge tone="amber">{pickLang(language, "Elastik", "Elastic")}</Badge>
    ) : (
      <Badge tone="rose">Infeasible</Badge>
    );

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+var(--safe-area-bottom))] z-30 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            {pickLang(language, "Estimasi/kg", "Est./kg")}
          </span>
          {statusBadge}
        </div>
        <p className="truncate text-sm font-bold tabular-nums text-[var(--text-primary)]">
          {costPerKg !== null
            ? formatCurrencyIdr(costPerKg)
            : pickLang(language, "Belum layak", "Not feasible")}
        </p>
      </div>

      <Button variant="primary" size="md" onClick={onShowResults} className="shrink-0">
        <Calculator className="h-4 w-4" />
        <span>
          {activeStep === "results"
            ? pickLang(language, "Hitung Ulang", "Recalculate")
            : pickLang(language, "Lihat Hasil", "View Results")}
        </span>
      </Button>
    </div>
  );
});
