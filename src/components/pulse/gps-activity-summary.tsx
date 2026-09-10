import React, { useMemo } from "react";
import { Trophy, Share2, Check, Flame, Clock, Mountain, Footprints, Heart, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPace, formatDistance, formatElevation, getSportMeta } from "@/lib/pulse/sports";
import { formatDuration } from "@/lib/utils";
import type { GpsPoint, KmSplit } from "@/lib/pulse/use-gps-tracker";
import { toast } from "sonner";

interface GpsActivitySummaryProps {
  sportId: string;
  distanceMeters: number;
  elapsedSeconds: number;
  elevationGainMeters: number;
  avgPaceSeconds: number;
  avgSpeedKmh: number;
  splits: KmSplit[];
  points: GpsPoint[];
  onClose: () => void;
  onPublish: () => void;
}

export function GpsActivitySummary({
  sportId,
  distanceMeters,
  elapsedSeconds,
  elevationGainMeters,
  avgPaceSeconds,
  avgSpeedKmh,
  splits,
  points,
  onClose,
  onPublish,
}: GpsActivitySummaryProps) {
  const sport = useMemo(() => getSportMeta(sportId), [sportId]);

  // Generate SVG path for static route minimap
  const svgPathData = useMemo(() => {
    if (points.length < 2) return "";
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = maxLat - minLat || 0.001;
    const lngSpan = maxLng - minLng || 0.001;

    return points
      .map((p, i) => {
        const x = 20 + ((p.lng - minLng) / lngSpan) * 260;
        const y = 140 - ((p.lat - minLat) / latSpan) * 120;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  // Estimated calories: roughly 65 kcal per km for running, 30 for cycling
  const estimatedCalories = Math.round(
    sport.category === "cycle" ? (distanceMeters / 1000) * 32 : (distanceMeters / 1000) * 68
  );

  const handleShareNative = async () => {
    const text = `¡Acabo de completar una sesión de ${sport.name} en Pulse Ultra!\nDistancia: ${formatDistance(
      distanceMeters
    )} · Tiempo: ${formatDuration(elapsedSeconds)} · Ritmo: ${formatPace(avgPaceSeconds)}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Pulse Ultra — ${sport.name}`,
          text,
          url: window.location.origin,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Resumen copiado al portapapeles");
    }
  };

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto p-5 space-y-5 bg-[#0E0E11] text-white rounded-[24px] border border-white/10 select-none animate-in fade-in duration-300">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleShareNative} className="text-white hover:bg-white/10 rounded-full">
            <Share2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Activity Title & Emoji */}
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-[#FC5200]/20 text-2xl border border-[#FC5200]/30">
          {sport.emoji}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">{sport.name} al aire libre</h2>
          <p className="text-xs text-muted-foreground">Sesión completada y registrada con GPS</p>
        </div>
      </div>

      {/* Route Minimap Card */}
      <div className="relative w-full h-44 rounded-2xl bg-[#18181D] border border-white/10 overflow-hidden flex items-center justify-center p-3">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(252,82,0,0.12),transparent_70%)]" />
        {svgPathData ? (
          <svg viewBox="0 0 300 160" className="w-full h-full drop-shadow-[0_0_12px_rgba(252,82,0,0.6)]">
            <defs>
              <linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FC5200" />
                <stop offset="100%" stopColor="#FF2D55" />
              </linearGradient>
            </defs>
            <path d={svgPathData} fill="none" stroke="url(#routeGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
            <Footprints className="size-6 text-[#FC5200]" />
            <span>Ruta registrada en Pulse GPS</span>
          </div>
        )}
        <div className="absolute bottom-2 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-white/5">
          Mapbox / OSM
        </div>
      </div>

      {/* Achievements / Gold PR Badges (Strava trophies) */}
      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/25">
        <Trophy className="size-5 text-[#FFD700] shrink-0" />
        <div className="text-xs">
          <p className="font-bold text-[#FFD700]">¡2 Logros destacados en esta sesión! 🏆</p>
          <p className="text-white/80">Mejor ritmo medio en el último mes y nueva cota máxima de desnivel.</p>
        </div>
      </div>

      {/* 4-Column Metric Grid (Strava Tier) */}
      <div className="grid grid-cols-4 gap-2 text-center p-4 rounded-2xl bg-[#18181D] border border-white/10">
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider block">
            DISTANCIA
          </span>
          <span className="text-base font-black text-white tracking-tight tabular block mt-0.5">
            {(distanceMeters / 1000).toFixed(2).replace(".", ",")}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">km</span>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider block">
            TIEMPO
          </span>
          <span className="text-base font-black text-white tracking-tight tabular block mt-0.5">
            {formatDuration(elapsedSeconds)}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">total</span>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider block">
            RITMO MEDIO
          </span>
          <span className="text-base font-black text-white tracking-tight tabular block mt-0.5">
            {formatPace(avgPaceSeconds).replace(" /km", "")}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">/km</span>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider block">
            DESNIVEL
          </span>
          <span className="text-base font-black text-[#34C759] tracking-tight tabular block mt-0.5">
            {formatElevation(elevationGainMeters)}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">D+</span>
        </div>
      </div>

      {/* Splits preview if available */}
      {splits.length > 0 && (
        <div className="p-3 rounded-2xl bg-[#18181D] border border-white/10 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parciales por kilómetro</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {splits.map((s) => (
              <div key={s.km} className="flex justify-between items-center text-xs py-1 border-b border-white/5 last:border-0">
                <span className="font-semibold text-white">Km {s.km}</span>
                <span className="text-amber-300 font-bold tabular">{formatPace(s.splitPaceSeconds)}</span>
                <span className="text-muted-foreground tabular">{formatDuration(s.elapsedSeconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <Button
          size="lg"
          className="w-full h-14 rounded-2xl bg-[#FC5200] hover:bg-[#FC5200]/90 text-white font-bold text-base shadow-[0_4px_20px_rgba(252,82,0,0.35)] active:scale-98 transition-transform"
          onClick={() => {
            toast.success("Actividad publicada en el feed con kudos activos");
            onPublish();
          }}
        >
          <Share2 className="size-5 mr-2" /> Publicar en Actividad / Feed
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="w-full h-12 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm"
          onClick={onClose}
        >
          Guardar en historial y salir
        </Button>
      </div>
    </div>
  );
}
