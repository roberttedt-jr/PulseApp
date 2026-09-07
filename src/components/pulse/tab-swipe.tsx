import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { TAB_PATHS, tabIndex } from "@/lib/motion";

function ignoreFrom(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], .h-scroll, [data-h-scroll], [data-swipe-pager], [data-sheet-scroll], [data-vaul-drawer], [data-vaul-handle]",
    ),
  );
}

function commitIndex(index: number, count: number, dx: number, width: number, vx: number) {
  const flicked = Math.abs(vx) > 0.5 && Math.abs(dx) > 20;
  const crossed = Math.abs(dx) >= Math.max(72, width * 0.22);
  let next = index;
  if (dx > 0 && (crossed || flicked)) next = index - 1;
  else if (dx < 0 && (crossed || flicked)) next = index + 1;
  return Math.max(0, Math.min(count - 1, next));
}

export function TabSwipe({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const idx = tabIndex(pathname);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !enabled || idx < 0) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;

    const drag = {
      active: false,
      x0: 0,
      y0: 0,
      lastX: 0,
      lastT: 0,
      vx: 0,
      axis: "none" as "none" | "x" | "y",
      peeked: false,
    };

    const start = (x: number, y: number, t: number, target: EventTarget | null) => {
      if (ignoreFrom(target)) return false;
      drag.active = true;
      drag.x0 = drag.lastX = x;
      drag.y0 = y;
      drag.lastT = t;
      drag.vx = 0;
      drag.axis = "none";
      drag.peeked = false;
      return true;
    };

    const move = (x: number, y: number, t: number, prevent: () => void) => {
      if (!drag.active) return;
      const dx = x - drag.x0;
      const dy = y - drag.y0;
      if (drag.axis === "none") {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y";
      }
      if (drag.axis !== "x") return;
      prevent();
      const dt = Math.max(1, t - drag.lastT);
      drag.vx = (x - drag.lastX) / dt;
      drag.lastX = x;
      drag.lastT = t;
      if (!drag.peeked) {
        drag.peeked = true;
        const peek = dx < 0 ? idx + 1 : idx - 1;
        const path = TAB_PATHS[peek];
        if (path) void router.preloadRoute({ to: path });
      }
    };

    const end = () => {
      if (!drag.active) return;
      const dx = drag.lastX - drag.x0;
      const axis = drag.axis;
      drag.active = false;
      drag.axis = "none";
      if (axis !== "x") return;
      const width = node.clientWidth || 1;
      const next = commitIndex(idx, TAB_PATHS.length, dx, width, drag.vx);
      const to = TAB_PATHS[next];
      if (next === idx || !to) return;
      node.dataset.tabSwiped = "1";
      window.setTimeout(() => {
        delete node.dataset.tabSwiped;
      }, 420);
      void navigate({ to, viewTransition: true });
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      start(t.clientX, t.clientY, e.timeStamp, e.target);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      move(t.clientX, t.clientY, e.timeStamp, () => e.preventDefault());
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      if (!start(e.clientX, e.clientY, e.timeStamp, e.target)) return;
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        /* Safari */
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      move(e.clientX, e.clientY, e.timeStamp, () => e.preventDefault());
    };
    const onClick = (e: MouseEvent) => {
      if (node.dataset.tabSwiped === "1") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", end);
    node.addEventListener("touchcancel", end);
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    node.addEventListener("click", onClick, true);
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", end);
      node.removeEventListener("touchcancel", end);
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", end);
      node.removeEventListener("pointercancel", end);
      node.removeEventListener("click", onClick, true);
    };
  }, [enabled, idx, navigate, router]);

  return (
    <div ref={nodeRef} className="tab-swipe min-h-full" data-tab-swipe={enabled ? "1" : "0"}>
      {children}
    </div>
  );
}
