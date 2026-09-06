import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-5 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" strokeWidth={1.75} />
      </span>
      <p className="mt-4 text-[17px] font-semibold tracking-tight">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">{hint}</p>
      {action ? <div className="mt-5 flex w-full max-w-xs flex-col gap-2">{action}</div> : null}
    </div>
  );
}
