import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { Activity, Dumbbell, House, UserRound, Users } from "lucide-react";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { PulseLogo } from "@/components/pulse-logo";
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

function haptic() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* unsupported */
  }
}

export function PageHeader({ title, action }: { title?: string; action?: ReactNode }) {
  if (!title && !action) return null;
  return (
    <header className="page-header sticky top-0 z-30 flex min-w-0 items-center justify-between gap-3 px-4 pb-3 md:px-8">
      <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">{title}</h1>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export const BottomNavigation = memo(function BottomNavigation({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  const routeActive = Math.max(0, TABS.findIndex((t) => isActive(pathname, t.to)));
  const [pressed, setPressed] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const visual = pressed ?? pending ?? routeActive;

  useEffect(() => {
    setPending(null);
  }, [pathname]);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    const drag = { on: false, last: -1 };

    const indexFromX = (x: number) => {
      const r = node.getBoundingClientRect();
      const t = (x - r.left) / Math.max(1, r.width);
      return Math.max(0, Math.min(TABS.length - 1, Math.floor(t * TABS.length)));
    };

    const start = (x: number) => {
      drag.on = true;
      const i = indexFromX(x);
      drag.last = i;
      setPressed(i);
      haptic();
      const tab = TABS[i];
      if (tab) void router.preloadRoute({ to: tab.to });
    };

    const move = (x: number, prevent: () => void) => {
      if (!drag.on) return;
      prevent();
      const i = indexFromX(x);
      if (i === drag.last) return;
      drag.last = i;
      setPressed(i);
      haptic();
      const tab = TABS[i];
      if (tab) void router.preloadRoute({ to: tab.to });
    };

    const end = () => {
      if (!drag.on) return;
      const i = drag.last;
      drag.on = false;
      setPressed(null);
      const tab = TABS[i];
      if (!tab || i < 0) return;
      if (atTabRoot(pathname, tab.to)) return;
      setPending(i);
      void navigate({ to: tab.to, replace: true, viewTransition: false });
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
    };
  }, [navigate, pathname, router]);

  return (
    <nav className="pulse-tabbar md:hidden" aria-label="Principal">
      <ul ref={trackRef} className="relative grid grid-cols-5 px-1.5 py-1.5" role="tablist" data-tabbar-track="1">
        <span
          aria-hidden
          className="pulse-tabbar-pill pointer-events-none absolute top-1.5 left-1.5 h-11 w-[calc((100%-0.75rem)/5)] rounded-full"
          style={{ transform: `translate3d(${visual * 100}%,0,0)` }}
        />
        {TABS.map((tab, i) => {
          const on = visual === i;
          const bubble = pressed === i;
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="min-w-0" role="presentation">
              <span
                role="tab"
                aria-selected={on}
                aria-label={tab.label}
                className={cn("pulse-tab-item relative flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full", bubble && "is-bubble")}
              >
                <Icon
                  className={cn("pulse-tab-icon size-5", on && "is-on")}
                  strokeWidth={on ? 2.4 : 1.85}
                  fill={on ? "currentColor" : "none"}
                  fillOpacity={on ? 0.28 : 0}
                />
                <span className={cn("pulse-tab-label max-w-full truncate px-0.5 text-[10px] font-semibold tracking-wide", on ? "is-on" : "")}>
                  {tab.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});

export function AppShell({
  children,
  title,
  action,
  hideNav = false,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
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
          <PageHeader title={title} action={action} />
          <main className={cn("min-w-0 max-w-full flex-1 px-4 md:px-8", hideNav ? "pb-8" : "pb-[calc(6.5rem+var(--safe-bottom))] md:pb-10")}>
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>

      {!hideNav && <BottomNavigation pathname={pathname} />}
    </div>
  );
}
