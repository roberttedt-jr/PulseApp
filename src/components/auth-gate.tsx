import { Navigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { hasSeenPublicOnboarding, flowPath, resolveAppFlow } from "@/lib/pulse/flow";
import { getBootstrap } from "@/lib/pulse/fns";

export function ScreenSkeleton() {
  return (
    <div className="min-h-dvh w-full min-w-0 bg-background px-4 pt-[max(2rem,calc(var(--safe-top)+1rem))] pb-8">
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-sm font-medium tracking-tight text-muted-foreground">Pulse</p>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-36 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    </div>
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
