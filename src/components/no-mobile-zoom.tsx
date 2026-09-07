import { useEffect } from "react";

/**
 * Native-app viewport: no pinch, no double-tap zoom. Scroll still works.
 * iOS Safari ignores user-scalable=no in the browser; gesture + multi-touch
 * preventDefault is what actually locks it there and in the PWA.
 */
export function NoMobileZoom() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    const blockGesture = (e: Event) => {
      e.preventDefault();
    };
    const blockPinchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
    document.addEventListener("gestureend", blockGesture, { passive: false });
    document.addEventListener("touchmove", blockPinchMove, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
      document.removeEventListener("touchmove", blockPinchMove);
    };
  }, []);
  return null;
}
