import { cn } from "@/lib/utils";

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
  const letter = fallback.trim().charAt(0).toUpperCase() || "P";
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        className={cn("size-10 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid size-10 place-items-center rounded-full bg-primary/20 text-sm font-semibold text-primary",
        className,
      )}
    >
      {letter}
    </span>
  );
}
