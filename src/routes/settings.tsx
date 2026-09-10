import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { AthleteProfile } from "@/components/pulse/athlete-profile";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { getBootstrap } from "@/lib/pulse/fns";
import { getSocialProfile } from "@/lib/pulse/social-fns";

export const Route = createFileRoute("/settings")({ component: OwnProfilePage });

function OwnProfilePage() {
  const qc = useQueryClient();
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
        <div className="mx-auto max-w-xl space-y-3 pt-[max(56px,calc(env(safe-area-inset-top,0px)+18px))]" aria-busy="true">
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
      {data && (
        <PullToRefresh
          onRefresh={async () => {
            await Promise.allSettled([
              refetch(),
              bootstrap.refetch(),
              qc.invalidateQueries({ queryKey: ["social-profile", "me"] }),
              qc.invalidateQueries({ queryKey: ["social-profile"] }),
              qc.invalidateQueries({ queryKey: ["bootstrap"] }),
              qc.invalidateQueries({ queryKey: ["consistency"] }),
              qc.invalidateQueries({ queryKey: ["activity-feed"] }),
            ]);
          }}
        >
          <AthleteProfile data={data} units={units} onRefresh={() => void refetch()} />
        </PullToRefresh>
      )}
    </AppPage>
  );
}
