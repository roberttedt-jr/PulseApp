import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Flame, Play, Trophy, Zap } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { AppPage, PublicEntryRedirect, ScreenSkeleton } from "@/components/auth-gate";
import { ChartCard } from "@/components/pulse/cards";
import { WeekDots } from "@/components/pulse/activity-rings";
import { ConsistencyCard } from "@/components/pulse/consistency";
import { HScroll } from "@/components/pulse/h-scroll";
import { EmptyState } from "@/components/pulse/empty-state";
import { SectionHeader } from "@/components/pulse/metric-card";
import { MuscleMap } from "@/components/pulse/muscle-map";
import { PulseScoreGlass } from "@/components/pulse/pulse-score-glass";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { flowPath, resolveAppFlow } from "@/lib/pulse/flow";
import { getBootstrap, startWorkout } from "@/lib/pulse/fns";
import { ageFromBirthDate, bmi, bmiLabel, mifflinStJeor, recommendedCalories } from "@/lib/pulse/formulas";
import { formatDuration, formatKg, greetingForHour } from "@/lib/utils";

const WeekVolumeChart = lazy(() =>
  import("@/components/charts").then((m) => ({ default: m.WeekVolumeChart })),
);

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (user) {
    return (
      <AppPage>
        <Dashboard />
      </AppPage>
    );
  }
  if (isPending) return <ScreenSkeleton />;
  return <PublicEntryRedirect />;
}

