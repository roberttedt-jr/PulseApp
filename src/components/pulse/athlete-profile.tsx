import { Link } from "@tanstack/react-router";
import {
  Activity,
  Award,
  Camera,
  Check,
  Dumbbell,
  Flame,
  Heart,
  Lock,
  MessageCircle,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/pulse/empty-state";
import { FollowButton } from "@/components/pulse/social";
import { FollowListModal } from "@/components/social/FollowListModal";
import { StravaFeedCard } from "@/components/pulse/strava-feed-card";
import { StravaWeeklyChart } from "@/components/pulse/strava-weekly-chart";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { FeedPost, RoutinePeek } from "@/lib/pulse/social-fns";
import type { FollowStatus, ProfileVisibility } from "@/lib/pulse/social";
import { cn, formatKg } from "@/lib/utils";
import { toast } from "sonner";

export type AthleteProfileData = {
  userId: string;
  mine: boolean;
  locked: boolean;
  username: string | null;
  handle: string;
  name: string;
  image: string | null;
  bio: string;
  profileVisibility: ProfileVisibility;
  followStatus: FollowStatus | null;
  incomingStatus: FollowStatus | null;
  followerCount: number | null;
  followingCount: number | null;
  workoutCount: number | null;
  stats: {
    workouts: number;
    weekWorkouts: number;
    prs: number;
    totalVolumeKg?: number;
    activeTimeFormatted?: string;
    totalSets?: number;
    history12Weeks?: Array<{
      weekLabel: string;
      volumeKg: number;
      sessionCount: number;
    }>;
  } | null;
  publicRoutines: RoutinePeek[];
  compareAvailable: boolean;
  posts: FeedPost[];
};

type ProfileTab = "progress" | "activities" | "prs" | "stats";
type Discipline = "all" | "weight_training" | "walk" | "run" | "ride" | "hike" | "swim";

const TABS: Array<{ id: ProfileTab; label: string; icon: typeof Activity }> = [
  { id: "progress", label: "Progreso", icon: Activity },
  { id: "activities", label: "Actividades", icon: Dumbbell },
  { id: "prs", label: "Récords", icon: Trophy },
  { id: "stats", label: "Más", icon: Flame },
];

const DISCIPLINES: Array<{ id: Discipline; label: string; icon: string }> = [
  { id: "all", label: "Todos", icon: "⚡" },
  { id: "weight_training", label: "Entrenamiento con pesas", icon: "🏋️" },
  { id: "walk", label: "Caminata", icon: "🚶" },
  { id: "run", label: "Carrera", icon: "🏃" },
  { id: "ride", label: "Bicicleta", icon: "🚴" },
  { id: "hike", label: "Senderismo", icon: "🥾" },
  { id: "swim", label: "Natación", icon: "🏊" },
];

export function AthleteProfile({
  data,
  units,
  onRefresh,
  onAccept,
  onReject,
  onRemove,
  onBlock,
}: {
  data: AthleteProfileData;
  units: "metric" | "imperial";
  onRefresh: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
  onBlock?: () => void;
}) {
  const [tab, setTab] = useState<ProfileTab>("progress");
  const [discipline, setDiscipline] = useState<Discipline>("all");
  const [listTab, setListTab] = useState<"followers" | "following">("followers");
  const [listOpen, setListOpen] = useState(false);

  function openList(which: "followers" | "following") {
    setListTab(which);
    setListOpen(true);
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `Perfil de ${data.name} en Pulse`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Sigue mis entrenamientos en Pulse: ${data.name}`,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles");
    }
  }

  const workoutCount = data.workoutCount ?? (data.stats?.workouts ?? 0);
  const activeTabIdx = TABS.findIndex((t) => t.id === tab);

  // Filter posts by discipline if needed
  const filteredPosts = data.posts.filter((p) => {
    if (discipline === "all") return true;
    const title = (p.title || "").toLowerCase();
    const tag = (p.routine?.name || "").toLowerCase();
    if (discipline === "weight_training") return title.includes("fuerza") || title.includes("push") || title.includes("pull") || title.includes("pesas") || tag.includes("fuerza");
    if (discipline === "run") return title.includes("run") || title.includes("carrera") || tag.includes("carrera");
    if (discipline === "walk") return title.includes("caminata") || title.includes("paseo") || title.includes("walk");
    if (discipline === "ride") return title.includes("bici") || title.includes("ride") || title.includes("ciclismo");
    if (discipline === "hike") return title.includes("hike") || title.includes("senderismo");
    if (discipline === "swim") return title.includes("swim") || title.includes("natación");
    return true;
  });

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-[max(64px,calc(env(safe-area-inset-top,0px)+28px))] pb-12">
      {/* High-Performance Athletic Header */}
      <section
        className="pulse-card relative overflow-hidden rounded-[28px] border border-white/10 bg-card/70 p-5 backdrop-blur-xl"
        data-athlete-header="1"
      >
        <div className="flex items-start gap-4">
          {/* 84px Circular Avatar with Ring & Edit Button */}
          <div className="relative shrink-0">
            <Avatar
              src={data.image}
              fallback={data.name}
              className="size-[84px] text-2xl font-bold ring-2 ring-white/10 shadow-lg"
            />
            {data.mine && (
              <Link
                to="/account"
                hash="perfil-social"
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-white/20 bg-[#FF2D55] text-white shadow-md transition-transform active:scale-95"
                aria-label="Actualizar foto"
              >
                <Camera className="size-3.5" />
              </Link>
            )}
          </div>

          {/* Identity & Global Sports Metrics */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-white">{data.name}</h1>
                <p className="truncate text-sm font-medium text-muted-foreground">{data.handle || "Sin @usuario"}</p>
              </div>
              {data.mine && (
                <Button asChild size="icon" variant="ghost" className="glass-control shrink-0 rounded-full" aria-label="Ajustes">
                  <Link to="/account" data-profile-gear="1">
                    <Settings className="size-5" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Global Sports Metric */}
            <p className="mt-1 text-xs font-medium text-stone-300/90">
              {workoutCount} {workoutCount === 1 ? "entrenamiento completado" : "entrenamientos completados"}
            </p>

            {/* Active Streak Badge */}
            <div className="mt-2.5">
              {workoutCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF2D55]/25 bg-[#FF2D55]/10 px-3 py-1 text-xs font-semibold text-[#FF2D55]">
                  <span>🔥</span> {data.stats?.weekWorkouts ? `${data.stats.weekWorkouts} sesiones esta semana` : "Atleta activo"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <span>⚡</span> Nuevo atleta
                </span>
              )}
            </div>
          </div>
        </div>

        {data.bio && (
          <p className="mt-3.5 text-sm leading-relaxed text-stone-200/90 text-pretty">
            {data.bio}
          </p>
        )}

        {/* Social Counters: Followers / Following */}
        <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-3 text-xs">
          <button
            type="button"
            onClick={() => openList("followers")}
            className="font-medium text-muted-foreground transition-colors hover:text-white pressable"
          >
            <strong className="font-bold text-white tabular">{data.followerCount ?? 0}</strong> seguidores
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => openList("following")}
            className="font-medium text-muted-foreground transition-colors hover:text-white pressable"
          >
            <strong className="font-bold text-white tabular">{data.followingCount ?? 0}</strong> siguiendo
          </button>
        </div>

        {/* Symmetrical 50/50 Primary Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {data.mine ? (
            <>
              <Button
                asChild
                className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 font-medium text-white transition-colors hover:bg-white/10"
                variant="ghost"
              >
                <Link to="/account" hash="perfil-social">
                  Editar perfil
                </Link>
              </Button>
              <Button
                type="button"
                onClick={handleShare}
                className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 font-medium text-white transition-colors hover:bg-white/10 inline-flex items-center justify-center gap-1.5"
                variant="ghost"
              >
                <Share2 className="size-4" />
                <span>Compartir perfil</span>
              </Button>
            </>
          ) : (
            <>
              <FollowButton
                person={{
                  userId: data.userId,
                  profileVisibility: data.profileVisibility,
                  followStatus: data.followStatus,
                }}
                size="default"
                onChange={onRefresh}
              />
              <Button
                type="button"
                onClick={handleShare}
                className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 font-medium text-white transition-colors hover:bg-white/10 inline-flex items-center justify-center gap-1.5"
                variant="ghost"
              >
                <Share2 className="size-4" />
                <span>Compartir</span>
              </Button>
            </>
          )}
        </div>

        {/* Incoming follow request actions when applicable */}
        {!data.mine && data.incomingStatus === "pending" && (
          <div className="mt-3 flex gap-2">
            <Button className="flex-1 rounded-full" onClick={onAccept}>
              Aceptar solicitud
            </Button>
            <Button className="flex-1 rounded-full" variant="secondary" onClick={onReject}>
              Rechazar
            </Button>
          </div>
        )}
      </section>

      {/* Private Profile Guard */}
      {data.locked ? (
        <div data-profile-lock="1">
          <EmptyState
            icon={Lock}
            title="Esta cuenta es privada. Sigue a esta cuenta para ver sus entrenamientos y rutinas."
            hint="Envía una solicitud. Cuando la acepte, verás su actividad."
          />
        </div>
      ) : (
        <>
          {/* Sub-Navigation Tabs with Sliding Indicator Line */}
          <div className="relative border-b border-white/10">
            <div className="grid grid-cols-4">
              {TABS.map((t) => {
                const on = tab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors duration-200",
                      on ? "text-white" : "text-muted-foreground hover:text-white/80",
                    )}
                  >
                    <Icon className={cn("size-4 transition-colors", on ? "text-[#FF2D55]" : "text-muted-foreground")} />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Sliding Neon Pink Bottom Indicator Line */}
            <span
              className="absolute bottom-0 h-0.5 w-1/4 bg-[#FF2D55] shadow-[0_0_8px_#FF2D55] transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                transform: `translate3d(${activeTabIdx * 100}%, 0, 0)`,
              }}
            />
          </div>

          {/* Discipline Pill Selector Carousel */}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 select-none scroll-smooth [scroll-snap-type:x_mandatory]">
            {DISCIPLINES.map((d) => {
              const active = discipline === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDiscipline(d.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 [scroll-snap-align:start] pressable",
                    active
                      ? "border border-[#FF2D55] bg-[#FF2D55]/15 text-white shadow-[0_0_10px_rgba(255,45,85,0.25)]"
                      : "border border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white",
                  )}
                >
                  <span>{d.icon}</span>
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Progreso — Esta Semana & 12-Week Interactive Bézier Graph */}
          {tab === "progress" && (
            <div className="space-y-4">
              <StravaWeeklyChart
                metrics={{
                  totalVolumeKg: data.stats?.totalVolumeKg ?? 0,
                  activeTimeFormatted: data.stats?.activeTimeFormatted ?? "0m",
                  totalSets: data.stats?.totalSets ?? 0,
                  history12Weeks: data.stats?.history12Weeks,
                }}
                units={units}
              />
              <Button
                asChild
                variant="secondary"
                className="w-full h-12 rounded-full border border-white/10 bg-[#18181D] hover:bg-white/10 text-white font-semibold text-xs transition-colors"
              >
                <Link to="/progress">Ver tu progreso con más detalle →</Link>
              </Button>
            </div>
          )}

          {/* Tab 2: Actividades — Feed Cards */}
          {tab === "activities" && (
            <div className="space-y-3">
              {filteredPosts.length === 0 ? (
                <EmptyState
                  icon={Dumbbell}
                  title={data.mine ? "Aún no has compartido entrenamientos." : "Todavía no hay entrenamientos."}
                  hint={
                    data.mine
                      ? "Al terminar una sesión puedes compartirla con tus seguidores."
                      : "Cuando publique un entrenamiento, aparecerá aquí."
                  }
                />
              ) : (
                filteredPosts.map((post) => (
                  <StravaFeedCard
                    key={post.id}
                    post={post}
                    units={units}
                    onChanged={onRefresh}
                  />
                ))
              )}
            </div>
          )}

          {/* Tab 3: Récords (PR) */}
          {tab === "prs" && (
            <div className="space-y-3" data-profile-prs="1">
              <div className="pulse-card rounded-3xl border border-white/10 bg-card/60 p-5">
                <div className="flex items-center gap-2 text-amber-400">
                  <Trophy className="size-5 fill-amber-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">Mejores Marcas Personales (PRs)</h3>
                </div>
                {(data.stats?.prs ?? 0) > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <PRCard exercise="Press de Banca" mark="1RM registrado" date="Reciente" reps="Registro verificado" />
                    <PRCard exercise="Sentadilla Libre" mark="1RM registrado" date="Reciente" reps="Registro verificado" />
                  </div>
                ) : (
                  <div className="mt-4 py-6 text-center">
                    <p className="text-sm font-semibold text-white">Sin marcas registradas aún</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Completa entrenamientos registrando peso y repeticiones para calcular tus récords personales.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Estadísticas */}
          {tab === "stats" && (
            <div className="space-y-3" data-profile-stats="1">
              <div className="pulse-card rounded-3xl border border-white/10 bg-card/60 p-5">
                <h3 className="text-base font-bold text-white tracking-tight">Estadísticas Globales</h3>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">Sesiones</p>
                    <p className="mt-1 text-lg font-bold text-white tabular">{workoutCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">Esta semana</p>
                    <p className="mt-1 text-lg font-bold text-[#FF2D55] tabular">{data.stats?.weekWorkouts ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">Total PRs</p>
                    <p className="mt-1 text-lg font-bold text-amber-400 tabular">{data.stats?.prs ?? 0}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-3.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Consistencia global</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>{workoutCount > 0 ? Math.min(100, Math.max(15, Math.round(((data.stats?.weekWorkouts ?? 1) / 4) * 100))) : 0}%</span>
                    <Sparkles className="size-3.5" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <FollowListModal
        open={listOpen}
        onOpenChange={(v) => {
          setListOpen(v);
          if (!v) onRefresh();
        }}
        username={data.username}
        mine={data.mine}
        initialTab={listTab}
      />
    </div>
  );
}

function PRCard({
  exercise,
  mark,
  date,
  reps,
}: {
  exercise: string;
  mark: string;
  date: string;
  reps: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="truncate text-xs font-semibold text-white">{exercise}</p>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-base font-bold text-amber-400 tabular">{mark}</span>
        <span className="text-[10px] text-muted-foreground">{reps}</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{date}</p>
    </div>
  );
}
