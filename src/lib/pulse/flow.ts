export const PUBLIC_ONBOARDING_KEY = "pulse_public_onboarding_seen";

export type AppFlow = "handle" | "setup" | "tutorial" | "app";

export function hasSeenPublicOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PUBLIC_ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPublicOnboardingSeen(): void {
  try {
    window.localStorage.setItem(PUBLIC_ONBOARDING_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function clearPublicOnboardingSeen(): void {
  try {
    window.localStorage.removeItem(PUBLIC_ONBOARDING_KEY);
  } catch {
    /* private mode */
  }
}

export function resolveAppFlow(profile: {
  username?: string | null;
  setupCompletedAt?: string | null;
  tutorialCompletedAt?: string | null;
}): AppFlow {
  if (!profile.username) return "handle";
  if (!profile.setupCompletedAt) return "setup";
  if (!profile.tutorialCompletedAt) return "tutorial";
  return "app";
}

export function flowPath(flow: AppFlow): "/handle" | "/setup" | "/tutorial" | "/" {
  if (flow === "handle") return "/handle";
  if (flow === "setup") return "/setup";
  if (flow === "tutorial") return "/tutorial";
  return "/";
}
