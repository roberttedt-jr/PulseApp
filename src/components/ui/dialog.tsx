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
          "pulse-dialog fixed z-50 flex max-h-[min(85dvh,640px)] flex-col overflow-x-hidden overflow-hidden rounded-3xl bg-card text-card-foreground shadow-float hairline",
          className,
        )}
        style={{
          left: "max(1rem, env(safe-area-inset-left))",
          right: "max(1rem, env(safe-area-inset-right))",
          top: "max(1rem, env(safe-area-inset-top))",
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          width: "min(calc(100% - 2rem), 420px)",
          maxWidth: "calc(100% - 2rem)",
          height: "fit-content",
          margin: "auto",
        }}
        {...props}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
        <DialogPrimitive.Close
          className="absolute top-3.5 right-3.5 z-10 grid size-9 place-items-center rounded-full bg-muted text-muted-foreground pressable"
          aria-label="Cerrar"
        >
          <X className="size-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("pr-12 text-lg leading-snug font-semibold tracking-tight text-balance break-words", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty", className)}
      {...props}
    />
  );
}
