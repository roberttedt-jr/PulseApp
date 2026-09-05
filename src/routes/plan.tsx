import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppPage } from "@/components/auth-gate";
import { getPlan, setPlanDay } from "@/lib/pulse/fns";

export const Route = createFileRoute("/plan")({ component: PlanPage });

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function PlanPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["plan"], queryFn: () => getPlan() });
  const mut = useMutation({
    mutationFn: (d: { weekday: number; routineId: string | null }) => setPlanDay({ data: d }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plan"] });
      void qc.invalidateQueries({ queryKey: ["consistency"] });
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });
  const byDay = new Map((data?.days ?? []).map((d) => [d.weekday, d]));

  return (
    <AppPage title="Plan semanal">
      <div className="mx-auto max-w-xl space-y-2 pt-4">
        <p className="mb-3 text-sm text-muted-foreground">Asigna una rutina a cada día. Pulse te la sugerirá en el inicio.</p>
        {DAYS.map((label, i) => {
          const current = byDay.get(i)?.routine_id ?? "";
          return (
            <div key={label} className="flex min-w-0 items-center gap-3 rounded-3xl bg-card px-4 py-3 hairline">
              <span className="w-20 shrink-0 text-sm font-medium sm:w-24">{label}</span>
              <select
                className="h-11 min-w-0 flex-1 rounded-2xl bg-muted px-3 text-sm"
                value={current}
                onChange={(e) => mut.mutate({ weekday: i, routineId: e.target.value || null })}
              >
                <option value="">Descanso</option>
                {(data?.routines ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </AppPage>
  );
}
