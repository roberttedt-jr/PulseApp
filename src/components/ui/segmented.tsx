import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  itemClassName,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex gap-1 rounded-full p-1", className)}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-11 min-h-11 min-w-14 flex-1 rounded-full px-4 text-sm font-semibold transition-colors pressable-feedback glass-pill",
              itemClassName,
              on ? "glass-pill-on" : "",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
