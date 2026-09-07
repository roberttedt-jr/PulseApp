import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronUp, MoreHorizontal, Plus, Trophy, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericField } from "@/components/pulse/numeric-field";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteWorkout,
  duplicateWorkout,
  getBootstrap,
  getWorkout,
  listExercises,
  updateCompletedWorkout,
} from "@/lib/pulse/fns";
import { displayMuscle } from "@/lib/pulse/exercise-meta";
import { cn, daysAgoEs, formatDuration, formatKg, fromKg, toKg } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/history/$workoutId")({ component: WorkoutDetail });

type Workout = NonNullable<Awaited<ReturnType<typeof getWorkout>>>;
type Block = Workout["blocks"][number];
type Kind = Block["sets"][number]["kind"];

const KINDS: Kind[] = ["work", "warmup", "drop", "fail"];

function WorkoutDetail() {
  const { workoutId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["workout", workoutId],
    queryFn: () => getWorkout({ data: { id: workoutId } }),
  });
  const profile = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const units = profile.data?.profile.units ?? "metric";
  const showRpe = profile.data?.profile.showRpe ?? true;
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [more, setMore] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteWorkout({ data: { id: workoutId } }),
    onSuccess: async () => {
      toast.success("Entrenamiento eliminado");
      await qc.invalidateQueries();
      await navigate({ to: "/history" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar"),
  });

  const dup = useMutation({
    mutationFn: () => duplicateWorkout({ data: { id: workoutId } }),
    onSuccess: async (res) => {
      setMore(false);
      toast.success(res.resumed ? "Tienes una sesión abierta" : "Sesión lista para entrenar");
      await qc.invalidateQueries();
      await navigate({ to: "/train", search: { id: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo duplicar"),
  });

  if (!data) {
    return (
      <AppPage title="Sesión">
        <p className="pt-8 text-sm text-muted-foreground">Cargando…</p>
      </AppPage>
    );
  }

  if (mode === "edit") {
    return (
      <EditWorkout
        workout={data}
        units={units}
        showRpe={showRpe}
        onCancel={() => setMode("view")}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["workout", workoutId] });
          void qc.invalidateQueries({ queryKey: ["workouts"] });
          void qc.invalidateQueries({ queryKey: ["progress"] });
          void qc.invalidateQueries({ queryKey: ["muscle-load"] });
          void qc.invalidateQueries({ queryKey: ["bootstrap"] });
          setMode("view");
        }}
      />
    );
  }

  const started = new Date(data.startedAt);

  return (
    <AppPage title={data.title}>
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          {format(started, "EEEE d MMMM yyyy · HH:mm", { locale: es })}
          {data.durationSeconds ? ` · ${formatDuration(data.durationSeconds)}` : ""}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Tile k="Volumen" v={data.volume > 0 ? formatKg(data.volume, units) : "—"} />
          <Tile k="Series" v={String(data.setCount)} />
          <Tile k="Ejercicios" v={String(data.exerciseCount)} />
        </div>
        {data.notes && <p className="pulse-card p-4 text-sm">{data.notes}</p>}
        {data.photoData && (
          <img src={data.photoData} alt="Foto post-entreno" className="w-full rounded-3xl object-cover" />
        )}
        {data.blocks.map((b) => (
          <section key={b.exerciseId} className="pulse-card p-4">
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
                  {displayMuscle(b.muscle)}
                  {b.equipment ? ` · ${b.equipment}` : ""}
                  {b.volume > 0 ? ` · ${formatKg(b.volume, units)}` : ""}
                </p>
                {b.lastSession && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Anterior: {b.lastSession.bestWeight > 0 ? formatKg(b.lastSession.bestWeight, units) : "—"} ×{" "}
                    {b.lastSession.bestReps} · {b.lastSession.setCount} series · {daysAgoEs(b.lastSession.startedAt)}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                {b.compareLabel && (
                  <p className="text-[11px] font-medium text-primary">{b.compareLabel}</p>
                )}
                {b.estimated1rm ? (
                  <p className="text-xs font-medium text-muted-foreground">1RM {formatKg(b.estimated1rm, units)}</p>
                ) : null}
              </div>
            </div>
            <ul className="space-y-1 text-sm tabular">
              {b.sets.filter((s) => s.completed).map((s, i) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-2 py-1.5",
                    s.completed ? "bg-success/10 text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="w-6 font-medium">
                    {s.kind === "warmup" ? "W" : s.kind === "drop" ? "D" : s.kind === "fail" ? "F" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    {s.weight > 0 ? `${formatKg(s.weight, units)} × ${s.reps}` : `${s.reps} reps`}
                    {showRpe && s.rpe ? ` · RPE ${s.rpe}` : ""}
                  </span>
                  {s.isPr ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning">
                      <Trophy className="size-3" /> Récord
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {b.notes && <p className="mt-3 text-sm text-muted-foreground">{b.notes}</p>}
          </section>
        ))}

        <div className="flex gap-2 pb-8">
          <Button className="flex-1" onClick={() => setMode("edit")}>
            Editar entrenamiento
          </Button>
          <Button variant="secondary" size="icon" aria-label="Más opciones" onClick={() => setMore(true)}>
            <MoreHorizontal />
          </Button>
        </div>
      </div>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent className="px-4 pt-4 pb-6">
          <SheetTitle>Más opciones</SheetTitle>
          <SheetDescription className="sr-only">Editar, duplicar o eliminar este entrenamiento.</SheetDescription>
          <div className="mt-4 grid gap-2">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => {
                setMore(false);
                setMode("edit");
              }}
            >
              Editar entrenamiento
            </Button>
            <Button variant="secondary" className="w-full justify-start" disabled={dup.isPending} onClick={() => dup.mutate()}>
              Duplicar entrenamiento
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                setMore(false);
                setConfirmDel(true);
              }}
            >
              Eliminar entrenamiento
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={confirmDel} onOpenChange={setConfirmDel}>
        <SheetContent className="px-4 pt-4 pb-6">
          <SheetTitle>¿Eliminar entrenamiento?</SheetTitle>
          <SheetDescription>
            Se borrará «{data.title}» del {format(started, "d MMMM yyyy", { locale: es })}. Volumen, estadísticas y récords se recalcularán.
          </SheetDescription>
          <div className="mt-5 grid gap-2">
            <Button variant="secondary" onClick={() => setConfirmDel(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
              <Trash2 className="size-4" /> Eliminar entrenamiento
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppPage>
  );
}

type DraftSet = { key: string; reps: string; weight: string; rpe: string; kind: Kind; completed: boolean };
type DraftBlock = { exerciseId: string; name: string; muscle: string; notes: string; sets: DraftSet[] };

function EditWorkout({
  workout,
  units,
  showRpe,
  onCancel,
  onSaved,
}: {
  workout: Workout;
  units: "metric" | "imperial";
  showRpe: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const started = new Date(workout.startedAt);
  const [title, setTitle] = useState(workout.title);
  const [date, setDate] = useState(format(started, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(started, "HH:mm"));
  const [durationMin, setDurationMin] = useState(String(Math.max(1, Math.round((workout.durationSeconds ?? 0) / 60))));
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [blocks, setBlocks] = useState<DraftBlock[]>(() =>
    workout.blocks.map((b) => ({
      exerciseId: b.exerciseId,
      name: b.name,
      muscle: b.muscle,
      notes: b.notes ?? "",
      sets: b.sets.map((s) => ({
        key: s.id,
        reps: s.reps ? String(s.reps) : "",
        weight: s.weight ? String(fromKg(s.weight, units)) : "",
        rpe: s.rpe != null ? String(s.rpe) : "",
        kind: s.kind,
        completed: s.completed,
      })),
    })),
  );
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState("");
  const ex = useQuery({ queryKey: ["ex", q], queryFn: () => listExercises({ data: { q } }) });

  const save = useMutation({
    mutationFn: () => {
      const startedAt = new Date(`${date}T${time}:00`);
      return updateCompletedWorkout({
        data: {
          id: workout.id,
          title,
          notes,
          durationSeconds: Math.round(Number(durationMin) * 60) || workout.durationSeconds,
          startedAt: startedAt.toISOString(),
          blocks: blocks.map((b) => ({
            exerciseId: b.exerciseId,
            notes: b.notes,
            sets: b.sets.map((s) => ({
              reps: Number(s.reps) || 0,
              weight: toKg(Number(s.weight) || 0, units),
              rpe: s.rpe === "" ? null : Math.min(10, Math.max(0, Number(s.rpe))),
              kind: s.kind,
              completed: s.completed,
            })),
          })),
        },
      });
    },
    onSuccess: () => {
      toast.success("Entrenamiento actualizado");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  function moveBlock(i: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }

  return (
    <AppPage title="Editar" hideNav>
      <div className="mx-auto max-w-xl space-y-4 pt-4 pb-28">
        <div className="space-y-1.5">
          <Label htmlFor="w-title">Nombre</Label>
          <Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="w-date">Fecha</Label>
            <Input id="w-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-time">Hora</Label>
            <Input id="w-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-dur">Duración (min)</Label>
          <Input id="w-dur" inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-notes">Notas</Label>
          <Textarea id="w-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cómo se sintió la sesión…" />
        </div>

        {blocks.map((b, bi) => (
          <section key={b.exerciseId + bi} className="pulse-card p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-medium">{b.name}</p>
              <button type="button" className="grid size-9 place-items-center" aria-label="Subir" onClick={() => moveBlock(bi, -1)}>
                <ChevronUp className="size-4" />
              </button>
              <button type="button" className="grid size-9 place-items-center" aria-label="Bajar" onClick={() => moveBlock(bi, 1)}>
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                className="grid size-9 place-items-center text-destructive"
                aria-label="Quitar ejercicio"
                onClick={() => setBlocks((prev) => prev.filter((_, i) => i !== bi))}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="space-y-1">
              {b.sets.map((s, si) => (
                <div key={s.key} className="grid grid-cols-[2.2rem_1fr_4.5rem_auto] items-center gap-1">
                  <button
                    type="button"
                    className="h-10 rounded-xl bg-muted text-xs font-semibold"
                    onClick={() =>
                      setBlocks((prev) =>
                        prev.map((bl, i) =>
                          i !== bi
                            ? bl
                            : {
                                ...bl,
                                sets: bl.sets.map((x, j) =>
                                  j === si ? { ...x, kind: KINDS[(KINDS.indexOf(x.kind) + 1) % KINDS.length]! } : x,
                                ),
                              },
                        ),
                      )
                    }
                  >
                    {s.kind === "warmup" ? "W" : s.kind === "drop" ? "D" : s.kind === "fail" ? "F" : si + 1}
                  </button>
                  <NumericField
                    kind="decimal"
                    className="h-10 rounded-xl px-2"
                    value={s.weight}
                    onValueChange={(v) =>
                      setBlocks((prev) =>
                        prev.map((bl, i) =>
                          i !== bi ? bl : { ...bl, sets: bl.sets.map((x, j) => (j === si ? { ...x, weight: v } : x)) },
                        ),
                      )
                    }
                    aria-label="Peso"
                  />
                  <NumericField
                    kind="int"
                    className="h-10 rounded-xl px-2"
                    value={s.reps}
                    onValueChange={(v) =>
                      setBlocks((prev) =>
                        prev.map((bl, i) =>
                          i !== bi ? bl : { ...bl, sets: bl.sets.map((x, j) => (j === si ? { ...x, reps: v } : x)) },
                        ),
                      )
                    }
                    aria-label="Repeticiones"
                  />
                  <button
                    type="button"
                    className="grid size-10 place-items-center text-destructive"
                    aria-label="Eliminar serie"
                    onClick={() =>
                      setBlocks((prev) =>
                        prev.map((bl, i) => (i !== bi ? bl : { ...bl, sets: bl.sets.filter((_, j) => j !== si) })),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                  {showRpe && (
                    <NumericField
                      kind="decimal"
                      className="col-span-4 h-9 rounded-xl px-2 text-sm"
                      value={s.rpe}
                      onValueChange={(v) =>
                        setBlocks((prev) =>
                          prev.map((bl, i) =>
                            i !== bi ? bl : { ...bl, sets: bl.sets.map((x, j) => (j === si ? { ...x, rpe: v } : x)) },
                          ),
                        )
                      }
                      aria-label="RPE"
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 inline-flex h-10 items-center gap-1 rounded-full bg-muted px-3 text-sm text-accent"
              onClick={() =>
                setBlocks((prev) =>
                  prev.map((bl, i) =>
                    i !== bi
                      ? bl
                      : {
                          ...bl,
                          sets: [
                            ...bl.sets,
                            {
                              key: crypto.randomUUID(),
                              reps: bl.sets.at(-1)?.reps || "8",
                              weight: bl.sets.at(-1)?.weight || "",
                              rpe: "",
                              kind: "work",
                              completed: true,
                            },
                          ],
                        },
                  ),
                )
              }
            >
              <Plus className="size-4" /> Serie
            </button>
            <Textarea
              className="mt-2"
              value={b.notes}
              onChange={(e) =>
                setBlocks((prev) => prev.map((bl, i) => (i !== bi ? bl : { ...bl, notes: e.target.value })))
              }
              placeholder="Nota del ejercicio"
            />
          </section>
        ))}

        <Button variant="secondary" className="w-full" onClick={() => setPicker(true)}>
          <Plus className="size-4" /> Añadir ejercicio
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={save.isPending} onClick={() => save.mutate()}>
            Guardar cambios
          </Button>
        </div>
      </div>

      <Sheet open={picker} onOpenChange={setPicker}>
        <SheetContent className="px-4 pt-4">
          <SheetTitle>Añadir ejercicio</SheetTitle>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="mt-3 mb-3" />
          <ul className="max-h-[55dvh] space-y-1 overflow-y-auto pb-6">
            {(ex.data ?? []).slice(0, 40).map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left pressable"
                  onClick={() => {
                    if (blocks.some((b) => b.exerciseId === e.id)) {
                      toast.error("Ese ejercicio ya está en la sesión");
                      return;
                    }
                    setBlocks((prev) => [
                      ...prev,
                      {
                        exerciseId: e.id,
                        name: e.name,
                        muscle: e.muscle,
                        notes: "",
                        sets: [{ key: crypto.randomUUID(), reps: "8", weight: "", rpe: "", kind: "work", completed: true }],
                      },
                    ]);
                    setPicker(false);
                  }}
                >
                  <span className="min-w-0 truncate font-medium">{e.name}</span>
                  <span className="text-xs text-muted-foreground">{displayMuscle(e.muscle)}</span>
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </AppPage>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="pulse-card px-3 py-4 text-center">
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className="mt-1 font-semibold">{v}</p>
    </div>
  );
}