function Dashboard() {
  const navigate = useNavigate();
  const { data, isPending, error } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data?.profile) return;
    const flow = resolveAppFlow(data.profile);
    if (flow !== "app") void navigate({ to: flowPath(flow) });
  }, [data, isPending, navigate]);

  if (isPending || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pt-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      </div>
    );
  }
  if (error) {
    return <p className="pt-10 text-center text-sm text-destructive">{(error as Error).message}</p>;
  }

  const hour = new Date().getHours();
  const greet = greetingForHour(hour, data.profile.displayName);
  const fresh = (data.lifetimeWorkouts ?? 0) === 0;
  const hasBody = Boolean(data.profile.weightKg && data.profile.heightCm);
  const bmiValue = hasBody ? bmi(data.profile.weightKg!, data.profile.heightCm!) : 0;
  const age = data.profile.birthDate ? ageFromBirthDate(data.profile.birthDate) : 0;
  const kcal =
    data.profile.weightKg && data.profile.heightCm && age && data.profile.sex
      ? recommendedCalories(
          mifflinStJeor({
            weightKg: data.profile.weightKg,
            heightCm: data.profile.heightCm,
            ageYears: age,
            sex: data.profile.sex,
          }),
          data.profile.goal,
        )
      : 0;

  const weekdayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hit = data.heatmap.some((h) => h.date === key && h.count > 0);
    const today = i === 6;
    return { key, hit, today, label: weekdayLabels[(d.getDay() + 6) % 7]! };
  });

  async function startToday() {
    const res = await startWorkout({
      data: { routineId: data?.today?.isRest ? undefined : data?.today?.routineId ?? undefined },
    });
    void navigate({ to: "/train", search: { id: res.id } });
  }

  const startLabel = data.activeWorkoutId
    ? "Reanudar entrenamiento"
    : data.today?.isRest
      ? "Entrenamiento libre"
      : data.today?.name
        ? `Empezar ${data.today.name}`
        : "Empezar entrenamiento";

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-7 pt-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium tracking-wide text-foreground-tertiary uppercase">
            {format(new Date(), "EEEE d MMMM", { locale: es })}
          </p>
          <h1 className="mt-1 text-[clamp(1.6rem,8vw,2rem)] leading-[1.05] font-semibold tracking-tight break-words">{greet}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {data.suggestion ?? (fresh ? "Tu progreso empieza hoy." : "Sigue el ritmo de esta semana.")}
          </p>
        </div>
        <Link to="/settings" className="shrink-0" aria-label="Perfil">
          <Avatar src={data.profile.image} fallback={data.profile.displayName ?? "P"} className="size-12" />
        </Link>
      </header>

      <section
        className="relative overflow-hidden pulse-card"
        style={{
          backgroundImage: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${data.today?.color ?? "#FF2D55"} 28%, transparent), transparent 58%)`,
        }}
      >
        <div className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">Entrenamiento de hoy</p>
          <h2 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            {data.today?.isRest ? "Día de descanso" : data.today?.name ?? "Sesión libre"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.today?.isRest
              ? "Hoy toca recuperar. Puedes hacer una sesión libre si quieres."
              : data.today?.exerciseCount
                ? `${data.today.exerciseCount} ejercicios`
                : "Elige al empezar"}
            {!data.today?.isRest && data.today?.estimatedMinutes ? ` · ~${data.today.estimatedMinutes} min` : ""}
            {!data.today?.isRest && data.today?.lastAt ? ` · última ${format(new Date(data.today.lastAt), "d MMM", { locale: es })}` : ""}
          </p>
          {data.today?.exercises && data.today.exercises.length > 0 && (
            <HScroll className="mt-3" gap="gap-1.5">
              {data.today.exercises.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] font-medium text-foreground-secondary"
                >
                  {name}
                </span>
              ))}
            </HScroll>
          )}
          <Button className="mt-5 w-full" size="lg" onClick={() => void startToday()}>
            <Play className="fill-current" />
            {startLabel}
          </Button>
          <Button asChild variant="secondary" className="mt-2 w-full">
            <Link to="/routines/$routineId" params={{ routineId: "new" }}>
              Crear rutina
            </Link>
          </Button>
        </div>
      </section>

      <section className="pulse-card px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Historial</p>
            <p className="mt-1 text-[17px] font-semibold tracking-tight">Tus sesiones</p>
          </div>
          <Link
            to="/history"
            className="glass-control inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-foreground pressable"
          >
            Ver todo
          </Link>
        </div>
        {data.lastSession ? (
          <Link to="/history/$workoutId" params={{ workoutId: data.lastSession.id }} className="mt-3 block rounded-2xl glass-pill px-3 py-3">
            <p className="text-[15px] font-semibold tracking-tight">{data.lastSession.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data.lastSession.startedAt ? format(new Date(data.lastSession.startedAt), "d MMM", { locale: es }) : ""}
              {data.lastSession.durationSeconds ? ` · ${formatDuration(data.lastSession.durationSeconds)}` : ""}
              {data.lastSession.volume ? ` · ${formatKg(data.lastSession.volume, data.profile.units)}` : ""}
            </p>
          </Link>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Aún no hay sesiones. Empieza tu primer entrenamiento.</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/progress" className="pulse-card px-4 py-4 pressable-feedback">
          <p className="text-xs text-muted-foreground">Progreso</p>
          <p className="mt-1 text-sm font-medium">Ver marcas y volumen</p>
        </Link>
        <Link to="/plan" className="pulse-card px-4 py-4 pressable-feedback">
          <p className="text-xs text-muted-foreground">Plan</p>
          <p className="mt-1 text-sm font-medium">Semana y rutinas</p>
        </Link>
      </div>

      {fresh ? (
        <section className="min-w-0 overflow-x-clip pulse-card px-4 py-5 sm:px-5">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">Resumen semanal</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.week.workouts} sesiones · {formatKg(data.week.volume, data.profile.units)} · {formatDuration(data.week.duration)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Las estadísticas aparecen cuando registres tu primera sesión.</p>
        </section>
      ) : null}

      <PulseScoreGlass score={data.score} breakdown={data.scoreBreakdown} />

      {fresh ? null : (
        <>

      <section className="flex min-w-0 items-center gap-4 overflow-x-clip pulse-card px-4 py-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-warning/15">
          <Flame className="flame-live size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Racha</p>
          <p className="text-[22px] leading-tight font-semibold tracking-tight tabular">
            {data.streak} {data.streak === 1 ? "día" : "días"}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.streak > 0 ? "No rompas el ritmo. Hoy cuenta." : "Empieza hoy y enciende la racha."}
          </p>
          <div className="mt-2.5">
            <WeekDots dates={weekDots} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Volumen de la semana">
          <Suspense fallback={<div className="h-44 rounded-2xl bg-muted/40" aria-hidden />}>
            <WeekVolumeChart data={data.volumeByDay} />
          </Suspense>
        </ChartCard>
        <ChartCard title="Balance muscular" className="overflow-visible">
          <MuscleMap
            compact
            loads={data.muscleLoad}
            periodLabel="Esta semana"
            periodPhrase="esta semana"
            units={data.profile.units}
            onOpenHistory={(muscle) => void navigate({ to: "/history", search: { muscle } })}
            onOpenProgress={(muscle) => void navigate({ to: "/progress", search: { muscle } })}
          />
        </ChartCard>
      </div>

      <section>
        <SectionHeader
          title="PRs recientes"
          action={
            <Link to="/progress" className="text-sm text-accent">
              Ver todo
            </Link>
          }
        />
        {data.prs.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Tus récords personales aparecerán aquí."
            hint="Completa series reales. El 1RM estimado se guarda cuando superas tu mejor marca."
            className="py-8"
          />
        ) : (
          <HScroll className="-mx-1 px-1">
            {data.prs.map((pr) => (
              <div key={pr.id} className="w-[9.75rem] pulse-card px-4 py-3">
                <span className="grid size-8 place-items-center rounded-xl bg-warning/15 text-warning">
                  <Trophy className="size-4" />
                </span>
                <p className="mt-2 truncate text-sm font-medium">{pr.name}</p>
                <p className="tabular text-lg font-semibold tracking-tight">{Math.round(pr.oneRepMax)} kg</p>
                <p className="text-[11px] text-muted-foreground">{pr.muscle}</p>
              </div>
            ))}
          </HScroll>
        )}
      </section>

      <ConsistencyCard />
        </>
      )}

      <ChartCard title="Cuerpo">
          <div className="space-y-3">
            <Row k="IMC" v={bmiValue ? `${bmiValue.toFixed(1)} · ${bmiLabel(bmiValue)}` : "Añadir peso"} />
            <Row k="kcal / día" v={kcal ? String(kcal) : "Completar perfil"} />
            <Row k="Peso" v={data.profile.weightKg ? formatKg(data.profile.weightKg, data.profile.units) : "Añadir peso"} />
            <Link to="/account" className="inline-flex items-center gap-1 text-sm text-accent">
              {hasBody ? "Ver perfil" : "Completar perfil"} <Zap className="size-3.5" />
            </Link>
          </div>
        </ChartCard>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
