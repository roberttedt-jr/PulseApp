import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  History,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  StickyNote,
  Weight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { Confetti } from "@/components/confetti";
import { ExerciseDemo } from "@/components/pulse/exercise-demo";
import { HScroll } from "@/components/pulse/h-scroll";
import { NumericField } from "@/components/pulse/numeric-field";
import { PlateStack } from "@/components/plate-calc";
import { RestTimer } from "@/components/rest-timer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  addExerciseToWorkout,
  getBootstrap,
  getWorkout,
  listExercises,
  setWorkoutStatus,
  upsertSet,
} from "@/lib/pulse/fns";
import { epley1rm } from "@/lib/pulse/formulas";
import { cn, formatDuration, formatKg } from "@/lib/utils";
import { toast } from "sonner";

type Search = { id: string };
type Workout = NonNullable<Awaited<ReturnType<typeof getWorkout>>>;
type Block = Workout["blocks"][number];
type Kind = Block["sets"][number]["kind"];

const KINDS: Kind[] = ["work", "warmup", "drop", "fail"];

export const Route = createFileRoute("/train")({
  validateSearch: (s: Record<string, unknown>): Search => ({ id: String(s.id ?? "") }),
  component: TrainRoute,
});

function TrainRoute() {
  const { id } = Route.useSearch();
  return (
    <AppPage hideNav>
      {id ? <Live id={id} /> : <p className="pt-10 text-center text-sm text-muted-foreground">No hay sesión activa.</p>}
    </AppPage>
  );
}

