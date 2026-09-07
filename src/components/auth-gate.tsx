import { Navigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/layout/app-shell";
import { hasSeenPublicOnboarding, flowPath, resolveAppFlow } from "@/lib/pulse/flow";
import { getBootstrap } from "@/lib/pulse/fns";

export function ScreenSkeleton() {
  return (
    <div
      className="min-h-dvh bg-black"
      aria-busy="true"
      aria-label="Cargando Pulse"
      suppressHydrationWarning
    />
  );
}

export function PublicEntryRedirect() {
  const seen = typeof window !== "undefined" && hasSeenPublicOnboarding();
  return <Navigate to={seen ? "/login" : "/welcome"} />;
}

export function AppPage({
  children,
  title,
  action,
  hideNav,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  hideNav?: boolean;
}) {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bootstrap = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  if (isPending) return <ScreenSkeleton />;
  if (!user) return <PublicEntryRedirect />;

  if (bootstrap.isPending || !bootstrap.data?.profile) {
    if (bootstrap.isError) {
      return (
        <div className="grid min-h-dvh place-items-center px-5 text-center">
          <p className="text-sm text-destructive">{(bootstrap.error as Error).message || "No se pudo cargar el perfil."}</p>
        </div>
      );
    }
    return <ScreenSkeleton />;
  }
  const flow = resolveAppFlow(bootstrap.data.profile);
  const dest = flowPath(flow);
  if (flow !== "app" && pathname !== dest) {
    return <Navigate to={dest} />;
  }

  return (
    <AppShell title={title} action={action} hideNav={hideNav}>
      {children}
    </AppShell>
  );
}