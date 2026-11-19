import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { GripVertical, RotateCcw, Sliders } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getNutrientDisplayName, getNutrientFullName, pickLang } from "../../i18n";
import type {
  AppLanguage,
  CompositionItem,
  Ingredient,
  IngredientCategory,
  Nutrient,
} from "../../types";
import { cn } from "../../utils/cn";
import { isDerivedNutrient, resolveNutrientValue } from "../../utils/equations";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { applyTsvGridPaste, type PasteColumnKey } from "../../utils/tsvPaste";
import { Badge } from "../ui/Badge";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientDesktopTableProps {
  readonly ingredients: readonly Ingredient[];
  readonly allIngredients?: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly composition?: readonly CompositionItem[];
  readonly showAdvanceColumns: boolean;
  readonly showNdf?: boolean;
  readonly simpleMode?: boolean;
  readonly scrollMaxHeightClass?: string;
  readonly globalAntiNol?: boolean;
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
  readonly onBatchIngredientsUpdate?: (nextAllIngredients: readonly Ingredient[]) => void;
}

const BASIC_NUTRIENT_IDS = new Set(["cp", "me_poultry", "tdn", "ee", "cf", "ca", "p"]);
const NDF_NUTRIENT_IDS = new Set(["ndf", "adf"]);

const MIN_NAME_COL_WIDTH = 96;
const MAX_NAME_COL_WIDTH = 340;
const DEFAULT_NAME_COL_WIDTH = 196;

const CATEGORY_DOT: Record<IngredientCategory, string> = {
  energy: "bg-[var(--status-warning)]",
  protein: "bg-[var(--status-info)]",
  mineral: "bg-[var(--color-secondary)]",
  premix: "bg-[var(--color-accent)]",
  forage: "bg-[var(--status-success)]",
  additive: "bg-[var(--status-danger)]",
  enzyme: "bg-[var(--color-primary)]",
};

interface CoreColumnVisibility {
  readonly price: boolean;
  readonly dm: boolean;
  readonly bounds: boolean;
  readonly inclusion: boolean;
}

interface IngredientTableRowProps {
  readonly ing: Ingredient;
  readonly rowIdx: number;
  readonly inclusionPct: number;
  readonly nameColWidth: number;
  readonly coreCols: CoreColumnVisibility;
  readonly visibleNutrients: readonly Nutrient[];
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
  readonly onCellPaste: (
    rowIdx: number,
    colKey: PasteColumnKey,
    event: ClipboardEvent<HTMLInputElement>,
  ) => void;
}

