import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScreenSkeleton } from "@/components/auth-gate";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { flowPath, resolveAppFlow } from "@/lib/pulse/flow";
import { getBootstrap } from "@/lib/pulse/fns";

export const Route = createFileRoute("/onboarding")({ component: OnboardingRedirect });

function OnboardingRedirect() {
  const { user, isPending } = useCurrentUserState();
  const { data, isPending: loading } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    enabled: Boolean(user),
  });
  if (isPending) return <ScreenSkeleton />;
  if (!user) return <RedirectToSignIn />;
  if (loading || !data?.profile) return <ScreenSkeleton />;
  return <Navigate to={flowPath(resolveAppFlow(data.profile))} />;
}
