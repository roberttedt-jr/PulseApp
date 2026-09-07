import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getBootstrap, listRoutines } from "@/lib/pulse/fns";
import { getActivityFeed } from "@/lib/pulse/social-fns";

export const PULSE_SPLASH_CSS = `
html,body{background:#000000;color-scheme:dark}
#pulse-splash,.pulse-splash-fallback{
  position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
  background:#000000;color:#f5f5f7;pointer-events:none;
}
#pulse-splash{transition:opacity 200ms cubic-bezier(0.22,1,0.36,1)}
#pulse-splash.is-done{opacity:0}
.pulse-splash-logo{
  width:100px;height:100px;display:block;object-fit:contain;
  border-radius:22%;
  animation:heartbeat 1.35s ease-in-out infinite;
  will-change:transform,filter;
}
@keyframes heartbeat{
  0%{transform:scale(1);filter:drop-shadow(0 0 0px rgba(255,45,85,0))}
  14%{transform:scale(1.06);filter:drop-shadow(0 0 18px rgba(255,45,85,0.5))}
  28%{transform:scale(1);filter:drop-shadow(0 0 0px rgba(255,45,85,0))}
  42%{transform:scale(1.04);filter:drop-shadow(0 0 12px rgba(255,45,85,0.35))}
  70%{transform:scale(1);filter:drop-shadow(0 0 0px rgba(255,45,85,0))}
}
@media (prefers-reduced-motion:reduce){
  .pulse-splash-logo{animation:none}
}
#nprogress,.nprogress,#nprogress .bar,#nprogress .spinner,
[data-nprogress],.vite-dev-loading,[data-vite-dev-loading],
.top-loading-bar,[data-loading-bar],.bar.nprogress{display:none!important}
`;

export const PULSE_SPLASH_HTML = `
<img
  class="pulse-splash-logo"
  src="/pulse-icon.png"
  width="100"
  height="100"
  alt="Pulse"
  decoding="async"
  fetchpriority="high"
  data-splash="heartbeat"
/>
`;

let splashShownAt = typeof performance !== "undefined" ? performance.now() : 0;
let splashHidden = false;

export function hidePulseSplash() {
  if (typeof document === "undefined" || splashHidden) return;
  const el = document.getElementById("pulse-splash");
  if (!el) {
    splashHidden = true;
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const elapsed = performance.now() - splashShownAt;
  const wait = reduce ? 0 : Math.max(0, 520 - elapsed);
  window.setTimeout(() => {
    el.classList.add("is-done");
    splashHidden = true;
    window.setTimeout(() => el.remove(), 220);
  }, wait);
}

export function PulseSplashScreen() {
  return (
    <div className="pulse-splash-fallback" aria-busy="true" aria-label="Cargando Pulse" data-splash-fallback="1">
      <div dangerouslySetInnerHTML={{ __html: PULSE_SPLASH_HTML }} />
    </div>
  );
}

const PUBLIC_PATHS = new Set(["/welcome", "/login"]);

export function SplashController() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const qc = useQueryClient();
  const bootstrap = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const publicPath = PUBLIC_PATHS.has(pathname) || pathname.startsWith("/login");
  const ready = !isPending && (publicPath || !user || bootstrap.isSuccess || bootstrap.isError);

  useEffect(() => {
    if (ready) hidePulseSplash();
  }, [ready]);

  useEffect(() => {
    if (!user || !bootstrap.isSuccess) return;
    void router.preloadRoute({ to: "/" });
    void router.preloadRoute({ to: "/routines" });
    void router.preloadRoute({ to: "/feed" });
    void qc.prefetchQuery({ queryKey: ["routines"], queryFn: () => listRoutines({ data: {} }), staleTime: 60_000 });
    void qc.prefetchInfiniteQuery({
      queryKey: ["activity-feed"],
      queryFn: ({ pageParam }) => getActivityFeed({ data: { cursor: pageParam as string | null } }),
      initialPageParam: null as string | null,
      getNextPageParam: (last: { nextCursor: string | null }) => last.nextCursor,
      staleTime: 30_000,
    });
  }, [user, bootstrap.isSuccess, qc, router]);

  return null;
}
