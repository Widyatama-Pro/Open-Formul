import type { ClipboardEvent, KeyboardEvent } from "react";
import { useState } from "react";
import { cn } from "../../utils/cn";
import { formatNumberLocale, parseLocaleDecimal } from "../../utils/locale-number";

export interface NumericCellInputProps {
  readonly value: number | null | undefined;
  readonly onCommit: (next: number | null) => void;
  readonly ariaLabel: string;
  readonly allowNull?: boolean | undefined;
  readonly allowNegative?: boolean | undefined;
  readonly treatSingleThousandDot?: boolean | undefined;
  readonly fractionDigits?: number | undefined;
  readonly invalid?: boolean | undefined;
  readonly errorTooltip?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gridRow?: number | undefined;
  readonly gridCol?: string | undefined;
  readonly onPaste?: ((event: ClipboardEvent<HTMLInputElement>) => void) | undefined;
  readonly className?: string | undefined;
}

/**
 * Input sel numerik bergaya recessed neumorphic well yang menerima koma (,) maupun titik (.),
 * rata kanan tabular-nums, dan mendukung navigasi keyboard antar-baris.
 */
export function NumericCellInput({
  value,
  onCommit,
  ariaLabel,
  allowNull = false,
  allowNegative = false,
  treatSingleThousandDot = false,
  fractionDigits = 2,
  invalid = false,
  errorTooltip,
  placeholder = "—",
  disabled = false,
  gridRow,
  gridCol,
  onPaste,
  className,
}: NumericCellInputProps) {
  const formatDisplay = (val: number | null | undefined) =>
    val === null || val === undefined ? "" : formatNumberLocale(val, fractionDigits);

  const [draft, setDraft] = useState<string>(() => formatDisplay(value));
  const [focused, setFocused] = useState(false);
  const [parseError, setParseError] = useState(false);

  const displayedValue = focused || parseError ? draft : formatDisplay(value);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setParseError(false);
      onCommit(allowNull ? null : 0);
      return;
    }
    const parsed = parseLocaleDecimal(trimmed, { treatSingleThousandDot });
    if (parsed === null || (!allowNegative && parsed < 0)) {
      setParseError(true);
      return;
    }
    setParseError(false);
    onCommit(parsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (event.key === "Enter") {
        commitDraft();
      }
      if (gridRow !== undefined && gridCol !== undefined) {
        const delta = event.key === "ArrowUp" ? -1 : 1;
        const nextSelector = `input[data-grid-row="${gridRow + delta}"][data-grid-col="${gridCol}"]`;
        const nextEl = document.querySelector<HTMLInputElement>(nextSelector);
        if (nextEl) {
          event.preventDefault();
          nextEl.focus();
          nextEl.select();
        }
      }
    }
  };

  const isError = invalid || parseError;

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-invalid={isError ? true : undefined}
      title={isError ? (errorTooltip ?? "Masukkan angka valid (>= 0)") : undefined}
      data-grid-row={gridRow}
      data-grid-col={gridCol}
      disabled={disabled}
      placeholder={placeholder}
      value={displayedValue}
      onFocus={(e) => {
        setFocused(true);
        if (!parseError) {
          setDraft(value !== null && value !== undefined ? String(value).replace(".", ",") : "");
        }
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const nextRaw = e.target.value;
        setDraft(nextRaw);
        if (nextRaw.trim() === "") {
          setParseError(false);
          return;
        }
        const parsed = parseLocaleDecimal(nextRaw, { treatSingleThousandDot });
        setParseError(parsed === null || (!allowNegative && parsed < 0));
      }}
      onBlur={() => {
        setFocused(false);
        commitDraft();
      }}
      onPaste={(e) => {
        onPaste?.(e);
        if (e.defaultPrevented) {
          setFocused(false);
          setParseError(false);
          setDraft("");
        }
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "neu-well min-h-10 w-full rounded-lg px-2 py-1 text-right text-sm font-medium tabular-nums text-[#122B36] placeholder:text-[#869EA9] transition-[box-shadow,border-color,background-color] duration-150 focus-visible:bg-white/95 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#0891B2] disabled:opacity-55 md:min-h-8 md:text-xs dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:bg-[#0D303D]",
        isError &&
          "border-[#EC6453] bg-rose-50/75 text-rose-900 focus-visible:outline-rose-600 dark:border-rose-500 dark:bg-rose-950/35 dark:text-rose-100",
        className,
      )}
    />
  );
}
