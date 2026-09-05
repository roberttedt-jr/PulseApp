import { cn } from "@/lib/utils";

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
  return (
    <img
      src="/pulse-icon.png"
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-[22%] object-cover", animated && "pulse-glow", className)}
      draggable={false}
    />
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
