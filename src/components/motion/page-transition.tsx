import type { ReactNode } from "react";

/** Tab roots swap instantly (Strava). Nested screens keep their own sheet/push motion. */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="pulse-page min-h-full">{children}</div>;
}