const IngredientTableRow = memo(function IngredientTableRow({
  ing,
  rowIdx,
  inclusionPct,
  nameColWidth,
  coreCols,
  visibleNutrients,
  language,
  onUpdateIngredient,
  onResetPriceOverride,
  onOpenDetail,
  onCellPaste,
}: IngredientTableRowProps) {
  const isActive = ing.isActive !== false;
  const min = ing.inclusion?.min ?? 0;
  const max = ing.inclusion?.max ?? 100;
  const invalidBounds = min > max;
  const hasOverride = ing.priceOverride !== undefined;
  const hasInclusion = inclusionPct > 0.005;
  const displayName = language === "id" ? ing.name : (ing.nameEn ?? ing.name);
  const compactName = nameColWidth < 145;

  return (
    <tr
      className={cn(
        "group transition-colors duration-100 hover:bg-[var(--bg-surface)]",
        !isActive && "opacity-55",
      )}
    >
      <td className="sticky left-0 z-10 w-10 border-r border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1.5 py-1.5 text-center transition-colors group-hover:bg-[var(--bg-surface)]">
        <input
          type="checkbox"
          checked={isActive}
          aria-label={`Aktifkan ${ing.name}`}
          onChange={(e) => onUpdateIngredient(ing.id, { isActive: e.target.checked })}
          className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
        />
      </td>

      <td
        style={{
          width: `${nameColWidth}px`,
          minWidth: `${nameColWidth}px`,
          maxWidth: `${nameColWidth}px`,
        }}
        title={displayName}
        className="sticky left-10 z-10 border-r border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-1.5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.10)] transition-colors group-hover:bg-[var(--bg-surface)]"
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("h-2 w-2 shrink-0 rounded-xs", CATEGORY_DOT[ing.category])}
            />
            <span className="truncate font-semibold text-[var(--text-primary)]">{displayName}</span>
          </div>
          {!compactName && (
            <Badge tone={ing.basis === "as_fed" ? "neutral" : "emerald"}>
              {ing.basis === "as_fed" ? "AF" : "BK"}
            </Badge>
          )}
        </div>
      </td>

      {coreCols.price && (
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            <NumericCellInput
              value={ing.priceOverride ?? ing.pricePerKg}
              treatSingleThousandDot
              fractionDigits={0}
              gridRow={rowIdx}
              gridCol="price"
              onPaste={(e) => onCellPaste(rowIdx, "price", e)}
              ariaLabel={`Harga/kg ${ing.name}`}
              className={cn(
                hasOverride &&
                  "border-[var(--status-warning)] bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
              )}
              onCommit={(next) => {
                if (next === null) return;
                if (Math.abs(next - ing.pricePerKg) < 0.01) {
                  onResetPriceOverride(ing.id);
                } else {
                  onUpdateIngredient(ing.id, { priceOverride: next });
                }
              }}
            />
            {hasOverride && (
              <button
                type="button"
                onClick={() => onResetPriceOverride(ing.id)}
                title={`Reset ke harga pasar (${formatCurrencyIdr(ing.pricePerKg)})`}
                aria-label={`Reset harga pasar ${ing.name}`}
                className="neu-pill-btn cursor-pointer rounded-md p-1 text-[var(--status-warning)]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      )}

      {coreCols.dm && (
        <td className="px-2 py-1">
          <NumericCellInput
            value={ing.dryMatter}
            fractionDigits={1}
            gridRow={rowIdx}
            gridCol="dm"
            onPaste={(e) => onCellPaste(rowIdx, "dm", e)}
            invalid={ing.dryMatter <= 0 || ing.dryMatter > 100}
            errorTooltip="BK harus antara > 0 dan 100%"
            ariaLabel={`BK % ${ing.name}`}
            onCommit={(next) => {
              if (next !== null && next > 0 && next <= 100) {
                onUpdateIngredient(ing.id, { dryMatter: next });
              }
            }}
          />
        </td>
      )}

      {coreCols.bounds && (
        <>
          <td className="px-2 py-1">
            <NumericCellInput
              value={min}
              fractionDigits={1}
              gridRow={rowIdx}
              gridCol="min"
              onPaste={(e) => onCellPaste(rowIdx, "min", e)}
              invalid={invalidBounds}
              errorTooltip={`Min (${min}%) > Max (${max}%)`}
              ariaLabel={`Min % ${ing.name}`}
              onCommit={(next) =>
                onUpdateIngredient(ing.id, {
                  inclusion: { ...ing.inclusion, min: next ?? 0 },
                })
              }
            />
          </td>

          <td className="px-2 py-1">
            <NumericCellInput
              value={max}
              fractionDigits={1}
              gridRow={rowIdx}
              gridCol="max"
              onPaste={(e) => onCellPaste(rowIdx, "max", e)}
              invalid={invalidBounds}
              errorTooltip={`Max (${max}%) < Min (${min}%)`}
              ariaLabel={`Max % ${ing.name}`}
              onCommit={(next) =>
                onUpdateIngredient(ing.id, {
                  inclusion: { ...ing.inclusion, max: next ?? 100 },
                })
              }
            />
          </td>
        </>
      )}

      {coreCols.inclusion && (
        <td
          className={cn(
            "px-2 py-1 text-right tabular-nums",
            hasInclusion
              ? "bg-[var(--status-success-soft)] font-bold text-[var(--status-success)]"
              : "text-[var(--text-muted)]",
          )}
        >
          {formatNumberLocale(inclusionPct, 2)}%
        </td>
      )}

      {visibleNutrients.map((nut) => {
        if (isDerivedNutrient(nut.id)) {
          const derivedVal = resolveNutrientValue(ing, nut.id);
          return (
            <td
              key={nut.id}
              className="px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]"
            >
              {derivedVal !== null ? formatNumberLocale(derivedVal, 0) : "N/A"}
            </td>
          );
        }
        const val = ing.nutrients[nut.id];
        const isNull = val === null || val === undefined;
        const digits =
          nut.unit === "kcal/kg" || nut.unit === "mg/kg" || nut.unit === "mEq/kg" ? 0 : 2;
        return (
          <td key={nut.id} className="px-2 py-1">
            <NumericCellInput
              value={val ?? null}
              allowNull
              fractionDigits={digits}
              gridRow={rowIdx}
              gridCol={nut.id}
              onPaste={(e) => onCellPaste(rowIdx, nut.id, e)}
              placeholder="N/A"
              ariaLabel={`${nut.name} ${ing.name}`}
              className={cn(
                isNull &&
                  "border-dashed border-[var(--status-warning-border)] bg-[var(--status-warning-soft)]",
              )}
              onCommit={(next) =>
                onUpdateIngredient(ing.id, {
                  nutrients: { ...ing.nutrients, [nut.id]: next },
                })
              }
            />
          </td>
        );
      })}

      <td className="px-2 py-1 text-center">
        <button
          type="button"
          onClick={() => onOpenDetail(ing)}
          aria-label={`Edit detail ${ing.name}`}
          className="neu-pill-btn inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--text-secondary)]"
        >
          <Sliders className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
});

export const IngredientDesktopTable = memo(function IngredientDesktopTable({
  ingredients,
  allIngredients,
  allNutrients = MOCK_NUTRIENTS,
  composition,
  showAdvanceColumns,
  showNdf = false,
  simpleMode = !showAdvanceColumns,
  scrollMaxHeightClass,
  language,
  onUpdateIngredient,
  onResetPriceOverride,
  onOpenDetail,
  onBatchIngredientsUpdate,
}: IngredientDesktopTableProps) {
  const [pasteNotice, setPasteNotice] = useState<{
    readonly text: string;
    readonly warnings: readonly string[];
  } | null>(null);
  const [nameColWidth, setNameColWidth] = useState<number>(DEFAULT_NAME_COL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<ReadonlySet<string>>(() => new Set());

  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragStateRef.current = { startX: event.clientX, startWidth: nameColWidth };
      setIsResizing(true);
    },
    [nameColWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const next = Math.max(
        MIN_NAME_COL_WIDTH,
        Math.min(MAX_NAME_COL_WIDTH, Math.round(state.startWidth + (event.clientX - state.startX))),
      );
      setNameColWidth(next);
    };

    const handleUp = () => {
      dragStateRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isResizing]);

  const handleResizeKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setNameColWidth((w) => Math.max(MIN_NAME_COL_WIDTH, w - 16));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setNameColWidth((w) => Math.min(MAX_NAME_COL_WIDTH, w + 16));
    }
  }, []);

  const toggleColumn = useCallback((colId: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  }, []);

  const compositionMap = useMemo(
    () => new Map((composition ?? []).map((c) => [c.ingredientId, c.fraction * 100])),
    [composition],
  );

  const candidateNutrients: readonly Nutrient[] = useMemo(
    () =>
      allNutrients.filter(
        (n) =>
          showAdvanceColumns ||
          BASIC_NUTRIENT_IDS.has(n.id) ||
          n.isCustom === true ||
          (showNdf && NDF_NUTRIENT_IDS.has(n.id)),
      ),
    [allNutrients, showAdvanceColumns, showNdf],
  );

  const visibleNutrients: readonly Nutrient[] = useMemo(
    () => candidateNutrients.filter((n) => !hiddenCols.has(n.id)),
    [candidateNutrients, hiddenCols],
  );

  const coreCols: CoreColumnVisibility = useMemo(
    () => ({
      price: !hiddenCols.has("price"),
      dm: !hiddenCols.has("dm"),
      bounds: !hiddenCols.has("bounds"),
      inclusion: !hiddenCols.has("inclusion"),
    }),
    [hiddenCols],
  );

  const orderedCols: PasteColumnKey[] = useMemo(() => {
    const cols: PasteColumnKey[] = [];
    if (coreCols.price) cols.push("price");
    if (coreCols.dm) cols.push("dm");
    if (coreCols.bounds) cols.push("min", "max");
    for (const nut of visibleNutrients) {
      cols.push(nut.id);
    }
    return cols;
  }, [coreCols.price, coreCols.dm, coreCols.bounds, visibleNutrients]);

  const handleCellPaste = useCallback(
    (startRowIdx: number, startColKey: PasteColumnKey, event: ClipboardEvent<HTMLInputElement>) => {
      if (!onBatchIngredientsUpdate) return;
      const clipboardText =
        event.clipboardData.getData("text/plain") || event.clipboardData.getData("text") || "";
      if (!clipboardText) return;

      const outcome = applyTsvGridPaste({
        clipboardText,
        activeIngredients: ingredients,
        allIngredients: allIngredients ?? ingredients,
        orderedCols,
        startRowIdx,
        startColKey,
      });

      if (!outcome.isGrid) return;
      event.preventDefault();

      if (outcome.appliedCells > 0) {
        onBatchIngredientsUpdate(outcome.ingredients);
      }
      setPasteNotice({
        text: pickLang(
          language,
          `${outcome.appliedCells} sel ditempel dari spreadsheet.`,
          `${outcome.appliedCells} cells pasted from spreadsheet.`,
        ),
        warnings: outcome.warnings,
      });
    },
    [allIngredients, ingredients, language, onBatchIngredientsUpdate, orderedCols],
  );

  const coreToggleItems: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
    { id: "price", label: pickLang(language, "Harga", "Price") },
    { id: "dm", label: pickLang(language, "BK", "DM") },
    { id: "bounds", label: "Min/Max" },
    { id: "inclusion", label: pickLang(language, "Inklusi", "Inclusion") },
  ];

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1.5",
        scrollMaxHeightClass ? "min-h-0" : "h-full min-h-0",
      )}
    >
      {/* Bar kotak centang tampilkan / sembunyikan kolom harga & nutrisi */}
      <div
        role="group"
        aria-label={pickLang(
          language,
          "Pilih kolom tabel yang ditampilkan",
          "Toggle table columns",
        )}
        className="neu-pressed flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg px-2.5 py-1.5 text-[11px]"
      >
        <span className="font-semibold text-[var(--text-secondary)]">
          {pickLang(language, "Kolom:", "Columns:")}
        </span>

        {coreToggleItems.map((col) => {
          const checked = !hiddenCols.has(col.id);
          return (
            <label
              key={col.id}
              className="inline-flex cursor-pointer items-center gap-1 font-medium text-[var(--text-primary)] select-none"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleColumn(col.id)}
                className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
              />
              <span>{col.label}</span>
            </label>
          );
        })}

        <span className="h-3.5 w-px bg-[var(--border-subtle)]" aria-hidden="true" />

        {candidateNutrients.map((nut) => {
          const checked = !hiddenCols.has(nut.id);
          const label = getNutrientDisplayName(nut, language, simpleMode);
          const fullName = getNutrientFullName(nut, language);
          return (
            <label
              key={nut.id}
              title={fullName}
              className="inline-flex cursor-pointer items-center gap-1 font-medium text-[var(--text-primary)] select-none"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleColumn(nut.id)}
                className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
              />
              <span>{label}</span>
            </label>
          );
        })}

        {hiddenCols.size > 0 && (
          <button
            type="button"
            onClick={() => setHiddenCols(new Set())}
            className="ml-auto cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--status-success)] hover:bg-[var(--status-success-soft)]"
          >
            {pickLang(language, "Tampilkan Semua", "Show All")}
          </button>
        )}
      </div>

      {pasteNotice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--status-success)]"
        >
          <span>
            {pasteNotice.text}
            {pasteNotice.warnings.length > 0 ? ` (${pasteNotice.warnings.join(" ")})` : ""}
          </span>
          <button
            type="button"
            onClick={() => setPasteNotice(null)}
            className="cursor-pointer rounded px-1.5 py-0.5 font-semibold underline hover:opacity-80"
          >
            {pickLang(language, "Tutup", "Close")}
          </button>
        </div>
      )}

      <div
        className={cn(
          "custom-scrollbar relative min-h-0 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]",
          scrollMaxHeightClass ?? "flex-1",
        )}
      >
        <table className="w-max min-w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 bg-[var(--bg-sunken)] text-[11px] font-bold tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="sticky left-0 z-30 w-10 border-r border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-1.5 py-2 text-center">
                {pickLang(language, "Aktif", "Active")}
              </th>
              <th
                style={{
                  width: `${nameColWidth}px`,
                  minWidth: `${nameColWidth}px`,
                  maxWidth: `${nameColWidth}px`,
                }}
                className="sticky left-10 z-30 border-r border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] py-2 pr-4 pl-2.5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate">{pickLang(language, "Nama Bahan", "Ingredient")}</span>
                </div>
                {/* Handle geser kiri/kanan lebar kolom Nama Bahan */}
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={pickLang(
                    language,
                    "Geser lebar kolom nama bahan",
                    "Resize ingredient name column",
                  )}
                  aria-valuemin={MIN_NAME_COL_WIDTH}
                  aria-valuemax={MAX_NAME_COL_WIDTH}
                  aria-valuenow={nameColWidth}
                  tabIndex={0}
                  title={pickLang(
                    language,
                    "Geser kiri/kanan untuk atur lebar (klik 2× untuk perkecil/perbesar)",
                    "Drag left/right to resize (double-click to toggle compact)",
                  )}
                  onPointerDown={handleResizePointerDown}
                  onDoubleClick={() =>
                    setNameColWidth((w) => (w <= 130 ? DEFAULT_NAME_COL_WIDTH : 112))
                  }
                  onKeyDown={handleResizeKeyDown}
                  className={cn(
                    "group/resize absolute top-0 right-0 bottom-0 flex w-3 cursor-col-resize items-center justify-center transition-colors select-none hover:bg-[var(--primary-soft)] focus-visible:bg-[var(--primary-soft)] focus-visible:outline-none",
                    isResizing && "bg-[var(--primary-soft)]",
                  )}
                >
                  <GripVertical
                    className={cn(
                      "h-3.5 w-3 text-[var(--text-muted)] transition-colors group-hover/resize:text-[var(--color-primary)]",
                      isResizing && "text-[var(--color-primary)]",
                    )}
                    aria-hidden="true"
                  />
                </div>
              </th>
              {coreCols.price && (
                <th className="w-24 min-w-24 border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                  {pickLang(language, "Harga/kg", "Price/kg")}
                </th>
              )}
              {coreCols.dm && (
                <th className="w-[68px] min-w-[68px] border-b border-[var(--border-subtle)] px-1.5 py-2 text-right">
                  {pickLang(language, "BK %", "DM %")}
                </th>
              )}
              {coreCols.bounds && (
                <>
                  <th className="w-[68px] min-w-[68px] border-b border-[var(--border-subtle)] px-1.5 py-2 text-right">
                    Min %
                  </th>
                  <th className="w-[68px] min-w-[68px] border-b border-[var(--border-subtle)] px-1.5 py-2 text-right">
                    Max %
                  </th>
                </>
              )}
              {coreCols.inclusion && (
                <th className="w-20 min-w-20 border-b border-[var(--border-subtle)] bg-[var(--status-success-soft)] px-2 py-2 text-right text-[var(--status-success)]">
                  {pickLang(language, "Inklusi %", "Inclusion %")}
                </th>
              )}
              {visibleNutrients.map((nut) => {
                const headerLabel = getNutrientDisplayName(nut, language, simpleMode);
                const fullLabel = getNutrientFullName(nut, language);
                const wideUnit =
                  nut.unit === "kcal/kg" || nut.unit === "mg/kg" || nut.unit === "mEq/kg";
                return (
                  <th
                    key={nut.id}
                    title={`${fullLabel} (${nut.unit})`}
                    className={cn(
                      "border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap",
                      wideUnit ? "w-[88px] min-w-[88px]" : "w-[74px] min-w-[74px]",
                    )}
                  >
                    <div className="text-[var(--text-primary)]">{headerLabel}</div>
                    <div className="text-[10px] font-medium lowercase text-[var(--text-muted)]">
                      {nut.unit}
                    </div>
                  </th>
                );
              })}
              <th className="w-12 min-w-12 border-b border-[var(--border-subtle)] px-2 py-2 text-center">
                Detail
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {ingredients.map((ing, rowIdx) => (
              <IngredientTableRow
                key={ing.id}
                ing={ing}
                rowIdx={rowIdx}
                inclusionPct={compositionMap.get(ing.id) ?? 0}
                nameColWidth={nameColWidth}
                coreCols={coreCols}
                visibleNutrients={visibleNutrients}
                language={language}
                onUpdateIngredient={onUpdateIngredient}
                onResetPriceOverride={onResetPriceOverride}
                onOpenDetail={onOpenDetail}
                onCellPaste={handleCellPaste}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
