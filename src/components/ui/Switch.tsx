import { cn } from "../../utils/cn";

export interface SwitchProps {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly label: string;
  readonly id?: string | undefined;
  readonly disabled?: boolean | undefined;
}

/** Sakelar toggle Precision Emerald aksesibel tanpa properti animasi non-GPU. */
export function Switch({ checked, onCheckedChange, label, id, disabled }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-[background-color,border-color,transform] duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none",
        checked
          ? "border-[#059669] bg-[#059669]"
          : "border-[#CBD5E1] bg-[#E2E8F0] dark:border-[#1E333D] dark:bg-[#162831]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-150 motion-reduce:transition-none",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
