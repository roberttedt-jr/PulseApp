import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Calendar, Clock, Dumbbell, Flame, Trophy } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { getStats } from "@/lib/pulse/fns";
import { formatDuration, formatKg } from "@/lib/utils";

export const Route = createFileRoute("/stats")({ component: StatsPage });

function StatsPage() {
  const { data } = useQuery({ queryKey: ["stats"], queryFn: () => getStats() });
  return (
    <AppPage title="Estadísticas">
      <div className="mx-auto max-w-2xl space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Tile icon={Calendar} k="Entrenamientos" v={String(data?.workouts ?? 0)} />
          <Tile icon={Dumbbell} k="Volumen total" v={formatKg(data?.volume ?? 0)} />
          <Tile icon={Clock} k="Tiempo medio" v={formatDuration(data?.avgDuration ?? 0)} />
          <Tile icon={Flame} k="Racha actual" v={String(data?.streak ?? 0)} />
        </div>
        <div className="rounded-3xl bg-card p-4 text-sm hairline">
          <Row k="Ejercicio más trabajado" v={data?.topExercise ?? "—"} />
          <Row k="Grupo muscular" v={data?.topMuscle ?? "—"} />
          <Row k="Día favorito" v={data?.favoriteDay ?? "—"} />
          <Row k="Hora favorita" v={data?.favoriteHour ?? "—"} />
          <Row k="Series totales" v={String(data?.sets ?? 0)} />
        </div>
        <h2 className="pt-2 text-lg font-semibold">Logros</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(data?.achievements ?? []).map((a) => (
            <li
              key={a.key}
              className={`rounded-3xl p-4 hairline ${a.unlockedAt ? "bg-card" : "bg-muted/40 opacity-60"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-10 place-items-center rounded-2xl ${
                    a.tier === "gold" ? "bg-warning/15 text-warning" : a.tier === "silver" ? "bg-muted text-foreground" : "bg-primary/12 text-primary"
                  }`}
                >
                  {a.unlockedAt ? <Trophy className="size-5" /> : <Award className="size-5" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppPage>
  );
}

function Tile({ icon: Icon, k, v }: { icon: typeof Flame; k: string; v: string }) {
  return (
    <div className="rounded-3xl bg-card px-4 py-4 hairline">
      <Icon className="mb-2 size-4 text-primary" />
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className="mt-1 text-xl font-semibold tabular">{v}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
