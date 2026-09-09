import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number;
  maxPull?: number;
}

const DEFAULT_THRESHOLD = 64;
const DEFAULT_MAX_PULL = 96;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 9; // radius = 9, circumference ≈ 56.55

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
  threshold = DEFAULT_THRESHOLD,
  maxPull = DEFAULT_MAX_PULL,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const canPullRef = useRef(false);
  const hasVibratedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  isRefreshingRef.current = isRefreshing;

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    setIsRefreshing(true);
    pullDistanceRef.current = threshold;
    setPullDistance(threshold);

    const minTime = new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await Promise.allSettled([Promise.resolve(onRefresh()), minTime]);
      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch {
      // Refresh error handled gracefully
    } finally {
      setIsSuccess(false);
      setIsRefreshing(false);
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [onRefresh, threshold]);

  // Touch event handling with passive: false for preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollY > 2) {
        canPullRef.current = false;
        return;
      }
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      canPullRef.current = true;
      hasVibratedRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!canPullRef.current || isRefreshingRef.current) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startYRef.current;
      const deltaX = Math.abs(currentX - startXRef.current);

      // If user scrolls horizontally more than vertically, abort pull-to-refresh
      if (deltaX > deltaY && deltaY < 15) {
        canPullRef.current = false;
        return;
      }

      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollY <= 2 && deltaY > 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        // Rubber-band resistance: linear dampening capped at maxPull
        const pull = Math.min(maxPull, deltaY * 0.44);
        pullDistanceRef.current = pull;
        setPullDistance(pull);
        setIsPulling(true);

        if (pull >= threshold && !hasVibratedRef.current) {
          try {
            navigator.vibrate?.(10);
          } catch {}
          hasVibratedRef.current = true;
        } else if (pull < threshold) {
          hasVibratedRef.current = false;
        }
      }
    };

    const onTouchEnd = () => {
      if (!canPullRef.current) return;
      canPullRef.current = false;
      setIsPulling(false);

      if (pullDistanceRef.current >= threshold && !isRefreshingRef.current) {
        void handleRefresh();
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, handleRefresh, maxPull, threshold]);

  // Desktop mouse drag simulation for testing / browser use
  const isMouseDownRef = useRef(false);
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isRefreshingRef.current) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY > 2) return;
    isMouseDownRef.current = true;
    startYRef.current = e.clientY;
    canPullRef.current = true;
    hasVibratedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !canPullRef.current || isRefreshingRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    if (deltaY > 0) {
      const pull = Math.min(maxPull, deltaY * 0.44);
      pullDistanceRef.current = pull;
      setPullDistance(pull);
      setIsPulling(true);
      if (pull >= threshold && !hasVibratedRef.current) {
        try {
          navigator.vibrate?.(10);
        } catch {}
        hasVibratedRef.current = true;
      }
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    canPullRef.current = false;
    setIsPulling(false);

    if (pullDistanceRef.current >= threshold && !isRefreshingRef.current) {
      void handleRefresh();
    } else {
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  };

  // Visual calculation
  const progress = Math.min(1, Math.max(0, pullDistance / threshold));
  const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress * 0.85);
  const rotation = progress * 270;

  // Indicator vertical positioning:
  // Hidden above screen when pullDistance is 0, slides down into view during pull
  const indicatorY = isRefreshing
    ? 44
    : pullDistance > 0
      ? -38 + pullDistance * 0.95
      : -48;

  const indicatorOpacity = isRefreshing ? 1 : Math.min(1, progress * 1.3);
  const indicatorScale = isRefreshing ? 1 : 0.7 + progress * 0.3;
  const contentY = isRefreshing ? 24 : isPulling ? pullDistance * 0.35 : 0;

  return (
    <div
      ref={containerRef}
      data-pull-to-refresh="1"
      className={cn("relative min-h-0 w-full overscroll-y-contain", className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Instagram-style floating circular activity indicator (ruedita) */}
      <div
        data-pull-to-refresh-indicator="1"
        aria-hidden={pullDistance === 0 && !isRefreshing}
        style={{
          transform: `translate3d(-50%, ${indicatorY}px, 0) scale(${indicatorScale})`,
          opacity: indicatorOpacity,
          transition: isPulling
            ? "none"
            : "transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out, scale 0.25s ease-out",
        }}
        className="pointer-events-none fixed top-2.5 left-1/2 z-50 flex size-10 items-center justify-center rounded-full border border-white/12 bg-card/95 text-foreground shadow-float backdrop-blur-md"
      >
        {isSuccess ? (
          <Check className="size-5 text-success animate-in zoom-in-50 duration-150" />
        ) : isRefreshing ? (
          <svg className="size-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="size-5 transition-transform"
            style={{ transform: `rotate(${rotation}deg)` }}
            viewBox="0 0 24 24"
            fill="none"
          >
            {/* Background track circle */}
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-white/15"
            />
            {/* Dynamic winding progress arc */}
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              className="text-primary transition-[stroke-dashoffset] duration-75"
            />
          </svg>
        )}
      </div>

      {/* Content wrapper with gentle elastic push */}
      <div
        data-pull-to-refresh-content="1"
        style={{
          transform: contentY > 0 ? `translate3d(0, ${contentY}px, 0)` : undefined,
          transition: isPulling ? "none" : "transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: isPulling || isRefreshing ? "transform" : "auto",
        }}
        className="w-full"
      >
        {children}
      </div>
    </div>
  );
}
