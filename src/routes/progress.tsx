import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { ChartCard, LoadingBlock } from "@/components/pulse/cards";
import { ConsistencyHeatmap } from "@/components/pulse/consistency";
import { EmptyState } from "@/components/pulse/empty-state";
import { CompareCtaCard } from "@/components/pulse/compare";
import { MuscleBalance } from "@/components/pulse/muscle-map";
import { NumericField } from "@/components/pulse/numeric-field";
import { Button } from "@/components/ui/button";
import { addBodyLog, getBootstrap, getMuscleLoad, getProgress } from "@/lib/pulse/fns";
import { normalizeMuscle } from "@/lib/pulse/exercise-meta";
import { PR_KIND_LABEL, type PrKind } from "@/lib/pulse/prs";
import { cn, daysAgoEs, formatKg, toKg } from "@/lib/utils";
import { Activity } from "lucide-react";
import { toast } from "sonner";

type Search = { muscle?: string };

const WeightLine = lazy(() =>
  import("@/components/charts").then((m) => ({ default: m.WeightLine })),
);
const VolumeBars = lazy(() =>
  import("@/components/charts").then((m) => ({ default: m.VolumeBars })),
);

const PERIOD_LABEL = {
  week: "Esta semana",
  month: "Este mes",
  all: "Total",
} as const;

const PERIOD_PHRASE = {
  week: "esta semana",
  month: "este mes",
  all: "en total",
} as const;

