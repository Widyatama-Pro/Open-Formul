import { memo } from "react";
import { Lock, Unlock } from "lucide-react";
import type { CompositionItem, Ingredient } from "../../types";
import { formatNumberLocale } from "../../utils/locale-number";
import { NumericCellInput } from "../formulation/NumericCellInput";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export interface WhatIfManualLockProps {
  readonly ingredients: readonly Ingredient[];
  readonly composition: readonly CompositionItem[];
  readonly manualLocks: Readonly<Record<string, number>>;
  readonly onSetManualLock: (id: string, pct: number | null) => void;
  readonly onClearLocks: () => void;
}

/** Simulasi "What-If" Manual Lock dengan elevasi crisp card. */
export const WhatIfManualLock = memo(function WhatIfManualLock({
  ingredients,
  composition,
  manualLocks,
  onSetManualLock,
  onClearLocks,
}: WhatIfManualLockProps) {
  const active = ingredients.filter((i) => i.isActive !== false);
  const compMap = new Map(composition.map((c) => [c.ingredientId, c.fraction * 100]));
  const totalLocked = Object.values(manualLocks).reduce((acc, v) => acc + v, 0);

  return (
    <div className="space-y-3 text-xs">
      <div className="neu-well flex flex-wrap items-center justify-between gap-2 rounded-xl p-2.5">
        <div>
          <p className="font-bold text-[#0F172A] dark:text-white">
            Simulasi Tukar Bahan Cepat (&ldquo;What-If&rdquo; Lock)
          </p>
          <p className="text-[11px] text-[#475569] dark:text-slate-300">
            Kunci persentase bahan tertentu (total terkunci:{" "}
            <strong className="tabular-nums text-[#0F172A] dark:text-white">
              {formatNumberLocale(totalLocked, 1)}%
            </strong>{" "}
            / 100%)
          </p>
        </div>
        {Object.keys(manualLocks).length > 0 && (
          <Button variant="secondary" size="sm" onClick={onClearLocks}>
            Reset Semua Kunci
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {active.map((ing) => {
          const lockedVal = manualLocks[ing.id];
          const isLocked = lockedVal !== undefined;
          const currentPct = lockedVal ?? compMap.get(ing.id) ?? 0;

          return (
            <Card
              key={ing.id}
              highlight={isLocked ? "amber" : "none"}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-2.5"
            >
              <button
                type="button"
                onClick={() =>
                  onSetManualLock(ing.id, isLocked ? null : Number(currentPct.toFixed(1)))
                }
                className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-left font-semibold text-[#0F172A] dark:text-white"
              >
                {isLocked ? (
                  <Lock className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                ) : (
                  <Unlock className="h-3.5 w-3.5 text-[#475569]" />
                )}
                <span>{ing.name}</span>
              </button>

              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  min={0}
                  max={ing.inclusion?.max ?? 100}
                  step={0.5}
                  value={currentPct}
                  aria-label={`Slider What-If ${ing.name}`}
                  onChange={(e) => onSetManualLock(ing.id, Number(e.target.value))}
                  className="w-24 cursor-pointer accent-[#059669] sm:w-32"
                />
                <div className="w-20">
                  <NumericCellInput
                    value={currentPct}
                    fractionDigits={1}
                    ariaLabel={`Persentase What-If ${ing.name}`}
                    onCommit={(val) => onSetManualLock(ing.id, val)}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
});
