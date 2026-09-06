import { HeartPulse } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { HEALTHKIT_METRICS } from "@/lib/pulse/healthkit";
import { updateProfile } from "@/lib/pulse/fns";
import { toast } from "sonner";

export function AppleHealthRow({ notify }: { notify: boolean }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (healthkitNotify: boolean) => updateProfile({ data: { healthkitNotify } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Preferencia guardada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left pressable"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
          <HeartPulse className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Apple Health</span>
          <span className="block text-xs text-muted-foreground">Próximamente</span>
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="px-4 pt-5 pb-8">
          <SheetTitle className="text-lg font-semibold">Apple Health</SheetTitle>
          <SheetDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
            La sincronización con Apple Health estará disponible en una futura app nativa para iPhone.
            Pulse es ahora una web/PWA y no puede pedir permisos de Salud ni leer HealthKit.
          </SheetDescription>
          <ul className="mt-5 space-y-2">
            {HEALTHKIT_METRICS.map((m) => (
              <li key={m.id} className="rounded-2xl bg-muted px-4 py-3 text-sm">
                {m.label}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Tus entrenamientos, peso y PRs se siguen registrando a mano en Pulse. Nada de esto se inventa ni se
            importa desde el Apple Watch.
          </p>
          <label className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 hairline">
            <span className="text-sm">
              <span className="block font-medium">Avisarme cuando esté disponible</span>
              <span className="block text-xs text-muted-foreground">Guardamos solo esta preferencia.</span>
            </span>
            <Switch
              checked={notify}
              disabled={save.isPending}
              onCheckedChange={(v) => save.mutate(v)}
            />
          </label>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => setOpen(false)}>
            Entendido
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
