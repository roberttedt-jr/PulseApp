import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getBootstrap, listRoutines } from "@/lib/pulse/fns";
import { getActivityFeed } from "@/lib/pulse/social-fns";

export const PULSE_SPLASH_CSS = `
html,body{background:#000;color-scheme:dark}
#pulse-splash,.pulse-splash-fallback{
  position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
  background:#000;color:#f5f5f7;pointer-events:none;
}
#pulse-splash{transition:opacity 200ms cubic-bezier(0.22,1,0.36,1)}
#pulse-splash.is-done{opacity:0}
#pulse-splash .pulse-splash-mark,.pulse-splash-fallback .pulse-splash-mark{
  position:relative;width:88px;height:88px;
  display:grid;place-items:center;
}
#pulse-splash .pulse-splash-halo,.pulse-splash-fallback .pulse-splash-halo{
  position:absolute;inset:-18px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,45,85,.42) 0%,rgba(255,45,85,0) 70%);
  animation:pulse-halo 1.35s ease-in-out infinite;
  will-change:transform,opacity;
}
#pulse-splash .pulse-splash-core,.pulse-splash-fallback .pulse-splash-core{
  position:relative;z-index:1;width:72px;height:72px;border-radius:22%;
  background:#0a0a0c;box-shadow:0 0 0 1px rgba(255,255,255,.08);
  animation:pulse-beat 1.35s ease-in-out infinite;
  will-change:transform;
}
#pulse-splash .pulse-splash-core svg,.pulse-splash-fallback .pulse-splash-core svg,
#pulse-splash .pulse-splash-core img,.pulse-splash-fallback .pulse-splash-core img{
  width:72px;height:72px;display:block;border-radius:22%;
}
#pulse-splash .pulse-splash-word,.pulse-splash-fallback .pulse-splash-word{
  margin-top:18px;font:600 15px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;
  letter-spacing:.18em;text-transform:uppercase;color:rgba(245,245,247,.42);
}
@keyframes pulse-beat{
  0%,100%{transform:scale(1)}
  14%{transform:scale(1.06)}
  28%{transform:scale(1)}
  42%{transform:scale(1.06)}
  56%{transform:scale(1)}
}
@keyframes pulse-halo{
  0%,100%{opacity:.18;transform:scale(.92)}
  14%{opacity:.55;transform:scale(1.12)}
  28%{opacity:.2;transform:scale(.96)}
  42%{opacity:.48;transform:scale(1.1)}
  56%{opacity:.16;transform:scale(.92)}
}
@media (prefers-reduced-motion:reduce){
  #pulse-splash .pulse-splash-halo,#pulse-splash .pulse-splash-core,
  .pulse-splash-fallback .pulse-splash-halo,.pulse-splash-fallback .pulse-splash-core{animation:none}
}
#nprogress,.nprogress,#nprogress .bar,#nprogress .spinner,
[data-nprogress],.vite-dev-loading,[data-vite-dev-loading],
.top-loading-bar,[data-loading-bar],.bar.nprogress{display:none!important}
`;

export const PULSE_SPLASH_HTML = `
<div class="pulse-splash-mark" data-splash="heartbeat" aria-hidden="true">
  <span class="pulse-splash-halo"></span>
  <span class="pulse-splash-core">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Pulse">
      <rect width="100" height="100" rx="22" fill="#0a0a0c"/>
      <defs>
        <linearGradient id="pulseSplashGrad" x1="10%" y1="20%" x2="95%" y2="40%">
          <stop offset="0%" stop-color="#FF2D55"/>
          <stop offset="82%" stop-color="#FF2D55"/>
          <stop offset="100%" stop-color="#4DA3FF"/>
        </linearGradient>
      </defs>
      <path d="M18 50 H32 L36 40 L40 54 L46 78 L49 30 C49 16 82 16 82 40 C82 60 62 64 49 54" fill="none" stroke="url(#pulseSplashGrad)" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>
</div>
<p class="pulse-splash-word">Pulse</p>
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
