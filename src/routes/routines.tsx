import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { AppPage } from "@/components/auth-gate";
import { LoadingBlock, RoutineCard } from "@/components/pulse/cards";
import { EmptyState } from "@/components/pulse/empty-state";
import { HScroll } from "@/components/pulse/h-scroll";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveRoutine, duplicateRoutine, listRoutines, shareRoutine, startWorkout } from "@/lib/pulse/fns";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/routines")({ component: RoutinesPage });

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
  const { data, isPending } = useQuery({ queryKey: ["routines"], queryFn: () => listRoutines({ data: {} }) });
  const navigate = useNavigate();
  const qc = useQueryClient();

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
            title="Crea tu primera rutina"
            hint="Push, Pull, Legs o un Full Body. Tú eliges el ritmo."
            action={
              <Button onClick={() => navigate({ to: "/routines/$routineId", params: { routineId: "new" } })}>
                Nueva rutina
              </Button>
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
                    <DropdownMenuItem asChild>
                      <Link to="/routines/$routineId" params={{ routineId: r.id }}>
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const { id } = await duplicateRoutine({ data: { id: r.id } });
                        await qc.invalidateQueries({ queryKey: ["routines"] });
                        toast.success("Rutina duplicada");
                        void navigate({ to: "/routines/$routineId", params: { routineId: id } });
                      }}
                    >
                      <Copy className="size-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const { slug } = await shareRoutine({ data: { id: r.id } });
                        const url = `${window.location.origin}/share/${slug}`;
                        await navigator.clipboard.writeText(url);
                        toast.success("Enlace copiado");
                      }}
                    >
                      <Share2 className="size-4" /> Compartir
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        await archiveRoutine({ data: { id: r.id, archived: true } });
                        await qc.invalidateQueries({ queryKey: ["routines"] });
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
        <Link to="/exercises" className="block pt-2 text-center text-sm text-accent">
          Biblioteca de ejercicios
        </Link>
      </div>
    </AppPage>
  );
}
