import { Link } from "@tanstack/react-router";
import { Dumbbell, Lock, Settings } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/pulse/empty-state";
import { FollowButton, PostCard } from "@/components/pulse/social";
import { FollowListModal } from "@/components/social/FollowListModal";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { copySharedRoutine, type FeedPost, type RoutinePeek } from "@/lib/pulse/social-fns";
import type { FollowStatus, ProfileVisibility } from "@/lib/pulse/social";
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
  stats: { workouts: number; weekWorkouts: number; prs: number } | null;
  publicRoutines: RoutinePeek[];
  compareAvailable: boolean;
  posts: FeedPost[];
};

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
  const [tab, setTab] = useState<"workouts" | "routines" | "stats">("workouts");
  const [listTab, setListTab] = useState<"followers" | "following">("followers");
  const [listOpen, setListOpen] = useState(false);

  function openList(which: "followers" | "following") {
    setListTab(which);
    setListOpen(true);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-4">
      <section className="pulse-card p-5" data-athlete-header="1">
        <div className="flex items-start gap-4">
          <Avatar src={data.image} fallback={data.name} className="size-20 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight">{data.name}</h1>
                <p className="truncate text-sm text-muted-foreground">{data.handle || "Sin @usuario"}</p>
              </div>
              {data.mine && (
                <Button asChild size="icon" variant="ghost" className="glass-control shrink-0" aria-label="Ajustes">
                  <Link to="/account" data-profile-gear="1">
                    <Settings className="size-5" />
                  </Link>
                </Button>
              )}
            </div>
            {data.bio ? <p className="mt-2 text-sm leading-relaxed text-pretty">{data.bio}</p> : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 text-center">
          <Counter value={data.locked ? "—" : data.workoutCount ?? 0} label="Entrenamientos" />
          <Counter
            value={data.followerCount ?? 0}
            label="Seguidores"
            onClick={() => openList("followers")}
          />
          <Counter
            value={data.followingCount ?? 0}
            label="Siguiendo"
            onClick={() => openList("following")}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {data.mine ? (
            <Button asChild variant="secondary">
              <Link to="/account" hash="perfil-social">
                Editar perfil
              </Link>
            </Button>
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
              {data.compareAvailable && data.username && (
                <Button asChild variant="secondary">
                  <Link to="/compare/$username" params={{ username: data.username }} data-compare-cta="1">
                    Comparar
                  </Link>
                </Button>
              )}
              {data.incomingStatus === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={onAccept}>
                    Aceptar
                  </Button>
                  <Button className="flex-1" variant="secondary" onClick={onReject}>
                    Rechazar
                  </Button>
                </div>
              )}
              {data.incomingStatus === "accepted" && (
                <Button variant="ghost" onClick={onRemove}>
                  Eliminar seguidor
                </Button>
              )}
              <Button variant="ghost" className="text-destructive" onClick={onBlock}>
                Bloquear
              </Button>
            </>
          )}
        </div>
      </section>

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
          <Segmented
            ariaLabel="Secciones del perfil"
            className="flex w-full"
            value={tab}
            options={[
              { value: "workouts", label: "Actividad" },
              { value: "routines", label: "Rutinas" },
              { value: "stats", label: "Stats" },
            ]}
            onChange={setTab}
          />

          {tab === "workouts" &&
            (data.posts.length === 0 ? (
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
              <div className="space-y-3">
                {data.posts.map((post) => (
                  <PostCard key={post.id} post={post} units={units} onChanged={onRefresh} />
                ))}
              </div>
            ))}

          {tab === "routines" &&
            (data.publicRoutines.length === 0 ? (
              <EmptyState
                icon={Lock}
                title="No hay rutinas públicas."
                hint={data.mine ? "Comparte una rutina desde Entrenar para que otros la copien." : "Esta persona aún no ha publicado rutinas."}
              />
            ) : (
              <div className="space-y-3">
                {data.publicRoutines.map((r) => (
                  <PublicRoutineCard key={r.id ?? r.name} routine={r} mine={data.mine} onCopied={onRefresh} />
                ))}
              </div>
            ))}

          {tab === "stats" && data.stats && (
            <div className="grid grid-cols-3 gap-3" data-profile-stats="1">
              <StatBox label="Totales" value={String(data.stats.workouts)} />
              <StatBox label="Esta semana" value={String(data.stats.weekWorkouts)} />
              <StatBox label="PRs" value={String(data.stats.prs)} />
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

function Counter({
  value,
  label,
  onClick,
}: {
  value: number | string;
  label: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-lg font-semibold tabular">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </>
  );
  if (!onClick) return <div>{inner}</div>;
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-xl pressable-feedback" aria-label={label}>
      {inner}
    </button>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="pulse-card p-4 text-center">
      <p className="text-xl font-semibold tabular">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function PublicRoutineCard({
  routine,
  mine,
  onCopied,
}: {
  routine: RoutinePeek;
  mine: boolean;
  onCopied: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <article className="pulse-card p-4">
      <p className="font-semibold tracking-tight">{routine.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {routine.exerciseCount} {routine.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
      </p>
      {!mine && routine.id && (
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={busy}
          loading={busy}
          loadingText="Copiando…"
          onClick={async () => {
            setBusy(true);
            try {
              await copySharedRoutine({ data: { routineId: routine.id ?? undefined } });
              toast.success("Rutina añadida a Mis rutinas");
              onCopied();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo copiar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Copiar a mis rutinas
        </Button>
      )}
    </article>
  );
}
