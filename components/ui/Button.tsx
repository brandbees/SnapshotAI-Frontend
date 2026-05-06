import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md",
  secondary:
    "bg-surface text-foreground border border-border shadow-xs hover:bg-muted hover:border-border-strong",
  outline:
    "bg-transparent text-foreground border border-border hover:bg-muted",
  ghost:
    "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
  danger:
    "bg-destructive text-white hover:bg-red-700 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        style={
          variant === "primary"
            ? { background: "var(--accent)" }
            : undefined
        }
        {...props}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
