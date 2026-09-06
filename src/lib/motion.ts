/** Tab order for Inicio → Entrenar → Progreso → Historial → Perfil. */
export const TAB_PATHS = ["/", "/routines", "/progress", "/history", "/settings"] as const;

export const MOTION = {
  tabMs: 200,
  tabMsOut: 180,
  tabSlidePx: 12,
  pressMs: 120,
  pressScale: 0.98,
  sheetInMs: 320,
  sheetOutMs: 180,
  fadeMs: 160,
  reducedMs: 120,
} as const;

export const EASE_IOS = [0.22, 1, 0.36, 1] as const;

export function tabIndex(pathname: string): number {
  if (pathname === "/") return 0;
  if (
    pathname.startsWith("/routines") ||
    pathname.startsWith("/train") ||
    pathname.startsWith("/exercises") ||
    pathname.startsWith("/plan")
  ) {
    return 1;
  }
  if (pathname.startsWith("/progress") || pathname.startsWith("/stats")) return 2;
  if (pathname.startsWith("/history")) return 3;
  if (pathname.startsWith("/settings") || pathname.startsWith("/feed") || pathname.startsWith("/onboarding")) {
    return 4;
  }
  return -1;
}

export function viewTransitionTypes(info: {
  fromLocation?: { pathname: string };
  toLocation: { pathname: string };
}): string[] {
  const from = tabIndex(info.fromLocation?.pathname ?? "");
  const to = tabIndex(info.toLocation.pathname);
  if (from < 0 || to < 0 || from === to) return ["pulse-fade"];
  return to > from ? ["pulse-tab-forward"] : ["pulse-tab-back"];
}

export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}
