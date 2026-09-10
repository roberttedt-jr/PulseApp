import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { PagerDots, SwipePager } from "@/components/pulse/swipe-pager";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

export function FlowShell({
  children,
  pages,
  step,
  total,
  onSkip,
  onBack,
  onStepChange,
  skipLabel = "Saltar",
  footer,
}: {
  children?: ReactNode;
  pages?: ReactNode[];
  step: number;
  total: number;
  onSkip?: () => void;
  onBack?: () => void;
  onStepChange?: (step: number) => void;
  skipLabel?: string;
  footer?: ReactNode;
}) {
  const list = pages ?? (children != null ? [children] : []);
  const count = Math.max(total, list.length);
  function go(next: number) {
    onStepChange?.(Math.max(0, Math.min(count - 1, next)));
  }
  return (
    <main className="relative mx-auto flex min-h-dvh w-full min-w-0 max-w-md flex-col overflow-visible bg-background px-5 pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="relative flex min-h-11 items-center justify-between gap-3">
        {step > 0 && onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Atrás"
            className="glass-control grid size-11 place-items-center rounded-full text-foreground pressable-feedback"
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
            className="glass-control h-11 rounded-full px-4 text-sm font-medium text-muted-foreground pressable-feedback"
          >
            {skipLabel}
          </button>
        ) : (
          <span className="size-11" />
        )}
      </div>
      {onStepChange && list.length > 1 ? (
        <SwipePager index={step} onIndexChange={go} pages={list} className="mt-4" />
      ) : (
        <div className="relative mt-4 flex min-w-0 flex-1 flex-col">{list[step] ?? children}</div>
      )}
      <PagerDots index={step} count={count} onIndexChange={go} />
      {footer ? <div className="relative mt-auto w-full min-w-0 space-y-2 pt-2">{footer}</div> : null}
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
        "min-h-14 w-full rounded-2xl px-4 py-3 text-left pressable-feedback",
        selected ? "glass-pill glass-pill-on" : "glass-pill",
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
