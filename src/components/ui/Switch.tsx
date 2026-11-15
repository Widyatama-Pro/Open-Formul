import { cn } from "../../utils/cn";

export interface SwitchProps {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly label: string;
  readonly id?: string | undefined;
  readonly disabled?: boolean | undefined;
}

/** Sakelar toggle neumorfik aksesibel dengan target sentuh memadai. */
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
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0891B2] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none",
        checked
          ? "border-[#0E7490]/40 bg-gradient-to-r from-[#0E7490] to-[#14B8A6] shadow-[0_4px_10px_rgba(14,116,144,0.28)]"
          : "neu-well border-white/70 dark:border-cyan-200/15",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4.5 w-4.5 rounded-full bg-white shadow-[0_2px_5px_rgba(10,45,56,0.24)] transition-transform duration-150 motion-reduce:transition-none",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
