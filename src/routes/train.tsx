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
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { SportSelector } from "@/components/pulse/sport-selector";
import { LiveGpsMap } from "@/components/pulse/live-gps-map";
import { getSportMeta, SPORTS_CATALOG } from "@/lib/pulse/sports";
import { ExerciseDemo } from "@/components/pulse/exercise-demo";
import { HScroll } from "@/components/pulse/h-scroll";
import { NumericField } from "@/components/pulse/numeric-field";
import { SearchInput } from "@/components/pulse/search-input";
import { PlateStack } from "@/components/plate-calc";
import { RestTimer } from "@/components/rest-timer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { WorkoutPublishForm } from "@/components/pulse/social";
import {
  addExerciseToWorkout,
  getBootstrap,
  getWorkout,
  listExercises,
  removeSet,
  saveBlockNote,
  setWorkoutStatus,
  upsertSet,
} from "@/lib/pulse/fns";
import { shareWorkout } from "@/lib/pulse/social-fns";
import type { WorkoutVisibility } from "@/lib/pulse/social";
import { epley1rm } from "@/lib/pulse/formulas";
import { displayMuscle } from "@/lib/pulse/exercise-meta";
import { cn, daysAgoEs, formatDuration, formatKg, fromKg, toKg } from "@/lib/utils";
import { toast } from "sonner";

type Search = { id?: string };
type Workout = NonNullable<Awaited<ReturnType<typeof getWorkout>>>;
type Block = Workout["blocks"][number];
type Kind = Block["sets"][number]["kind"];

const KINDS: Kind[] = ["work", "warmup", "drop", "fail"];

export const Route = createFileRoute("/train")({
  validateSearch: (s: Record<string, unknown>): Search => ({ id: s.id ? String(s.id) : undefined }),
  component: TrainRoute,
});

