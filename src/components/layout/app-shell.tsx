import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Dumbbell, House, UserRound, Users } from "lucide-react";
import { memo, useEffect, useState, type ReactNode } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { PulseLogo } from "@/components/pulse-logo";
import { TabSwipe } from "@/components/pulse/tab-swipe";
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

function useCollapseOnScroll(pathname: string) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCollapsed(false);
    if (reduce) return;
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 40 || y < last - 6) setCollapsed(false);
        else if (y > last + 16 && y > 120) setCollapsed(true);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
  return collapsed;
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
  const collapsed = useCollapseOnScroll(pathname);
  const active = Math.max(0, TABS.findIndex((t) => isActive(pathname, t.to)));
  return (
    <nav className={cn("pulse-tabbar md:hidden", collapsed && "is-collapsed")} aria-label="Principal">
      <ul className="relative grid grid-cols-5 px-1.5 py-1.5">
        <span
          aria-hidden
          className="pulse-tabbar-pill pointer-events-none absolute top-1.5 left-1.5 h-11 w-[calc((100%-0.75rem)/5)] rounded-full transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${active * 100}%)` }}
        />
        {TABS.map((tab) => {
          const on = isActive(pathname, tab.to);
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="min-w-0">
              <Link
                to={tab.to}
                preload="intent"
                className={cn(
                  "relative flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-colors duration-200",
                  on ? "text-white" : "text-foreground-tertiary",
                )}
                aria-current={on ? "page" : undefined}
                aria-label={tab.label}
              >
                <Icon
                  className={cn("size-5 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]", on && "scale-[1.06]")}
                  strokeWidth={on ? 2.4 : 1.85}
                  fill={on ? "currentColor" : "none"}
                  fillOpacity={on ? 0.22 : 0}
                />
                <span className={cn("max-w-full truncate px-0.5", on ? "opacity-100" : "opacity-75")}>{tab.label}</span>
              </Link>
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
          <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
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
                  preload="intent"
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
          <p className="px-3 text-[11px] text-foreground-tertiary">Tu ritmo. Tu progreso.</p>
        </aside>

        <div className="flex min-w-0 max-w-full flex-1 flex-col">
          <main className={cn("min-w-0 max-w-full flex-1 px-4 md:px-8", hideNav ? "pb-8" : "pb-[calc(6.5rem+var(--safe-bottom))] md:pb-10")}>
            <TabSwipe enabled={!hideNav}>
              <PageTransition>
                <>
                  <PageHeader title={title} action={action} />
                  {children}
                </>
              </PageTransition>
            </TabSwipe>
          </main>
        </div>
      </div>

      {!hideNav && <BottomNavigation pathname={pathname} />}
    </div>
  );
}
