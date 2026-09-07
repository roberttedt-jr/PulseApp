import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Moon, Sparkles } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { getPlan, setPlanDay } from "@/lib/pulse/fns";
import { toast } from "sonner";

export const Route = createFileRoute("/plan")({ component: PlanPage });

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function PlanPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["plan"], queryFn: () => getPlan() });
  const [picking, setPicking] = useState<number | null>(null);
  const mut = useMutation({
    mutationFn: (d: { weekday: number; type: "routine" | "template" | "rest"; routineId?: string | null; templateKey?: string | null }) =>
      setPlanDay({ data: d }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plan"] });
      void qc.invalidateQueries({ queryKey: ["consistency"] });
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      setPicking(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar el plan."),
  });
  const byDay = new Map((data?.days ?? []).map((d) => [d.weekday, d]));

  return (
    <AppPage title="Plan semanal">
      <div className="mx-auto max-w-xl space-y-2 pt-4">
        <p className="mb-3 text-sm text-muted-foreground">Toca un día para asignar una rutina, una plantilla Pulse o descanso.</p>
        {DAYS.map((label, i) => {
          const current = byDay.get(i);
          const isRest = !current || current.kind === "rest" || !current.routine_id;
          const name = isRest ? "Descanso" : current?.name || "Rutina";
          return (
            <button
              key={label}
              type="button"
              onClick={() => setPicking(i)}
              className="flex min-h-14 w-full min-w-0 items-center gap-3 rounded-3xl bg-card px-4 py-3 text-left hairline pressable-feedback"
            >
              <span className="w-20 shrink-0 text-sm font-medium sm:w-24">{label}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{name}</span>
            </button>
          );
        })}
      </div>

      <Sheet open={picking != null} onOpenChange={(o) => !o && setPicking(null)}>
        <SheetContent className="px-5 pt-2">
          <SheetTitle>{picking != null ? DAYS[picking] : "Día"}</SheetTitle>
          <SheetDescription>Elige qué toca este día.</SheetDescription>
          <div className="mt-4 space-y-5 pb-4">
            <section>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                <Dumbbell className="size-3.5" /> Mis rutinas
              </p>
              {(data?.routines ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no tienes rutinas propias.</p>
              ) : (
                <ul className="space-y-1.5">
                  {(data?.routines ?? []).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        disabled={mut.isPending}
                        onClick={() =>
                          picking != null && mut.mutate({ weekday: picking, type: "routine", routineId: r.id })
                        }
                        className="flex min-h-12 w-full items-center rounded-2xl glass-pill px-4 text-left text-sm font-medium pressable-feedback disabled:opacity-50"
                      >
                        {r.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                <Sparkles className="size-3.5" /> Plantillas Pulse
              </p>
              <ul className="space-y-1.5">
                {(data?.templates ?? []).map((t) => (
                  <li key={t.key}>
                    <button
                      type="button"
                      disabled={mut.isPending}
                      onClick={() =>
                        picking != null && mut.mutate({ weekday: picking, type: "template", templateKey: t.key })
                      }
                      className="flex min-h-12 w-full flex-col items-start justify-center rounded-2xl glass-pill px-4 py-2 text-left pressable-feedback disabled:opacity-50"
                    >
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="text-[11px] text-muted-foreground">{t.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                <Moon className="size-3.5" /> Recuperación
              </p>
              <button
                type="button"
                disabled={mut.isPending}
                onClick={() => picking != null && mut.mutate({ weekday: picking, type: "rest" })}
                className="flex min-h-12 w-full items-center rounded-2xl glass-pill px-4 text-left text-sm font-medium pressable-feedback disabled:opacity-50"
              >
                Día de descanso
              </button>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </AppPage>
  );
}
