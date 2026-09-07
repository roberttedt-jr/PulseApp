import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PulseMark } from "@/components/pulse-logo";
import { Button } from "@/components/ui/button";
import { getPublicRoutine } from "@/lib/pulse/fns";

export const Route = createFileRoute("/share/$slug")({ component: SharePage });

function SharePage() {
  const { slug } = Route.useParams();
  const { data, isPending } = useQuery({
    queryKey: ["share", slug],
    queryFn: () => getPublicRoutine({ data: { slug } }),
  });
  return (
    <main className="min-h-dvh bg-background px-5 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center gap-2">
          <PulseMark />
          <span className="font-semibold">Pulse</span>
        </div>
        {isPending && <p className="text-sm text-muted-foreground">Cargando rutina…</p>}
        {!isPending && !data && <p>Esta rutina no es pública o el enlace caducó.</p>}
        {data && (
          <>
            <p className="text-sm text-muted-foreground">Rutina de {data.author}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.name}</h1>
            {data.description && <p className="mt-2 text-sm text-muted-foreground">{data.description}</p>}
            <ul className="mt-6 space-y-2">
              {data.exercises.map((e, i) => (
                <li key={i} className="flex items-center justify-between pulse-card px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium">{e.name}</span>
                    <span className="text-xs text-muted-foreground">{e.muscle}</span>
                  </span>
                  <span className="text-sm tabular text-muted-foreground">
                    {e.target_sets} × {e.target_reps}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 w-full">
              <Link to="/login">Abrir en Pulse</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
