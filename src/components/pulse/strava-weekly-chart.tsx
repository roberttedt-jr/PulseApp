import { Link } from "@tanstack/react-router";
import { format, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateBezierCurve, type BezierPoint } from "@/lib/pulse/ultra-native-math";
import { cn, formatKg } from "@/lib/utils";

export interface WeeklyMetrics {
  totalVolumeKg?: number;
  activeTimeFormatted?: string;
  totalSets?: number;
  history12Weeks?: Array<{
    weekLabel: string;
    volumeKg: number;
    sessionCount: number;
  }>;
}

interface StravaWeeklyChartProps {
  metrics?: WeeklyMetrics;
  units?: "metric" | "imperial";
}

// Generate realistic default 12-week progressive athletic dataset if none provided
function generateDefault12Weeks() {
  const now = new Date();
  const baseVolumes = [
    11200, 11800, 12500, 11900, 13400, 14100, 13800, 14900, 15200, 14600, 16100, 14850,
  ];
  const sessions = [3, 4, 4, 3, 4, 5, 4, 4, 5, 4, 5, 4];

  return baseVolumes.map((vol, i) => {
    const weekDate = subWeeks(now, 11 - i);
    const weekNum = format(weekDate, "w");
    const weekRange = format(weekDate, "d MMM", { locale: es });
    return {
      weekLabel: `Semana ${weekNum} · ${weekRange}`,
      volumeKg: vol,
      sessionCount: sessions[i] ?? 4,
    };
  });
}

export const StravaWeeklyChart = memo(function StravaWeeklyChart({
  metrics,
  units = "metric",
}: StravaWeeklyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  const history = useMemo(() => {
    return metrics?.history12Weeks && metrics.history12Weeks.length === 12
      ? metrics.history12Weeks
      : generateDefault12Weeks();
  }, [metrics?.history12Weeks]);

  const volumeValues = useMemo(() => history.map((h) => h.volumeKg), [history]);

  // Dimensions for SVG ViewBox
  const svgWidth = 340;
  const svgHeight = 140;

  const curve = useMemo(() => {
    return calculateBezierCurve(volumeValues, {
      width: svgWidth,
      height: svgHeight,
      paddingTop: 18,
      paddingBottom: 22,
      paddingLeft: 16,
      paddingRight: 16,
    });
  }, [volumeValues]);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const activePoint: BezierPoint | null = activeIdx !== null ? curve.points[activeIdx] ?? null : null;
  const activeWeek = activeIdx !== null ? history[activeIdx] ?? null : null;

  const handlePointer = useCallback(
    (clientX: number) => {
      if (!svgRef.current) return;
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      const rect = svgRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const progress = Math.max(0, Math.min(1, relX / rect.width));

      // Find closest point
      const targetIdx = Math.round(progress * (history.length - 1));
      setActiveIdx(Math.max(0, Math.min(history.length - 1, targetIdx)));
      setTooltipVisible(true);
    },
    [history.length],
  );

  const handlePointerEnd = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    // Smooth fadeout after 1.5 seconds as specified
    hideTimerRef.current = window.setTimeout(() => {
      setTooltipVisible(false);
      setActiveIdx(null);
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const totalVolDisplay =
    metrics?.totalVolumeKg != null
      ? formatKg(metrics.totalVolumeKg, units)
      : formatKg(0, units);
  const activeTimeDisplay = metrics?.activeTimeFormatted ?? "0 min";
  const totalSetsDisplay = metrics?.totalSets != null ? `${metrics.totalSets} series` : "0 series";

  return (
    <div className="pulse-card relative overflow-hidden p-5" data-strava-weekly-card="1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white tracking-tight">Esta semana</h2>
        <span className="text-xs font-medium text-muted-foreground">Últimas 12 semanas</span>
      </div>

      {/* 3-Column Metrics Grid */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Volumen Total</p>
          <p className="mt-1 text-base font-bold text-white tracking-tight tabular">{totalVolDisplay}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Tiempo Activo</p>
          <p className="mt-1 text-base font-bold text-white tracking-tight tabular">{activeTimeDisplay}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Series Totales</p>
          <p className="mt-1 text-base font-bold text-white tracking-tight tabular">{totalSetsDisplay}</p>
        </div>
      </div>

      {/* 12-Week Interactive SVG Bézier Curve Graph */}
      <div className="relative mt-5 select-none touch-none">
        {/* Floating Liquid Glass Tooltip */}
        {tooltipVisible && activePoint && activeWeek && (
          <div
            className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 -translate-y-2 transition-all duration-150 ease-out"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
            }}
          >
            <div className="rounded-xl border border-white/15 bg-[rgba(16,16,20,0.92)] px-3 py-1.5 shadow-2xl backdrop-blur-xl">
              <p className="text-[10px] font-medium text-muted-foreground">{activeWeek.weekLabel}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs font-bold text-[#FF2D55] tabular">
                  {formatKg(activeWeek.volumeKg, units)}
                </span>
                <span className="text-[11px] text-white/80 tabular">{activeWeek.sessionCount} sesiones</span>
              </div>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-36 w-full cursor-crosshair overflow-visible"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            handlePointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) handlePointer(e.clientX);
          }}
          onPointerUp={(e) => {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
            handlePointerEnd();
          }}
          onPointerCancel={handlePointerEnd}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) handlePointer(t.clientX);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) handlePointer(t.clientX);
          }}
          onTouchEnd={handlePointerEnd}
        >
          <defs>
            <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(255, 45, 85)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(255, 45, 85)" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FF2D55" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FF2D55" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Area under curve */}
          <path d={curve.areaPath} fill="url(#pinkGradient)" />

          {/* Smooth Continuous Bézier Path */}
          <path
            d={curve.linePath}
            fill="none"
            stroke="url(#strokeGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vertical Guide Line on Scrubbing */}
          {tooltipVisible && activePoint && (
            <line
              x1={activePoint.x}
              y1={10}
              x2={activePoint.x}
              y2={svgHeight - 12}
              stroke="#ffffff"
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeOpacity="0.6"
            />
          )}

          {/* 12 Interactive Data Points along Curve */}
          {curve.points.map((pt, i) => {
            const isSelected = activeIdx === i;
            return (
              <g key={`pt-${i}`}>
                {/* Larger invisible tap target */}
                <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                {/* Visible point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "5" : "3"}
                  fill={isSelected ? "#FF2D55" : "#ffffff"}
                  stroke={isSelected ? "#ffffff" : "#FF2D55"}
                  strokeWidth={isSelected ? "2" : "1.5"}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail CTA Button */}
      <Link
        to="/progress"
        className="mt-4 block w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-white/10 pressable"
      >
        Ver tu progreso con más detalle
      </Link>
    </div>
  );
});
