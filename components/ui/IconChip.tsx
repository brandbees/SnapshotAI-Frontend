import { cn } from "@/lib/utils";

type Tone = "brand" | "neutral" | "success" | "warning" | "danger" | "info";
type Size = "sm" | "md" | "lg";

interface IconChipProps {
  children: React.ReactNode;
  tone?: Tone;
  size?: Size;
  className?: string;
}

const sizeMap: Record<Size, string> = {
  sm: "w-7 h-7 rounded-lg [&>svg]:w-3.5 [&>svg]:h-3.5",
  md: "w-9 h-9 rounded-xl [&>svg]:w-4 [&>svg]:h-4",
  lg: "w-11 h-11 rounded-xl [&>svg]:w-5 [&>svg]:h-5",
};

/**
 * Single shared "accent icon chip" pattern used across the Agent header, stat
 * cards, and site cards — replaces ad hoc per-page inline gradient styles
 * (e.g. the old one-off gold-brown Agent icon) with one consistent primitive.
 */
export function IconChip({ children, tone = "brand", size = "md", className }: IconChipProps) {
  if (tone === "brand") {
    return (
      <div
        className={cn(
          "flex items-center justify-center shrink-0 text-white shadow-elevated-sm bg-gradient-brand",
          sizeMap[size],
          className
        )}
      >
        {children}
      </div>
    );
  }

  const toneMap: Record<Exclude<Tone, "brand">, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-[var(--score-good-bg)] text-[var(--score-good)]",
    warning: "bg-[var(--score-warn-bg)] text-[var(--score-warn)]",
    danger: "bg-[var(--score-bad-bg)] text-[var(--score-bad)]",
    info: "bg-[var(--accent-light)] text-[var(--accent-hover)]",
  };

  return (
    <div className={cn("flex items-center justify-center shrink-0", sizeMap[size], toneMap[tone], className)}>
      {children}
    </div>
  );
}
