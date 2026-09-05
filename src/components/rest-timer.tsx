import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.value = 1175;
      gain2.gain.value = 0.08;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.22);
    }, 180);
  } catch {
    /* audio not available */
  }
}

export function RestTimer({
  seconds,
  sound,
  onClose,
}: {
  seconds: number;
  sound: boolean;
  onClose: () => void;
}) {
  const [total, setTotal] = useState(seconds);
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const [kb, setKb] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    setTotal(seconds);
    setLeft(seconds);
    done.current = false;
    setPaused(false);
  }, [seconds]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKb(inset > 80 ? inset : 0);
    };
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          window.clearInterval(id);
          if (!done.current) {
            done.current = true;
            if (sound) beep();
            window.setTimeout(onClose, 800);
          }
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, sound, onClose]);

  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = total <= 0 ? 0 : Math.min(1, left / total);
  const offset = c * (1 - pct);
  const urgent = left <= 5 && left > 0;
  const label = useMemo(() => formatDuration(left), [left]);

  function add(n: number) {
    setTotal((t) => t + n);
    setLeft((v) => v + n);
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 px-3"
      style={{ bottom: kb + 8, paddingBottom: kb ? 0 : "max(0.75rem, env(safe-area-inset-bottom))" }}
      role="timer"
      aria-live="polite"
      aria-label={`Descanso ${label}`}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-lg rounded-[24px] bg-card/96 px-3 py-2.5 shadow-float hairline backdrop-blur-xl",
          urgent && "ring-1 ring-primary/50",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative grid size-12 shrink-0 place-items-center">
            <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden>
              <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" className="text-muted" strokeWidth="4" />
              <circle
                cx="24"
                cy="24"
                r={r}
                fill="none"
                stroke="currentColor"
                className={urgent ? "text-primary" : "text-success"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Descanso</p>
            <p className={cn("tabular text-[28px] leading-none font-semibold tracking-tight", urgent && "text-primary")}>
              {label}
            </p>
          </div>
          <Button size="sm" className="h-11 min-w-20" onClick={onClose}>
            <SkipForward />
            Saltar
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <Button variant="secondary" size="sm" className="h-10 flex-1" onClick={() => add(15)}>
            +15 s
          </Button>
          <Button variant="secondary" size="sm" className="h-10 flex-1" onClick={() => add(30)}>
            +30 s
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            aria-label={paused ? "Reanudar" : "Pausar"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play /> : <Pause />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            aria-label="Reiniciar"
            onClick={() => {
              done.current = false;
              setLeft(total);
            }}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>
    </div>
  );
}