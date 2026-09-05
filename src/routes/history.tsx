import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Trophy } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { LoadingBlock } from "@/components/pulse/cards";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/ui/button";
import { listWorkouts } from "@/lib/pulse/fns";
import { cn, formatDuration, formatKg } from "@/lib/utils";

type Search = { muscle?: string };

export const Route = createFileRoute("/history")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    muscle: typeof s.muscle === "string" && s.muscle ? s.muscle : undefined,
  }),
  component: HistoryPage,
});

function weekDays(items: { startedAt: string }[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hit = items.some((w) => w.startedAt.slice(0, 10) === key);
    return { key, d, hit, today: i === 6, label: ["L", "M", "X", "J", "V", "S", "D"][(d.getDay() + 6) % 7]! };
  });
}

function HistoryPage() {
  const { muscle } = Route.useSearch();
  const { data, isPending } = useQuery({
    queryKey: ["workouts", muscle],
    queryFn: () => listWorkouts({ data: { muscle } }),
  });
  const items = data ?? [];
  let lastMonth = "";
  const week = weekDays(items);

  return (
    <AppPage title="Historial">
      <div className="mx-auto max-w-xl space-y-2 pt-4">
        <div className="mb-3 flex justify-between rounded-[22px] bg-card px-2 py-3 hairline">
          {week.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{d.label}</span>
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-sm font-semibold tabular",
                  d.hit && "bg-primary text-primary-foreground",
                  !d.hit && d.today && "ring-1 ring-primary/50",
                  !d.hit && !d.today && "text-muted-foreground",
                )}
              >
                {format(d.d, "d")}
              </span>
            </div>
          ))}
        </div>
        {muscle && (
          <p className="text-sm text-muted-foreground">
            Filtrado: {muscle}{" "}
            <Link to="/history" className="text-accent">
              Quitar
            </Link>
          </p>
        )}
        {isPending && <LoadingBlock rows={5} />}
        {!isPending && items.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title="Todavía no hay sesiones"
            hint="Termina un entrenamiento para verlo aquí, con volumen y duración."
            action={
              <Button asChild>
                <Link to="/routines">Entrenar</Link>
              </Button>
            }
          />
        )}
        {items.map((w) => {
          const d = new Date(w.startedAt);
          const month = format(d, "MMMM yyyy", { locale: es });
          const show = month !== lastMonth;
          lastMonth = month;
          return (
            <div key={w.id}>
              {show && (
                <p className="mt-4 mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{month}</p>
              )}
              <Link
                to="/history/$workoutId"
                params={{ workoutId: w.id }}
                className="flex items-center gap-3 rounded-[22px] bg-card px-3 py-3 hairline pressable"
              >
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-muted">
                  <p className="text-lg leading-none font-semibold tabular">{format(d, "d")}</p>
                  <p className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {format(d, "MMM", { locale: es })}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium">
                    {w.title}
                    {w.hasPr ? <Trophy className="size-3.5 shrink-0 text-warning" aria-label="PR" /> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDuration(w.durationSeconds ?? 0)}
                    {w.lifts ? ` · ${w.lifts}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-[15px] font-semibold">{formatKg(w.volume)}</p>
                  <p className="text-[11px] text-muted-foreground">{w.setCount} series</p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </AppPage>
  );
}
