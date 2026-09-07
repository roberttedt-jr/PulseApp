import { cn } from "@/lib/utils";

/** Official Pulse mark — splash, welcome, login and PWA icons. */
export const PULSE_LOGO_SRC = "/pulse-icon.png";

export function PulseLogo({
  className,
  animated = false,
  size = 28,
  alt = "",
}: {
  className?: string;
  animated?: boolean;
  size?: number;
  alt?: string;
}) {
  if (!animated) {
    return (
      <img
        src={PULSE_LOGO_SRC}
        alt={alt}
        width={size}
        height={size}
        className={cn("rounded-[22%] object-cover", className)}
        draggable={false}
      />
    );
  }

  return (
    <span
      className={cn("relative inline-grid place-items-center overflow-visible p-8", className)}
      style={{ width: size + 64, height: size + 64 }}
    >
      <span className="pulse-logo-halo pointer-events-none absolute inset-0 rounded-full" aria-hidden />
      <img
        src={PULSE_LOGO_SRC}
        alt={alt}
        width={size}
        height={size}
        className="relative z-[1] rounded-[22%] object-cover"
        draggable={false}
      />
    </span>
  );
}

export function PulseMark({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <PulseLogo
      size={size}
      className={cn("shadow-[0_8px_24px_rgb(255_45_85/0.32)]", className)}
    />
  );
}