function TrainRoute() {
  const { id } = Route.useSearch();
  const [selectedSportId, setSelectedSportId] = useState("run");
  const [liveGpsOpen, setLiveGpsOpen] = useState(false);
  const selectedSport = getSportMeta(selectedSportId);

  if (id) {
    return (
      <AppPage hideNav>
        <Live id={id} />
      </AppPage>
    );
  }

  return (
    <AppPage title="Entrenar">
      <div className="mx-auto max-w-xl space-y-6 pt-4 pb-16">
        <HScroll gap="gap-2">
          <Link to="/routines" className="h-8 rounded-full bg-muted px-3 text-xs font-medium leading-8 text-muted-foreground hover:text-white">
            Rutinas
          </Link>
          <Link to="/train" className="h-8 rounded-full bg-primary px-3 text-xs font-medium leading-8 text-primary-foreground">
            Deportes & GPS
          </Link>
          <Link to="/exercises" className="h-8 rounded-full bg-muted px-3 text-xs font-medium leading-8 text-muted-foreground">
            Ejercicios
          </Link>
          <Link to="/plan" className="h-8 rounded-full bg-muted px-3 text-xs font-medium leading-8 text-muted-foreground">
            Plan semanal
          </Link>
        </HScroll>

        {liveGpsOpen ? (
          <LiveGpsMap
            sportId={selectedSportId}
            onClose={() => setLiveGpsOpen(false)}
          />
        ) : (
          <>
            {/* Sports Taxonomy Carousel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Catálogo de deportes
                </p>
                <span className="text-xs font-medium text-[#FF2D55]">
                  {selectedSport.isGpsCapable ? "● GPS al aire libre" : "Gimnasio y sala"}
                </span>
              </div>
              <SportSelector
                selectedSportId={selectedSportId}
                onSelectSport={(s) => setSelectedSportId(s.id)}
              />
            </div>

            {/* Selected Sport Hero Card */}
            <div className="relative overflow-hidden rounded-[24px] bg-[#18181D] border border-white/10 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="grid size-14 place-items-center rounded-2xl bg-[#FF2D55]/15 text-3xl border border-[#FF2D55]/25">
                    {selectedSport.emoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">{selectedSport.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedSport.description}</p>
                  </div>
                </div>
              </div>

              {selectedSport.isGpsCapable ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-[#121217] border border-white/5">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">MÉTRICA 1</span>
                      <span className="text-sm font-bold text-white block mt-0.5">Distancia (km)</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">MÉTRICA 2</span>
                      <span className="text-sm font-bold text-white block mt-0.5">Ritmo / Vel</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">MÉTRICA 3</span>
                      <span className="text-sm font-bold text-[#34C759] block mt-0.5">Desnivel D+</span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full h-14 rounded-2xl bg-[#FF2D55] hover:bg-[#FF2D55]/90 text-white font-bold text-base shadow-[0_4px_20px_rgba(255,45,85,0.35)] active:scale-98 transition-transform"
                    onClick={() => setLiveGpsOpen(true)}
                  >
                    <Play className="size-5 fill-white mr-2" /> Iniciar GPS en vivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Registra series, repeticiones, peso y RPE para {selectedSport.name}.
                  </p>
                  <div className="flex gap-2">
                    <Button asChild size="lg" className="flex-1 h-14 rounded-2xl bg-[#FF2D55] text-white font-bold">
                      <Link to="/routines">Mis rutinas</Link>
                    </Button>
                    <Button asChild variant="secondary" size="lg" className="flex-1 h-14 rounded-2xl bg-white/10 text-white font-semibold">
                      <Link to="/exercises">Ver ejercicios</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
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
  const [confirm, setConfirm] = useState(false);
  const [summary, setSummary] = useState<{ volume: number; sets: number; prs: string[]; exercises: number } | null>(null);
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
  const showRpe = profile.data?.profile.showRpe ?? true;

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
      setSummary({
        volume: data?.volume ?? 0,
        sets: data?.setCount ?? 0,
        prs: res.newPrs,
        exercises: data?.blocks.length ?? 0,
      });
      if (res.newPrs.length > 0) {
        toast.success(`PR · ${res.newPrs.join(", ")}`);
      }
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const share = useMutation({
    mutationFn: (payload: { visibility: WorkoutVisibility; title: string; caption: string; photos: string[] }) =>
      shareWorkout({
        data: {
          workoutId: id,
          visibility: payload.visibility,
          title: payload.title,
          caption: payload.caption,
          photos: payload.photos,
        },
      }),
    onSuccess: (res) => {
      toast.success(res.posted ? "Entrenamiento compartido" : "Guardado en tu historial");
      void navigate({ to: "/" });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "El entrenamiento se guardó, pero no se pudo compartir.");
      void navigate({ to: "/" });
    },
  });

  if (!data) {
    return (
      <div className="mx-auto max-w-lg min-w-0 space-y-4 pt-2" aria-busy="true">
        <header className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/86 px-4 py-3 backdrop-blur-2xl md:mx-0 md:rounded-3xl md:border">
          <div className="flex items-center justify-between gap-3">
            <div className="h-6 w-36 rounded-lg bg-muted/80 animate-pulse" />
            <div className="flex shrink-0 gap-1.5">
              <div className="size-9 rounded-xl bg-muted/80 animate-pulse" />
              <div className="h-9 w-20 rounded-xl bg-muted/80 animate-pulse" />
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            <div className="h-12 rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-12 rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-12 rounded-2xl bg-muted/60 animate-pulse" />
          </div>
        </header>
        <div className="pulse-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-40 rounded-md bg-muted/80 animate-pulse" />
              <div className="h-3.5 w-24 rounded-md bg-muted/50 animate-pulse" />
            </div>
            <div className="size-8 rounded-full bg-muted/50 animate-pulse" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-11 w-full rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-11 w-full rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-11 w-full rounded-xl bg-muted/40 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

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
      <div className="mx-auto max-w-md pt-4 pb-8" data-publish-screen="1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-wide text-primary uppercase">Sesión completada</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{data.title}</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="glass-control"
            aria-label="Cerrar y guardar en privado"
            onClick={() => {
              void shareWorkout({ data: { workoutId: id, visibility: "me" } }).catch(() => {});
              void navigate({ to: "/" });
            }}
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="mt-5">
          <WorkoutPublishForm
            routineName={data.title}
            durationSeconds={elapsed}
            volume={summary.volume}
            setCount={summary.sets}
            exerciseCount={summary.exercises}
            prs={summary.prs}
            units={units}
            busy={share.isPending}
            onCancel={() => {
              void shareWorkout({ data: { workoutId: id, visibility: "me" } }).catch(() => {});
              void navigate({ to: "/" });
            }}
            onSubmit={async (payload) => {
              await share.mutateAsync(payload);
            }}
          />
        </div>
      </div>
    );
  }

  const pending = data.blocks.reduce((n, b) => n + b.sets.filter((s) => !s.completed).length, 0);

  return (
    <div className={cn("mx-auto max-w-lg min-w-0 space-y-4 pt-2", rest != null && "pb-40")}>
      {rest != null && (
        <AnimatePresence>
          <RestTimer seconds={rest} sound={sound} onClose={() => setRest(null)} />
        </AnimatePresence>
      )}

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
            <Button size="sm" onClick={() => setConfirm(true)}>
              Finalizar
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
          showRpe={showRpe}
          onRest={(sec) => {
            if (autoRest) setRest(sec);
          }}
          onPlates={(kg) => {
            setPlateKg(String(kg));
            setPlates(true);
          }}
          onPr={(name, orm) => {
            setPrFlash(`PR · ${name} · ${Math.round(orm)} kg`);
            toast.success(`PR · ${name}`);
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
          <SheetTitle className="mb-3">Añadir ejercicio</SheetTitle>
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
          <SheetTitle className="mb-3">Discos</SheetTitle>
          <NumericField
            kind="decimal"
            className="mb-4 h-12 rounded-2xl border border-border bg-muted px-4 text-left text-base"
            value={plateKg}
            onValueChange={setPlateKg}
            aria-label="Peso total"
          />
          <PlateStack weight={Number(plateKg) || 0} />
        </SheetContent>
      </Sheet>

      <Sheet open={confirm} onOpenChange={setConfirm}>
        <SheetContent className="px-5 pt-3 pb-2">
          <SheetTitle>¿Terminar entrenamiento?</SheetTitle>
          <SheetDescription>
            {data.setCount} series · {formatKg(data.volume, units)} · {formatDuration(elapsed)}
            {pending > 0 ? ` · ${pending} series sin marcar` : ""}
          </SheetDescription>
          <div className="mt-5 flex min-w-0 gap-2">
            <Button variant="secondary" className="min-w-0 flex-1" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button className="min-w-0 flex-1" onClick={() => finish.mutate()} loading={finish.isPending} loadingText="Guardando…">
              Terminar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ExerciseBlock({
  block,
  workoutId,
  units,
  showRpe,
  onRest,
  onPlates,
  onPr,
}: {
  block: Block;
  workoutId: string;
  units: "metric" | "imperial";
  showRpe: boolean;
  onRest: (seconds: number) => void;
  onPlates: (kg: number) => void;
  onPr: (name: string, orm: number) => void;
}) {
  const qc = useQueryClient();
  const [restSec, setRestSec] = useState(String(block.restSeconds));
  const restSeconds = Math.max(0, Number(restSec) || 0);
  const [demo, setDemo] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(block.notes ?? "");
  useEffect(() => {
    setNote(block.notes ?? "");
  }, [block.exerciseId, block.notes]);
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
    <section className="min-w-0 overflow-x-clip pulse-card p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <button type="button" className="min-w-0 text-left" onClick={() => setDemo(true)}>
          <h3 className="font-semibold">{block.name}</h3>
          <p className="text-xs text-muted-foreground">
            {displayMuscle(block.muscle)} · {block.equipment ?? "Libre"}
          </p>
          {block.lastSession && (
            <p className="mt-1 text-xs text-muted-foreground">
              Última vez:{" "}
              {block.lastSession.bestWeight > 0
                ? `${formatKg(block.lastSession.bestWeight, units)} × ${block.lastSession.bestReps}`
                : `${block.lastSession.bestReps} reps`}
              {` · ${block.lastSession.setCount} series · ${daysAgoEs(block.lastSession.startedAt)}`}
            </p>
          )}
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

      <div className={cn(
        "grid items-center gap-1 px-0.5 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase",
        showRpe
          ? "grid-cols-[2rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_1.7rem_2.2rem]"
          : "grid-cols-[2rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_2.2rem]",
      )}>
        <span className="text-center">Set</span>
        <span>Antes</span>
        <span className="text-center">{units === "imperial" ? "lb" : "kg"}</span>
        <span className="text-center">Reps</span>
        {showRpe ? <span className="text-center">RPE</span> : null}
        <span />
      </div>

      <div className="space-y-1">
        <AnimatePresence initial={false}>
        {block.sets.map((s, i) => {
          if (s.kind === "work") workN += 1;
          const last = block.lastSets[i];
          const label =
            s.kind === "warmup" ? "W" : s.kind === "drop" ? "D" : s.kind === "fail" ? "F" : String(workN);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
            <SetRow
              set={s}
              last={last}
              label={label}
              pending={s.id === nextPending}
              units={units}
              showRpe={showRpe}
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
                  onRest(restSeconds);
                  const orm = epley1rm(weight, reps);
                  if (block.pr && orm > block.pr + 0.4) onPr(block.name, orm);
                }
              }}
            />
            </motion.div>
          );
        })}
        </AnimatePresence>
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
                void patch(open.id, { weight: Math.max(0, toKg(fromKg(open.weight, units) + Number(d), units)) });
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
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[11px] tabular text-muted-foreground">{formatKg(volume, units)}</span>
          <NumericField
            kind="int"
            className="h-10 w-14 rounded-xl bg-muted text-xs"
            value={restSec}
            onValueChange={setRestSec}
            onCommit={(n) => {
              if (n == null) return;
              setRestSec(String(Math.min(600, Math.max(0, Math.round(n)))));
            }}
            aria-label="Descanso entre series"
          />
          <span className="text-[11px] text-muted-foreground">s</span>
        </div>
      </div>

      <Sheet open={demo} onOpenChange={setDemo}>
        <SheetContent className="px-4 pt-4 pb-6">
          <SheetTitle className="mb-3">{block.name}</SheetTitle>
          <ExerciseDemo name={block.name} muscle={block.muscle} type={block.type ?? "Compuesto"} gifUrl={block.gifUrl} />
          {block.instructions && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{block.instructions}</p>}
          <Button asChild variant="secondary" className="mt-4 w-full">
            <Link to="/exercises/$exerciseId" params={{ exerciseId: block.exerciseId }}>
              <History className="size-4" /> Historial
            </Link>
          </Button>
        </SheetContent>
      </Sheet>

      <Sheet
        open={noteOpen}
        onOpenChange={(open) => {
          setNoteOpen(open);
          if (!open) {
            void saveBlockNote({ data: { workoutId, exerciseId: block.exerciseId, notes: note } }).catch(() => {
              toast.error("No se pudo guardar la nota");
            });
          }
        }}
      >
        <SheetContent className="px-4 pt-4">
          <SheetTitle className="mb-3 flex items-center gap-2">
            <StickyNote className="size-5" /> Nota
          </SheetTitle>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Técnica, fatiga, setup…" />
          {block.sets.length > 1 && (
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={async () => {
                const last = block.sets.at(-1);
                if (!last) return;
                await removeSet({ data: { id: last.id, workoutId } });
                await qc.invalidateQueries({ queryKey: ["workout", workoutId] });
                setNoteOpen(false);
              }}
            >
              Quitar última serie
            </Button>
          )}
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
  showRpe,
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
  showRpe: boolean;
  onKind: () => void;
  onCopy: () => void;
  onCommit: (p: { weight?: number; reps?: number; rpe?: number | null }) => void;
  onToggle: (on: boolean) => void;
}) {
  const [weight, setWeight] = useState(set.weight ? String(fromKg(set.weight, units)) : "");
  const [reps, setReps] = useState(set.reps ? String(set.reps) : "");
  const [rpe, setRpe] = useState(set.rpe ? String(set.rpe) : "");
  const repsRef = useRef<HTMLInputElement>(null);
  const rpeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeight(set.weight ? String(fromKg(set.weight, units)) : "");
    setReps(set.reps ? String(set.reps) : "");
    setRpe(set.rpe ? String(set.rpe) : "");
  }, [set.id, set.weight, set.reps, set.rpe, units]);

  const prev =
    last && last.weight > 0
      ? `${fromKg(last.weight, units)}×${last.reps}`
      : last && last.reps
        ? `—×${last.reps}`
        : "—";

  return (
    <div
      className={cn(
        "grid items-center gap-1 rounded-2xl px-0.5 py-0.5",
        showRpe
          ? "grid-cols-[2rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_1.7rem_2.2rem]"
          : "grid-cols-[2rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_2.2rem]",
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
      </button>
      <NumericField
        kind="decimal"
        className="h-11 min-w-0 rounded-xl px-1"
        value={weight}
        onValueChange={setWeight}
        onCommit={(n) => {
          if (n == null) return;
          const kg = toKg(n, units);
          if (Math.abs(kg - set.weight) > 0.001) onCommit({ weight: kg });
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
        onEnter={() => {
          if (showRpe) rpeRef.current?.focus();
          else if (!set.completed) onToggle(true);
        }}
        aria-label="Repeticiones"
      />
      {showRpe ? (
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
      ) : null}
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
      <SearchInput
        id="pulse_exercise_search_field"
        name="pulse_exercise_search_field"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar…"
        className="mb-3"
        aria-label="Buscar ejercicio"
      />
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
