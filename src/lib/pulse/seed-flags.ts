export const DEMO_USER_PREFIX = "pulse-demo-";

export function isDemoUserId(id: string): boolean {
  return id.startsWith(DEMO_USER_PREFIX);
}

/** Never true in production. Opt-in local seed only. */
export function isDevSeedEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PULSE_SEED_DEMO === "1";
}

export function isDevToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function slugKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
