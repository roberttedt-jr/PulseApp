import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { PulseScoreBreakdown } from "@/lib/pulse/formulas";
import { cn } from "@/lib/utils";

const RINGS = [
  { key: "consistency", label: "Consistencia", color: "#FF2D55", track: "rgba(255,45,85,0.18)", r: 54, max: 40 },
  { key: "overload", label: "Sobrecarga", color: "#AF52DE", track: "rgba(175,82,222,0.18)", r: 40, max: 40 },
  { key: "recovery", label: "Recuperación", color: "#00F0FF", track: "rgba(0,240,255,0.18)", r: 26, max: 20 },
] as const;

const RING_DURATION = 1100;
const RING_STAGGER = 140;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function ringT(elapsed: number, delay: number) {
  return easeOutCubic(Math.min(1, Math.max(0, (elapsed - delay) / RING_DURATION)));
}

function useInViewPlay(ref: RefObject<HTMLElement | null>) {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlay(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(() => setPlay(true));
      },
      { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [ref]);
  return play;
}

function useRingClock(play: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!play) {
      setElapsed(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setElapsed(RING_DURATION + RING_STAGGER * 2);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const total = RING_DURATION + RING_STAGGER * 2 + 32;
    const tick = (now: number) => {
      const next = now - t0;
      setElapsed(next);
      if (next < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play]);
  return elapsed;
}

function Ring({
  r,
  pct,
  color,
  track,
  t,
}: {
  r: number;
  pct: number;
  color: string;
  track: string;
  t: number;
}) {
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, pct * t));
  const angle = 2 * Math.PI * p;
  return (
    <g>
      <circle cx="70" cy="70" r={r} fill="none" stroke={track} strokeWidth="10" />
      <circle
        className="pulse-ring-progress"
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
      />
      {p > 0.015 ? (
        <circle
          cx={70 + r * Math.cos(angle)}
          cy={70 + r * Math.sin(angle)}
          r="5"
          fill={color}
          className="pulse-ring-cap"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      ) : null}
    </g>
  );
}

export function PulseScoreGlass({
  score,
  breakdown,
}: {
  score: number;
  breakdown?: PulseScoreBreakdown | null;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const play = useInViewPlay(rootRef);
  const elapsed = useRingClock(play);
  const [open, setOpen] = useState(false);
  const value = Math.min(100, Math.max(0, breakdown?.score ?? score));
  const consistency = breakdown?.consistency ?? 0;
  const overload = breakdown?.overload ?? 0;
  const recovery = breakdown?.recovery ?? 0;
  const targets = [consistency / 40, overload / 40, recovery / 20];
  const ts = [ringT(elapsed, 0), ringT(elapsed, RING_STAGGER), ringT(elapsed, RING_STAGGER * 2)];
  const shownScore = Math.round(value * ringT(elapsed, 0));
  const shown = [
    Math.round(consistency * ts[0]!),
    Math.round(overload * ts[1]!),
    Math.round(recovery * ts[2]!),
  ];

  return (
    <section ref={rootRef} className="pulse-score-glass" data-pulse-score="1">
      <button
        type="button"
        className="flex w-full items-center gap-4 text-left pressable-feedback"
        aria-expanded={open}
        aria-label={`Pulse Score ${value}`}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="relative grid size-[140px] shrink-0 place-items-center overflow-visible">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90" aria-hidden>
            {RINGS.map((ring, i) => (
              <Ring
                key={ring.key}
                r={ring.r}
                pct={targets[i] ?? 0}
                color={ring.color}
                track={ring.track}
                t={ts[i] ?? 0}
              />
            ))}
          </svg>
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="tabular text-[32px] leading-none font-semibold tracking-tight">{shownScore}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">Pulse Score</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {breakdown?.copy.headline ?? "Rendimiento semanal consolidado."}
          </p>
          <ul className="mt-3 space-y-1.5">
            {RINGS.map((ring, i) => (
              <li key={ring.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ background: ring.color }} />
                <span className="min-w-0 flex-1 truncate">{ring.label}</span>
                <span className="tabular text-foreground">
                  {shown[i]}/{ring.max}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </button>

      <button
        type="button"
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1 text-sm text-muted-foreground pressable-feedback"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ¿Cómo se calcula?
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && breakdown ? (
        <ul className="space-y-2 pb-1 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-[#FF2D55]">Consistencia.</span> {breakdown.copy.consistency}
          </li>
          <li>
            <span className="font-medium text-[#AF52DE]">Sobrecarga.</span> {breakdown.copy.overload}
          </li>
          <li>
            <span className="font-medium text-[#00F0FF]">Recuperación.</span> {breakdown.copy.recovery}
          </li>
        </ul>
      ) : null}
    </section>
  );
}
