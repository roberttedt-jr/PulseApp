import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,opacity,background-color,color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 active:not-disabled:scale-[0.965] active:not-disabled:opacity-90 pressable-feedback",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_8px_24px_rgb(255_45_85/0.28)] hover:opacity-95",
        blue: "bg-accent text-accent-foreground hover:opacity-95",
        secondary: "glass-pill text-foreground hover:bg-white/10",
        ghost: "bg-transparent text-foreground hover:bg-white/5",
        outline: "border border-border bg-transparent hover:bg-white/5",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-95",
        success: "bg-success text-success-foreground hover:opacity-95",
        link: "text-accent underline-offset-4 hover:underline px-0",
      },
      size: {
        default: "h-12 rounded-2xl px-5 text-[15px]",
        sm: "h-9 rounded-xl px-3 text-sm",
        lg: "h-14 rounded-2xl px-6 text-base",
        icon: "size-11 rounded-2xl",
        pill: "h-10 rounded-full px-4 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  loading,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingText?: string;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { buttonVariants };
export const PulseButton = Button;
