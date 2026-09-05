import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <span className="text-primary" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">Algo no ha salido bien</h1>
      <p className="max-w-md text-sm break-words text-muted-foreground">
        {error.message || "Error inesperado. Recarga e inténtalo de nuevo."}
      </p>
    </main>
  );
}
