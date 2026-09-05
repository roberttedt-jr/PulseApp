import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getRoutine, listExercises, saveRoutine } from "@/lib/pulse/fns";
import { ROUTINE_COLORS, ROUTINE_ICONS } from "@/lib/pulse/types";
import { toast } from "sonner";

export const Route = createFileRoute("/routines/$routineId")({ component: EditorPage });

type Row = { key: string; exerciseId: string; name: string; muscle: string; targetSets: number; targetReps: string; restSeconds: number };

function EditorPage() {
  const { routineId } = Route.useParams();
  const isNew = routineId === "new";
  const { data } = useQuery({
    queryKey: ["routine", routineId],
    queryFn: () => getRoutine({ data: { id: routineId } }),
    enabled: !isNew,
  });
  return (
    <AppPage title={isNew ? "Nueva rutina" : data?.name ?? "Rutina"}>
      <Editor isNew={isNew} routineId={isNew ? undefined : routineId} initial={data} />
    </AppPage>
  );
}

function Editor({
  isNew,
  routineId,
  initial,
}: {
  isNew: boolean;
  routineId?: string;
  initial: Awaited<ReturnType<typeof getRoutine>> | undefined;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("dumbbell");
  const [color, setColor] = useState("#FF2D55");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setName(initial.name);
    setDescription(initial.description ?? "");
    setIcon(initial.icon);
    setColor(initial.color);
    setRows(
      (initial.exercises ?? []).map((e) => ({
        key: e.id,
        exerciseId: e.exerciseId,
        name: e.name,
        muscle: e.muscle,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        restSeconds: e.restSeconds,
      })),
    );
  }, [initial]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setRows((items) => {
      const oldIndex = items.findIndex((i) => i.key === active.id);
      const newIndex = items.findIndex((i) => i.key === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  const save = useMutation({
    mutationFn: () =>
      saveRoutine({
        data: {
          id: routineId,
          name: name.trim() || "Rutina",
          description,
          icon,
          color,
          exercises: rows.map((r) => ({
            exerciseId: r.exerciseId,
            targetSets: r.targetSets,
            targetReps: r.targetReps,
            restSeconds: r.restSeconds,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Rutina guardada");
      void navigate({ to: "/routines" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-4 pb-8">
      <div className="space-y-1.5">
        <Label>Nombre</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Push A" />
      </div>
      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {ROUTINE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => setColor(c)}
            className="size-8 rounded-full"
            style={{ background: c, boxShadow: color === c ? `0 0 0 3px ${c}55` : undefined }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {ROUTINE_ICONS.map((ic) => (
          <button
            key={ic}
            type="button"
            onClick={() => setIcon(ic)}
            className={`rounded-xl px-3 py-1.5 text-xs capitalize ${icon === ic ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {ic}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <SortableRow
                key={r.key}
                row={r}
                index={i}
                onChange={(patch) => setRows((all) => all.map((x) => (x.key === r.key ? { ...x, ...patch } : x)))}
                onRemove={() => setRows((all) => all.filter((x) => x.key !== r.key))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <Plus /> Añadir ejercicio
      </Button>
      <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || (isNew && rows.length === 0)}>
        Guardar
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-hidden px-4 pt-4">
          <p className="mb-3 text-lg font-semibold">Ejercicios</p>
          <Picker
            onPick={(ex) => {
              setRows((all) => [
                ...all,
                {
                  key: crypto.randomUUID(),
                  exerciseId: ex.id,
                  name: ex.name,
                  muscle: ex.muscle,
                  targetSets: 3,
                  targetReps: "8-12",
                  restSeconds: 90,
                },
              ]);
              setOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SortableRow({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: Row;
  index: number;
  onChange: (p: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.key });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-2xl bg-card p-3 hairline"
    >
      <div className="flex items-center gap-2">
        <button type="button" className="text-muted-foreground" {...attributes} {...listeners} aria-label="Reordenar">
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {index + 1}. {row.name}
          </p>
          <p className="text-xs text-muted-foreground">{row.muscle}</p>
        </div>
        <button type="button" onClick={onRemove} className="text-muted-foreground" aria-label="Quitar">
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Input
          className="h-10"
          value={row.targetSets}
          onChange={(e) => onChange({ targetSets: Number(e.target.value) || 1 })}
          aria-label="Series"
        />
        <Input className="h-10" value={row.targetReps} onChange={(e) => onChange({ targetReps: e.target.value })} aria-label="Reps" />
        <Input
          className="h-10"
          value={row.restSeconds}
          onChange={(e) => onChange({ restSeconds: Number(e.target.value) || 0 })}
          aria-label="Descanso"
        />
      </div>
    </li>
  );
}

function Picker({ onPick }: { onPick: (e: { id: string; name: string; muscle: string }) => void }) {
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["ex", q], queryFn: () => listExercises({ data: { q } }) });
  return (
    <div className="flex h-[70dvh] min-h-0 flex-col">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="mb-3" />
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto no-scrollbar overscroll-contain pb-8">
        {(data ?? []).slice(0, 50).map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="w-full rounded-2xl px-3 py-3 text-left hover:bg-muted"
              onClick={() => onPick(e)}
            >
              <span className="block text-sm font-medium">{e.name}</span>
              <span className="text-xs text-muted-foreground">
                {e.muscle} · {e.type}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
