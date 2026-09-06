import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Copy,
  Dumbbell,
  Flame,
  Heart,
  Layers,
  MoreHorizontal,
  PersonStanding as PersonStandingIcon,
  Plus,
  Share2,
  Target,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { LoadingBlock, RoutineCard } from "@/components/pulse/cards";
import { EmptyState } from "@/components/pulse/empty-state";
import { HScroll } from "@/components/pulse/h-scroll";
import { TemplatePicker } from "@/components/pulse/template-picker";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { archiveRoutine, duplicateRoutine, listRoutines, shareRoutine, startWorkout } from "@/lib/pulse/fns";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Search = { templates?: boolean };

export const Route = createFileRoute("/routines")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    templates: s.templates === true || s.templates === "1" || s.templates === "true",
  }),
  component: RoutinesPage,
});

const ICONS: Record<string, typeof Dumbbell> = {
  dumbbell: Dumbbell,
  flame: Flame,
  zap: Zap,
  target: Target,
  heart: Heart,
  activity: Activity,
  person: PersonStandingIcon,
  layers: Layers,
};

function RoutinesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/routines/") && pathname !== "/routines/") {
    return <Outlet />;
  }
  const { templates } = Route.useSearch();
  const { data, isPending } = useQuery({ queryKey: ["routines"], queryFn: () => listRoutines({ data: {} }) });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    if (templates) setPicker(true);
  }, [templates]);

  async function start(id?: string) {
    const res = await startWorkout({ data: { routineId: id } });
    void navigate({ to: "/train", search: { id: res.id } });
  }

  return (
    <AppPage
      title="Entrenar"
      action={
        <Button size="sm" onClick={() => navigate({ to: "/routines/$routineId", params: { routineId: "new" } })}>
          <Plus /> Nueva
        </Button>
      }
    >
      <div className="mx-auto max-w-2xl space-y-3 pt-4">
        <HScroll gap="gap-2">
          <Link to="/routines" className="h-8 rounded-full bg-primary px-3 text-xs font-medium leading-8 text-primary-foreground">
            Rutinas
          </Link>
          <Link to="/exercises" className="h-8 rounded-full bg-muted px-3 text-xs font-medium leading-8 text-muted-foreground">
            Ejercicios
          </Link>
          <Link to="/plan" className="h-8 rounded-full bg-muted px-3 text-xs font-medium leading-8 text-muted-foreground">
            Plan semanal
          </Link>
        </HScroll>
        <button
          type="button"
          onClick={() => void start()}
          className="flex w-full items-center justify-between overflow-hidden rounded-[24px] bg-primary px-5 py-5 text-left text-primary-foreground pressable shadow-[0_10px_28px_rgb(255_45_85/0.28)]"
        >
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase opacity-80">Ahora</p>
            <p className="text-[22px] leading-tight font-semibold tracking-tight">Entrenamiento libre</p>
            <p className="mt-1 text-sm opacity-80">Sin plantilla. Empieza y añade ejercicios.</p>
          </div>
          <Zap className="size-7 opacity-90" />
        </button>

        {isPending && <LoadingBlock rows={4} />}
        {!isPending && (data ?? []).length === 0 && (
          <EmptyState
            icon={Dumbbell}
            title="Aún no tienes rutinas."
            hint="Crea la tuya o duplica una plantilla PPL, Upper/Lower o Full Body. No se guardan hasta que las elijas."
            action={
              <>
                <Button onClick={() => navigate({ to: "/routines/$routineId", params: { routineId: "new" } })}>
                  Crear rutina
                </Button>
                <Button variant="secondary" onClick={() => setPicker(true)}>
                  Ver plantillas
                </Button>
              </>
            }
          />
        )}

        {(data ?? []).map((r) => {
          const Icon = ICONS[r.icon] ?? Dumbbell;
          return (
            <RoutineCard
              key={r.id}
              name={r.name}
              description={r.description}
              exerciseCount={r.exerciseCount}
              lastUsed={
                r.lastUsedAt
                  ? formatDistanceToNow(new Date(r.lastUsedAt), { addSuffix: true, locale: es })
                  : null
              }
              color={r.color}
              icon={Icon}
              onStart={() => void start(r.id)}
              menu={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Más" className="mr-1">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => navigate({ to: "/routines/$routineId", params: { routineId: r.id } })}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        await duplicateRoutine({ data: { id: r.id } });
                        void qc.invalidateQueries({ queryKey: ["routines"] });
                        toast.success("Rutina duplicada");
                      }}
                    >
                      <Copy className="size-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const res = await shareRoutine({ data: { id: r.id } });
                        const url = `${window.location.origin}/share/${res.slug}`;
                        await navigator.clipboard.writeText(url);
                        toast.success("Enlace copiado");
                      }}
                    >
                      <Share2 className="size-4" /> Compartir
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        await archiveRoutine({ data: { id: r.id, archived: true } });
                        void qc.invalidateQueries({ queryKey: ["routines"] });
                      }}
                    >
                      Archivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          );
        })}

        {(data ?? []).length > 0 && (
          <Button variant="secondary" className="w-full" onClick={() => setPicker(true)}>
            Ver plantillas
          </Button>
        )}
      </div>

      <Sheet open={picker} onOpenChange={setPicker}>
        <SheetContent className="px-4 pt-4 pb-8">
          <SheetTitle className="text-lg font-semibold">Plantillas</SheetTitle>
          <SheetDescription className="mb-4 text-sm text-muted-foreground">
            Se copian a tus rutinas solo cuando las eliges.
          </SheetDescription>
          <TemplatePicker onCloned={() => setPicker(false)} />
        </SheetContent>
      </Sheet>
    </AppPage>
  );
}
