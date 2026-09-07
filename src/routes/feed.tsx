import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Bell, Search, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { CompareCtaCard } from "@/components/pulse/compare";
import { PostCard } from "@/components/pulse/social";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { getBootstrap } from "@/lib/pulse/fns";
import { getActivityFeed, getDiscoverFeed } from "@/lib/pulse/social-fns";

export const Route = createFileRoute("/feed")({ component: FeedLayout });

function FeedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/feed/") && pathname !== "/feed/") {
    return <Outlet />;
  }
  return <ActivityPage />;
}

function ActivityPage() {
  const [tab, setTab] = useState<"following" | "foryou">("following");
  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const units = bootstrap.data?.profile.units ?? "metric";
  const feed = useInfiniteQuery({
    queryKey: ["activity-feed"],
    queryFn: ({ pageParam }) => getActivityFeed({ data: { cursor: pageParam } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const discover = useInfiniteQuery({
    queryKey: ["discover-feed"],
    queryFn: ({ pageParam }) => getDiscoverFeed({ data: { cursor: pageParam } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = (feed.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => p.kind === "workout");
  const discoverItems = (discover.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => p.kind === "workout");
  const meta = feed.data?.pages[0];
  const pending = meta?.pendingIncoming ?? 0;
  const unread = meta?.unreadNotifications ?? 0;
  const badge = unread + pending > 0;
  const active = tab === "foryou" ? discover : feed;
  const activeItems = tab === "foryou" ? discoverItems : items;

  return (
    <AppPage
      title="Actividad"
      action={
        <div className="flex items-center gap-1">
          <Button asChild size="icon" variant="ghost" className="glass-control">
            <Link to="/feed/notifications" className="relative" aria-label="Notificaciones">
              <Bell className="size-5" />
              {badge && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" data-unread-badge="1" />
              )}
            </Link>
          </Button>
          <Button asChild size="icon" variant="ghost" className="glass-control">
            <Link to="/feed/search" aria-label="Buscar personas">
              <Search className="size-5" />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <Segmented
          ariaLabel="Tipo de feed"
          className="flex w-full"
          value={tab}
          options={[
            { value: "following", label: "Siguiendo" },
            { value: "foryou", label: "Para ti" },
          ]}
          onChange={setTab}
        />

        <CompareCtaCard />

        {meta && !meta.username && (
          <Link to="/account" hash="perfil-social" className="block rounded-[22px] bg-card p-4 text-sm hairline">
            <p className="font-medium">Elige tu @usuario</p>
            <p className="mt-1 text-muted-foreground">Así tus amigos pueden encontrarte en Pulse.</p>
          </Link>
        )}

        {active.isPending ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando actividad">
            <Skeleton className="h-36 w-full rounded-[22px]" />
            <Skeleton className="h-36 w-full rounded-[22px]" />
          </div>
        ) : active.isError ? (
          <EmptyState
            icon={Users}
            title="No se ha podido cargar la actividad."
            hint={(active.error as Error).message || "Comprueba la conexión e inténtalo de nuevo."}
            action={<Button onClick={() => void active.refetch()}>Reintentar</Button>}
          />
        ) : tab === "foryou" && activeItems.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Todavía no hay entrenamientos públicos."
            hint="Cuando alguien publique un entreno en público, aparecerá aquí."
            action={
              <Button asChild>
                <Link to="/feed/search">Buscar personas</Link>
              </Button>
            }
          />
        ) : tab === "following" && activeItems.length === 0 ? (
          (meta?.followingCount ?? 0) === 0 ? (
            <EmptyState
              icon={Users}
              title="Sigue a tus amigos para ver sus entrenamientos aquí"
              hint="Busca a gente que conoces y empieza a seguirla."
              action={
                <Button asChild>
                  <Link to="/feed/search">Buscar personas</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Tus amigos todavía no han compartido entrenamientos."
              hint="Cuando lo hagan, aparecerán aquí. Tú también puedes compartir al terminar una sesión."
            />
          )
        ) : (
          <div className="space-y-3">
            {activeItems.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                units={units}
                onChanged={() => {
                  void feed.refetch();
                  void discover.refetch();
                }}
              />
            ))}
            {active.hasNextPage && (
              <Button
                variant="secondary"
                className="w-full"
                loading={active.isFetchingNextPage}
                onClick={() => void active.fetchNextPage()}
              >
                Ver más
              </Button>
            )}
          </div>
        )}
      </div>
    </AppPage>
  );
}
