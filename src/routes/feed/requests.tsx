import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { PersonRow } from "@/components/pulse/social";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { acceptFollowRequest, listFollowRequests, rejectFollowRequest } from "@/lib/pulse/social-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/feed/requests")({ component: RequestsPage });

function RequestsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["follow-requests"],
    queryFn: () => listFollowRequests(),
  });
  const accept = useMutation({
    mutationFn: (userId: string) => acceptFollowRequest({ data: { userId } }),
    onSuccess: () => {
      toast.success("Solicitud aceptada");
      void qc.invalidateQueries({ queryKey: ["follow-requests"] });
      void qc.invalidateQueries({ queryKey: ["activity-feed"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (userId: string) => rejectFollowRequest({ data: { userId } }),
    onSuccess: () => {
      toast.success("Solicitud rechazada");
      void qc.invalidateQueries({ queryKey: ["follow-requests"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const people = data?.people ?? [];

  return (
    <AppPage
      title="Solicitudes"
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
            title="No se han podido cargar las solicitudes."
            hint={(error as Error).message || "Inténtalo de nuevo."}
            action={<Button onClick={() => void refetch()}>Reintentar</Button>}
          />
        )}
        {!isPending && !isError && people.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No tienes solicitudes."
            hint="Cuando alguien quiera seguir tu perfil privado, aparecerá aquí."
          />
        )}
        {people.map((p) => (
          <div key={p.userId} className="rounded-[22px] bg-card p-3 hairline">
            <PersonRow
              person={p}
              action={
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" disabled={accept.isPending} onClick={() => accept.mutate(p.userId)}>
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate(p.userId)}
                  >
                    Rechazar
                  </Button>
                </div>
              }
            />
          </div>
        ))}
      </div>
    </AppPage>
  );
}
