import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { avatarInitials } from "@/lib/pulse/image";

export function Avatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const letters = avatarInitials(fallback);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (src && !failed) {
    return (
      <span className={cn("relative inline-grid size-10 place-items-center overflow-hidden rounded-full bg-primary/20", className)}>
        {!loaded && (
          <span className="absolute inset-0 animate-pulse bg-primary/15" aria-hidden />
        )}
        <img
          src={src}
          alt={alt ?? ""}
          className={cn("size-full object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid size-10 place-items-center rounded-full bg-primary/20 text-sm font-semibold tracking-wide text-primary",
        className,
      )}
      aria-hidden={alt ? undefined : true}
    >
      {letters}
    </span>
  );
}
