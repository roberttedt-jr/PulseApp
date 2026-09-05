import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
