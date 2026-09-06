import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { VolumeBars, WeightLine } from "@/components/charts";
import { ChartCard, LoadingBlock } from "@/components/pulse/cards";
import { ConsistencyHeatmap } from "@/components/pulse/consistency";
import { EmptyState } from "@/components/pulse/empty-state";
import { MuscleMap } from "@/components/pulse/muscle-map";
import { NumericField } from "@/components/pulse/numeric-field";
import { Button } from "@/components/ui/button";
import { addBodyLog, getMuscleLoad, getProgress } from "@/lib/pulse/fns";
import { normalizeMuscle } from "@/lib/pulse/exercise-meta";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { toast } from "sonner";

type Search = { muscle?: string };

const PERIOD_LABEL = {
  week: "Esta semana",
  month: "Este mes",
  quarter: "Últimos 3 meses",
  year: "Este año",
} as const;

const PERIOD_PHRASE = {
  week: "esta semana",
  month: "este mes",
  quarter: "en los últimos 3 meses",
  year: "este año",
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
  const { muscle: muscleParam } = Route.useSearch();
  const { data, isPending } = useQuery({ queryKey: ["progress"], queryFn: () => getProgress() });
  const [weight, setWeight] = useState("");
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("week");
  const [selected, setSelected] = useState<string | null>(muscleParam ?? null);
  const load = useQuery({
    queryKey: ["muscle-load", period],
    queryFn: () => getMuscleLoad({ data: { period } }),
  });

  useEffect(() => {
    if (muscleParam) setSelected(muscleParam);
  }, [muscleParam]);

  const log = useMutation({
    mutationFn: () => addBodyLog({ data: { weightKg: Number(weight) } }),
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
        {isPending && <LoadingBlock />}
        <ChartCard title="Peso corporal">
          {(data?.weight.length ?? 0) === 0 ? (
            <EmptyState icon={Activity} title="Sin registros" hint="Añade tu peso para ver la evolución." className="py-6" />
          ) : (
            <WeightLine data={data?.weight ?? []} />
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
              placeholder="kg"
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
              hint="El mapa muscular se llena con series reales, no con estimaciones."
              className="py-8"
            />
          ) : (
          <>
          <div className="mb-4 flex gap-1 rounded-full bg-muted p-1">
            {(
              [
                ["week", "Semana"],
                ["month", "Mes"],
                ["quarter", "3 meses"],
                ["year", "Año"],
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
          <MuscleMap
            loads={loads}
            selected={selected}
            periodLabel={PERIOD_LABEL[period]}
            periodPhrase={PERIOD_PHRASE[period]}
            topExercises={load.data?.topExercises ?? []}
            onSelect={(m) => {
              setSelected(m);
              void navigate({ to: "/progress", search: { muscle: m ?? undefined } });
            }}
            onOpenHistory={(m) => {
              void navigate({ to: "/history", search: { muscle: m } });
            }}
            onOpenLibrary={(m) => {
              void navigate({ to: "/exercises", search: { muscle: m } });
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
              <VolumeBars data={data?.volumeMonth ?? []} />
            </>
          )}
        </ChartCard>

        <ConsistencyHeatmap />
      </div>
    </AppPage>
  );
}
