import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { TAB_PATHS, tabIndex } from "@/lib/motion";
import { rubberBand, snapPageIndex } from "@/lib/pulse/swipe";

function ignoreFrom(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], .h-scroll, [data-h-scroll], [data-swipe-pager], [data-sheet-scroll], [data-vaul-drawer], [data-vaul-handle]",
    ),
  );
}

export function TabSwipe({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
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
    };

    const setX = (x: number, animate = false) => {
      node.style.transition = animate ? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
      node.style.transform = x ? `translate3d(${x}px,0,0)` : "";
    };

    const finish = (dx: number, vx: number) => {
      const next = snapPageIndex({
        index: idx,
        count: TAB_PATHS.length,
        dx,
        width: node.clientWidth || 1,
        vx,
      });
      if (next === idx) {
        setX(0, true);
        return;
      }
      const to = TAB_PATHS[next];
      if (!to) {
        setX(0, true);
        return;
      }
      node.dataset.tabSwiped = "1";
      window.setTimeout(() => {
        delete node.dataset.tabSwiped;
      }, 400);
      setX(0);
      void navigate({ to });
    };

    const start = (x: number, y: number, t: number, target: EventTarget | null) => {
      if (ignoreFrom(target)) return false;
      drag.active = true;
      drag.x0 = drag.lastX = x;
      drag.y0 = y;
      drag.lastT = t;
      drag.vx = 0;
      drag.axis = "none";
      return true;
    };

    const move = (x: number, y: number, t: number, prevent: () => void) => {
      if (!drag.active) return;
      const dx = x - drag.x0;
      const dy = y - drag.y0;
      if (drag.axis === "none") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) * 1.05 ? "x" : "y";
      }
      if (drag.axis !== "x") return;
      prevent();
      const dt = Math.max(1, t - drag.lastT);
      drag.vx = (x - drag.lastX) / dt;
      drag.lastX = x;
      drag.lastT = t;
      const width = node.clientWidth || 1;
      const atStart = idx <= 0 && dx > 0;
      const atEnd = idx >= TAB_PATHS.length - 1 && dx < 0;
      setX(atStart || atEnd ? rubberBand(dx, width) : dx);
    };

    const end = () => {
      if (!drag.active) return;
      const dx = drag.lastX - drag.x0;
      const axis = drag.axis;
      drag.active = false;
      drag.axis = "none";
      if (axis === "x") finish(dx, drag.vx);
      else setX(0);
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
      setX(0);
    };
  }, [enabled, idx, navigate]);

  return (
    <div ref={nodeRef} className="tab-swipe min-h-full" data-tab-swipe={enabled ? "1" : "0"}>
      {children}
    </div>
  );
}
