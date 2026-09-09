import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { rubberBand, snapPageIndex } from "@/lib/pulse/swipe";
import { cn } from "@/lib/utils";

export function SwipePager({
  index,
  onIndexChange,
  pages,
  className,
}: {
  index: number;
  onIndexChange: (next: number) => void;
  pages: ReactNode[];
  className?: string;
}) {
  const count = pages.length;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    startLeft: 0,
    vx: 0,
    axis: "none" as "none" | "x" | "y",
  });
  const suppressRef = useRef(false);

  const widthOf = () => scrollerRef.current?.clientWidth || 1;

  const snapTo = useCallback(
    (next: number, behavior: ScrollBehavior = "smooth") => {
      const node = scrollerRef.current;
      if (!node) return;
      const clamped = Math.max(0, Math.min(count - 1, next));
      suppressRef.current = true;
      node.scrollTo({ left: clamped * widthOf(), behavior });
      if (clamped !== index) onIndexChange(clamped);
      window.setTimeout(() => {
        suppressRef.current = false;
      }, 380);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const target = index * (node.clientWidth || 1);
    if (Math.abs(node.scrollLeft - target) < 6) return;
    suppressRef.current = true;
    node.scrollTo({ left: target, behavior: "smooth" });
    const t = window.setTimeout(() => {
      suppressRef.current = false;
    }, 380);
    return () => window.clearTimeout(t);
  }, [index]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const viewport: HTMLDivElement = node;

    const onResize = () => {
      viewport.scrollTo({ left: index * (viewport.clientWidth || 1), behavior: "auto" });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(viewport);

    const onScroll = () => {
      if (suppressRef.current || dragRef.current.active) return;
      const next = Math.round(viewport.scrollLeft / (viewport.clientWidth || 1));
      if (next !== index && next >= 0 && next < count) onIndexChange(next);
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      viewport.removeEventListener("scroll", onScroll);
    };
  }, [count, index, onIndexChange]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const viewport: HTMLDivElement = node;

    function finishFromGesture(dx: number, vx: number) {
      const next = snapPageIndex({ index, count, dx, width: viewport.clientWidth || 1, vx });
      snapTo(next);
    }

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [role='radio'], [role='button'], [data-no-swipe]")) return;
      const st = dragRef.current;
      st.active = true;
      st.startX = t.clientX;
      st.startY = t.clientY;
      st.lastX = t.clientX;
      st.lastT = e.timeStamp;
      st.startLeft = viewport.scrollLeft;
      st.vx = 0;
      st.axis = "none";
    }

    function onTouchMove(e: TouchEvent) {
      const st = dragRef.current;
      const t = e.touches[0];
      if (!st.active || !t) return;
      const dx = t.clientX - st.startX;
      const dy = t.clientY - st.startY;
      if (st.axis === "none") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        st.axis = Math.abs(dx) > Math.abs(dy) * 1.05 ? "x" : "y";
      }
      if (st.axis !== "x") return;
      e.preventDefault();
      const dt = Math.max(1, e.timeStamp - st.lastT);
      st.vx = (t.clientX - st.lastX) / dt;
      st.lastX = t.clientX;
      st.lastT = e.timeStamp;
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      let next = st.startLeft - dx;
      if (next < 0) next = rubberBand(next, viewport.clientWidth);
      else if (next > max) next = max + rubberBand(next - max, viewport.clientWidth);
      viewport.scrollLeft = next;
    }

    function onTouchEnd() {
      const st = dragRef.current;
      if (!st.active) return;
      st.active = false;
      if (st.axis === "x") finishFromGesture(st.lastX - st.startX, st.vx);
      st.axis = "none";
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [role='radio'], [role='button'], [data-no-swipe]")) return;
      const st = dragRef.current;
      st.active = true;
      st.startX = e.clientX;
      st.startY = e.clientY;
      st.lastX = e.clientX;
      st.lastT = e.timeStamp;
      st.startLeft = viewport.scrollLeft;
      st.vx = 0;
      st.axis = "none";
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const st = dragRef.current;
      if (!st.active) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (st.axis === "none") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        st.axis = Math.abs(dx) > Math.abs(dy) * 1.05 ? "x" : "y";
      }
      if (st.axis !== "x") return;
      e.preventDefault();
      const dt = Math.max(1, e.timeStamp - st.lastT);
      st.vx = (e.clientX - st.lastX) / dt;
      st.lastX = e.clientX;
      st.lastT = e.timeStamp;
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      let next = st.startLeft - dx;
      if (next < 0) next = rubberBand(next, viewport.clientWidth);
      else if (next > max) next = max + rubberBand(next - max, viewport.clientWidth);
      viewport.scrollLeft = next;
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const st = dragRef.current;
      if (!st.active) return;
      st.active = false;
      if (st.axis === "x") finishFromGesture(st.lastX - st.startX, st.vx);
      st.axis = "none";
    }

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd);
    viewport.addEventListener("touchcancel", onTouchEnd);
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
    };
  }, [count, index, snapTo]);

  return (
    <div
      ref={scrollerRef}
      className={cn("relative min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden no-scrollbar", className)}
      style={{
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-x pan-y",
        overscrollBehaviorX: "contain",
      }}
      data-swipe-pager="1"
    >
      <div className="flex h-full min-h-0" style={{ width: `${count * 100}%` }}>
        {pages.map((page, i) => (
          <div
            key={i}
            className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-visible"
            style={{
              width: `${100 / count}%`,
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
              touchAction: "pan-y",
            }}
            aria-hidden={i !== index}
          >
            {page}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PagerDots({
  index,
  count,
  onIndexChange,
}: {
  index: number;
  count: number;
  onIndexChange: (i: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3" role="tablist" aria-label="Páginas">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === index}
          aria-label={`Pantalla ${i + 1} de ${count}`}
          onClick={() => onIndexChange(i)}
          className={cn(
            "h-2 rounded-full transition-[width,background-color] duration-200 pressable-feedback",
            i === index ? "w-5 bg-primary" : "w-2 bg-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}
