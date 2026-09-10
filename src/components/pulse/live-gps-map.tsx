import React, { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, Square, MapPin, Navigation, Compass, Zap, Flame, Trophy, Volume2, Maximize2, Minimize2 } from "lucide-react";
import { useGpsTracker, type GpsPoint, type KmSplit } from "@/lib/pulse/use-gps-tracker";
import { formatPace, formatSpeed, formatDistance, formatElevation, type SportMeta, getSportMeta } from "@/lib/pulse/sports";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GpsActivitySummary } from "./gps-activity-summary";

interface LiveGpsMapProps {
  sportId?: string;
  onClose?: () => void;
  onPublishWorkout?: (summary: {
    sportId: string;
    distanceMeters: number;
    elapsedSeconds: number;
    elevationGainMeters: number;
    avgPaceSeconds: number;
    points: GpsPoint[];
  }) => void;
}

export function LiveGpsMap({ sportId = "run", onClose, onPublishWorkout }: LiveGpsMapProps) {
  const sport = useMemo(() => getSportMeta(sportId), [sportId]);
  const tracker = useGpsTracker();
  const [fullscreen, setFullscreen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "splits">("map");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Initialize Leaflet only in browser
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    async function initLeaflet() {
      try {
        // Dynamically inject Leaflet CSS if not already present
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        // Dynamically load Leaflet script if not present
        if (!(window as any).L) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Leaflet"));
            document.head.appendChild(script);
          });
        }

        if (!isMounted || !mapElementRef.current) return;
        const L = (window as any).L;
        if (!L) return;

        // Default to Madrid coordinates if no points yet
        const initialLat = tracker.points.length > 0 ? tracker.points[tracker.points.length - 1]!.lat : 40.4153;
        const initialLng = tracker.points.length > 0 ? tracker.points[tracker.points.length - 1]!.lng : -3.6845;

        if (!leafletMapRef.current) {
          const map = L.map(mapElementRef.current, {
            zoomControl: false,
            attributionControl: false,
          }).setView([initialLat, initialLng], 16);

          // OpenStreetMap tile layer with dark styling class
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            className: "pulse-dark-tile",
          }).addTo(map);

          // Pulsating athlete marker
          const pulsingIcon = L.divIcon({
            className: "pulse-athlete-marker-container",
            html: `
              <div class="relative flex items-center justify-center size-8">
                <div class="absolute size-8 rounded-full bg-[#FC5200]/30 animate-ping"></div>
                <div class="absolute size-5 rounded-full bg-[#FC5200] border-2 border-white shadow-lg"></div>
                <div class="size-2 rounded-full bg-white"></div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([initialLat, initialLng], { icon: pulsingIcon }).addTo(map);
          markerRef.current = marker;

          // Route polyline with neon gradient look
          const polyline = L.polyline([], {
            color: "#FC5200",
            weight: 5,
            opacity: 0.95,
            lineJoin: "round",
            lineCap: "round",
          }).addTo(map);
          polylineRef.current = polyline;

          leafletMapRef.current = map;
          setIsLeafletReady(true);
        }
      } catch (err) {
        console.warn("Leaflet dynamic init fallback to SVG:", err);
      }
    }

    void initLeaflet();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Leaflet polyline & center when GPS points change
  useEffect(() => {
    if (!leafletMapRef.current || tracker.points.length === 0) return;
    const L = (window as any).L;
    if (!L) return;

    const latLngs = tracker.points.map((p) => [p.lat, p.lng]);
    const latest = tracker.points[tracker.points.length - 1]!;

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latLngs);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([latest.lat, latest.lng]);
    }
    leafletMapRef.current.panTo([latest.lat, latest.lng], { animate: true, duration: 0.8 });
  }, [tracker.points]);

  // When session finishes, display summary
  const handleFinish = () => {
    tracker.finish();
    setShowSummary(true);
  };

  if (showSummary) {
    return (
      <GpsActivitySummary
        sportId={sport.id}
        distanceMeters={tracker.distanceMeters}
        elapsedSeconds={tracker.elapsedSeconds}
        elevationGainMeters={tracker.elevationGainMeters}
        avgPaceSeconds={tracker.avgPaceSeconds}
        avgSpeedKmh={tracker.avgSpeedKmh}
        splits={tracker.splits}
        points={tracker.points}
        onClose={() => {
          setShowSummary(false);
          onClose?.();
        }}
        onPublish={() => {
          onPublishWorkout?.({
            sportId: sport.id,
            distanceMeters: tracker.distanceMeters,
            elapsedSeconds: tracker.elapsedSeconds,
            elevationGainMeters: tracker.elevationGainMeters,
            avgPaceSeconds: tracker.avgPaceSeconds,
            points: tracker.points,
          });
          setShowSummary(false);
          onClose?.();
        }}
      />
    );
  }

  // SVG route path coordinates for the vector canvas layer
  const svgPathData = useMemo(() => {
    if (tracker.points.length < 2) return "";
    const lats = tracker.points.map((p) => p.lat);
    const lngs = tracker.points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = maxLat - minLat || 0.001;
    const lngSpan = maxLng - minLng || 0.001;

    return tracker.points
      .map((p, i) => {
        const x = 30 + ((p.lng - minLng) / lngSpan) * 280;
        const y = 270 - ((p.lat - minLat) / latSpan) * 240;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [tracker.points]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#0E0E11] text-white overflow-hidden select-none ${
        fullscreen ? "fixed inset-0 z-50" : "w-full min-h-[580px] rounded-[24px] border border-white/10"
      }`}
    >
      {/* Top Bar / Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top,16px))] pb-3 bg-gradient-to-b from-[#0E0E11]/90 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{sport.emoji}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold tracking-tight text-white">{sport.name}</h2>
              {tracker.isSimulated && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Simulación
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-muted-foreground/80">
              {tracker.status === "recording"
                ? "● Grabando GPS en directo"
                : tracker.status === "paused"
                ? "⏸ Pausado"
                : "Listo para iniciar"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            className="grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
            aria-label="Pantalla completa"
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Map Viewport Area */}
      <div className="relative w-full flex-1 min-h-[340px] overflow-hidden pulse-dark-map">
        {/* Leaflet container */}
        <div ref={mapElementRef} className="absolute inset-0 w-full h-full bg-[#121217]" />

        {/* Vector SVG path overlay fallback */}
        {!isLeafletReady && tracker.points.length >= 2 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
            <svg viewBox="0 0 340 300" className="w-full h-full drop-shadow-[0_0_12px_rgba(252,82,0,0.5)]">
              <path d={svgPathData} fill="none" stroke="#FC5200" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Live GPS status pill */}
        <div className="absolute top-20 left-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
          <div className={`size-2 rounded-full ${tracker.status === "recording" ? "bg-[#34C759] animate-pulse" : "bg-amber-400"}`} />
          {tracker.points.length} coords GPS
        </div>

        {/* Kilometer milestone pills (1k, 2k...) */}
        {tracker.splits.length > 0 && (
          <div className="absolute top-20 right-4 z-10 flex flex-col gap-1.5">
            {tracker.splits.slice(-3).map((split) => (
              <div
                key={split.km}
                className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 backdrop-blur-md border border-white/10 text-[11px] font-bold text-amber-300"
              >
                <span>🚩 {split.km}k:</span>
                <span className="tabular">{formatPace(split.splitPaceSeconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Liquid Glass HUD — 4 Giant Sports Metrics */}
      <div className="relative z-20 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom,20px))] bg-[#18181D]/90 backdrop-blur-2xl border-t border-white/10 rounded-t-[28px] shadow-[0_-12px_32px_rgba(0,0,0,0.5)]">
        {/* Toggle between HUD metrics & KM Splits */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                activeTab === "map" ? "bg-[#FC5200] text-white" : "bg-white/5 text-muted-foreground"
              }`}
            >
              Métricas en vivo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("splits")}
              className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                activeTab === "splits" ? "bg-[#FC5200] text-white" : "bg-white/5 text-muted-foreground"
              }`}
            >
              Parciales ({tracker.splits.length})
            </button>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider tabular">
            GPS ±3m
          </span>
        </div>

        {activeTab === "map" ? (
          <div className="grid grid-cols-2 gap-3 py-2">
            {/* DISTANCIA */}
            <div className="flex flex-col p-3 rounded-2xl bg-white/[0.04] border border-white/5">
              <span className="text-[11px] font-semibold text-muted-foreground/75 uppercase tracking-wider">
                DISTANCIA
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-3xl font-black text-white tracking-tight tabular">
                  {(tracker.distanceMeters / 1000).toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs font-bold text-muted-foreground">km</span>
              </div>
            </div>

            {/* RITMO */}
            <div className="flex flex-col p-3 rounded-2xl bg-white/[0.04] border border-white/5">
              <span className="text-[11px] font-semibold text-muted-foreground/75 uppercase tracking-wider">
                RITMO MEDIO
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-3xl font-black text-white tracking-tight tabular">
                  {formatPace(tracker.avgPaceSeconds).replace(" /km", "")}
                </span>
                <span className="text-xs font-bold text-muted-foreground">/km</span>
              </div>
            </div>

            {/* TIEMPO */}
            <div className="flex flex-col p-3 rounded-2xl bg-white/[0.04] border border-white/5">
              <span className="text-[11px] font-semibold text-muted-foreground/75 uppercase tracking-wider">
                TIEMPO TRANSCURRIDO
              </span>
              <div className="mt-0.5">
                <span className="text-3xl font-black text-white tracking-tight tabular">
                  {formatDuration(tracker.elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* DESNIVEL D+ */}
            <div className="flex flex-col p-3 rounded-2xl bg-white/[0.04] border border-white/5">
              <span className="text-[11px] font-semibold text-muted-foreground/75 uppercase tracking-wider">
                DESNIVEL D+
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#34C759] tracking-tight tabular">
                  {formatElevation(tracker.elevationGainMeters)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 max-h-36 overflow-y-auto space-y-1.5">
            {tracker.splits.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Completa el primer kilómetro para ver el ritmo parcial.
              </p>
            ) : (
              tracker.splits.map((s) => (
                <div
                  key={s.km}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] text-xs"
                >
                  <span className="font-bold text-white">Km {s.km}</span>
                  <span className="font-semibold text-amber-300 tabular">{formatPace(s.splitPaceSeconds)}</span>
                  <span className="text-muted-foreground tabular">{formatDuration(s.elapsedSeconds)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 flex items-center gap-3">
          {tracker.status === "idle" ? (
            <div className="flex w-full gap-2">
              <Button
                size="lg"
                className="flex-1 h-14 rounded-2xl bg-[#FC5200] hover:bg-[#FC5200]/90 text-white font-bold text-base shadow-[0_4px_20px_rgba(252,82,0,0.35)] active:scale-98 transition-transform"
                onClick={() => tracker.start(false)}
              >
                <Play className="size-5 fill-white mr-2" /> Iniciar GPS
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="h-14 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs px-3.5"
                onClick={() => tracker.start(true)}
                title="Modo simulación de ruta para pruebas"
              >
                Simular ruta
              </Button>
            </div>
          ) : tracker.status === "recording" ? (
            <div className="flex w-full gap-3">
              <Button
                size="lg"
                className="flex-1 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-base shadow-lg active:scale-98"
                onClick={tracker.pause}
              >
                <Pause className="size-5 mr-2" /> Pausar
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="flex-1 h-14 rounded-2xl bg-[#FF2D55] hover:bg-[#FF2D55]/90 text-white font-bold text-base shadow-lg active:scale-98"
                onClick={handleFinish}
              >
                <Square className="size-5 mr-2" /> Finalizar
              </Button>
            </div>
          ) : tracker.status === "paused" ? (
            <div className="flex w-full gap-3">
              <Button
                size="lg"
                className="flex-1 h-14 rounded-2xl bg-[#34C759] hover:bg-[#34C759]/90 text-white font-bold text-base shadow-lg active:scale-98"
                onClick={tracker.resume}
              >
                <Play className="size-5 fill-white mr-2" /> Reanudar
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="flex-1 h-14 rounded-2xl bg-[#FF2D55] hover:bg-[#FF2D55]/90 text-white font-bold text-base shadow-lg active:scale-98"
                onClick={handleFinish}
              >
                <Square className="size-5 mr-2" /> Finalizar
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
