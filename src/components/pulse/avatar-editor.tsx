import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { deleteAvatar, uploadAvatar } from "@/lib/pulse/fns";
import { AVATAR_ACCEPT, avatarInitials, prepareAvatar, validateAvatarFile } from "@/lib/pulse/image";
import { toast } from "sonner";

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return desktop;
}

export function ProfileAvatar({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const desktop = useDesktop();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async (dataUrl: string) => uploadAvatar({ data: { dataUrl } }),
    onSuccess: async () => {
      setPreview(null);
      setPendingUrl(null);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
      await qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Foto actualizada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo subir la foto"),
  });

  const remove = useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: async () => {
      setPreview(null);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
      await qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Foto eliminada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar"),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    const err = validateAvatarFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const prepared = await prepareAvatar(file);
      setPreview(prepared.previewUrl);
      setPendingUrl(prepared.dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer la imagen");
    }
  }

  const busy = save.isPending || remove.isPending;
  const body = (
    <div className="space-y-4 px-1 pb-2">
      <div className="flex flex-col items-center gap-3 pt-2">
        <Avatar src={preview ?? src} fallback={name} className="size-28 text-2xl" />
        <p className="text-sm text-muted-foreground">
          {preview ? "Así se verá tu foto." : src ? "Cambia o elimina tu foto." : "Añade una foto de perfil."}
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        className="w-full"
        variant="secondary"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <ImagePlus />
        {src || preview ? "Cambiar foto" : "Subir foto"}
      </Button>
      <Button
        type="button"
        className="w-full"
        variant="ghost"
        disabled={busy}
        onClick={() => cameraRef.current?.click()}
      >
        <Camera />
        Hacer una foto
      </Button>
      {preview && (
        <Button
          type="button"
          className="w-full"
          loading={save.isPending}
          loadingText="Subiendo foto…"
          onClick={() => pendingUrl && save.mutate(pendingUrl)}
        >
          Guardar foto
        </Button>
      )}
      {src && !preview && (
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          loading={remove.isPending}
          loadingText="Eliminando…"
          onClick={() => remove.mutate()}
        >
          <Trash2 />
          Eliminar foto
        </Button>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative mx-auto block pressable"
        aria-label="Editar foto de perfil"
      >
        <Avatar src={src} fallback={name} className="size-24 text-2xl" />
        <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-ring">
          <Camera className="size-4" />
        </span>
      </button>
      {desktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription>JPEG, PNG o WebP. Se recorta a cuadrado y se comprime antes de guardar.</DialogDescription>
            {body}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent className="px-4 pt-4">
            <SheetTitle className="sr-only">Foto de perfil</SheetTitle>
            <SheetDescription className="sr-only">Sube, cambia o elimina tu foto.</SheetDescription>
            <p className="mb-1 text-lg font-semibold">Foto de perfil</p>
            {body}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

export { avatarInitials };
