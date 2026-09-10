import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { Activity, Dumbbell, House, UserRound, Users } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  createContext,
  memo,
  startTransition,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { PulseLogo } from "@/components/pulse-logo";
import { createSpring, type Spring } from "@/lib/pulse/spring";
import { calculatePillInterpolation } from "@/lib/pulse/ultra-native-math";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/routines", label: "Entrenar", icon: Dumbbell },
  { to: "/feed", label: "Actividad", icon: Users },
  { to: "/progress", label: "Progreso", icon: Activity },
  { to: "/settings", label: "Perfil", icon: UserRound },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/" || pathname.startsWith("/history");
  if (to === "/routines") {
    return (
      pathname.startsWith("/routines") ||
      pathname.startsWith("/train") ||
      pathname.startsWith("/exercises") ||
      pathname.startsWith("/plan")
    );
  }
  if (to === "/feed") return pathname.startsWith("/feed") || pathname.startsWith("/u/") || pathname.startsWith("/compare");
  if (to === "/progress") return pathname.startsWith("/progress") || pathname.startsWith("/stats");
  return pathname.startsWith(to) || (to === "/settings" && pathname.startsWith("/account"));
}

function atTabRoot(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to;
}

function isBarePath(pathname: string) {
  return (
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/share") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/handle") ||
    pathname.startsWith("/tutorial") ||
    pathname.startsWith("/onboarding")
  );
}

function haptic() {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* unsupported */
  }
}

const HideNavContext = createContext<(v: boolean) => void>(() => {});

export function useHideNav(hide?: boolean) {
  const set = useContext(HideNavContext);
  useLayoutEffect(() => {
    set(Boolean(hide));
    return () => set(false);
  }, [hide, set]);
}

