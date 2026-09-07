import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloneLibraryTemplate, listLibraryTemplates } from "@/lib/pulse/fns";
import { toast } from "sonner";

export function TemplatePicker({ onCloned }: { onCloned?: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["library-templates"],
    queryFn: () => listLibraryTemplates(),
  });
  const clone = useMutation({
    mutationFn: (key: string) => cloneLibraryTemplate({ data: { key } }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["routines"] });
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success(`${res.name} añadida a tus rutinas`);
      onCloned?.();
      void navigate({ to: "/routines/$routineId", params: { routineId: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo copiar"),
  });

  if (isPending) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Cargando plantillas…</p>;
  }

  return (
    <ul className="space-y-2">
      {(data ?? []).map((t) => (
        <li key={t.key}>
          <button
            type="button"
            disabled={clone.isPending}
            onClick={() => clone.mutate(t.key)}
            className="flex w-full items-center gap-3 pulse-card px-4 py-3 text-left pressable disabled:opacity-50"
            style={{
              backgroundImage: `linear-gradient(120deg, color-mix(in srgb, ${t.color} 22%, var(--color-card)) 0%, var(--color-card) 62%)`,
            }}
          >
            <span
              className="grid size-11 shrink-0 place-items-center rounded-2xl text-white"
              style={{ background: t.color }}
            >
              <Dumbbell className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t.name}</span>
              <span className="block text-xs text-muted-foreground">
                {t.description} · {t.exerciseCount} ejercicios
              </span>
            </span>
          </button>
        </li>
      ))}
      {clone.isPending && (
        <p className="pt-2 text-center text-xs text-muted-foreground">Creando rutina…</p>
      )}
    </ul>
  );
}

export function TemplateActions({
  onCreate,
  onTemplates,
}: {
  onCreate: () => void;
  onTemplates: () => void;
}) {
  return (
    <>
      <Button onClick={onCreate}>Crear rutina</Button>
      <Button variant="secondary" onClick={onTemplates}>
        Ver plantillas
      </Button>
    </>
  );
}
