import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { ExerciseDemo } from "@/components/pulse/exercise-demo";
import { HScroll } from "@/components/pulse/h-scroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { createExercise, listExercises, toggleFavorite } from "@/lib/pulse/fns";
import { EQUIPMENT, EXERCISE_TYPES, MUSCLES } from "@/lib/pulse/types";
import { toast } from "sonner";

type Search = { muscle?: string };

export const Route = createFileRoute("/exercises")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    muscle: typeof s.muscle === "string" && s.muscle ? s.muscle : undefined,
  }),
  component: ExercisesPage,
});

function ExercisesPage() {
  const { muscle: muscleParam } = Route.useSearch();
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string>(muscleParam ?? "");
  const [type, setType] = useState<string>("");
  const [equipment, setEquipment] = useState<string>("");
  const [favOnly, setFavOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (muscleParam) setMuscle(muscleParam);
  }, [muscleParam]);
  const { data } = useQuery({
    queryKey: ["ex", q, muscle, type, equipment, favOnly],
    queryFn: () =>
      listExercises({
        data: {
          q,
          muscle: muscle || undefined,
          type: type || undefined,
          equipment: equipment || undefined,
          favorites: favOnly,
        },
      }),
  });

  return (
    <AppPage
      title="Ejercicios"
      action={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Nuevo
        </Button>
      }
    >
      <div className="mx-auto max-w-2xl space-y-3 pt-4">
        <HScroll gap="gap-2">
          <Link to="/routines" className="h-8 rounded-full bg-muted px-3 text-xs font-medium leading-8 text-muted-foreground">
            Rutinas
          </Link>
          <Link to="/exercises" className="h-8 rounded-full bg-primary px-3 text-xs font-medium leading-8 text-primary-foreground">
            Ejercicios
          </Link>
          <Link to="/plan" className="h-8 rounded-full bg-muted px-3 text-xs font-medium leading-8 text-muted-foreground">
            Plan semanal
          </Link>
        </HScroll>
        <div className="sticky top-[52px] z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur-xl md:top-0">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar press, dominadas…" />
        </div>
        <HScroll gap="gap-2">
          <Chip active={favOnly} onClick={() => setFavOnly(!favOnly)}>
            Favoritos
          </Chip>
          {MUSCLES.map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? "" : m)}>
              {m}
            </Chip>
          ))}
        </HScroll>
        <HScroll gap="gap-2">
          {EXERCISE_TYPES.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(type === t ? "" : t)}>
              {t}
            </Chip>
          ))}
        </HScroll>
        <HScroll gap="gap-2">
          {EQUIPMENT.map((eq) => (
            <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(equipment === eq ? "" : eq)}>
              {eq}
            </Chip>
          ))}
        </HScroll>
        <ul className="space-y-1.5">
          {(data ?? []).map((e) => (
            <li key={e.id} className="flex items-center gap-2 pulse-card rounded-2xl px-2 py-2">
              <Link to="/exercises/$exerciseId" params={{ exerciseId: e.id }} className="flex min-w-0 flex-1 items-center gap-3">
                <ExerciseDemo name={e.name} muscle={e.muscle} type={e.type} gifUrl={e.gifUrl} compact />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.muscle} · {e.type} · {e.equipment}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label="Favorito"
                onClick={async () => {
                  await toggleFavorite({ data: { exerciseId: e.id } });
                  await qc.invalidateQueries({ queryKey: ["ex"] });
                }}
                className={`grid size-11 place-items-center ${e.isFavorite ? "text-warning" : "text-muted-foreground"}`}
              >
                <Star className={e.isFavorite ? "size-5 fill-current" : "size-5"} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="px-4 pt-4">
          <SheetTitle className="mb-3">Nuevo ejercicio</SheetTitle>
          <CreateForm
            onDone={() => {
              setOpen(false);
              void qc.invalidateQueries({ queryKey: ["ex"] });
            }}
          />
        </SheetContent>
      </Sheet>
    </AppPage>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("Pecho");
  const [type, setType] = useState("Compuesto");
  const [equipment, setEquipment] = useState("Barra");
  const mut = useMutation({
    mutationFn: () => createExercise({ data: { name, muscle, type, equipment } }),
    onSuccess: () => {
      toast.success("Ejercicio creado");
      onDone();
    },
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
    >
      <h2 className="text-lg font-semibold">Ejercicio personalizado</h2>
      <div className="space-y-1.5">
        <Label>Nombre</Label>
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Músculo</Label>
        <select className="h-12 w-full rounded-2xl bg-muted px-3" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          {MUSCLES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <select className="h-12 w-full rounded-2xl bg-muted px-3" value={type} onChange={(e) => setType(e.target.value)}>
          {EXERCISE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Equipo</Label>
        <select className="h-12 w-full rounded-2xl bg-muted px-3" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          {EQUIPMENT.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <Button className="w-full" type="submit" disabled={mut.isPending}>
        Guardar
      </Button>
    </form>
  );
}
