import { useMemo } from "react";

const COLORS = ["#FF2D55", "#007AFF", "#34C759", "#FF9F0A", "#FFFFFF"];

export function Confetti({ show }: { show: boolean }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        left: `${(i * 97) % 100}%`,
        delay: `${(i % 12) * 0.05}s`,
        duration: `${1.6 + (i % 7) * 0.12}s`,
        color: COLORS[i % COLORS.length],
        drift: `${((i % 9) - 4) * 18}px`,
        size: 6 + (i % 5),
      })),
    [],
  );
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: b.left,
            width: b.size,
            height: b.size * 1.6,
            background: b.color,
            animation: `confetti-fall ${b.duration} cubic-bezier(0.22,1,0.36,1) ${b.delay} both`,
            // @ts-expect-error CSS custom prop
            "--drift": b.drift,
          }}
        />
      ))}
    </div>
  );
}
