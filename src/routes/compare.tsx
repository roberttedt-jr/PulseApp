import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Shield } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { CompareBanner, FriendPickRow } from "@/components/pulse/compare";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COMPARE_COPY } from "@/lib/pulse/compare";
import { listComparableFriends } from "@/lib/pulse/compare-fns";

export const Route = createFileRoute("/compare")({ component: CompareLayout });

function CompareLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/compare/") && pathname !== "/compare/") {
    return <Outlet />;
  }
  return <ComparePickerPage />;
}

function ComparePickerPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["compare-friends"],
    queryFn: () => listComparableFriends(),
  });

  return (
    <AppPage title={COMPARE_COPY.title}>
      <div className="mx-auto max-w-xl space-y-4 pt-4" data-compare-root="picker">
        <section className="pulse-card p-4">
          <h2 className="text-[15px] font-semibold tracking-tight">{COMPARE_COPY.ctaFriends}</h2>
          <div className="mt-1">
            <CompareBanner />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{COMPARE_COPY.privacyNote}</p>
        </section>

        {data && !data.enabled && (
          <section className="pulse-card p-4" data-compare-viewer-off="1">
            <p className="text-sm font-medium">{COMPARE_COPY.viewerOff}</p>
            <Button asChild className="mt-3 w-full">
              <Link to="/account" hash="comparativas">
                Ir a Privacidad
              </Link>
            </Button>
          </section>
        )}

        {isPending && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-16 w-full rounded-[22px]" />
            <Skeleton className="h-16 w-full rounded-[22px]" />
          </div>
        )}
        {isError && (
          <EmptyState
            icon={ArrowLeftRight}
            title="No se ha podido cargar la lista."
            hint="Comprueba la conexión e inténtalo de nuevo."
            action={<Button onClick={() => void refetch()}>Reintentar</Button>}
          />
        )}
        {data && data.friends.length === 0 && (
          <EmptyState
            icon={Shield}
            title="Todavía no hay amigos para comparar."
            hint={COMPARE_COPY.emptyFriends}
            action={
              <Button asChild>
                <Link to="/feed/search">Buscar personas</Link>
              </Button>
            }
          />
        )}
        {data && data.friends.length > 0 && (
          <ul className="space-y-2">
            {data.friends.map((friend) => (
              <li key={friend.userId}>
                <FriendPickRow friend={friend} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppPage>
  );
}
