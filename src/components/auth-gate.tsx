import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

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
  if (isPending) return <ScreenSkeleton />;
  if (!user) return <RedirectToSignIn />;
  return (
    <AppShell title={title} action={action} hideNav={hideNav}>
      {children}
    </AppShell>
  );
}
