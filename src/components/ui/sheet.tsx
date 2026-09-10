import { Drawer } from "vaul";
import { X } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  children,
  shouldScaleBackground = false,
  setBackgroundColorOnScale = false,
  handleOnly = true,
  repositionInputs = false,
  ...props
}: ComponentProps<typeof Drawer.Root>) {
  return (
    <Drawer.Root
      shouldScaleBackground={shouldScaleBackground}
      setBackgroundColorOnScale={setBackgroundColorOnScale}
      handleOnly={handleOnly}
      repositionInputs={repositionInputs}
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
  fullScreen = false,
  ...props
}: ComponentProps<typeof Drawer.Content> & { side?: "bottom" | "right"; fullScreen?: boolean }) {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-black/55" />
      <Drawer.Content
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden bg-card text-card-foreground shadow-float outline-none",
          side === "bottom" &&
            (fullScreen
              ? "inset-x-0 bottom-0 mx-auto h-[100dvh] w-full max-w-lg rounded-t-[24px] border-t border-white/12 pt-[env(safe-area-inset-top,0px)]"
              : "inset-x-0 bottom-0 mx-auto w-full max-w-lg max-h-[min(90dvh,760px)] rounded-t-[28px] border-t border-white/12"),
          side === "right" && "inset-y-0 right-0 h-full w-[min(100%,420px)] max-w-full rounded-l-3xl border-l border-white/12",
        )}
        {...props}
      >
        {side === "bottom" ? <Drawer.Handle className="mt-2.5 mb-1 bg-ios-elevated" /> : null}
        <div
          data-sheet-scroll="1"
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]",
            fullScreen ? "overflow-hidden" : "overflow-y-auto",
            className,
          )}
        >
          {children}
        </div>
        <Drawer.Close
          className={cn(
            "glass-control absolute right-3.5 z-10 grid size-11 place-items-center rounded-full text-muted-foreground pressable",
            fullScreen ? "top-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.25rem))]" : "top-3.5",
          )}
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

export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 mt-4 border-t border-white/8 bg-card px-0 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  );
}
