import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    vx: 0,
    dx: 0,
    axis: "none" as "none" | "x" | "y",
    moved: false,
  });

  const widthOf = () => viewportRef.current?.getBoundingClientRect().width || 1;

  const finish = useCallback(
    (dx: number, vx: number) => {
      const width = widthOf();
      const next = snapPageIndex({ index, count, dx, width, vx });
      setSnapping(true);
      setDrag(0);
      if (next !== index) onIndexChange(next);
      window.setTimeout(() => setSnapping(false), 340);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [data-no-swipe]")) return;
      const st = dragRef.current;
      st.active = true;
      st.startX = e.clientX;
      st.startY = e.clientY;
      st.lastX = e.clientX;
      st.lastT = e.timeStamp;
      st.vx = 0;
      st.dx = 0;
      st.axis = "none";
      st.moved = false;
      setSnapping(false);
      try {
        viewportRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* some browsers reject capture on synthetic events */
      }
    }

    function onPointerMove(e: PointerEvent) {
      const st = dragRef.current;
      if (!st.active) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (st.axis === "none") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        st.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y";
      }
      if (st.axis !== "x") return;
      e.preventDefault();
      st.moved = true;
      const dt = Math.max(1, e.timeStamp - st.lastT);
      st.vx = (e.clientX - st.lastX) / dt;
      st.lastX = e.clientX;
      st.lastT = e.timeStamp;
      const width = widthOf();
      let next = dx;
      if ((index === 0 && dx > 0) || (index === count - 1 && dx < 0)) {
        next = rubberBand(dx, width);
      }
      st.dx = next;
      setDrag(next);
    }

    function onPointerUp() {
      const st = dragRef.current;
      if (!st.active) return;
      st.active = false;
      if (st.axis === "x") finish(st.dx, st.vx);
      else setDrag(0);
      st.axis = "none";
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove, { passive: false });
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
    };
  }, [count, finish, index]);

  const width = widthOf();
  const x = -index * 100 + (width ? (drag / width) * 100 : 0);

  return (
    <div
      ref={viewportRef}
      className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden", className)}
      style={{ touchAction: "pan-y" }}
      data-swipe-pager="1"
    >
      <div
        className="flex h-full min-h-0"
        style={{
          width: `${count * 100}%`,
          transform: `translate3d(${x / count}%, 0, 0)`,
          transition: snapping || drag === 0 ? "transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
        }}
      >
        {pages.map((page, i) => (
          <div
            key={i}
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
            style={{ width: `${100 / count}%` }}
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
