import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;

export function SheetContent({
  className,
  children,
  side = "bottom",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: "bottom" | "right" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-float hairline overscroll-contain",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]",
          side === "right" &&
            "inset-y-0 right-0 h-full w-[min(100%,420px)] max-w-full overflow-hidden rounded-l-3xl",
        )}
        {...props}
      >
        {side === "bottom" && (
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ios-elevated" />
        )}
        <div className={cn("min-h-0 min-w-0 overflow-y-auto overscroll-contain", className)}>
          {children}
        </div>
        <DialogPrimitive.Close className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
          <X className="size-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
