/** Web stand-in for Reanimated `withSpring`: compositor transforms, no React renders. */

export type SpringConfig = {
  stiffness?: number;
  damping?: number;
  mass?: number;
  restDelta?: number;
  restSpeed?: number;
};

const DEFAULTS: Required<SpringConfig> = {
  stiffness: 340,
  damping: 28,
  mass: 0.85,
  restDelta: 0.001,
  restSpeed: 0.02,
};

export type Spring = {
  get: () => number;
  set: (value: number) => void;
  to: (target: number) => void;
  stop: () => void;
};

export function createSpring(onFrame: (value: number) => void, config: SpringConfig = {}): Spring {
  const cfg = { ...DEFAULTS, ...config };
  let x = 0;
  let v = 0;
  let target = 0;
  let raf = 0;
  let last = 0;
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tick = (now: number) => {
    raf = 0;
    const dt = Math.min(0.032, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    const { stiffness: k, damping: c, mass: m } = cfg;
    const a = (-k * (x - target) - c * v) / m;
    v += a * dt;
    x += v * dt;
    if (Math.abs(x - target) < cfg.restDelta && Math.abs(v) < cfg.restSpeed) {
      x = target;
      v = 0;
      onFrame(x);
      return;
    }
    onFrame(x);
    raf = requestAnimationFrame(tick);
  };

  const run = () => {
    if (reduce) {
      x = target;
      v = 0;
      onFrame(x);
      return;
    }
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  };

  return {
    get: () => x,
    set: (value) => {
      x = target = value;
      v = 0;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      onFrame(x);
    },
    to: (next) => {
      target = next;
      run();
    },
    stop: () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
