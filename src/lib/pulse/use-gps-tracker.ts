import { useState, useEffect, useRef, useCallback } from "react";

export interface GpsPoint {
  lat: number;
  lng: number;
  altitude: number | null;
  timestamp: number;
  speed: number | null;
}

export interface KmSplit {
  km: number;
  elapsedSeconds: number;
  splitPaceSeconds: number;
}

export type GpsTrackingStatus = "idle" | "recording" | "paused" | "finished";

export interface GpsTrackerState {
  status: GpsTrackingStatus;
  elapsedSeconds: number;
  distanceMeters: number;
  currentSpeedKmh: number;
  avgSpeedKmh: number;
  currentPaceSeconds: number; // sec / km
  avgPaceSeconds: number; // sec / km
  elevationGainMeters: number;
  points: GpsPoint[];
  splits: KmSplit[];
  isSimulated: boolean;
  error: string | null;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGpsTracker() {
  const [state, setState] = useState<GpsTrackerState>({
    status: "idle",
    elapsedSeconds: 0,
    distanceMeters: 0,
    currentSpeedKmh: 0,
    avgSpeedKmh: 0,
    currentPaceSeconds: 0,
    avgPaceSeconds: 0,
    elevationGainMeters: 0,
    points: [],
    splits: [],
    isSimulated: false,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const lastAltRef = useRef<number | null>(null);
  const lastSplitDistRef = useRef<number>(0);
  const lastSplitTimeRef = useRef<number>(0);

  // Stopwatch timer
  useEffect(() => {
    if (state.status === "recording") {
      timerIdRef.current = window.setInterval(() => {
        setState((prev) => {
          const nextSec = prev.elapsedSeconds + 1;
          const distKm = prev.distanceMeters / 1000;
          const avgSpeed = distKm > 0 && nextSec > 0 ? (distKm / (nextSec / 3600)) : 0;
          const avgPace = distKm > 0.05 ? Math.round(nextSec / distKm) : 0;
          return {
            ...prev,
            elapsedSeconds: nextSec,
            avgSpeedKmh: avgSpeed,
            avgPaceSeconds: avgPace,
          };
        });
      }, 1000);
    } else {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    }

    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, [state.status]);

  const addPoint = useCallback((lat: number, lng: number, altitude: number | null, speedMs: number | null) => {
    setState((prev) => {
      if (prev.status !== "recording") return prev;

      const now = Date.now();
      const newPoint: GpsPoint = {
        lat,
        lng,
        altitude,
        timestamp: now,
        speed: speedMs != null ? speedMs * 3.6 : null,
      };

      const pts = [...prev.points, newPoint];
      let addedMeters = 0;

      if (prev.points.length > 0) {
        const last = prev.points[prev.points.length - 1]!;
        addedMeters = haversineMeters(last.lat, last.lng, lat, lng);
        // Ignore small GPS jitter (< 1.5 meters)
        if (addedMeters < 1.5) {
          addedMeters = 0;
        }
      }

      const totalDist = prev.distanceMeters + addedMeters;

      // Elevation gain (positive delta filter > 1.5m)
      let nextElev = prev.elevationGainMeters;
      if (altitude != null) {
        if (lastAltRef.current != null) {
          const diff = altitude - lastAltRef.current;
          if (diff > 1.5) {
            nextElev += diff;
            lastAltRef.current = altitude;
          } else if (diff < -1.5) {
            lastAltRef.current = altitude;
          }
        } else {
          lastAltRef.current = altitude;
        }
      }

      // Speeds and paces
      const speedKmh = speedMs != null && speedMs > 0 ? speedMs * 3.6 : 0;
      const currentPaceSec = speedKmh > 1.5 ? Math.round(3600 / speedKmh) : 0;

      // Check for kilometer splits
      const newSplits = [...prev.splits];
      const currentKmThreshold = Math.floor(totalDist / 1000);
      const prevKmThreshold = Math.floor(lastSplitDistRef.current / 1000);

      if (currentKmThreshold > prevKmThreshold && currentKmThreshold > 0) {
        const splitTime = prev.elapsedSeconds - lastSplitTimeRef.current;
        newSplits.push({
          km: currentKmThreshold,
          elapsedSeconds: prev.elapsedSeconds,
          splitPaceSeconds: splitTime,
        });
        lastSplitDistRef.current = totalDist;
        lastSplitTimeRef.current = prev.elapsedSeconds;
      }

      return {
        ...prev,
        distanceMeters: totalDist,
        elevationGainMeters: nextElev,
        currentSpeedKmh: speedKmh,
        currentPaceSeconds: currentPaceSec,
        points: pts,
        splits: newSplits,
      };
    });
  }, []);

  // Real GPS watch position
  const startRealGps = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState((prev) => ({ ...prev, error: "Geolocalización no soportada en este navegador." }));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        addPoint(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.altitude,
          pos.coords.speed
        );
      },
      (err) => {
        setState((prev) => ({ ...prev, error: `GPS: ${err.message}` }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      } as PositionOptions
    );
  }, [addPoint]);

  const start = useCallback(() => {
    lastAltRef.current = null;
    lastSplitDistRef.current = 0;
    lastSplitTimeRef.current = 0;
    setState((prev) => ({ ...prev, status: "recording", isSimulated: false, error: null }));
    startRealGps();
  }, [startRealGps]);

  const pause = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, status: "paused" }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, status: "recording" }));
    startRealGps();
  }, [startRealGps]);

  const finish = useCallback(() => {
    pause();
    setState((prev) => ({ ...prev, status: "finished" }));
  }, [pause]);

  const reset = useCallback(() => {
    pause();
    setState({
      status: "idle",
      elapsedSeconds: 0,
      distanceMeters: 0,
      currentSpeedKmh: 0,
      avgSpeedKmh: 0,
      currentPaceSeconds: 0,
      avgPaceSeconds: 0,
      elevationGainMeters: 0,
      points: [],
      splits: [],
      isSimulated: false,
      error: null,
    });
  }, [pause]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
      if (timerIdRef.current != null) {
        clearInterval(timerIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
