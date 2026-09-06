import { Drawer } from "vaul";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  children,
  shouldScaleBackground = false,
  setBackgroundColorOnScale = false,
  ...props
}: ComponentProps<typeof Drawer.Root>) {
  return (
    <Drawer.Root
      shouldScaleBackground={shouldScaleBackground}
      setBackgroundColorOnScale={setBackgroundColorOnScale}
      {...props}
    >
      {children}
    </Drawer.Root>
  );
}

export const SheetTrigger = Drawer.Trigger;
export const SheetClose = Drawer.Close;

export function SheetContent({
  className,
  children,
  side = "bottom",
  ...props
}: ComponentProps<typeof Drawer.Content> & { side?: "bottom" | "right" }) {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[6px]" />
      <Drawer.Content
        className={cn(
          "fixed z-50 flex flex-col overflow-x-hidden bg-card text-card-foreground shadow-float outline-none hairline",
          side === "bottom" &&
            "bottom-0 left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] mx-auto w-[min(calc(100%-2rem),480px)] max-h-[min(92dvh,720px)] rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]",
          side === "right" &&
            "inset-y-0 right-0 h-full w-[min(100%,420px)] max-w-full rounded-l-3xl",
        )}
        {...props}
      >
        {side === "bottom" ? <Drawer.Handle className="mt-2.5 bg-ios-elevated" /> : null}
        <div className={cn("min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain", className)}>
          {children}
        </div>
        <Drawer.Close
          className="absolute top-3.5 right-3.5 z-10 grid size-9 place-items-center rounded-full bg-muted text-muted-foreground pressable"
          aria-label="Cerrar"
        >
          <X className="size-4" />
          <span className="sr-only">Cerrar</span>
        </Drawer.Close>
      </Drawer.Content>
    </Drawer.Portal>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof Drawer.Title>) {
  return (
    <Drawer.Title
      className={cn("pr-12 text-[17px] leading-snug font-semibold tracking-tight text-balance break-words", className)}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof Drawer.Description>) {
  return (
    <Drawer.Description className={cn("mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty", className)} {...props} />
  );
}
