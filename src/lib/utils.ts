import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nid(): string {
  return crypto.randomUUID();
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export function formatKg(value: number, units: "metric" | "imperial" = "metric"): string {
  if (units === "imperial") {
    return `${Math.round(value * 2.20462 * 10) / 10} lb`;
  }
  return `${Math.round(value * 10) / 10} kg`;
}

export function toKg(value: number, units: "metric" | "imperial"): number {
  return units === "imperial" ? value / 2.20462 : value;
}

export function fromKg(value: number, units: "metric" | "imperial"): number {
  return units === "imperial" ? Math.round(value * 2.20462 * 10) / 10 : Math.round(value * 10) / 10;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function greetingForHour(hour: number, name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  const hello = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  return first ? `${hello}, ${first}` : hello;
}

export function isoDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}