export function PageHeader({ title, action }: { title?: string; action?: ReactNode }) {
  if (!title && !action) return null;
  return (
    <header className="page-header sticky top-0 z-30 -mx-4 flex min-w-0 items-center justify-between gap-3 px-4 pb-3 md:-mx-8 md:px-8">
      <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">{title}</h1>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export const BottomNavigation = memo(function BottomNavigation({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  const routeActive = Math.max(0, TABS.findIndex((t) => isActive(pathname, t.to)));
  const trackRef = useRef<HTMLUListElement>(null);
  const pathRef = useRef(pathname);
  const activeRef = useRef(routeActive);
  const springsRef = useRef<{ pill: Spring; scale: Spring[] } | null>(null);
  pathRef.current = pathname;
  activeRef.current = routeActive;

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const pill = node.querySelector<HTMLElement>("[data-tabbar-pill]");
    const marks = () => Array.from(node.querySelectorAll<HTMLElement>("[data-tab-bubble]"));
    const items = () => Array.from(node.querySelectorAll<HTMLElement>("[data-tab-item]"));

    const drag = { on: false, last: -1, width: 0, left: 0 };

    const paintPill = (index: number) => {
      if (pill && !drag.on) {
        pill.style.transition = "none";
        pill.style.transform = `translate3d(${index * 100}%,0,0) scale(1)`;
      }
    };
    const paintBubble = (i: number, lift: number) => {
      const mark = marks()[i];
      if (!mark) return;
      const y = -12 * lift;
      const s = 1 + 0.38 * lift;
      mark.style.transform = `translate3d(0,${y}px,0) scale(${s})`;
    };

    const pillSpring = createSpring(paintPill, { stiffness: 380, damping: 32, mass: 0.8 });
    const scaleSprings = TABS.map((_, i) => createSpring((v) => paintBubble(i, v), { stiffness: 420, damping: 26, mass: 0.7 }));
    springsRef.current = { pill: pillSpring, scale: scaleSprings };
    pillSpring.set(activeRef.current);

    const hot = (i: number) => {
      items().forEach((el, idx) => {
        el.classList.toggle("is-hot", idx === i);
        el.classList.toggle("is-bubble", drag.on && idx === i);
      });
    };

    const start = (x: number) => {
      const r = node.getBoundingClientRect();
      drag.on = true;
      drag.width = r.width;
      drag.left = r.left;
      const interp = calculatePillInterpolation({
        pointerX: x - drag.left,
        trackWidth: drag.width,
        tabCount: TABS.length,
        pillWidth: drag.width / TABS.length,
      });
      const i = interp.nearestIndex;
      drag.last = i;
      hot(i);
      if (pill) {
        pill.style.transition = "none";
        pill.style.transform = `translate3d(${interp.continuousIndex * 100}%,0,0) scale(0.92)`;
      }
      scaleSprings.forEach((s, idx) => s.to(idx === i ? 1 : 0));
      haptic();
      const tab = TABS[i];
      if (tab) void router.preloadRoute({ to: tab.to });
    };

    const move = (x: number, prevent: () => void) => {
      if (!drag.on) return;
      prevent();
      const interp = calculatePillInterpolation({
        pointerX: x - drag.left,
        trackWidth: drag.width,
        tabCount: TABS.length,
        pillWidth: drag.width / TABS.length,
      });
      if (pill) {
        pill.style.transition = "none";
        pill.style.transform = `translate3d(${interp.continuousIndex * 100}%,0,0) scale(0.92)`;
      }
      const i = interp.nearestIndex;
      if (i === drag.last) return;
      scaleSprings[drag.last]?.to(0);
      drag.last = i;
      hot(i);
      scaleSprings[i]?.to(1);
      haptic();
      const tab = TABS[i];
      if (tab) void router.preloadRoute({ to: tab.to });
    };

    const end = () => {
      if (!drag.on) return;
      const i = drag.last;
      drag.on = false;
      scaleSprings.forEach((s) => s.to(0));
      items().forEach((el) => el.classList.remove("is-bubble"));
      const tab = TABS[i];
      if (!tab || i < 0) return;
      hot(i);
      if (pill) {
        pill.style.transition = "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)";
        pill.style.transform = `translate3d(${i * 100}%,0,0) scale(1)`;
      }
      pillSpring.set(i);
      if (atTabRoot(pathRef.current, tab.to)) return;
      startTransition(() => {
        void navigate({ to: tab.to, replace: true, viewTransition: false });
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      start(t.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      move(t.clientX, () => e.preventDefault());
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      start(e.clientX);
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        /* Safari */
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!drag.on) return;
      move(e.clientX, () => {});
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", end);
    node.addEventListener("touchcancel", end);
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", end);
      node.removeEventListener("touchcancel", end);
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", end);
      node.removeEventListener("pointercancel", end);
      pillSpring.stop();
      scaleSprings.forEach((s) => s.stop());
      springsRef.current = null;
    };
  }, [navigate, router]);

  useEffect(() => {
    springsRef.current?.pill.to(routeActive);
  }, [routeActive]);

  return (
    <nav className="pulse-native-tabbar pulse-tabbar md:hidden" aria-label="Principal">
      <div className="relative mx-auto h-14 w-full max-w-lg px-2">
        <ul ref={trackRef} className="relative grid h-full grid-cols-5 items-center" role="tablist" data-tabbar-track="1">
          <span
            aria-hidden
            data-tabbar-pill="1"
            className="pulse-native-bubble pulse-tabbar-pill pointer-events-none absolute top-1.5 left-0 h-11 w-1/5 rounded-full"
          />
          {TABS.map((tab, i) => {
            const on = routeActive === i;
            const Icon = tab.icon;
            return (
              <li key={tab.to} className="min-w-0 overflow-visible" role="presentation">
                <span
                  role="tab"
                  data-tab-item={i}
                  aria-selected={on}
                  aria-label={tab.label}
                  className={cn(
                    "pulse-tab-item relative flex h-11 min-w-0 flex-col items-center justify-center gap-1 overflow-visible rounded-full select-none",
                    on && "is-on",
                  )}
                >
                  <span className="pulse-tab-bubble-mark -mt-[0.5px]" data-tab-bubble={i}>
                    <Icon className="pulse-tab-icon size-[22px]" strokeWidth={on ? 2.3 : 2} />
                  </span>
                  <span className="pulse-tab-label max-w-full truncate px-0.5 text-[10px] leading-none font-medium tracking-tight">
                    {tab.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
});

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="app-shell bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-6xl">
        <aside
          className={cn(
            "pulse-sidebar sticky top-0 hidden h-dvh w-[15.5rem] shrink-0 flex-col border-r border-border px-3 py-6",
            hideNav ? "md:hidden" : "md:flex",
          )}
        >
          <Link to="/" className="mb-8 flex items-center gap-2.5 px-2" viewTransition={false}>
            <PulseLogo size={32} alt="" />
            <span className="text-[19px] font-semibold tracking-tight">Pulse</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {TABS.map((tab) => {
              const on = isActive(pathname, tab.to);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  replace
                  preload="intent"
                  viewTransition={false}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-[background-color,color] duration-200",
                    on ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={on ? 2.25 : 2} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <p className="px-3 text-[11px] font-medium text-foreground-tertiary">Tu ritmo. Tu progreso.</p>
        </aside>

        <div className="flex min-w-0 max-w-full flex-1 flex-col">
          <main className={cn("min-w-0 max-w-full flex-1 px-4 md:px-8", hideNav ? "pb-8" : "pb-[var(--bottom-nav-total-space)] md:pb-10")}>
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>

      <div className={cn(hideNav && "hidden")} hidden={hideNav}>
        <BottomNavigation pathname={pathname} />
      </div>
    </div>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUserState();
  const [hideNav, setHideNav] = useState(false);
  if (isBarePath(pathname) || !user) return children;
  return (
    <HideNavContext.Provider value={setHideNav}>
      <AppShell hideNav={hideNav}>{children}</AppShell>
    </HideNavContext.Provider>
  );
}