import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  /** Elevated variant — stronger shadow + brand-tinted border, for featured/highlighted content. */
  featured?: boolean;
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  children,
  className,
  padding = "md",
  hover = false,
  featured = false,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl transition-all duration-base",
        "shadow-elevated-sm hover:shadow-elevated-md hover:-translate-y-0.5",
        featured && "shadow-elevated-md",
        hover && "hover:shadow-glow hover:-translate-y-1 cursor-pointer",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-sm font-semibold text-foreground", className)}>
      {children}
    </h2>
  );
}
