import { forwardRef, type KeyboardEvent, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function sanitize(raw: string, kind: "decimal" | "int") {
  const next = raw.replace(",", ".");
  if (kind === "int") return next.replace(/[^\d]/g, "").slice(0, 4);
  const cleaned = next.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned.slice(0, 6);
  return `${parts[0]!.slice(0, 4)}.${parts.slice(1).join("").slice(0, 2)}`;
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value" | "inputMode"> & {
  value: string;
  onValueChange: (v: string) => void;
  onCommit?: (n: number | null) => void;
  onEnter?: () => void;
  kind?: "decimal" | "int";
};

export const NumericField = forwardRef<HTMLInputElement, Props>(function NumericField(
  { value, onValueChange, onCommit, onEnter, kind = "decimal", className, onBlur, onFocus, onKeyDown, ...props },
  ref,
) {
  function commit() {
    if (!onCommit) return;
    if (value.trim() === "") {
      onCommit(null);
      return;
    }
    const n = Number(value.replace(",", "."));
    onCommit(Number.isFinite(n) ? n : null);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      onEnter?.();
    }
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode={kind === "int" ? "numeric" : "decimal"}
      pattern={kind === "int" ? "[0-9]*" : "[0-9]*[.,]?[0-9]*"}
      enterKeyHint={onEnter ? "next" : "done"}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      value={value}
      onChange={(e) => onValueChange(sanitize(e.target.value, kind))}
      onFocus={(e) => {
        e.currentTarget.select();
        e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
        onFocus?.(e);
      }}
      onBlur={(e) => {
        commit();
        onBlur?.(e);
      }}
      onKeyDown={handleKey}
      className={cn(
        "h-11 min-w-0 rounded-xl border border-transparent bg-transparent px-1 text-center text-base font-semibold tabular text-foreground outline-none",
        "placeholder:text-foreground-tertiary focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
});
