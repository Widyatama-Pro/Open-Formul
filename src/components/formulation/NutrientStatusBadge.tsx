import { ArrowDown, ArrowUp, CheckCircle2, Minus } from "lucide-react";
import { getNutrientStatusLabel } from "../../i18n";
import type { AppLanguage, NutrientStatus } from "../../types";
import { formatNumberLocale } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";

export interface NutrientStatusBadgeProps {
  readonly status: NutrientStatus;
  readonly deviation?: number | undefined;
  readonly digits?: number | undefined;
  readonly language?: AppLanguage;
}

/** Indikator status wajib menggabungkan ikon + warna + teks untuk aksesibilitas. */
export function NutrientStatusBadge({
  status,
  deviation,
  digits = 2,
  language = "id",
}: NutrientStatusBadgeProps) {
  if (status === "met") {
    return (
      <Badge tone="emerald">
        <CheckCircle2 className="h-3 w-3" />
        <span>{getNutrientStatusLabel(language, "met")}</span>
      </Badge>
    );
  }

  if (status === "below_min") {
    return (
      <Badge tone="rose">
        <ArrowDown className="h-3 w-3" />
        <span className="tabular-nums">
          {getNutrientStatusLabel(language, "below_min")}
          {deviation !== undefined ? ` (${formatNumberLocale(deviation, digits)})` : ""}
        </span>
      </Badge>
    );
  }

  if (status === "above_max") {
    return (
      <Badge tone="rose">
        <ArrowUp className="h-3 w-3" />
        <span className="tabular-nums">
          {getNutrientStatusLabel(language, "above_max")}
          {deviation !== undefined ? ` (+${formatNumberLocale(deviation, digits)})` : ""}
        </span>
      </Badge>
    );
  }

  return (
    <Badge tone="neutral">
      <Minus className="h-3 w-3" />
      <span>{getNutrientStatusLabel(language, "unconstrained")}</span>
    </Badge>
  );
}
