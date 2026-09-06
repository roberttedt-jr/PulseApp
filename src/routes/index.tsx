import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Flame, Play, Trophy, Zap } from "lucide-react";
import { useEffect } from "react";
import { AppPage, ScreenSkeleton } from "@/components/auth-gate";
import { WeekVolumeChart } from "@/components/charts";
import { FadeIn, Stagger, StaggerItem } from "@/components/fade";
import { ChartCard } from "@/components/pulse/cards";
import { ActivityRings, WeekDots } from "@/components/pulse/activity-rings";
import { ConsistencyCard } from "@/components/pulse/consistency";
import { HScroll } from "@/components/pulse/h-scroll";
import { EmptyState } from "@/components/pulse/empty-state";
import { SectionHeader } from "@/components/pulse/metric-card";
import { MuscleMap } from "@/components/pulse/muscle-map";
import { PulseLogo, PulseMark } from "@/components/pulse-logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getBootstrap, startWorkout } from "@/lib/pulse/fns";
import { ageFromBirthDate, bmi, bmiLabel, mifflinStJeor, recommendedCalories } from "@/lib/pulse/formulas";
import { formatDuration, formatKg, greetingForHour } from "@/lib/utils";

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
  return <Landing />;
}

function Landing() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-[-20%] h-[55%] bg-[radial-gradient(ellipse_at_top,rgba(255,45,85,0.22),transparent_58%)]" />
      <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-lg flex-col px-5 pt-[max(4rem,calc(var(--safe-top)+2.5rem))] pb-[max(2.5rem,calc(var(--safe-bottom)+1.5rem))]">
        <FadeIn>
          <div className="flex items-center gap-2">
            <PulseMark />
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
          </div>
        </FadeIn>
        <FadeIn delay={0.08} className="mt-14">
          <PulseLogo animated size={112} alt="Pulse" className="mb-6" />
          <h1 className="text-[clamp(1.85rem,8vw,2.5rem)] leading-[1.05] font-semibold tracking-tight">
            El ritmo
            <br />
            de tu fuerza.
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Registra series, conquista PRs y siente cada descanso. Pulse es el tracker de gimnasio que parece esculpido
            en iOS.
          </p>
        </FadeIn>
        <Stagger className="mt-10 grid gap-3">
          {[
            { t: "Entrenamiento en vivo", d: "Temporizador circular, 1RM y volumen al instante." },
            { t: "Pulse Score", d: "Una cifra 0–100 que resume tu semana." },
            { t: "Rutinas con alma", d: "PPL, Upper/Lower y las tuyas, reordenables." },
          ].map((f) => (
            <StaggerItem key={f.t}>
              <div className="rounded-3xl bg-card px-5 py-4 hairline">
                <p className="font-medium">{f.t}</p>
                <p className="text-sm text-muted-foreground">{f.d}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
        <FadeIn delay={0.28} className="mt-auto pt-10">
          <Button asChild className="w-full" size="lg">
            <Link to="/login">Empezar</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Crea tu cuenta con email. Tus datos, tu racha.</p>
        </FadeIn>
      </div>
    </main>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { data, isPending, error } = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });

  useEffect(() => {
    if (!data?.profile) return;
    const dark =
      data.profile.theme === "dark" ||
      (data.profile.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
  }, [data?.profile]);

  useEffect(() => {
    if (!data || isPending) return;
    if (!data.profile.onboardingDone) {
      void navigate({ to: "/onboarding" });
    }
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

  const volumeGoal = Math.max(data.profile.weeklyGoal * 2500, 1);
  const volumePct = data.week.volume / volumeGoal;
  const streakPct = data.streak / 7;
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
  const scoreHint =
    fresh
      ? "Completa tu primer entrenamiento para ver el Pulse Score."
      : data.week.workouts < data.profile.weeklyGoal
        ? `Te faltan ${data.profile.weeklyGoal - data.week.workouts} sesiones para el objetivo.`
        : data.score >= 80
          ? "Semana excelente. El volumen y la racha están alineados."
          : "Ritmo bueno. Un poco más de volumen sube la cifra.";

  async function startToday() {
    const res = await startWorkout({ data: { routineId: data?.today?.routineId ?? undefined } });
    void navigate({ to: "/train", search: { id: res.id } });
  }

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
        className="relative overflow-hidden rounded-[28px] bg-card hairline"
        style={{
          backgroundImage: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${data.today?.color ?? "#FF2D55"} 28%, transparent), transparent 58%)`,
        }}
      >
        <div className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">Entrenamiento de hoy</p>
          <h2 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{data.today?.name ?? "Sesión libre"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.today?.exerciseCount ? `${data.today.exerciseCount} ejercicios` : "Elige al empezar"}
            {data.today?.estimatedMinutes ? ` · ~${data.today.estimatedMinutes} min` : ""}
            {data.today?.lastAt ? ` · última ${format(new Date(data.today.lastAt), "d MMM", { locale: es })}` : ""}
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
            {data.activeWorkoutId ? "Reanudar entrenamiento" : fresh ? "Iniciar primer entrenamiento" : "Iniciar entrenamiento"}
          </Button>
        </div>
      </section>

      {fresh ? (
        <EmptyState
          icon={Play}
          title="Tu progreso empieza hoy."
          hint="Las estadísticas, PRs y el balance muscular aparecerán cuando registres tu primera sesión real."
          action={
            <Button size="lg" onClick={() => void startToday()}>
              Iniciar primer entrenamiento
            </Button>
          }
        />
      ) : (
        <>
      <section className="min-w-0 overflow-x-clip rounded-[28px] bg-card px-4 py-5 hairline sm:px-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <ActivityRings
            sessions={data.week.workouts}
            sessionGoal={data.profile.weeklyGoal}
            volumePct={volumePct}
            streakPct={streakPct}
          />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">Pulse Score {data.score}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{scoreHint}</p>
            </div>
            <ul className="space-y-1 text-[13px]">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" /> Sesiones
                </span>
                <span className="font-semibold tabular">
                  {data.week.workouts}/{data.profile.weeklyGoal}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-success" /> Volumen
                </span>
                <span className="font-semibold tabular">{formatKg(data.week.volume, data.profile.units)}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-warning" /> Tiempo
                </span>
                <span className="font-semibold tabular">{formatDuration(data.week.duration)}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="flex min-w-0 items-center gap-4 overflow-x-clip rounded-[24px] bg-card px-4 py-4 hairline">
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
          <WeekVolumeChart data={data.volumeByDay} />
        </ChartCard>
        <ChartCard title="Balance muscular" className="overflow-visible">
          <MuscleMap
            compact
            loads={data.muscleLoad}
            periodLabel="Esta semana"
            periodPhrase="esta semana"
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
              <div key={pr.id} className="w-[9.75rem] rounded-[22px] bg-card px-4 py-3 hairline">
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
            <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-accent">
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
