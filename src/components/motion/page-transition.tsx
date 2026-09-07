import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { EASE_IOS, MOTION, supportsViewTransitions, tabIndex } from "@/lib/motion";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduced = useReducedMotion();
  const [fallback, setFallback] = useState(false);
  const prev = useRef(pathname);
  const dir = useRef(1);

  useEffect(() => {
    setFallback(!supportsViewTransitions());
  }, []);

  const from = tabIndex(prev.current);
  const to = tabIndex(pathname);
  if (from !== to && from >= 0 && to >= 0) {
    dir.current = to > from ? 1 : -1;
  }
  const sameTab = from === to || from < 0 || to < 0;
  prev.current = pathname;

  if (!fallback) {
    return <div className="pulse-page min-h-full">{children}</div>;
  }

  const slide = typeof window !== "undefined" ? Math.round(window.innerWidth * 0.28) : MOTION.tabSlidePx;
  const dx = reduced || sameTab ? 0 : dir.current * slide;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        className="pulse-page min-h-full will-change-transform"
        initial={{ x: dx }}
        animate={{ x: 0 }}
        exit={{ x: reduced || sameTab ? 0 : -dx }}
        transition={{
          duration: (reduced ? MOTION.reducedMs : MOTION.tabMs) / 1000,
          ease: EASE_IOS,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
