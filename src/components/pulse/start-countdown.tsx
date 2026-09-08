import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { startWorkout } from "@/lib/pulse/fns";
import { cn } from "@/lib/utils";

type Tick = "3" | "2" | "1" | "go";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function haptic() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* unsupported */
  }
}

export function StartCountdown({
  title,
  job,
  onDone,
  onFail,
}: {
  title: string;
  job: Promise<{ id: string }>;
  onDone: (id: string) => void;
  onFail: (err: Error) => void;
}) {
  const [tick, setTick] = useState<Tick>(prefersReducedMotion() ? "go" : "3");
  const finished = useRef(false);
  const sessionId = useRef<string | null>(null);
  const failed = useRef<Error | null>(null);
  const onDoneRef = useRef(onDone);
  const onFailRef = useRef(onFail);
  onDoneRef.current = onDone;
  onFailRef.current = onFail;

  useEffect(() => {
    let alive = true;
    void job
      .then((res) => {
        if (!alive) return;
        sessionId.current = res.id;
      })
      .catch((e) => {
        if (!alive) return;
        failed.current = e instanceof Error ? e : new Error("No se ha podido crear la sesión.");
      });
    return () => {
      alive = false;
    };
  }, [job]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const steps: { tick: Tick; ms: number }[] = reduced
      ? [{ tick: "go", ms: 420 }]
      : [
          { tick: "3", ms: 1000 },
          { tick: "2", ms: 1000 },
          { tick: "1", ms: 1000 },
          { tick: "go", ms: 450 },
        ];
    let i = 0;
    let timer = 0;
    haptic();

    const finish = () => {
      if (finished.current) return;
      if (failed.current) {
        finished.current = true;
        onFailRef.current(failed.current);
        return;
      }
      if (sessionId.current) {
        finished.current = true;
        onDoneRef.current(sessionId.current);
        return;
      }
      timer = window.setTimeout(finish, 80);
    };

    const advance = () => {
      if (failed.current) {
        finish();
        return;
      }
      i += 1;
      if (i >= steps.length) {
        finish();
        return;
      }
      const next = steps[i]!;
      setTick(next.tick);
      if (next.tick !== "go") haptic();
      timer = window.setTimeout(advance, next.ms);
    };

    timer = window.setTimeout(advance, steps[0]!.ms);
    return () => window.clearTimeout(timer);
  }, []);

  const label = tick === "go" ? "¡Vamos!" : tick;
  const r = 54;
  const c = 2 * Math.PI * r;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/96 px-6"
      role="status"
      aria-live="assertive"
      aria-label={tick === "go" ? "Preparando tu sesión" : `Empieza en ${tick}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(255_45_85_/_0.16),transparent_62%)]" />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative grid size-44 place-items-center">
          <svg
            width="176"
            height="176"
            viewBox="0 0 176 176"
            className="-rotate-90"
            style={{ ["--ring-len" as string]: String(c) }}
            aria-hidden
          >
            <circle cx="88" cy="88" r={r} fill="none" stroke="currentColor" className="text-muted" strokeWidth="6" />
            <circle
              key={tick}
              cx="88"
              cy="88"
              r={r}
              fill="none"
              stroke="currentColor"
              className={cn("text-primary", tick === "go" ? "" : "pulse-countdown-ring")}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={tick === "go" ? 0 : c}
            />
          </svg>
          <p
            key={tick}
            className={cn(
              "pulse-countdown-num absolute inset-0 grid place-items-center font-semibold tracking-tight tabular",
              tick === "go" ? "text-countdown-go" : "text-countdown leading-none",
            )}
          >
            {label}
          </p>
        </div>
        <p className="mt-5 text-lg font-semibold tracking-tight">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">Preparando tu sesión</p>
      </div>
    </div>
  );
}

export function useStartWorkout() {
  const navigate = useNavigate();
  const [run, setRun] = useState<{ title: string; job: Promise<{ id: string }> } | null>(null);

  function start(title: string, data: { routineId?: string; exerciseIds?: string[] } = {}) {
    if (run) return;
    setRun({ title, job: startWorkout({ data }) });
  }

  const overlay = run ? (
    <StartCountdown
      title={run.title}
      job={run.job}
      onDone={(id) => {
        setRun(null);
        void navigate({ to: "/train", search: { id } });
      }}
      onFail={(err) => {
        setRun(null);
        toast.error(err.message || "No se ha podido crear la sesión.");
      }}
    />
  ) : null;

  return { start, busy: Boolean(run), overlay };
}
