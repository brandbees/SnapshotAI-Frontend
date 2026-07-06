import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "outline"
  | "accent";

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  dot?: boolean;
}

const variants: Record<Variant, string> = {
  default: "bg-foreground text-background",
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  muted: "bg-muted text-muted-foreground border border-border",
  outline: "bg-transparent text-foreground border border-border",
  accent: "bg-[var(--accent-light)] text-[var(--accent-hover)] border border-[var(--accent)]/20",
};

export function Badge({
  children,
  variant = "default",
  className,
  dot,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            variant === "success" && "bg-green-500",
            variant === "danger" && "bg-red-500",
            variant === "warning" && "bg-amber-500",
            variant === "info" && "bg-blue-500",
            variant === "muted" && "bg-muted-foreground"
          )}
        />
      )}
      {children}
    </span>
  );
}
