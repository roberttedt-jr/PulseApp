import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, UserRound } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { AthleteProfile } from "@/components/pulse/athlete-profile";
import { EmptyState } from "@/components/pulse/empty-state";
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
    <AppPage
      title="Perfil"
      action={
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary pressable py-1 px-1.5"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              void navigate({ to: "/feed" });
            }
          }}
          aria-label="Volver"
        >
          <ChevronLeft className="size-4 -ml-1" />
          Atrás
        </button>
      }
    >
      {isPending && (
        <div className="mx-auto max-w-xl space-y-3 pt-4" aria-busy="true">
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
        <AthleteProfile
          data={data}
          units={units}
          onRefresh={() => void refetch()}
          onAccept={() => accept.mutate(data.userId)}
          onReject={() => reject.mutate(data.userId)}
          onRemove={() => remove.mutate(data.userId)}
          onBlock={() => block.mutate(data.userId)}
        />
      )}
    </AppPage>
  );
}
