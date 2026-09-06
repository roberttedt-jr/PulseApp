import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="pulse-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-[6px]" />
      <DialogPrimitive.Content
        className={cn(
          "pulse-dialog fixed top-1/2 left-1/2 z-50 flex max-h-[min(85dvh,640px)] w-[min(100%-2rem,420px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-card shadow-float hairline",
          className,
        )}
        {...props}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
        <DialogPrimitive.Close className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-full bg-muted text-muted-foreground pressable">
          <X className="size-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("pr-8 text-lg font-semibold", className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}
