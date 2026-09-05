import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppPage } from "@/components/auth-gate";
import { ExerciseDemo } from "@/components/pulse/exercise-demo";
import { EmptyState } from "@/components/pulse/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExerciseDetail } from "@/lib/pulse/fns";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dumbbell } from "lucide-react";

export const Route = createFileRoute("/exercises/$exerciseId")({ component: Detail });

function Detail() {
  const { exerciseId } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["ex-detail", exerciseId],
    queryFn: () => getExerciseDetail({ data: { id: exerciseId } }),
  });
  if (!data) {
    return (
      <AppPage title="Ejercicio">
        <p className="pt-8 text-sm text-muted-foreground">Cargando…</p>
      </AppPage>
    );
  }
  return (
    <AppPage title={data.name}>
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          {data.muscle} · {data.type} · {data.equipment}
          {data.secondaryMuscles?.length ? ` · + ${data.secondaryMuscles.join(", ")}` : ""}
        </p>
        <ExerciseDemo name={data.name} muscle={data.muscle} type={data.type} gifUrl={data.gifUrl} />
        {data.instructions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Técnica</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{data.instructions}</p>
            </CardContent>
          </Card>
        )}
        {data.commonMistakes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Errores comunes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{data.commonMistakes}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PRs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.prs.length === 0 && (
              <EmptyState icon={Dumbbell} title="Todavía no hay récord" hint="La primera serie pesada se queda aquí." className="py-4" />
            )}
            {data.prs.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(p.recordedAt), "d MMM yyyy", { locale: es })}
                </span>
                <span className="tabular font-medium">
                  {p.weight} × {p.reps} · 1RM {Math.round(p.oneRepMax)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas 10 sesiones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.history.length === 0 && <p className="text-sm text-muted-foreground">Aún no lo has entrenado.</p>}
            {data.history.map((h) => (
              <div key={h.workoutId} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{format(new Date(h.date), "d MMM", { locale: es })}</span>
                <span className="tabular">
                  {h.weight} kg × {h.reps} · {Math.round(h.volume)} kg
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
}
