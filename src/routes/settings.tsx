import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { AthleteProfile } from "@/components/pulse/athlete-profile";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBootstrap } from "@/lib/pulse/fns";
import { getSocialProfile } from "@/lib/pulse/social-fns";

export const Route = createFileRoute("/settings")({ component: OwnProfilePage });

function OwnProfilePage() {
  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const units = bootstrap.data?.profile.units ?? "metric";
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["social-profile", "me"],
    queryFn: () => getSocialProfile({ data: {} }),
    staleTime: 60_000,
  });

  return (
    <AppPage>
      {isPending && !data && (
        <div className="mx-auto max-w-xl space-y-3 pt-4" aria-busy="true">
          <Skeleton className="h-48 w-full rounded-[22px]" />
          <Skeleton className="h-28 w-full rounded-[22px]" />
        </div>
      )}
      {isError && (
        <EmptyState
          icon={UserRound}
          title="No se ha podido cargar tu perfil."
          hint="Comprueba la conexión e inténtalo de nuevo."
          action={<Button onClick={() => void refetch()}>Reintentar</Button>}
        />
      )}
      {data && <AthleteProfile data={data} units={units} onRefresh={() => void refetch()} />}
    </AppPage>
  );
}
