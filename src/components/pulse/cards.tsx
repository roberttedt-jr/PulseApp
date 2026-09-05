import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 max-w-full overflow-x-clip rounded-3xl bg-card p-4 hairline sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          {title ? <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 pt-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-36 w-full rounded-3xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-3xl" />
      ))}
    </div>
  );
}

export function RoutineCard({
  name,
  description,
  exerciseCount,
  lastUsed,
  color,
  icon: Icon,
  onStart,
  menu,
}: {
  name: string;
  description?: string | null;
  exerciseCount: number;
  lastUsed?: string | null;
  color: string;
  icon: LucideIcon;
  onStart: () => void;
  menu?: ReactNode;
}) {
  return (
    <div
      className="flex items-stretch gap-1 overflow-hidden rounded-[22px] hairline"
      style={{
        backgroundImage: `linear-gradient(120deg, color-mix(in srgb, ${color} 26%, var(--color-card)) 0%, var(--color-card) 58%)`,
      }}
    >
      <button
        type="button"
        onClick={onStart}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left pressable"
      >
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-white"
          style={{ background: color }}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-tight">{name}</span>
          {description ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
          ) : null}
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {exerciseCount} ejercicios
            {lastUsed ? ` · ${lastUsed}` : ""}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-foreground-tertiary" />
      </button>
      {menu}
    </div>
  );
}

export function ExerciseCard({
  name,
  muscle,
  type,
  equipment,
  thumb,
  trailing,
  href,
}: {
  name: string;
  muscle: string;
  type: string;
  equipment?: string | null;
  thumb?: ReactNode;
  trailing?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      {thumb}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {muscle} · {type}
          {equipment ? ` · ${equipment}` : ""}
        </span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card px-2.5 py-2 hairline">
      {href ? (
        <a href={href} className="flex min-w-0 flex-1 items-center gap-3">
          {body}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {trailing}
    </div>
  );
}