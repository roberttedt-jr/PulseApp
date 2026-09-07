import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HScroll({
  children,
  className,
  contentClassName,
  gap = "gap-2",
  snap = "mandatory",
  startAt = "start",
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  gap?: string;
  snap?: "mandatory" | "proximity" | "none";
  startAt?: "start" | "end";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const aligned = useRef(false);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      if (startAt === "end" && !aligned.current && el.scrollWidth > el.clientWidth + 4) {
        el.scrollLeft = el.scrollWidth;
        aligned.current = true;
      }
      const max = el.scrollWidth - el.clientWidth;
      const overflowing = max > 4;
      setCanL(overflowing && el.scrollLeft > 3);
      setCanR(overflowing && el.scrollLeft < max - 3);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [children, startAt]);

  return (
    <div
      className={cn(
        "relative min-w-0 max-w-full",
        canR && "h-scroll-fade-r",
        canL && "h-scroll-fade-l",
        className,
      )}
    >
      <div
        ref={ref}
        data-h-scroll="1"
        className={cn(
          "h-scroll no-scrollbar",
          snap === "proximity" && "h-scroll-proximity",
          snap === "none" && "h-scroll-none",
          gap,
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
