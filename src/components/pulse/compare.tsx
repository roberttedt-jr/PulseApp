import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { barRatio, COMPARE_COPY, COMPARE_METRICS, type CompareMetricId } from "@/lib/pulse/compare";
import type { CompareExercise, CompareFriend, ComparePr } from "@/lib/pulse/compare-fns";
import { PR_KIND_LABEL, type PrKind } from "@/lib/pulse/prs";
import { cn, formatKg } from "@/lib/utils";

export function CompareBanner() {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">{COMPARE_COPY.subtitle}</p>
  );
}

export function CompareCtaCard() {
  return (
    <Link
      to="/compare"
      data-compare-cta="1"
      className="flex items-center gap-3 rounded-[22px] bg-card px-4 py-3 hairline pressable"
    >
      <span className="grid size-9 place-items-center rounded-full bg-primary/12 text-primary">
        <ArrowLeftRight className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{COMPARE_COPY.ctaFriends}</span>
        <span className="block text-xs text-muted-foreground">{COMPARE_COPY.subtitle}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

export function FriendPickRow({ friend }: { friend: CompareFriend }) {
  return (
    <Link
      to="/compare/$username"
      params={{ username: friend.username }}
      className="flex items-center gap-3 rounded-[22px] bg-card px-4 py-3 hairline pressable"
      data-compare-friend={friend.username}
    >
      <Avatar src={friend.image} fallback={friend.name} className="size-11" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{friend.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{friend.handle}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function PairBars({ you, them }: { you: number; them: number }) {
  const max = Math.max(you, them, 0);
  return (
    <div className="mt-3 space-y-1.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.round(barRatio(you, max) * 100)}%` }}
        />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/45"
          style={{ width: `${Math.round(barRatio(them, max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function MetricPair({
  metric,
  youLabel,
  themLabel,
  you,
  them,
  format,
}: {
  metric: CompareMetricId;
  youLabel: string;
  themLabel: string;
  you: number;
  them: number;
  format?: (n: number) => string;
}) {
  const meta = COMPARE_METRICS.find((m) => m.id === metric);
  const fmt = format ?? ((n: number) => String(Math.round(n)));
  return (
    <section className="rounded-[22px] bg-card p-4 hairline" data-compare-metric={metric}>
      <h2 className="text-[15px] font-semibold tracking-tight">{meta?.label ?? metric}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="truncate text-xs text-muted-foreground">{youLabel}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular tracking-tight" data-compare-you={metric}>
            {fmt(you)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs text-muted-foreground">{themLabel}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular tracking-tight" data-compare-them={metric}>
            {fmt(them)}
          </p>
        </div>
      </div>
      <PairBars you={you} them={them} />
    </section>
  );
}

export function ExerciseList({
  items,
  youLabel,
  themLabel,
  units,
}: {
  items: CompareExercise[];
  youLabel: string;
  themLabel: string;
  units: "metric" | "imperial";
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-[22px] bg-card p-4 hairline" data-compare-metric="exercises">
        <h2 className="text-[15px] font-semibold tracking-tight">Progreso por ejercicio</h2>
        <p className="mt-2 text-sm text-muted-foreground">{COMPARE_COPY.noExercises}</p>
      </section>
    );
  }
  return (
    <section className="rounded-[22px] bg-card p-4 hairline" data-compare-metric="exercises">
      <h2 className="text-[15px] font-semibold tracking-tight">Progreso por ejercicio</h2>
      <p className="mt-1 text-xs text-muted-foreground">{COMPARE_COPY.catalogOnly}</p>
      <ul className="mt-3 space-y-4">
        {items.map((ex) => (
          <li key={ex.exerciseId}>
            <p className="truncate text-sm font-medium">{ex.name}</p>
            <p className="text-xs text-muted-foreground">{ex.muscle}</p>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <p className="min-w-0">
                <span className="block truncate text-xs text-muted-foreground">{youLabel}</span>
                <span className="tabular">
                  {ex.you.sets} series · {formatKg(ex.you.volume, units)}
                </span>
              </p>
              <p className="min-w-0 text-right">
                <span className="block truncate text-xs text-muted-foreground">{themLabel}</span>
                <span className="tabular">
                  {ex.them.sets} series · {formatKg(ex.them.volume, units)}
                </span>
              </p>
            </div>
            <PairBars you={ex.you.volume} them={ex.them.volume} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PrList({
  items,
  youLabel,
  themLabel,
  units,
}: {
  items: ComparePr[];
  youLabel: string;
  themLabel: string;
  units: "metric" | "imperial";
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-[22px] bg-card p-4 hairline" data-compare-metric="prs">
        <h2 className="text-[15px] font-semibold tracking-tight">Récords</h2>
        <p className="mt-2 text-sm text-muted-foreground">{COMPARE_COPY.noPrs}</p>
      </section>
    );
  }
  return (
    <section className="rounded-[22px] bg-card p-4 hairline" data-compare-metric="prs">
      <h2 className="text-[15px] font-semibold tracking-tight">Récords</h2>
      <ul className="mt-3 space-y-4">
        {items.map((pr) => (
          <li key={`${pr.exerciseId}:${pr.kind}`}>
            <p className="truncate text-sm font-medium">{pr.name}</p>
            <p className="text-xs text-muted-foreground">
              {PR_KIND_LABEL[(pr.kind as PrKind) ?? "one_rm"] ?? pr.kind}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <p className="min-w-0">
                <span className="block truncate text-xs text-muted-foreground">{youLabel}</span>
                <span className="tabular">
                  {pr.kind === "max_volume"
                    ? formatKg(pr.you.volume, units)
                    : pr.you.weight > 0
                      ? `${formatKg(pr.you.weight, units)} × ${pr.you.reps}`
                      : `${pr.you.reps} reps`}
                </span>
              </p>
              <p className="min-w-0 text-right">
                <span className="block truncate text-xs text-muted-foreground">{themLabel}</span>
                <span className="tabular">
                  {pr.kind === "max_volume"
                    ? formatKg(pr.them.volume, units)
                    : pr.them.weight > 0
                      ? `${formatKg(pr.them.weight, units)} × ${pr.them.reps}`
                      : `${pr.them.reps} reps`}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ComparePersonHeader({
  youName,
  youImage,
  themName,
  themHandle,
  themImage,
}: {
  youName: string;
  youImage: string | null;
  themName: string;
  themHandle: string;
  themImage: string | null;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <Avatar src={youImage} fallback={youName} className="size-12" />
        <p className="mt-2 max-w-full truncate text-xs font-medium">{COMPARE_COPY.you}</p>
      </div>
      <ArrowLeftRight className={cn("size-4 shrink-0 text-muted-foreground")} />
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <Avatar src={themImage} fallback={themName} className="size-12" />
        <p className="mt-2 max-w-full truncate text-xs font-medium">{themHandle || themName}</p>
      </div>
    </div>
  );
}