export const Route = createFileRoute("/progress")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    muscle: typeof s.muscle === "string" && s.muscle ? s.muscle : undefined,
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isPending } = useQuery({ queryKey: ["progress"], queryFn: () => getProgress(), staleTime: 60_000 });
  const profile = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const units = profile.data?.profile.units ?? "metric";
  const [weight, setWeight] = useState("");
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const load = useQuery({
    queryKey: ["muscle-load", period],
    queryFn: () => getMuscleLoad({ data: { period } }),
  });

  const log = useMutation({
    mutationFn: () => addBodyLog({ data: { weightKg: toKg(Number(weight), units) } }),
    onSuccess: () => {
      setWeight("");
      void qc.invalidateQueries({ queryKey: ["progress"] });
      toast.success("Peso registrado");
    },
  });

  const loads = useMemo(
    () =>
      (load.data?.loads ?? []).map((m) => ({
        ...m,
        muscle: String(normalizeMuscle(m.muscle)),
      })),
    [load.data?.loads],
  );
  const cmp = data?.compare;
  const cmpText =
    cmp && cmp.prev > 0 && cmp.pct !== 0
      ? cmp.pct > 0
        ? `Has levantado un ${cmp.pct}% más que el mes anterior.`
        : `Has levantado un ${Math.abs(cmp.pct)}% menos que el mes anterior.`
      : null;

  return (
    <AppPage
      title="Progreso"
      action={
        <Link to="/stats" className="text-sm text-accent">
          Stats
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4 pt-4">
        {isPending && !data && <LoadingBlock />}

        <CompareCtaCard />
        {data && (data.week.workouts > 0 || data.prevWeek.workouts > 0) && (
          <ChartCard title="Resumen semanal">
            <div className="grid grid-cols-3 gap-2">
              <Mini k="Sesiones" v={`${data.week.workouts}/${data.weeklyGoal}`} />
              <Mini k="Series" v={String(Math.round(data.week.sets))} />
              <Mini k="Volumen" v={data.week.volume > 0 ? formatKg(data.week.volume, units) : "—"} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {weekDelta(data.week, data.prevWeek, units)}
              {data.streak > 0 ? ` · Racha de ${data.streak} ${data.streak === 1 ? "día" : "días"}.` : ""}
            </p>
          </ChartCard>
        )}

        {data && data.recentPrs.length > 0 && (
          <ChartCard title="Récords recientes">
            <ul className="space-y-2">
              {data.recentPrs.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PR_KIND_LABEL[(p.kind as PrKind) ?? "one_rm"] ?? p.kind}
                      {p.recordedAt ? ` · ${daysAgoEs(p.recordedAt)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 tabular font-semibold">
                    {p.kind === "max_volume"
                      ? formatKg(p.volume, units)
                      : p.weight > 0
                        ? `${formatKg(p.weight, units)} × ${p.reps}`
                        : `${p.reps} reps`}
                  </p>
                </li>
              ))}
            </ul>
          </ChartCard>
        )}
        <ChartCard title="Peso corporal">
          {(data?.weight.length ?? 0) === 0 ? (
            <EmptyState icon={Activity} title="Sin registros" hint="Añade tu peso para ver la evolución." className="py-6" />
          ) : (
            <Suspense fallback={<div className="h-44 rounded-2xl bg-muted/40" aria-hidden />}>
              <WeightLine data={data?.weight ?? []} />
            </Suspense>
          )}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(weight) > 0) log.mutate();
            }}
          >
            <NumericField
              kind="decimal"
              className="h-12 flex-1 rounded-2xl border border-border bg-muted px-4 text-left text-base"
              value={weight}
              onValueChange={setWeight}
              placeholder={units === "imperial" ? "lb" : "kg"}
              aria-label="Peso corporal"
            />
            <Button type="submit" size="sm" disabled={log.isPending}>
              Guardar
            </Button>
          </form>
        </ChartCard>

        <ChartCard title="Balance muscular" className="overflow-visible">
          {(loads.length === 0 && !load.isPending) ? (
            <EmptyState
              icon={Activity}
              title="Completa tu primer entrenamiento para ver tu balance."
              hint="El balance se llena con series reales, no con estimaciones."
              className="py-8"
            />
          ) : (
          <>
          <div className="mb-4 flex gap-1 rounded-full glass-lite p-1">
            {(
              [
                ["week", "Semana"],
                ["month", "Mes"],
                ["all", "Total"],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPeriod(k)}
                className={cn(
                  "h-9 flex-1 rounded-full text-sm font-medium transition-colors",
                  period === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {lab}
              </button>
            ))}
          </div>
          <MuscleBalance
            loads={loads}
            periodLabel={PERIOD_LABEL[period]}
            periodPhrase={PERIOD_PHRASE[period]}
            units={units}
            onOpenHistory={(m) => {
              void navigate({ to: "/history", search: { muscle: m } });
            }}
          />
          </>
          )}
        </ChartCard>

        <ChartCard
          title="Volumen mensual"
          action={
            cmp ? (
              <span className="text-xs text-muted-foreground">
                {cmp.pct >= 0 ? "+" : ""}
                {cmp.pct}%
              </span>
            ) : null
          }
        >
          {(data?.volumeMonth?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Activity}
              title="Completa algunos entrenamientos para desbloquear tus estadísticas."
              hint="El gráfico de volumen aparece con sesiones reales."
              className="py-8"
            />
          ) : (
            <>
              {cmpText && <p className="mb-3 text-sm text-muted-foreground">{cmpText}</p>}
              <Suspense fallback={<div className="h-44 rounded-2xl bg-muted/40" aria-hidden />}>
                <VolumeBars data={data?.volumeMonth ?? []} />
              </Suspense>
            </>
          )}
        </ChartCard>

        <ConsistencyHeatmap />
      </div>
    </AppPage>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-3 text-center">
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className="mt-1 text-[15px] font-semibold tabular">{v}</p>
    </div>
  );
}

function weekDelta(
  week: { workouts: number; sets: number; volume: number },
  prev: { workouts: number; sets: number; volume: number },
  units: "metric" | "imperial",
) {
  if (prev.workouts <= 0 && prev.volume <= 0) {
    return week.workouts > 0 ? "Primera semana con sesiones registradas." : "Aún no hay datos esta semana.";
  }
  const dw = week.workouts - prev.workouts;
  const sessions =
    dw === 0 ? "Igual número de sesiones" : dw > 0 ? `${dw} sesión${dw === 1 ? "" : "es"} más` : `${Math.abs(dw)} menos`;
  if (prev.volume > 0) {
    const pct = Math.round(((week.volume - prev.volume) / prev.volume) * 100);
    if (pct === 0) return `${sessions} que la semana anterior.`;
    return `${sessions} que la semana anterior · ${pct > 0 ? "+" : ""}${pct}% de volumen.`;
  }
  return `${sessions} que la semana anterior · ${week.volume > 0 ? formatKg(week.volume, units) : "sin volumen"}.`;
}
