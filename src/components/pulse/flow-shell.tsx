import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export function FlowShell({
  children,
  step,
  total,
  onSkip,
  onBack,
  skipLabel = "Saltar",
  footer,
}: {
  children: ReactNode;
  step: number;
  total: number;
  onSkip?: () => void;
  onBack?: () => void;
  skipLabel?: string;
  footer?: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <main className="relative mx-auto flex min-h-dvh w-full min-w-0 max-w-md flex-col overflow-x-hidden bg-background px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="relative flex min-h-11 items-center justify-between gap-3">
        {step > 0 && onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Atrás"
            className="glass-control grid size-11 place-items-center rounded-full text-foreground pressable"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="glass-control h-11 rounded-full px-4 text-sm font-medium text-muted-foreground pressable"
          >
            {skipLabel}
          </button>
        ) : (
          <span className="size-11" />
        )}
      </div>
      <div
        className="relative mb-6 mt-4 flex gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        aria-label={`Paso ${step + 1} de ${total}`}
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: reduced ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -8 }}
          transition={{ duration: reduced ? 0.12 : 0.22, ease }}
          className="relative flex min-w-0 flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
      {footer ? <div className="relative mt-auto w-full min-w-0 space-y-2 pt-8">{footer}</div> : null}
    </main>
  );
}

export function ChoiceButton({
  selected,
  title,
  hint,
  onClick,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-14 w-full rounded-2xl px-4 py-3 text-left pressable",
        selected ? "bg-primary/12 ring-1 ring-primary" : "bg-muted",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </button>
  );
}

export function UnitSegment({
  value,
  onChange,
}: {
  value: "metric" | "imperial";
  onChange: (value: "metric" | "imperial") => void;
}) {
  return (
    <Segmented
      ariaLabel="Unidad de peso"
      className="flex w-full"
      value={value}
      options={[
        { value: "metric", label: "kg" },
        { value: "imperial", label: "lb" },
      ]}
      onChange={onChange}
    />
  );
}

export function FlowActions({
  primary,
  primaryLabel,
  secondaryLabel,
  onSecondary,
  busy,
}: {
  primary: () => void;
  primaryLabel: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  busy?: boolean;
}) {
  return (
    <>
      <Button className="w-full" size="lg" onClick={primary} disabled={busy} loading={busy} loadingText="Guardando…">
        {primaryLabel}
      </Button>
      {secondaryLabel && onSecondary ? (
        <Button className="w-full" variant="ghost" onClick={onSecondary} disabled={busy}>
          {secondaryLabel}
        </Button>
      ) : null}
    </>
  );
}