function Live({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["workout", id], queryFn: () => getWorkout({ data: { id } }) });
  const profile = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const [rest, setRest] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [picker, setPicker] = useState(false);
  const [plates, setPlates] = useState(false);
  const [plateKg, setPlateKg] = useState("100");
  const [celebrate, setCelebrate] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [summary, setSummary] = useState<{ volume: number; sets: number; prs: string[] } | null>(null);
  const [prFlash, setPrFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.startedAt) return;
    setNotes(data.notes ?? "");
    setPaused(data.status === "paused");
  }, [data?.startedAt, data?.status, data?.notes]);

  useEffect(() => {
    if (!data?.startedAt || paused || done) return;
    const start = new Date(data.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [data?.startedAt, paused, done]);

  const units = profile.data?.profile.units ?? "metric";
  const sound = profile.data?.profile.restSound ?? true;
  const autoRest = profile.data?.profile.autoRest ?? true;

  const finish = useMutation({
    mutationFn: async () => {
      const res = await setWorkoutStatus({
        data: { id, status: "completed", durationSeconds: elapsed, notes },
      });
      return res;
    },
    onSuccess: (res) => {
      setConfirm(false);
      setDone(true);
      setCelebrate(true);
      setSummary({ volume: data?.volume ?? 0, sets: data?.setCount ?? 0, prs: res.newPrs });
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!data) return <p className="pt-8 text-sm text-muted-foreground">Cargando sesión…</p>;
  if (data.status === "completed" && !done) {
    return (
      <div className="mx-auto max-w-lg pt-10 text-center">
        <p className="text-lg font-semibold">Sesión guardada</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/history/$workoutId", params: { workoutId: id } })}>
          Ver resumen
        </Button>
      </div>
    );
  }

  if (done && summary) {
    return (
      <div className="mx-auto max-w-md pt-8 text-center">
        <Confetti show={celebrate} />
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Sesión completada</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{data.title}</h2>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Mini k="Volumen" v={formatKg(summary.volume, units)} />
          <Mini k="Series" v={String(summary.sets)} />
          <Mini k="Tiempo" v={formatDuration(elapsed)} />
        </div>
        {summary.prs.length > 0 && (
          <p className="mt-5 text-sm text-warning">Nuevos PRs: {summary.prs.join(", ")}</p>
        )}
        <Button className="mt-8 w-full" onClick={() => navigate({ to: "/" })}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  const pending = data.blocks.reduce((n, b) => n + b.sets.filter((s) => !s.completed).length, 0);

  return (
    <div className={cn("mx-auto max-w-lg min-w-0 space-y-4 pt-2", rest != null && "pb-40")}>
      {rest != null && <RestTimer seconds={rest} sound={sound} onClose={() => setRest(null)} />}

      <header className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/86 px-4 py-3 backdrop-blur-2xl md:mx-0 md:rounded-3xl md:border">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[17px] font-semibold tracking-tight">{data.title}</p>
          <div className="flex shrink-0 gap-1.5">
            <Button
              variant="secondary"
              size="icon"
              aria-label={paused ? "Reanudar" : "Pausar"}
              onClick={() => {
                const next = paused ? "in_progress" : "paused";
                setPaused(!paused);
                void setWorkoutStatus({ data: { id, status: next, durationSeconds: elapsed } });
              }}
            >
              {paused ? <Play /> : <Pause />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
              Fin
            </Button>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <div className="rounded-2xl bg-muted/80 px-2 py-1.5 text-center">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Tiempo</p>
            <p className="tabular text-sm font-semibold">{formatDuration(elapsed)}</p>
          </div>
          <div className="rounded-2xl bg-muted/80 px-2 py-1.5 text-center">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Volumen</p>
            <p className="tabular text-sm font-semibold">{formatKg(data.volume, units)}</p>
          </div>
          <div className="rounded-2xl bg-muted/80 px-2 py-1.5 text-center">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Series</p>
            <p className="tabular text-sm font-semibold">{data.setCount}</p>
          </div>
        </div>
      </header>

      {prFlash && (
        <p className="rounded-2xl bg-warning/15 px-4 py-2 text-center text-sm font-medium text-warning">{prFlash}</p>
      )}

      {data.blocks.map((block) => (
        <ExerciseBlock
          key={block.exerciseId}
          block={block}
          workoutId={id}
          units={units}
          onRest={(sec) => {
            if (autoRest) setRest(sec);
          }}
          onPlates={(kg) => {
            setPlateKg(String(kg));
            setPlates(true);
          }}
          onPr={(name, orm) => {
            setPrFlash(`PR · ${name} · ${Math.round(orm)} kg`);
            window.setTimeout(() => setPrFlash(null), 2800);
          }}
        />
      ))}

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setPicker(true)}>
          <Plus />
          Ejercicio
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setPlates(true)} aria-label="Calculadora de discos">
          <Weight />
        </Button>
      </div>

      <div className="space-y-2 pb-8">
        <p className="text-sm font-medium">Notas</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cómo se sintió la sesión…" />
      </div>

      <Sheet open={picker} onOpenChange={setPicker}>
        <SheetContent className="overflow-hidden px-4 pt-4">
          <p className="mb-3 text-lg font-semibold">Añadir ejercicio</p>
          <ExercisePicker
            onPick={async (exerciseId) => {
              await addExerciseToWorkout({ data: { workoutId: id, exerciseId } });
              await qc.invalidateQueries({ queryKey: ["workout", id] });
              setPicker(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={plates} onOpenChange={setPlates}>
        <SheetContent className="px-4 pt-4">
          <p className="mb-3 text-lg font-semibold">Discos</p>
          <Input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            enterKeyHint="done"
            autoComplete="off"
            value={plateKg}
            onChange={(e) => setPlateKg(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""))}
            className="mb-4 text-base"
            aria-label="Peso total"
          />
          <PlateStack weight={Number(plateKg) || 0} />
        </SheetContent>
      </Sheet>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>¿Terminar entrenamiento?</DialogTitle>
          <DialogDescription>
            {data.setCount} series · {formatKg(data.volume, units)} · {formatDuration(elapsed)}
            {pending > 0 ? ` · ${pending} series sin marcar` : ""}
          </DialogDescription>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
              Seguir
            </Button>
            <Button className="flex-1" onClick={() => finish.mutate()} disabled={finish.isPending}>
              {finish.isPending ? "Guardando…" : "Terminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-card py-3 hairline">
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className="mt-1 font-semibold tabular">{v}</p>
    </div>
  );
}

function ExerciseBlock({
  block,
  workoutId,
  units,
  onRest,
  onPlates,
  onPr,
}: {
  block: Block;
  workoutId: string;
  units: "metric" | "imperial";
  onRest: (seconds: number) => void;
  onPlates: (kg: number) => void;
  onPr: (name: string, orm: number) => void;
}) {
  const qc = useQueryClient();
  const [restSec, setRestSec] = useState(block.restSeconds);
  const [demo, setDemo] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const nextPending = block.sets.find((s) => !s.completed)?.id;
  const volume = block.sets.reduce((s, x) => s + (x.completed ? x.weight * x.reps : 0), 0);
  const best = useMemo(() => {
    const done = block.sets.filter((s) => s.completed && s.weight > 0);
    return done.reduce((m, s) => Math.max(m, epley1rm(s.weight, s.reps)), 0);
  }, [block.sets]);

  function writeCache(setId: string, patch: Partial<Block["sets"][number]>) {
    qc.setQueryData(["workout", workoutId], (old: Workout | null | undefined) => {
      if (!old) return old;
      const blocks = old.blocks.map((b) => ({
        ...b,
        sets: b.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      }));
      const all = blocks.flatMap((b) => b.sets);
      return {
        ...old,
        blocks,
        volume: all.reduce((sum, s) => sum + (s.completed ? s.weight * s.reps : 0), 0),
        setCount: all.filter((s) => s.completed).length,
      };
    });
  }

  async function patch(
    setId: string,
    data: { reps?: number; weight?: number; rpe?: number | null; completed?: boolean; setKind?: Kind },
  ) {
    writeCache(setId, {
      ...(data.reps != null ? { reps: data.reps } : {}),
      ...(data.weight != null ? { weight: data.weight } : {}),
      ...(data.rpe != null ? { rpe: data.rpe } : {}),
      ...(data.completed != null ? { completed: data.completed } : {}),
      ...(data.setKind ? { kind: data.setKind } : {}),
    });
    try {
      await upsertSet({ data: { id: setId, workoutId, exerciseId: block.exerciseId, ...data } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      await qc.invalidateQueries({ queryKey: ["workout", workoutId] });
    }
  }

  let workN = 0;

  return (
    <section className="min-w-0 overflow-x-clip rounded-3xl bg-card p-3 hairline sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <button type="button" className="min-w-0 text-left" onClick={() => setDemo(true)}>
          <h3 className="font-semibold">{block.name}</h3>
          <p className="text-xs text-muted-foreground">
            {block.muscle} · {block.equipment ?? "Libre"}
          </p>
        </button>
        <div className="flex items-start gap-2">
          <div className="text-right">
            <p className="tabular text-sm font-semibold text-primary">{best ? `${Math.round(best)} kg` : "—"}</p>
            <p className="text-[11px] text-muted-foreground">{block.pr ? `PR ${Math.round(block.pr)}` : "1RM est."}</p>
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-2xl text-muted-foreground"
            aria-label="Opciones"
            onClick={() => setNoteOpen(true)}
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[2rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_1.7rem_2.2rem] items-center gap-1 px-0.5 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        <span className="text-center">Set</span>
        <span>Antes</span>
        <span className="text-center">{units === "imperial" ? "lb" : "kg"}</span>
        <span className="text-center">Reps</span>
        <span className="text-center">RPE</span>
        <span />
      </div>

      <div className="space-y-1">
        {block.sets.map((s, i) => {
          if (s.kind === "work") workN += 1;
          const last = block.lastSets[i];
          const label =
            s.kind === "warmup" ? "W" : s.kind === "drop" ? "D" : s.kind === "fail" ? "F" : String(workN);
          return (
            <SetRow
              key={s.id}
              set={s}
              last={last}
              label={label}
              pending={s.id === nextPending}
              units={units}
              onKind={() => {
                const next = KINDS[(KINDS.indexOf(s.kind) + 1) % KINDS.length]!;
                void patch(s.id, { setKind: next });
              }}
              onCopy={() => {
                if (!last || last.weight <= 0) {
                  onPlates(s.weight || 0);
                  return;
                }
                void patch(s.id, { weight: last.weight, reps: last.reps, rpe: last.rpe });
                onPlates(last.weight);
              }}
              onCommit={(next) => void patch(s.id, next)}
              onToggle={async (on) => {
                const weight = s.weight || last?.weight || 0;
                const reps = s.reps || last?.reps || 0;
                await patch(s.id, { completed: on, weight, reps });
                if (on) {
                  onRest(restSec);
                  const orm = epley1rm(weight, reps);
                  if (block.pr && orm > block.pr + 0.4) onPr(block.name, orm);
                }
              }}
            />
          );
        })}
      </div>

      <div className="mt-3 flex min-w-0 items-center justify-between gap-2 px-0.5">
        <HScroll className="min-w-0 flex-1" gap="gap-1">
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-muted px-3 text-sm text-accent"
            onClick={async () => {
              await upsertSet({ data: { workoutId, exerciseId: block.exerciseId, add: true } });
              await qc.invalidateQueries({ queryKey: ["workout", workoutId] });
            }}
          >
            <Plus className="size-4" /> Serie
          </button>
          {[
            ["−2.5", -2.5],
            ["−1", -1],
            ["+1", 1],
            ["+2.5", 2.5],
          ].map(([lab, d]) => (
            <button
              key={String(lab)}
              type="button"
              className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-muted px-2.5 text-xs font-medium tabular text-muted-foreground"
              onClick={() => {
                const open = block.sets.find((s) => !s.completed);
                if (!open) return;
                void patch(open.id, { weight: Math.max(0, Math.round((open.weight + Number(d)) * 2) / 2) });
              }}
            >
              {lab}
            </button>
          ))}
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center rounded-full bg-muted px-3 text-xs text-muted-foreground"
            onClick={() => {
              const open = block.sets.find((s) => !s.completed);
              if (!open) return;
              void patch(open.id, { reps: Math.max(0, open.reps - 1) });
            }}
          >
            −rep
          </button>
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center rounded-full bg-muted px-3 text-xs text-muted-foreground"
            onClick={() => {
              const open = block.sets.find((s) => !s.completed);
              if (!open) return;
              void patch(open.id, { reps: open.reps + 1 });
            }}
          >
            +rep
          </button>
        </HScroll>
        <button
          type="button"
          className="shrink-0 text-[11px] tabular text-muted-foreground"
          onClick={() => {
            const cycle = [60, 90, 120, 180];
            const i = cycle.indexOf(restSec);
            setRestSec(cycle[(i + 1) % cycle.length]!);
          }}
          aria-label="Descanso entre series"
        >
          {Math.round(volume)} kg · {restSec}s
        </button>
      </div>

      <Sheet open={demo} onOpenChange={setDemo}>
        <SheetContent className="px-4 pt-4 pb-6">
          <p className="mb-3 text-lg font-semibold">{block.name}</p>
          <ExerciseDemo name={block.name} muscle={block.muscle} type={block.type ?? "Compuesto"} gifUrl={block.gifUrl} />
          {block.instructions && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{block.instructions}</p>}
          <Button asChild variant="secondary" className="mt-4 w-full">
            <Link to="/exercises/$exerciseId" params={{ exerciseId: block.exerciseId }}>
              <History className="size-4" /> Historial
            </Link>
          </Button>
        </SheetContent>
      </Sheet>

      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent className="px-4 pt-4">
          <p className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <StickyNote className="size-5" /> Nota
          </p>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Técnica, fatiga, setup…" />
        </SheetContent>
      </Sheet>
    </section>
  );
}

function SetRow({
  set,
  last,
  label,
  pending,
  units,
  onKind,
  onCopy,
  onCommit,
  onToggle,
}: {
  set: Block["sets"][number];
  last?: Block["lastSets"][number];
  label: string;
  pending: boolean;
  units: "metric" | "imperial";
  onKind: () => void;
  onCopy: () => void;
  onCommit: (p: { weight?: number; reps?: number; rpe?: number | null }) => void;
  onToggle: (on: boolean) => void;
}) {
  const [weight, setWeight] = useState(set.weight ? String(set.weight) : "");
  const [reps, setReps] = useState(set.reps ? String(set.reps) : "");
  const [rpe, setRpe] = useState(set.rpe ? String(set.rpe) : "");
  const repsRef = useRef<HTMLInputElement>(null);
  const rpeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeight(set.weight ? String(set.weight) : "");
    setReps(set.reps ? String(set.reps) : "");
    setRpe(set.rpe ? String(set.rpe) : "");
  }, [set.id, set.weight, set.reps, set.rpe]);

  const prev =
    last && last.weight > 0 ? `${last.weight}×${last.reps}` : last && last.reps ? `—×${last.reps}` : "—";

  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_1.7rem_2.2rem] items-center gap-1 rounded-2xl px-0.5 py-0.5",
        set.completed && "bg-success/12 set-just-done",
        pending && !set.completed && "bg-primary/8 ring-1 ring-primary/25",
      )}
    >
      <button
        type="button"
        onClick={onKind}
        className={cn(
          "grid size-10 place-items-center rounded-xl text-xs font-semibold tabular",
          set.kind === "warmup" && "bg-warning/15 text-warning",
          set.kind === "drop" && "bg-primary/12 text-primary",
          set.kind === "fail" && "bg-destructive/15 text-destructive",
          set.kind === "work" && "text-muted-foreground",
        )}
        aria-label="Tipo de serie"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onCopy}
        className="h-11 truncate text-left text-xs tabular text-muted-foreground"
        title="Copiar serie anterior"
      >
        {prev}
        {units === "imperial" ? "" : ""}
      </button>
      <NumericField
        kind="decimal"
        className="h-11 min-w-0 rounded-xl px-1"
        value={weight}
        onValueChange={setWeight}
        onCommit={(n) => {
          if (n != null && n !== set.weight) onCommit({ weight: n });
        }}
        onEnter={() => repsRef.current?.focus()}
        aria-label="Peso"
      />
      <NumericField
        ref={repsRef}
        kind="int"
        className="h-11 min-w-0 rounded-xl px-1"
        value={reps}
        onValueChange={setReps}
        onCommit={(n) => {
          if (n != null && n !== set.reps) onCommit({ reps: n });
        }}
        onEnter={() => rpeRef.current?.focus()}
        aria-label="Repeticiones"
      />
      <NumericField
        ref={rpeRef}
        kind="decimal"
        enterKeyHint="done"
        className="h-11 min-w-0 rounded-xl px-0.5 text-sm"
        value={rpe}
        onValueChange={setRpe}
        onCommit={(n) => {
          const next = n == null ? null : Math.min(10, Math.max(0, n));
          if (next !== set.rpe) onCommit({ rpe: next });
        }}
        onEnter={() => {
          if (!set.completed) onToggle(true);
        }}
        aria-label="RPE"
      />
      <div className="flex justify-center">
        <Checkbox
          checked={set.completed}
          onCheckedChange={(v) => onToggle(v === true)}
          aria-label={`Completar serie ${label}`}
          className="size-7"
        />
      </div>
    </div>
  );
}

function ExercisePicker({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["ex", q],
    queryFn: () => listExercises({ data: { q } }),
  });
  return (
    <div className="flex h-[70dvh] min-h-0 flex-col">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="mb-3" />
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto no-scrollbar overscroll-contain pb-8">
        {(data ?? []).slice(0, 40).map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onPick(e.id)}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-muted"
            >
              <span>
                <span className="block text-sm font-medium">{e.name}</span>
                <span className="text-xs text-muted-foreground">
                  {e.muscle} · {e.equipment}
                </span>
              </span>
              <Check className="size-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
