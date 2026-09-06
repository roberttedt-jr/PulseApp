import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, UserRound } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { FollowButton, PostCard } from "@/components/pulse/social";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBootstrap } from "@/lib/pulse/fns";
import { acceptFollowRequest, blockUser, getSocialProfile, rejectFollowRequest, removeFollower } from "@/lib/pulse/social-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({ component: SocialProfilePage });

function SocialProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const units = bootstrap.data?.profile.units ?? "metric";
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["social-profile", username],
    queryFn: () => getSocialProfile({ data: { username } }),
  });

  const accept = useMutation({
    mutationFn: (userId: string) => acceptFollowRequest({ data: { userId } }),
    onSuccess: () => {
      toast.success("Solicitud aceptada");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (userId: string) => rejectFollowRequest({ data: { userId } }),
    onSuccess: () => {
      toast.success("Solicitud rechazada");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeFollower({ data: { userId } }),
    onSuccess: () => {
      toast.success("Seguidor eliminado");
      void qc.invalidateQueries({ queryKey: ["social-profile"] });
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const block = useMutation({
    mutationFn: (userId: string) => blockUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuario bloqueado");
      void qc.invalidateQueries({ queryKey: ["activity-feed"] });
      void qc.invalidateQueries({ queryKey: ["social-profile"] });
      void navigate({ to: "/feed" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AppPage title={data?.handle || "Perfil"}>
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        {isPending && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-40 w-full rounded-[22px]" />
            <Skeleton className="h-28 w-full rounded-[22px]" />
          </div>
        )}
        {isError && (
          <EmptyState
            icon={UserRound}
            title="No se ha encontrado este perfil."
            hint="Puede que el @usuario no exista o esté bloqueado."
            action={
              <Button variant="secondary" onClick={() => void navigate({ to: "/feed" })}>
                Volver a actividad
              </Button>
            }
          />
        )}
        {data && (
          <>
            <section className="rounded-[22px] bg-card p-5 text-center hairline">
              <Avatar src={data.image} fallback={data.name} className="mx-auto size-20 text-xl" />
              <h1 className="mt-3 text-lg font-semibold tracking-tight">{data.name}</h1>
              <p className="text-sm text-muted-foreground">{data.handle}</p>
              {data.bio && <p className="mt-3 text-sm leading-relaxed text-pretty">{data.bio}</p>}
              {!data.locked && (
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <span>
                    <span className="font-semibold tabular">{data.followerCount ?? 0}</span>
                    <span className="ml-1 text-muted-foreground">seguidores</span>
                  </span>
                  <span>
                    <span className="font-semibold tabular">{data.followingCount ?? 0}</span>
                    <span className="ml-1 text-muted-foreground">seguidos</span>
                  </span>
                </div>
              )}
              <div className="mt-4 flex flex-col gap-2">
                {data.mine ? (
                  <Button asChild variant="secondary">
                    <Link to="/settings" hash="perfil-social">
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
                      onChange={() => void refetch()}
                    />
                    {data.incomingStatus === "pending" && (
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={() => accept.mutate(data.userId)}>
                          Aceptar
                        </Button>
                        <Button className="flex-1" variant="secondary" onClick={() => reject.mutate(data.userId)}>
                          Rechazar
                        </Button>
                      </div>
                    )}
                    {data.incomingStatus === "accepted" && (
                      <Button variant="ghost" onClick={() => remove.mutate(data.userId)}>
                        Eliminar seguidor
                      </Button>
                    )}
                    <Button variant="ghost" className="text-destructive" onClick={() => block.mutate(data.userId)}>
                      Bloquear
                    </Button>
                  </>
                )}
              </div>
            </section>

            {data.locked ? (
              <EmptyState
                icon={Lock}
                title="Este perfil es privado."
                hint="Envía una solicitud para ver sus entrenamientos compartidos."
              />
            ) : data.posts.length === 0 ? (
              <EmptyState
                icon={UserRound}
                title={data.mine ? "Aún no has compartido entrenamientos." : "Todavía no hay actividad."}
                hint={
                  data.mine
                    ? "Al terminar una sesión puedes compartirla con tus seguidores."
                    : "Cuando publique algo permitido, aparecerá aquí."
                }
              />
            ) : (
              <div className="space-y-3">
                {data.posts.map((post) => (
                  <PostCard key={post.id} post={post} units={units} onChanged={() => void refetch()} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppPage>
  );
}
