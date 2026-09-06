/**
 * Future HealthKit / Apple Fitness integration.
 *
 * Pulse is a web/PWA. Browsers cannot request HealthKit permissions, read
 * Apple Health, or sync Apple Watch workouts. This module exists so a native
 * iOS client can plug in later without rewriting manual logging.
 *
 * Do not call HealthKit APIs from the web app. Do not invent samples.
 */

export type DataSource = "manual" | "imported" | "healthkit";

export const HEALTHKIT_METRICS = [
  { id: "workouts", label: "Entrenamientos" },
  { id: "activeEnergy", label: "Calorías activas" },
  { id: "heartRate", label: "Frecuencia cardíaca" },
  { id: "bodyMass", label: "Peso corporal" },
  { id: "steps", label: "Pasos" },
] as const;

export function healthkitAvailableOnWeb(): false {
  return false;
}

export type HealthSample<T> = {
  value: T;
  source: DataSource;
  externalId?: string | null;
  importedAt?: string | null;
};
