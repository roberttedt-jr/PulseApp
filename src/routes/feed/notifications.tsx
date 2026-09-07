import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { PersonRow } from "@/components/pulse/social";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  acceptFollowRequest,
  listNotifications,
  markNotificationsRead,
  rejectFollowRequest,
  type ActivityNotification,
} from "@/lib/pulse/social-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/feed/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
  });

  useEffect(() => {
    void markNotificationsRead({ data: {} })
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["activity-feed"] });
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .catch(() => {});
  }, [qc]);

  const accept = useMutation({
    mutationFn: (userId: string) => acceptFollowRequest({ data: { userId } }),
    onSuccess: () => {
      toast.success("Solicitud aceptada");
      void refetch();
      void qc.invalidateQueries({ queryKey: ["activity-feed"] });
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

  const items = data?.items ?? [];

  function openItem(n: ActivityNotification) {
    if (n.type === "like" || n.type === "comment") {
      if (n.postId) {
        void navigate({ to: "/feed/p/$postId", params: { postId: n.postId } });
        return;
      }
    }
    if (n.username) {
      void navigate({ to: "/u/$username", params: { username: n.username } });
    }
  }

  return (
    <AppPage
      title="Notificaciones"
      action={
        <button type="button" className="text-sm text-primary" onClick={() => void navigate({ to: "/feed" })}>
          Listo
        </button>
      }
    >
      <div className="mx-auto max-w-xl space-y-3 pt-4">
        {isPending && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        )}
        {isError && (
          <EmptyState
            icon={Bell}
            title="No se han podido cargar las notificaciones."
            hint={(error as Error).message || "Inténtalo de nuevo."}
            action={<Button onClick={() => void refetch()}>Reintentar</Button>}
          />
        )}
        {!isPending && !isError && items.length === 0 && (
          <EmptyState icon={Bell} title="No tienes notificaciones." hint="Los me gusta, comentarios y seguidores aparecerán aquí." />
        )}
        {items.map((n) => (
          <div
            key={n.id}
            className="rounded-[22px] bg-card p-3 hairline"
            data-notification={n.type}
            data-notification-unread={n.read ? "0" : "1"}
          >
            {n.type === "follow_request" ? (
              <PersonRow
                person={{
                  userId: n.actorId,
                  username: n.username,
                  handle: n.handle,
                  name: n.name,
                  image: n.image,
                  bio: null,
                  profileVisibility: "private",
                  followStatus: null,
                  incomingStatus: "pending",
                }}
                action={
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" disabled={accept.isPending} onClick={() => accept.mutate(n.actorId)}>
                      Aceptar
                    </Button>
                    <Button size="sm" variant="secondary" disabled={reject.isPending} onClick={() => reject.mutate(n.actorId)}>
                      Rechazar
                    </Button>
                  </div>
                }
              />
            ) : (
              <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => openItem(n)}>
                {n.username ? (
                  <Link
                    to="/u/$username"
                    params={{ username: n.username }}
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar src={n.image} fallback={n.name} />
                  </Link>
                ) : (
                  <Avatar src={n.image} fallback={n.name} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug">{n.text}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                  </span>
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </AppPage>
  );
}
