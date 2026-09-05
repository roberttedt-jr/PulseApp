import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AppPage } from "@/components/auth-gate";
import { getWorkout } from "@/lib/pulse/fns";
import { cn, formatDuration, formatKg } from "@/lib/utils";

export const Route = createFileRoute("/history/$workoutId")({ component: WorkoutDetail });

function WorkoutDetail() {
  const { workoutId } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["workout", workoutId],
    queryFn: () => getWorkout({ data: { id: workoutId } }),
  });
  if (!data) {
    return (
      <AppPage title="Sesión">
        <p className="pt-8 text-sm text-muted-foreground">Cargando…</p>
      </AppPage>
    );
  }
  return (
    <AppPage title={data.title}>
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          {format(new Date(data.startedAt), "EEEE d MMMM yyyy · HH:mm", { locale: es })}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Tile k="Volumen" v={formatKg(data.volume)} />
          <Tile k="Series" v={String(data.setCount)} />
          <Tile k="Tiempo" v={formatDuration(data.durationSeconds ?? 0)} />
        </div>
        {data.notes && <p className="rounded-3xl bg-card p-4 text-sm hairline">{data.notes}</p>}
        {data.photoData && (
          <img src={data.photoData} alt="Foto post-entreno" className="w-full rounded-3xl object-cover" />
        )}
        {data.blocks.map((b) => (
          <section key={b.exerciseId} className="rounded-3xl bg-card p-4 hairline">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to="/exercises/$exerciseId"
                  params={{ exerciseId: b.exerciseId }}
                  className="font-medium"
                >
                  {b.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {b.muscle}
                  {b.equipment ? ` · ${b.equipment}` : ""}
                </p>
              </div>
              {b.estimated1rm ? (
                <p className="shrink-0 text-xs font-medium text-primary">1RM {Math.round(b.estimated1rm)}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-[2rem_1fr_1fr] gap-1 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              <span>Set</span>
              <span>Peso</span>
              <span className="text-right">Reps</span>
            </div>
            <ul className="space-y-1 text-sm tabular">
              {b.sets.map((s, i) => (
                <li
                  key={s.id}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_1fr] items-center rounded-xl px-2 py-1.5",
                    s.completed ? "bg-success/10 text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="font-medium">
                    {s.kind === "warmup" ? "W" : s.kind === "drop" ? "D" : s.kind === "fail" ? "F" : i + 1}
                  </span>
                  <span>
                    {s.weight} kg
                    {s.rpe ? ` @ ${s.rpe}` : ""}
                  </span>
                  <span className="text-right">{s.reps}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppPage>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-3xl bg-card px-3 py-4 text-center hairline">
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className="mt-1 font-semibold">{v}</p>
    </div>
  );
}
