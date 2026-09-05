import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, CalendarDays, Dumbbell, House, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { PulseLogo } from "@/components/pulse-logo";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/routines", label: "Entrenar", icon: Dumbbell, emphasize: true },
  { to: "/progress", label: "Progreso", icon: Activity },
  { to: "/history", label: "Historial", icon: CalendarDays },
  { to: "/settings", label: "Perfil", icon: UserRound },
] as const;

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

export function PageHeader({ title, action }: { title?: string; action?: ReactNode }) {
  if (!title) return null;
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/50 bg-background/80 px-4 pt-[max(0.7rem,env(safe-area-inset-top))] pb-3 backdrop-blur-2xl md:px-8">
      <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
      {action}
    </header>
  );
}

export function BottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/6 bg-background/78 backdrop-blur-2xl md:hidden"
      aria-label="Principal"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1.5 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.to);
          const Icon = tab.icon;
          const heavy = "emphasize" in tab && tab.emphasize;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                className={cn(
                  "relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold tracking-wide",
                  active ? "text-primary" : "text-foreground-tertiary",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-xl transition-colors",
                    active && "bg-primary/12",
                  )}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={heavy || active ? 2.4 : 1.85}
                    fill={active ? "currentColor" : "none"}
                    fillOpacity={active ? 0.18 : 0}
                  />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

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
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh w-[15.5rem] shrink-0 flex-col border-r border-border px-3 py-6",
            hideNav ? "md:hidden" : "md:flex",
          )}
        >
          <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
            <PulseLogo size={32} alt="" />
            <span className="text-[19px] font-semibold tracking-tight">Pulse</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.to);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors",
                    active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={"emphasize" in tab && tab.emphasize ? 2.25 : 2} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <p className="px-3 text-[11px] text-foreground-tertiary">Tu ritmo. Tu progreso.</p>
        </aside>

        <div className="flex min-w-0 max-w-full flex-1 flex-col">
          <PageHeader title={title} action={action} />
          <main className={cn("min-w-0 max-w-full flex-1 px-4 md:px-8", hideNav ? "pb-8" : "pb-28 md:pb-10")}>
            {children}
          </main>
        </div>
      </div>

      {!hideNav && <BottomNavigation pathname={pathname} />}
    </div>
  );
}
